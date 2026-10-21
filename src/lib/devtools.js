export function detectLanguage(filename = '') {
  const ext = filename.split('.').pop()?.toLowerCase();
  const map = {
    js: 'javascript', jsx: 'javascript', mjs: 'javascript', cjs: 'javascript',
    ts: 'typescript', tsx: 'typescript', py: 'python', java: 'java', go: 'go',
    rs: 'rust', c: 'c', h: 'c', cpp: 'cpp', cc: 'cpp', cxx: 'cpp', hpp: 'cpp',
    cs: 'csharp', php: 'php', rb: 'ruby', kt: 'kotlin', swift: 'swift',
    dart: 'dart', sql: 'sql', sh: 'shell', ps1: 'powershell', html: 'html',
    htm: 'html', css: 'css', scss: 'scss', json: 'json', yaml: 'yaml',
    yml: 'yaml', xml: 'xml', md: 'markdown', lua: 'lua', r: 'r'
  };
  return map[ext] || 'plaintext';
}

export function formatJson(input, space = 2) {
  return JSON.stringify(JSON.parse(input), null, space);
}

export function minifyJson(input) {
  return JSON.stringify(JSON.parse(input));
}

export function jsonToCsv(input) {
  const rows = JSON.parse(input);
  if (!Array.isArray(rows) || rows.some(row => row === null || typeof row !== 'object' || Array.isArray(row))) {
    throw new TypeError('Expected an array of objects');
  }
  const headers = [...new Set(rows.flatMap(Object.keys))];
  const cell = value => {
    const s = value == null ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value);
    return /[",\r\n]/.test(s) ? '"' + s.replaceAll('"', '""') + '"' : s;
  };
  return [headers.map(cell).join(','), ...rows.map(row => headers.map(key => cell(row[key])).join(','))].join('\r\n');
}

export function base64Encode(value) {
  return btoa(unescape(encodeURIComponent(value)));
}

export function base64Decode(value) {
  return decodeURIComponent(escape(atob(value)));
}

export function encodeUrl(value) {
  return encodeURIComponent(value);
}

export function decodeUrl(value) {
  return decodeURIComponent(value);
}

export function textStats(value) {
  return {
    characters: value.length,
    charactersNoWhitespace: value.replace(/\s/g, '').length,
    words: (value.trim().match(/\S+/g) || []).length,
    lines: value.length ? value.split(/\r\n|\n|\r/).length : 0
  };
}

export function compareLines(left, right, { ignoreWhitespace = false, ignoreCase = false } = {}) {
  const a = left.split(/\r\n|\n|\r/);
  const b = right.split(/\r\n|\n|\r/);
  const norm = s => ignoreWhitespace ? s.replace(/\s+/g, '') : s;
  const eq = (x, y) => {
    x = norm(x);
    y = norm(y);
    return ignoreCase ? x.toLowerCase() === y.toLowerCase() : x === y;
  };
  const rows = [];
  const n = a.length;
  const m = b.length;
  if ((n + 1) * (m + 1) > 1_000_000) {
    throw new RangeError('Diff is too large for the built-in comparison limit');
  }
  const dp = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = eq(a[i], b[j]) ? 1 + dp[i + 1][j + 1] : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (eq(a[i], b[j])) rows.push({ type: 'same', left: a[i++], right: b[j++] });
    else if (dp[i + 1][j] >= dp[i][j + 1]) rows.push({ type: 'removed', left: a[i++], right: null });
    else rows.push({ type: 'added', left: null, right: b[j++] });
  }
  while (i < n) rows.push({ type: 'removed', left: a[i++], right: null });
  while (j < m) rows.push({ type: 'added', left: null, right: b[j++] });
  return rows;
}

export function decodeJwtPayload(token) {
  const parts = token.split('.');
  if (parts.length !== 3) throw new TypeError('JWT must have three segments');
  const raw = parts[1].replace(/-/g, '+').replace(/_/g, '/');
  const padded = raw.padEnd(Math.ceil(raw.length / 4) * 4, '=');
  return JSON.parse(decodeURIComponent(escape(atob(padded))));
}
