const { app, BrowserWindow, ipcMain, dialog, shell, safeStorage } = require('electron');
const path = require('node:path');
const fs = require('node:fs/promises');
const { spawn } = require('node:child_process');

const isDev = Boolean(process.env.VITE_DEV_SERVER_URL);
let mainWindow;
const workspaceRoots = new Set();
const MAX_FILE_BYTES = 2 * 1024 * 1024;
const MAX_OUTPUT_BYTES = 256 * 1024;
const runtimes = {
  javascript: { bin: process.execPath, args: ['--disable-warning=ExperimentalWarning', '{file}'], ext: 'js' },
  node: { bin: process.execPath, args: ['{file}'], ext: 'js' },
  python: { bin: 'python', args: ['-I', '{file}'], ext: 'py', fallback: 'python3' }
};

function createWindow() {
  mainWindow = new BrowserWindow({ width: 1500, height: 960, minWidth: 980, minHeight: 650,
    title: 'DevForge', backgroundColor: '#0b0e14',
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true, webSecurity: true } });
  if (isDev) mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  else mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  mainWindow.webContents.setWindowOpenHandler(({ url }) => { try { if (new URL(url).protocol === 'https:') shell.openExternal(url); } catch {} return { action: 'deny' }; });
  mainWindow.webContents.on('will-navigate', (event, url) => { const allowed = isDev ? url.startsWith(process.env.VITE_DEV_SERVER_URL) : url.startsWith('file://'); if (!allowed) event.preventDefault(); });
}
function trusted(event) { if (!mainWindow || event.sender.id !== mainWindow.webContents.id) throw new Error('Untrusted IPC sender'); }
async function assertWorkspacePath(target, {allowRoot=true}={}) {
 if(typeof target!=='string'||!path.isAbsolute(target)) throw new Error('Invalid path');
 const resolved=path.resolve(target);
 for(const root of workspaceRoots){
  const rel=path.relative(root,resolved);
  if((rel===''&&allowRoot)|| (rel!==''&&!rel.startsWith('..'+path.sep)&&rel!=='..'&&!path.isAbsolute(rel))){
   const realRoot=await fs.realpath(root);
   let realTarget;
   try{realTarget=await fs.realpath(resolved);}catch(error){if(error.code==='ENOENT'&&rel!==''){const parentReal=await fs.realpath(path.dirname(resolved));const parentRel=path.relative(realRoot,parentReal);if(parentRel===''||(!parentRel.startsWith('..'+path.sep)&&parentRel!=='..'&&!path.isAbsolute(parentRel))){try{await fs.lstat(resolved);throw new Error('Symbolic links are not allowed for workspace file operations');}catch(statError){if(statError.code==='ENOENT')return resolved;throw statError;}}}throw error;}
   const realRel=path.relative(realRoot,realTarget);
   if(realRel===''||(!realRel.startsWith('..'+path.sep)&&realRel!=='..'&&!path.isAbsolute(realRel))) return resolved;
  }
 }
 throw new Error('Path is outside the currently opened workspace. Open its parent folder first.');
}
ipcMain.handle('dialog:openFolder', async event => { trusted(event); const r = await dialog.showOpenDialog(mainWindow, { properties: ['openDirectory'] }); if(r.canceled)return null; workspaceRoots.add(await fs.realpath(r.filePaths[0])); return { path: r.filePaths[0], name: path.basename(r.filePaths[0]) }; });
ipcMain.handle('dialog:openFile', async event => { trusted(event); const r = await dialog.showOpenDialog(mainWindow, { properties: ['openFile'] }); return r.canceled ? null : r.filePaths[0]; });
ipcMain.handle('fs:listDirectory', async (event, dir) => { trusted(event); dir=await assertWorkspacePath(dir); const entries = await fs.readdir(dir, { withFileTypes: true }); return entries.filter(e => !['.git','node_modules','.venv'].includes(e.name)).map(e => ({ name:e.name,path:path.join(dir,e.name),type:e.isDirectory()?'directory':'file' })).sort((a,b)=>a.type===b.type?a.name.localeCompare(b.name):a.type==='directory'?-1:1); });
ipcMain.handle('fs:read', async (event, file) => { trusted(event); file=await assertWorkspacePath(file,{allowRoot:false}); const stat=await fs.stat(file); if(!stat.isFile()||stat.size>MAX_FILE_BYTES) throw new Error('File is not a regular text file or exceeds 2 MB'); return fs.readFile(file,'utf8'); });
ipcMain.handle('fs:write', async (event, p) => { trusted(event); if(!p||typeof p.content!=='string'||Buffer.byteLength(p.content)>MAX_FILE_BYTES*2) throw new Error('Invalid save request'); const target=await assertWorkspacePath(p.path,{allowRoot:false}); await fs.writeFile(target,p.content,'utf8'); return {ok:true}; });
ipcMain.handle('settings:load', async event => { trusted(event); try{return JSON.parse(await fs.readFile(path.join(app.getPath('userData'),'settings.json'),'utf8'));}catch{return {theme:'dark',fontSize:14,wordWrap:'on',minimap:true};} });
ipcMain.handle('settings:save', async (event,s) => { trusted(event); if(!s||typeof s!=='object'||Array.isArray(s)) throw new Error('Invalid settings'); await fs.writeFile(path.join(app.getPath('userData'),'settings.json'),JSON.stringify(s,null,2),{mode:0o600}); return {ok:true}; });
ipcMain.handle('runtime:detect', async event => { trusted(event); const checks=[['node','--version'],['npm','--version'],['python','--version'],['python3','--version'],['java','-version'],['go','version'],['rustc','--version'],['gcc','--version'],['clang','--version'],['dotnet','--version'],['php','--version'],['ruby','--version']]; return Promise.all(checks.map(([bin,arg])=>new Promise(resolve=>{const p=spawn(bin,[arg],{shell:false,windowsHide:true});let out='';p.stdout.on('data',d=>out+=d);p.stderr.on('data',d=>out+=d);p.on('error',()=>resolve({name:bin,available:false,version:null}));p.on('close',code=>resolve({name:bin,available:code===0,version:out.trim().split(/\r?\n/)[0]||null}));}))); });
const SUPPORTED_RUNNERS = {
  javascript: { file: 'main.cjs', run: async dir => ({ bin: process.execPath, args: ['--disable-warning=ExperimentalWarning', path.join(dir,'main.cjs')], env: { ELECTRON_RUN_AS_NODE: '1' } }) },
  python: { file: 'main.py', run: async dir => ({ bin: await findExecutable(['python','python3','py']), args: ['-I', path.join(dir,'main.py')] }) },
  java: { file: 'Main.java', compile: async dir => ({ bin: 'javac', args: [path.join(dir,'Main.java')] }), run: async dir => ({ bin: 'java', args: ['-cp', dir, 'Main'] }) },
  go: { file: 'main.go', run: async dir => ({ bin: 'go', args: ['run', path.join(dir,'main.go')] }) },
  rust: { file: 'main.rs', compile: async dir => ({ bin: 'rustc', args: [path.join(dir,'main.rs'), '-o', path.join(dir, process.platform==='win32'?'main.exe':'main')] }), run: async dir => ({ bin: path.join(dir,process.platform==='win32'?'main.exe':'main'), args: [] }) },
  c: { file: 'main.c', compile: async dir => ({ bin: await findExecutable(['gcc','clang']), args: [path.join(dir,'main.c'), '-O0', '-o', path.join(dir,process.platform==='win32'?'main.exe':'main')] }), run: async dir => ({ bin: path.join(dir,process.platform==='win32'?'main.exe':'main'), args: [] }) },
  cpp: { file: 'main.cpp', compile: async dir => ({ bin: await findExecutable(['g++','clang++']), args: [path.join(dir,'main.cpp'), '-std=c++17', '-O0', '-o', path.join(dir,process.platform==='win32'?'main.exe':'main')] }), run: async dir => ({ bin: path.join(dir,process.platform==='win32'?'main.exe':'main'), args: [] }) },
  php: { file: 'main.php', run: async dir => ({ bin: 'php', args: [path.join(dir,'main.php')] }) },
  ruby: { file: 'main.rb', run: async dir => ({ bin: 'ruby', args: [path.join(dir,'main.rb')] }) }
};
async function findExecutable(names) {
  for (const bin of names) {
    const ok = await new Promise(resolve => {
      const p = spawn(bin, ['--version'], { shell:false, windowsHide:true });
      p.on('error', () => resolve(false)); p.on('close', code => resolve(code === 0));
    });
    if (ok) return bin;
  }
  throw new Error('Required runtime/compiler not found: ' + names.join(' or '));
}
function runChild(bin,args,{cwd,env={}}={}) {
 return new Promise(resolve=>{
  const started=Date.now(); let stdout='',stderr='',settled=false,limitHit=false;
  const child=spawn(bin,args,{cwd,shell:false,windowsHide:true,env:{PATH:process.env.PATH||'',SystemRoot:process.env.SystemRoot||'',HOME:process.env.HOME||'',TMPDIR:process.env.TMPDIR||'',...env}});
  const finish=result=>{if(settled)return;settled=true;clearTimeout(timer);resolve({...result,durationMs:Date.now()-started});};
  const append=(key,data)=>{
   const s=data.toString(); const remaining=MAX_OUTPUT_BYTES-Buffer.byteLength(stdout)-Buffer.byteLength(stderr);
   if(remaining<=0){if(!limitHit){limitHit=true;child.kill();stderr+='\\n[output limit reached]';}return;}
   const part=Buffer.from(s).subarray(0,remaining).toString();
   if(key==='stdout')stdout+=part;else stderr+=part;
   if(Buffer.byteLength(s)>remaining&&!limitHit){limitHit=true;child.kill();stderr+='\\n[output limit reached]';}
  };
  child.stdout.on('data',d=>append('stdout',d)); child.stderr.on('data',d=>append('stderr',d));
  child.on('error',e=>finish({stdout,stderr:stderr||e.message,exitCode:1,timedOut:false}));
  const timer=setTimeout(()=>{child.kill();finish({stdout,stderr:stderr+'\\n[execution timed out after 8 seconds]',exitCode:null,timedOut:true});},8000);
  child.on('close',code=>finish({stdout,stderr,exitCode:code,timedOut:false}));
 });
}
ipcMain.handle('run:code', async (event, payload) => {
 trusted(event);
 if(!payload||typeof payload.code!=='string'||payload.code.length>MAX_FILE_BYTES) throw new Error('Invalid code payload');
 const language=String(payload.language||'javascript').toLowerCase();
 const adapter=SUPPORTED_RUNNERS[language];
 if(!adapter) throw new Error('No execution adapter for '+language+'. Supported: '+Object.keys(SUPPORTED_RUNNERS).join(', '));
 const dir=await fs.mkdtemp(path.join(app.getPath('temp'),'devforge-'));
 try {
  await fs.writeFile(path.join(dir,adapter.file),payload.code,'utf8');
  if(adapter.compile){
   let compileSpec;
   try{compileSpec=await adapter.compile(dir);}catch(e){return {stdout:'',stderr:e.message,exitCode:127,durationMs:0,stage:'setup'};}
   const compiled=await runChild(compileSpec.bin,compileSpec.args,{cwd:dir});
   if(compiled.exitCode!==0||compiled.timedOut) return {...compiled,stage:'compile'};
  }
  let runSpec;
  try{runSpec=await adapter.run(dir);}catch(e){return {stdout:'',stderr:e.message,exitCode:127,durationMs:0,stage:'setup'};}
  const result=await runChild(runSpec.bin,runSpec.args,{cwd:dir,env:runSpec.env||{}});
  return {...result,stage:'run'};
 } finally { await fs.rm(dir,{recursive:true,force:true}).catch(()=>{}); }
});

