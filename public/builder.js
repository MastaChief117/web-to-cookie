'use strict';

const CHUNK = 3000;
const PREFIX = 'cookiehost_';
const COUNT = PREFIX + 'count';
const MAX_AGE = 31536000;
const ALLOWED = new Set(['html','htm','css','js','json','txt','svg']);

const $ = id => document.getElementById(id);
let picked = [];

function ext(name) {
  const i = name.lastIndexOf('.');
  return i === -1 ? '' : name.slice(i + 1).toLowerCase();
}

function status(message, kind = '') {
  const el = $('status');
  el.textContent = message;
  el.className = 'status ' + kind;
}

function bytesText(n) {
  if (n == null) return '—';
  if (n < 1024) return Math.round(n) + ' B';
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
  return (n / 1024 / 1024).toFixed(2) + ' MB';
}

function setStats(a = {}) {
  const vals = {
    sFiles: a.files,
    sOrig: a.orig == null ? null : bytesText(a.orig),
    sComp: a.comp == null ? null : bytesText(a.comp),
    sEnc: a.enc == null ? null : bytesText(a.enc),
    sCookies: a.cookies,
    sStored: a.stored
  };
  for (const [id, value] of Object.entries(vals)) $(id).textContent = value ?? '—';
}

function cleanPath(file) {
  let p = (file.webkitRelativePath || file.name || '').replace(/\\/g, '/');
  p = p.replace(/^\/+/, '').replace(/^\.\//, '');
  const parts = p.split('/').filter(Boolean);
  if (!parts.length || parts.includes('..')) return null;
  return parts.join('/');
}

function addFiles(fileList) {
  const files = Array.from(fileList || []);
  if (!files.length) {
    status('No files were selected. On mobile, use Pick files and choose at least one file.', 'error');
    return;
  }

  let added = 0;
  for (const file of files) {
    const p = cleanPath(file);
    if (!p) continue;
    file._cookieHostPath = p;
    picked = picked.filter(old => old._cookieHostPath !== p);
    picked.push(file);
    added++;
  }

  render();
  status('Added ' + added + ' file(s). Total: ' + picked.length + '.', 'ok');
}

function render() {
  const list = $('fileList');
  list.replaceChildren();

  for (const file of [...picked].sort((a,b) =>
    a._cookieHostPath.localeCompare(b._cookieHostPath))) {
    const row = document.createElement('div');
    row.className = 'file ' + (ALLOWED.has(ext(file._cookieHostPath)) ? '' : 'bad');

    const name = document.createElement('code');
    name.textContent = file._cookieHostPath;

    const size = document.createElement('small');
    size.textContent = bytesText(file.size) +
      (ALLOWED.has(ext(file._cookieHostPath)) ? '' : ' · UNSUPPORTED');

    row.append(name, size);
    list.appendChild(row);
  }
}

function cookies() {
  const map = new Map();
  for (const item of (document.cookie || '').split(';')) {
    const i = item.indexOf('=');
    if (i >= 0) map.set(item.slice(0, i).trim(), item.slice(i + 1).trim());
  }
  return map;
}

function wipeCookies() {
  for (const key of cookies().keys()) {
    if (key === COUNT || key.startsWith(PREFIX)) {
      document.cookie = key + '=; Path=/; Max-Age=0; SameSite=Lax';
    }
  }
}

function base64url(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 32768) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 32768));
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function compress(bytes) {
  if (!window.CompressionStream) return { bytes, algorithm: 'none' };
  const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('gzip'));
  return {
    bytes: new Uint8Array(await new Response(stream).arrayBuffer()),
    algorithm: 'gzip'
  };
}

function readFile(file) {
  if (typeof file.text === 'function') return file.text();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('Could not read ' + file.name));
    reader.readAsText(file);
  });
}

