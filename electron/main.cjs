const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('node:path');
const fs = require('node:fs/promises');
const { spawn } = require('node:child_process');

const isDev = Boolean(process.env.VITE_DEV_SERVER_URL);
let mainWindow;
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
ipcMain.handle('dialog:openFolder', async event => { trusted(event); const r = await dialog.showOpenDialog(mainWindow, { properties: ['openDirectory'] }); return r.canceled ? null : { path: r.filePaths[0], name: path.basename(r.filePaths[0]) }; });
ipcMain.handle('dialog:openFile', async event => { trusted(event); const r = await dialog.showOpenDialog(mainWindow, { properties: ['openFile'] }); return r.canceled ? null : r.filePaths[0]; });
ipcMain.handle('fs:listDirectory', async (event, dir) => { trusted(event); if (typeof dir !== 'string' || !path.isAbsolute(dir)) throw new Error('Invalid path'); const entries = await fs.readdir(dir, { withFileTypes: true }); return entries.filter(e => !['.git','node_modules','.venv'].includes(e.name)).map(e => ({ name:e.name,path:path.join(dir,e.name),type:e.isDirectory()?'directory':'file' })).sort((a,b)=>a.type===b.type?a.name.localeCompare(b.name):a.type==='directory'?-1:1); });
ipcMain.handle('fs:read', async (event, file) => { trusted(event); if(typeof file!=='string'||!path.isAbsolute(file)) throw new Error('Invalid path'); const stat=await fs.stat(file); if(!stat.isFile()||stat.size>MAX_FILE_BYTES) throw new Error('File is not a regular text file or exceeds 2 MB'); return fs.readFile(file,'utf8'); });
ipcMain.handle('fs:write', async (event, p) => { trusted(event); if(!p||typeof p.path!=='string'||!path.isAbsolute(p.path)||typeof p.content!=='string'||Buffer.byteLength(p.content)>MAX_FILE_BYTES*2) throw new Error('Invalid save request'); await fs.writeFile(p.path,p.content,'utf8'); return {ok:true}; });
ipcMain.handle('settings:load', async event => { trusted(event); try{return JSON.parse(await fs.readFile(path.join(app.getPath('userData'),'settings.json'),'utf8'));}catch{return {theme:'dark',fontSize:14,wordWrap:'on',minimap:true};} });
ipcMain.handle('settings:save', async (event,s) => { trusted(event); if(!s||typeof s!=='object'||Array.isArray(s)) throw new Error('Invalid settings'); await fs.writeFile(path.join(app.getPath('userData'),'settings.json'),JSON.stringify(s,null,2),{mode:0o600}); return {ok:true}; });
ipcMain.handle('runtime:detect', async event => { trusted(event); const checks=[['node','--version'],['npm','--version'],['python','--version'],['python3','--version'],['java','-version'],['go','version'],['rustc','--version'],['gcc','--version'],['clang','--version'],['dotnet','--version'],['php','--version'],['ruby','--version']]; return Promise.all(checks.map(([bin,arg])=>new Promise(resolve=>{const p=spawn(bin,[arg],{shell:false,windowsHide:true});let out='';p.stdout.on('data',d=>out+=d);p.stderr.on('data',d=>out+=d);p.on('error',()=>resolve({name:bin,available:false,version:null}));p.on('close',code=>resolve({name:bin,available:code===0,version:out.trim().split(/\r?\n/)[0]||null}));}))); });
ipcMain.handle('run:javascript', async (event, payload) => { trusted(event); if(!payload||typeof payload.code!=='string'||payload.code.length>MAX_FILE_BYTES) throw new Error('Invalid code payload'); const dir=await fs.mkdtemp(path.join(app.getPath('temp'),'devforge-')); const file=path.join(dir,'main.cjs'); await fs.writeFile(file,payload.code,'utf8'); return new Promise(resolve=>{const child=spawn(process.execPath,['--disable-warning=ExperimentalWarning',file],{cwd:dir,shell:false,windowsHide:true,env:{PATH:process.env.PATH||'',SystemRoot:process.env.SystemRoot||'',ELECTRON_RUN_AS_NODE:'1'}});let stdout='',stderr='',timedOut=false,settled=false;const finish=result=>{if(settled)return;settled=true;clearTimeout(timer);fs.rm(dir,{recursive:true,force:true}).catch(()=>{});resolve(result)};const append=(key,data)=>{const s=data.toString();if((stdout.length+stderr.length)<MAX_OUTPUT_BYTES){if(key==='stdout')stdout+=s;else stderr+=s;}else{child.kill();stderr+='\\n[output limit reached]';}};child.stdout.on('data',d=>append('stdout',d));child.stderr.on('data',d=>append('stderr',d));child.on('error',e=>finish({stdout,stderr:e.message,exitCode:1,durationMs:Date.now()-started}));const started=Date.now();const timer=setTimeout(()=>{timedOut=true;child.kill();finish({stdout,stderr:stderr+'\\n[execution timed out after 5 seconds]',exitCode:null,timedOut:true,durationMs:Date.now()-started});},5000);child.on('close',code=>finish({stdout,stderr,exitCode:code,timedOut,durationMs:Date.now()-started}));}); });
app.whenReady().then(()=>{createWindow();app.on('activate',()=>{if(BrowserWindow.getAllWindows().length===0)createWindow();});});
app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit();});