const aiKeyPath = () => path.join(app.getPath('userData'),'ai-key.enc');
async function readAiKey(){
 if(!safeStorage.isEncryptionAvailable()) throw new Error('OS secure storage is unavailable on this system.');
 const encrypted=await fs.readFile(aiKeyPath());
 return safeStorage.decryptString(encrypted);
}
ipcMain.handle('ai:keyStatus', async event => {
 trusted(event);
 try{await fs.access(aiKeyPath());return {configured:true,secureStorage:safeStorage.isEncryptionAvailable()};}
 catch{return {configured:false,secureStorage:safeStorage.isEncryptionAvailable()};}
});
ipcMain.handle('ai:clearKey', async event => { trusted(event); await fs.rm(aiKeyPath(),{force:true}); return {ok:true}; });
ipcMain.handle('ai:saveKey', async (event, key) => {
 trusted(event);
 if(typeof key!=='string'||key.trim().length<8||key.length>4096) throw new Error('Enter a valid API key.');
 if(!safeStorage.isEncryptionAvailable()) throw new Error('OS secure storage is unavailable. AI credentials cannot be saved safely.');
 await fs.writeFile(aiKeyPath(),safeStorage.encryptString(key.trim()),{mode:0o600});
 return {ok:true};
});
ipcMain.handle('ai:chat', async (event, payload) => {
 trusted(event);
 if(!payload||typeof payload.endpoint!=='string'||typeof payload.model!=='string'||!Array.isArray(payload.messages)) throw new Error('Invalid AI request.');
 if(payload.model.length>200||payload.messages.length<1||payload.messages.length>20) throw new Error('Invalid model or message count.');
 const endpoint=new URL(payload.endpoint);
 const localHosts=new Set(['localhost','127.0.0.1','::1','[::1]']);
 if(endpoint.username||endpoint.password||!(endpoint.protocol==='https:'||(endpoint.protocol==='http:'&&localHosts.has(endpoint.hostname)))) throw new Error('Use HTTPS for remote providers. HTTP is allowed only for localhost model servers.');
 endpoint.pathname=endpoint.pathname.replace(/\\/$/,'');
 if(!endpoint.pathname.endsWith('/chat/completions')) endpoint.pathname+='/chat/completions';
 endpoint.search='';endpoint.hash='';
 const messages=payload.messages.map(m=>{
  if(!m||!['system','user','assistant'].includes(m.role)||typeof m.content!=='string'||m.content.length>30000) throw new Error('Invalid AI message.');
  return {role:m.role,content:m.content};
 });
 const key=await readAiKey();
 const response=await fetch(endpoint.toString(),{method:'POST',redirect:'error',signal:AbortSignal.timeout(60000),headers:{'Authorization':'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({model:payload.model,messages,stream:false})});
 const body=await response.text();
 if(body.length>2*1024*1024) throw new Error('AI provider response exceeded 2 MB.');
 let parsed;try{parsed=JSON.parse(body);}catch{throw new Error('AI provider returned a non-JSON response (HTTP '+response.status+').');}
 if(!response.ok) throw new Error(parsed.error?.message||('AI provider request failed (HTTP '+response.status+').'));
 const answer=parsed.choices?.[0]?.message?.content;
 if(typeof answer!=='string') throw new Error('AI provider response did not contain a message.');
 return {content:answer,model:parsed.model||payload.model};
});
app.whenReady().then(()=>{createWindow();app.on('activate',()=>{if(BrowserWindow.getAllWindows().length===0)createWindow();});});
app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit();});