function wireInput(id) {
  const input = $(id);
  if (!input) return;
  input.addEventListener('change', function () {
    try {
      addFiles(this.files);
    } catch (error) {
      console.error('CookieHost picker error:', error);
      status('Could not read the selected files: ' + error.message, 'error');
    }
    // Do NOT clear the value here. Some Android browsers can drop the
    // FileList while the change event is still being processed.
  });
}

wireInput('fileInput');
wireInput('dirInput');

$('clearBtn').onclick = () => {
  picked = [];
  render();
  setStats();
  status('Cleared.');
};

$('wipeBtn').onclick = () => {
  wipeCookies();
  $('baked').classList.remove('show');
  setStats();
  status('Cookies eaten. 🍪', 'ok');
};

$('drop').onclick = e => {
  if (e.target.closest('input')) return;
  $('fileInput').click();
};

$('drop').ondragover = e => {
  e.preventDefault();
  $('drop').classList.add('over');
};

$('drop').ondragleave = () => $('drop').classList.remove('over');

$('drop').ondrop = e => {
  e.preventDefault();
  $('drop').classList.remove('over');
  addFiles(e.dataTransfer && e.dataTransfer.files);
};

$('bakeBtn').onclick = async () => {
  if (!picked.length) return status('No files picked. Pick files first.', 'error');

  const bad = picked.filter(f => !ALLOWED.has(ext(f._cookieHostPath)));
  if (bad.length) {
    return status('Unsupported files:\n- ' +
      bad.map(f => f._cookieHostPath).join('\n- ') +
      '\n\nV1 is text-only.', 'error');
  }

  if (!picked.some(f => /^index\.html?$/i.test(f._cookieHostPath) ||
                         /\.html?$/i.test(f._cookieHostPath))) {
    return status('No HTML file found. Add index.html.', 'error');
  }

  const button = $('bakeBtn');
  button.disabled = true;
  $('progress').classList.add('show');

  try {
    status('Reading selected files…');

    const files = [];
    for (const file of picked) {
      files.push({
        path: file._cookieHostPath,
        content: await readFile(file)
      });
    }

    status('Compressing website…');
    const raw = new TextEncoder().encode(JSON.stringify({
      version: 1,
      compressed: 'gzip',
      files
    }));

    const compressed = await compress(raw);
    const encoded = base64url(compressed.bytes);
    const chunks = [];

    for (let i = 0; i < encoded.length; i += CHUNK) {
      chunks.push(encoded.slice(i, i + CHUNK));
    }

    status('Writing ' + chunks.length + ' cookies…');
    wipeCookies();

    for (let i = 0; i < chunks.length; i++) {
      const name = PREFIX + String(i).padStart(4, '0');
      document.cookie = name + '=' + chunks[i] +
        '; Path=/; SameSite=Lax; Max-Age=' + MAX_AGE;
    }
    document.cookie = COUNT + '=' + chunks.length +
      '; Path=/; SameSite=Lax; Max-Age=' + MAX_AGE;

    const jar = cookies();
    let stored = 0;
    for (let i = 0; i < chunks.length; i++) {
      if (jar.has(PREFIX + String(i).padStart(4, '0'))) stored++;
    }

    setStats({
      files: files.length,
      orig: raw.length,
      comp: compressed.bytes.length,
      enc: encoded.length,
      cookies: chunks.length,
      stored: stored + '/' + chunks.length
    });

    if (stored !== chunks.length) {
      wipeCookies();
      return status(
        'Cookie storage limit reached: only ' + stored + '/' + chunks.length +
        ' chunks were stored. Try a smaller site.',
        'error'
      );
    }

    $('baked').classList.add('show');
    status(
      '🍪 WEBSITE BAKED\n' +
      files.length + ' files · ' + chunks.length + ' cookies · ' +
      bytesText(encoded.length) + ' payload\nOpen /loadsite.',
      'ok'
    );
  } catch (error) {
    console.error('CookieHost bake error:', error);
    status('Baking failed: ' + (error && error.message ? error.message : error), 'error');
  } finally {
    button.disabled = false;
    $('progress').classList.remove('show');
  }
};
