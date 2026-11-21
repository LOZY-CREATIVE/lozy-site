#!/usr/bin/env node
/* Painel de vídeos da Lozy: servidor LOCAL (só responde neste computador).
   Uso:  npm run admin      (ou: node admin/server.js)
   Sem dependências externas. Precisa de Node, ffmpeg/ffprobe e git instalados. */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawn, execFile } = require('child_process');
const site = require('./build-site');

const ROOT = site.ROOT;
const DATA_FILE = site.DATA_FILE;
const VIDEO_DIR = site.VIDEO_DIR;
const TMP_DIR = path.join(__dirname, '.tmp', 'uploads');
const PUBLIC_DIR = path.join(__dirname, 'public');
const HOST = '127.0.0.1';
const PORT = Number(process.env.PORT) || 4321;
const MAX_UPLOAD = 6 * 1024 * 1024 * 1024; // 6 GB
const VIDEO_EXT = new Set(['.mp4', '.mov', '.m4v', '.mkv', '.webm', '.avi']);
const PAGES_SOFT_LIMIT_MB = 900; // o GitHub Pages recomenda sites de até ~1 GB
const PUBLISH_PATHS = ['data', 'index.html', 'work.html', 'projeto.html', 'assets/videos'];

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.mp4': 'video/mp4', '.woff2': 'font/woff2',
  '.woff': 'font/woff', '.txt': 'text/plain; charset=utf-8', '.md': 'text/plain; charset=utf-8'
};

/* ───────────────────────── utilitários ───────────────────────── */
class HttpError extends Error { constructor(code, msg) { super(msg); this.code = code; } }

function json(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(body);
}

function readBody(req, limit = 2 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = []; let n = 0;
    req.on('data', c => { n += c.length; if (n > limit) { reject(new HttpError(413, 'Conteúdo grande demais.')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}
async function readJson(req) {
  const t = await readBody(req);
  try { return t ? JSON.parse(t) : {}; } catch (e) { throw new HttpError(400, 'JSON inválido.'); }
}

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { maxBuffer: 1 << 26, ...opts }, (err, stdout, stderr) => {
      if (err) { err.stdout = stdout; err.stderr = stderr; reject(err); } else resolve({ stdout, stderr });
    });
  });
}
const git = (args, extra = {}) => run('git', args, { cwd: ROOT, ...extra });

let lockChain = Promise.resolve();
function withLock(fn) {
  const next = lockChain.then(fn, fn);
  lockChain = next.catch(() => {});
  return next;
}

const clean = (v, max) => String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, max);
const cleanLong = (v, max) => String(v == null ? '' : v).replace(/\r/g, '').trim().slice(0, max);

function readData() { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
function writeData(data) {
  const tmp = DATA_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2) + '\n');
  fs.renameSync(tmp, DATA_FILE);
  return site.build(); // mantém as páginas sempre em dia
}

function fileSize(p) { try { return fs.statSync(p).size; } catch (e) { return 0; } }
function dirSize(dir) {
  let total = 0;
  const walk = d => {
    let list; try { list = fs.readdirSync(d, { withFileTypes: true }); } catch (e) { return; }
    list.forEach(e => { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else total += fileSize(p); });
  };
  walk(dir);
  return total;
}
const mb = n => Math.round(n / 1048576 * 10) / 10;

/* ───────────────────────── ferramentas de vídeo ───────────────────────── */
async function toolsOk() {
  const out = {};
  for (const [t, flag] of [['ffmpeg', '-version'], ['ffprobe', '-version'], ['git', '--version']]) {
    try { await run(t, [flag]); out[t] = true; } catch (e) { out[t] = false; }
  }
  return out;
}

async function probe(file) {
  const { stdout } = await run('ffprobe', ['-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', file]);
  const j = JSON.parse(stdout);
  const v = (j.streams || []).find(s => s.codec_type === 'video');
  if (!v) throw new HttpError(400, 'Este arquivo não tem imagem de vídeo.');
  let w = v.width, h = v.height;
  const rot = (v.side_data_list || []).map(s => s.rotation).find(r => r !== undefined) || (v.tags && v.tags.rotate) || 0;
  if (Math.abs(Number(rot)) === 90 || Math.abs(Number(rot)) === 270) { const t = w; w = h; h = t; }
  const dur = Number((j.format && j.format.duration) || v.duration || 0);
  return {
    duration: dur, width: w, height: h, codec: v.codec_name,
    bitrate: Number((j.format && j.format.bit_rate) || 0), size: Number((j.format && j.format.size) || 0),
    hasAudio: (j.streams || []).some(s => s.codec_type === 'audio')
  };
}

/* Capa: lado maior até 1280 px. Devolve um Buffer JPEG. */
function frameJpeg(videoFile, t) {
  return new Promise((resolve, reject) => {
    const vf = "scale='if(gt(iw,ih),min(1280,iw),-2)':'if(gt(iw,ih),-2,min(1280,ih))'";
    const p = spawn('ffmpeg', ['-v', 'error', '-ss', String(Math.max(0, t)), '-i', videoFile, '-frames:v', '1', '-vf', vf, '-q:v', '3', '-f', 'mjpeg', 'pipe:1']);
    const chunks = []; let err = '';
    p.stdout.on('data', c => chunks.push(c));
    p.stderr.on('data', c => { err += c; });
    p.on('error', reject);
    p.on('close', code => {
      const buf = Buffer.concat(chunks);
      if (code === 0 && buf.length) resolve(buf); else reject(new HttpError(500, 'Não consegui extrair o quadro. ' + err.slice(0, 200)));
    });
  });
}

/* ───────────────────────── envios e processamento ───────────────────────── */
const uploads = new Map(); // id -> { dir, source, info, name }
const jobs = new Map();    // id -> { status, progress, message, uploadId }

function newId() { return crypto.randomBytes(8).toString('hex'); }
function uploadOf(id) {
  const u = uploads.get(id);
  if (!u) throw new HttpError(404, 'Envio não encontrado (talvez o painel tenha sido reiniciado). Envie o arquivo de novo.');
  return u;
}

async function handleUpload(req, res, url) {
  const name = clean(url.searchParams.get('filename') || 'video.mp4', 200);
  const ext = path.extname(name).toLowerCase();
  if (!VIDEO_EXT.has(ext)) throw new HttpError(400, 'Formato não suportado. Use MP4, MOV, M4V, MKV, WEBM ou AVI.');
  const len = Number(req.headers['content-length'] || 0);
  if (len > MAX_UPLOAD) throw new HttpError(413, 'Arquivo maior que 6 GB.');
  const id = newId();
  const dir = path.join(TMP_DIR, id);
  fs.mkdirSync(dir, { recursive: true });
  const source = path.join(dir, 'source' + ext);
  await new Promise((resolve, reject) => {
    const ws = fs.createWriteStream(source);
    let n = 0;
    req.on('data', c => { n += c.length; if (n > MAX_UPLOAD) { ws.destroy(); reject(new HttpError(413, 'Arquivo maior que 6 GB.')); req.destroy(); } });
    req.on('aborted', () => { ws.destroy(); reject(new HttpError(499, 'Envio cancelado.')); });
    req.pipe(ws);
    ws.on('finish', resolve);
    ws.on('error', reject);
    req.on('error', reject);
  }).catch(e => { fs.rmSync(dir, { recursive: true, force: true }); throw e; });
  let info;
  try { info = await probe(source); } catch (e) {
    fs.rmSync(dir, { recursive: true, force: true });
    throw e instanceof HttpError ? e : new HttpError(400, 'Não consegui ler este vídeo. O arquivo pode estar corrompido.');
  }
  uploads.set(id, { dir, source, info, name });
  json(res, 200, { uploadId: id, name, info });
}

function startProcess(uploadId, compress) {
  const u = uploadOf(uploadId);
  const jobId = newId();
  const job = { id: jobId, uploadId, status: 'running', progress: 0, message: '' };
  jobs.set(jobId, job);
  const out = path.join(u.dir, 'out.mp4');
  const partial = out + '.part';
  const isMp4 = ['.mp4', '.m4v'].includes(path.extname(u.source).toLowerCase());

  if (!compress && isMp4 && u.info.codec === 'h264') {
    fs.copyFile(u.source, out, err => {
      if (err) { job.status = 'error'; job.message = 'Falha ao copiar o arquivo.'; return; }
      u.out = out; u.outInfo = u.info; job.status = 'done'; job.progress = 1;
    });
    return job;
  }

  const vf = "scale='if(gt(iw,ih),min(1920,iw),-2)':'if(gt(iw,ih),-2,min(1920,ih))'";
  const args = ['-y', '-v', 'error', '-nostats', '-progress', 'pipe:1', '-i', u.source,
    '-vf', vf, '-c:v', 'libx264', '-preset', 'medium', '-b:v', '5M', '-maxrate', '6M', '-bufsize', '10M', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', '-f', 'mp4', partial];
  const p = spawn('ffmpeg', args);
  let buf = '', err = '';
  const dur = Math.max(0.1, u.info.duration);
  p.stdout.on('data', c => {
    buf += c;
    const lines = buf.split('\n'); buf = lines.pop();
    lines.forEach(l => {
      const m = l.match(/^out_time_(?:us|ms)=(\d+)/);
      if (m) job.progress = Math.min(0.99, Number(m[1]) / 1e6 / dur);
    });
  });
  p.stderr.on('data', c => { err += c; });
  p.on('error', e => { job.status = 'error'; job.message = 'ffmpeg não pôde ser iniciado: ' + e.message; });
  p.on('close', async code => {
    if (code !== 0) { job.status = 'error'; job.message = 'Falha ao comprimir. ' + err.slice(-300); fs.rmSync(partial, { force: true }); return; }
    try {
      fs.renameSync(partial, out);
      u.out = out; u.outInfo = await probe(out);
      job.status = 'done'; job.progress = 1;
    } catch (e) { job.status = 'error'; job.message = 'O arquivo comprimido não pôde ser lido.'; }
  });
  return job;
}

/* ───────────────────────── projetos ───────────────────────── */
function projectFromBody(b, nichos, prev) {
  const p = {
    id: prev ? prev.id : clean(b.id, 60),
    client: clean(b.client, 120),
    title: clean(b.title, 160),
    tag: clean(b.tag, 60),
    nicho: clean(b.nicho, 40),
    year: clean(b.year, 10),
    delivery: clean(b.delivery, 80),
    desc: cleanLong(b.desc, 4000),
    posterV: prev ? prev.posterV : null
  };
  if (prev && prev.hidden) p.hidden = true; // editar não muda a visibilidade (isso é feito por /hidden)
  if (!p.client) throw new HttpError(400, 'Preencha o nome do cliente.');
  if (!nichos.some(n => n.id === p.nicho)) throw new HttpError(400, 'Escolha um nicho.');
  return p;
}

function inRepoPath(rel) {
  const full = path.resolve(ROOT, rel);
  if (!full.startsWith(VIDEO_DIR + path.sep)) throw new HttpError(400, 'Caminho inválido.');
  return full;
}

async function savePoster(id, videoFile, t) {
  const buf = await frameJpeg(videoFile, t);
  fs.writeFileSync(inRepoPath(`assets/videos/projects/${id}-poster.jpg`), buf);
  return Math.floor(Date.now() / 1000);
}

function installVideo(id, uploadId) {
  const u = uploadOf(uploadId);
  if (!u.out) throw new HttpError(400, 'O vídeo ainda não foi processado.');
  fs.mkdirSync(VIDEO_DIR, { recursive: true });
  const dest = inRepoPath(`assets/videos/projects/${id}.mp4`);
  fs.copyFileSync(u.out, dest);
  return dest;
}

function discardUpload(id) {
  const u = uploads.get(id);
  if (u) { fs.rmSync(u.dir, { recursive: true, force: true }); uploads.delete(id); }
}

async function createProject(b) {
  return withLock(async () => {
    const data = readData();
    const p = projectFromBody(b, data.nichos);
    if (!site.SLUG_RE.test(p.id)) throw new HttpError(400, 'O identificador deve ter só letras minúsculas, números e hífen.');
    if (data.projects.some(x => x.id === p.id)) throw new HttpError(409, 'Já existe um projeto com este identificador.');
    const dest = installVideo(p.id, b.uploadId);
    const u = uploadOf(b.uploadId);
    const at = Number.isFinite(Number(b.posterAt)) ? Number(b.posterAt) : Math.min(1, (u.outInfo.duration || 2) / 2);
    p.posterV = await savePoster(p.id, dest, at);
    data.projects.push(p);
    if (b.home) data.home.push(p.id);
    const r = writeData(data);
    discardUpload(b.uploadId);
    return { project: p, build: r };
  });
}

async function updateProject(id, b) {
  return withLock(async () => {
    const data = readData();
    const i = data.projects.findIndex(x => x.id === id);
    if (i < 0) throw new HttpError(404, 'Projeto não encontrado.');
    const p = projectFromBody(b, data.nichos, data.projects[i]);
    const videoFile = inRepoPath(`assets/videos/projects/${id}.mp4`);
    if (b.uploadId) {
      installVideo(id, b.uploadId);
      const u = uploadOf(b.uploadId);
      const at = Number.isFinite(Number(b.posterAt)) ? Number(b.posterAt) : Math.min(1, (u.outInfo.duration || 2) / 2);
      p.posterV = await savePoster(id, videoFile, at);
      discardUpload(b.uploadId);
    } else if (Number.isFinite(Number(b.posterAt))) {
      p.posterV = await savePoster(id, videoFile, Number(b.posterAt));
    }
    data.projects[i] = p;
    const inHome = data.home.includes(id);
    if (b.home && !inHome) data.home.push(id);
    if (!b.home && inHome) data.home = data.home.filter(x => x !== id);
    const r = writeData(data);
    return { project: p, build: r };
  });
}

/* Ocultar: tira do site (home, Work e página própria) sem apagar nada. Mostrar: volta no mesmo lugar. */
async function setHidden(id, hidden) {
  return withLock(async () => {
    const data = readData();
    const p = data.projects.find(x => x.id === id);
    if (!p) throw new HttpError(404, 'Projeto não encontrado.');
    if (hidden) p.hidden = true; else delete p.hidden;
    return { project: p, build: writeData(data) };
  });
}

async function deleteProject(id, removeFiles) {
  return withLock(async () => {
    const data = readData();
    if (!data.projects.some(x => x.id === id)) throw new HttpError(404, 'Projeto não encontrado.');
    data.projects = data.projects.filter(x => x.id !== id);
    data.home = data.home.filter(x => x !== id);
    const r = writeData(data);
    if (removeFiles) {
      fs.rmSync(inRepoPath(`assets/videos/projects/${id}.mp4`), { force: true });
      fs.rmSync(inRepoPath(`assets/videos/projects/${id}-poster.jpg`), { force: true });
    }
    return { build: r };
  });
}

async function saveOrder(b) {
  return withLock(async () => {
    const data = readData();
    const ids = new Set(data.projects.map(p => p.id));
    if (Array.isArray(b.projects)) {
      const same = b.projects.length === data.projects.length && b.projects.every(id => ids.has(id)) && new Set(b.projects).size === b.projects.length;
      if (!same) throw new HttpError(400, 'A ordem enviada não confere com a lista atual. Recarregue a página.');
      const byId = new Map(data.projects.map(p => [p.id, p]));
      data.projects = b.projects.map(id => byId.get(id));
    }
    if (Array.isArray(b.home)) {
      if (!b.home.every(id => ids.has(id)) || new Set(b.home).size !== b.home.length) throw new HttpError(400, 'A lista da home tem um projeto inválido.');
      data.home = b.home;
    }
    return { build: writeData(data) };
  });
}

/* ───────────────────────── revisão e publicação ───────────────────────── */
function summarize(oldData, newData) {
  const out = { added: [], removed: [], changed: [], hidden: [], shown: [], reordered: false, homeChanged: false };
  const o = new Map((oldData.projects || []).map(p => [p.id, p]));
  const n = new Map(newData.projects.map(p => [p.id, p]));
  newData.projects.forEach(p => {
    if (!o.has(p.id)) { out.added.push(p.client + (p.title ? ' — ' + p.title : '') + (p.hidden ? ' (oculto)' : '')); return; }
    const q = o.get(p.id);
    if (!!q.hidden !== !!p.hidden) (p.hidden ? out.hidden : out.shown).push(p.client);
    const diff = ['client', 'title', 'tag', 'nicho', 'year', 'delivery', 'desc', 'posterV'].filter(k => String(q[k] || '') !== String(p[k] || ''));
    if (diff.length) out.changed.push({ name: p.client, fields: diff.map(k => ({ client: 'cliente', title: 'título', tag: 'categoria', nicho: 'nicho', year: 'ano', delivery: 'entrega', desc: 'descrição', posterV: 'capa/vídeo' }[k])) });
  });
  (oldData.projects || []).forEach(p => { if (!n.has(p.id)) out.removed.push(p.client); });
  const common = ids => ids.filter(id => o.has(id) && n.has(id));
  out.reordered = JSON.stringify(common((oldData.projects || []).map(p => p.id))) !== JSON.stringify(common(newData.projects.map(p => p.id)));
  out.homeChanged = JSON.stringify(oldData.home || []) !== JSON.stringify(newData.home || []);
  return out;
}

async function pending() {
  const branch = (await git(['rev-parse', '--abbrev-ref', 'HEAD'])).stdout.trim();
  const st = (await git(['status', '--porcelain', '-z', '-uall'])).stdout.split('\0').filter(Boolean);
  const files = [], others = [];
  for (let i = 0; i < st.length; i++) {
    const code = st[i].slice(0, 2), rel = st[i].slice(3);
    if (code[0] === 'R' || code[0] === 'C') i++; // pula o nome antigo
    const included = PUBLISH_PATHS.some(pp => rel === pp || rel.startsWith(pp + '/'));
    const kind = code.includes('D') ? 'Removido' : (code === '??' || code.includes('A')) ? 'Novo' : 'Alterado';
    const entry = { path: rel, kind, sizeMB: kind === 'Removido' ? 0 : mb(fileSize(path.join(ROOT, rel))) };
    (included ? files : others).push(entry);
  }
  let oldData = { projects: [], home: [] };
  try { oldData = JSON.parse((await git(['show', 'HEAD:data/projects.json'])).stdout); } catch (e) { /* sem versão anterior */ }
  const summary = summarize(oldData, readData());
  const addedMB = mb(files.filter(f => f.path.startsWith('assets/videos/') && f.kind !== 'Removido').reduce((s, f) => s + f.sizeMB * 1048576, 0));
  const totalMB = mb(dirSize(path.join(ROOT, 'assets', 'videos')));
  const warnings = [];
  if (branch !== 'main') warnings.push(`Você está na branch "${branch}", e não na main. O painel só publica a partir da main.`);
  if (totalMB > PAGES_SOFT_LIMIT_MB) warnings.push(`A pasta de vídeos já tem ${totalMB} MB. O GitHub Pages recomenda sites de até cerca de 1 GB (1024 MB). Vale mover os vídeos para um armazenamento externo.`);
  // o GitHub recusa arquivos acima de 100 MB
  const big = files.filter(f => f.kind !== 'Removido' && f.sizeMB > 95);
  big.forEach(f => warnings.push(`O arquivo ${f.path} tem ${f.sizeMB} MB. O GitHub recusa arquivos acima de 100 MB: use um vídeo mais curto ou comprima mais. Enquanto isso, não dá para publicar.`));
  return { branch, files, others, summary, addedMB, totalMB, warnings, canPublish: branch === 'main' && files.length > 0 && !big.length };
}

function autoMessage(s) {
  const parts = [];
  if (s.added.length) parts.push('add ' + s.added.slice(0, 3).join(', ') + (s.added.length > 3 ? ` +${s.added.length - 3}` : ''));
  if (s.changed.length) parts.push('update ' + s.changed.slice(0, 3).map(c => c.name).join(', ') + (s.changed.length > 3 ? ` +${s.changed.length - 3}` : ''));
  if (s.removed.length) parts.push('remove ' + s.removed.slice(0, 3).join(', '));
  if (s.hidden.length) parts.push('hide ' + s.hidden.slice(0, 3).join(', ') + (s.hidden.length > 3 ? ` +${s.hidden.length - 3}` : ''));
  if (s.shown.length) parts.push('show ' + s.shown.slice(0, 3).join(', ') + (s.shown.length > 3 ? ` +${s.shown.length - 3}` : ''));
  if (s.reordered) parts.push('reorder');
  if (s.homeChanged && !s.added.length) parts.push('home');
  return 'Videos: ' + (parts.join('; ') || 'update');
}

async function publish(b) {
  if (b.confirm !== true) throw new HttpError(400, 'Falta a confirmação.');
  return withLock(async () => {
    site.build(); // garante que as páginas refletem a lista
    const p = await pending();
    if (p.branch !== 'main') throw new HttpError(400, 'Você não está na main.');
    if (!p.files.length) throw new HttpError(400, 'Não há nada para publicar.');
    if (!p.canPublish) throw new HttpError(400, p.warnings.join(' ') || 'Não é possível publicar agora.');
    const message = clean(b.message, 200) || autoMessage(p.summary);
    await git(['add', '-A', '--', ...PUBLISH_PATHS]);
    await git(['commit', '-m', message]);
    const sha = (await git(['rev-parse', '--short', 'HEAD'])).stdout.trim();
    let pushOut;
    try { pushOut = await git(['push', 'origin', 'HEAD:main']); } catch (e) {
      throw new HttpError(500, 'O commit foi criado (' + sha + '), mas o envio falhou: ' + ((e.stderr || e.message || '') + '').slice(0, 400) + ' Tente novamente ou avise quem cuida do repositório.');
    }
    return { sha, message, output: ((pushOut.stderr || '') + (pushOut.stdout || '')).trim() };
  });
}

/* ───────────────────────── roteamento ───────────────────────── */
function allowedHost(h) { return h === `127.0.0.1:${PORT}` || h === `localhost:${PORT}`; }
function allowedOrigin(o) { return o === `http://127.0.0.1:${PORT}` || o === `http://localhost:${PORT}`; }

function sendFile(req, res, file, { cache } = {}) {
  let st;
  try { st = fs.statSync(file); } catch (e) { st = null; }
  if (!st || !st.isFile()) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('Não encontrado'); }
  const type = MIME[path.extname(file).toLowerCase()] || 'application/octet-stream';
  const headers = { 'Content-Type': type, 'Accept-Ranges': 'bytes', 'Cache-Control': cache || 'no-store' };
  const range = req.headers.range && req.headers.range.match(/bytes=(\d*)-(\d*)/);
  if (range) {
    let start = range[1] === '' ? st.size - Number(range[2]) : Number(range[1]);
    let end = range[1] === '' || range[2] === '' ? st.size - 1 : Math.min(Number(range[2]), st.size - 1);
    if (!(start >= 0 && start <= end)) { res.writeHead(416, { 'Content-Range': `bytes */${st.size}` }); return res.end(); }
    res.writeHead(206, { ...headers, 'Content-Range': `bytes ${start}-${end}/${st.size}`, 'Content-Length': end - start + 1 });
    return fs.createReadStream(file, { start, end }).pipe(res);
  }
  res.writeHead(200, { ...headers, 'Content-Length': st.size });
  if (req.method === 'HEAD') return res.end();
  fs.createReadStream(file).pipe(res);
}

function safeJoin(base, rel) {
  let decoded;
  try { decoded = decodeURIComponent(rel); } catch (e) { return null; }
  const full = path.resolve(base, '.' + path.sep + decoded);
  return full === base || full.startsWith(base + path.sep) ? full : null;
}

async function api(req, res, url) {
  const m = req.method, p = url.pathname;
  if (m === 'GET' && p === '/api/state') {
    const data = readData();
    return json(res, 200, { data, tools: await toolsOk(), videosMB: mb(dirSize(path.join(ROOT, 'assets', 'videos'))), warnings: site.validate(data).warnings, year: new Date().getFullYear() });
  }
  if (m === 'POST' && p === '/api/upload') return handleUpload(req, res, url);
  if (m === 'POST' && p === '/api/process') {
    const b = await readJson(req);
    const job = startProcess(String(b.uploadId || ''), b.compress !== false);
    return json(res, 200, { jobId: job.id });
  }
  let mm;
  if (m === 'GET' && (mm = p.match(/^\/api\/jobs\/([a-f0-9]+)$/))) {
    const j = jobs.get(mm[1]);
    if (!j) throw new HttpError(404, 'Tarefa não encontrada.');
    const u = uploads.get(j.uploadId);
    return json(res, 200, { status: j.status, progress: j.progress, message: j.message, info: j.status === 'done' && u ? u.outInfo : null, sizeMB: j.status === 'done' && u && u.out ? mb(fileSize(u.out)) : null });
  }
  if (m === 'GET' && p === '/api/frame') {
    const t = Number(url.searchParams.get('t') || 0);
    let file;
    if (url.searchParams.get('uploadId')) { const u = uploadOf(url.searchParams.get('uploadId')); if (!u.out) throw new HttpError(400, 'Ainda processando.'); file = u.out; }
    else { const id = url.searchParams.get('id') || ''; if (!site.SLUG_RE.test(id)) throw new HttpError(400, 'Identificador inválido.'); file = inRepoPath(`assets/videos/projects/${id}.mp4`); }
    const buf = await frameJpeg(file, t);
    res.writeHead(200, { 'Content-Type': 'image/jpeg', 'Cache-Control': 'no-store' });
    return res.end(buf);
  }
  if (m === 'GET' && p === '/api/video-info') {
    const id = url.searchParams.get('id') || '';
    if (!site.SLUG_RE.test(id)) throw new HttpError(400, 'Identificador inválido.');
    const file = inRepoPath(`assets/videos/projects/${id}.mp4`);
    if (!fs.existsSync(file)) throw new HttpError(404, 'Vídeo não encontrado.');
    const info = await probe(file);
    return json(res, 200, { info, sizeMB: mb(fileSize(file)) });
  }
  if (m === 'POST' && p === '/api/projects') return json(res, 200, await createProject(await readJson(req)));
  if (m === 'PUT' && (mm = p.match(/^\/api\/projects\/([a-z0-9-]+)\/hidden$/))) {
    const b = await readJson(req);
    return json(res, 200, await setHidden(mm[1], b.hidden === true));
  }
  if ((mm = p.match(/^\/api\/projects\/([a-z0-9-]+)$/))) {
    if (m === 'PUT') return json(res, 200, await updateProject(mm[1], await readJson(req)));
    if (m === 'DELETE') return json(res, 200, await deleteProject(mm[1], url.searchParams.get('files') !== '0'));
  }
  if (m === 'PUT' && p === '/api/order') return json(res, 200, await saveOrder(await readJson(req)));
  if ((mm = p.match(/^\/api\/uploads\/([a-f0-9]+)$/)) && m === 'DELETE') { discardUpload(mm[1]); return json(res, 200, { ok: true }); }
  if (m === 'GET' && p === '/api/review') {
    site.build();
    const r = await pending();
    r.message = autoMessage(r.summary);
    return json(res, 200, r);
  }
  if (m === 'POST' && p === '/api/publish') return json(res, 200, await publish(await readJson(req)));
  throw new HttpError(404, 'Rota não encontrada.');
}

const server = http.createServer(async (req, res) => {
  try {
    if (!allowedHost(req.headers.host || '')) throw new HttpError(403, 'Acesso negado.');
    const url = new URL(req.url, `http://${req.headers.host}`);
    const mutating = !['GET', 'HEAD'].includes(req.method);
    if (mutating) {
      if (req.headers.origin && !allowedOrigin(req.headers.origin)) throw new HttpError(403, 'Origem não permitida.');
      if (req.headers['x-lozy-admin'] !== '1') throw new HttpError(403, 'Requisição não autorizada.');
    }
    if (url.pathname.startsWith('/api/')) return await api(req, res, url);
    if (url.pathname === '/preview') { res.writeHead(302, { Location: '/preview/' }); return res.end(); }
    if (url.pathname.startsWith('/preview/')) {
      const rel = url.pathname.slice('/preview/'.length) || 'index.html';
      const full = safeJoin(ROOT, rel);
      const blocked = !full || /(^|[\\/])(\.git|node_modules)([\\/]|$)/.test(path.relative(ROOT, full)) || full.startsWith(path.join(ROOT, 'admin', '.tmp'));
      if (blocked) throw new HttpError(404, 'Não encontrado.');
      return sendFile(req, res, fs.existsSync(full) && fs.statSync(full).isDirectory() ? path.join(full, 'index.html') : full);
    }
    const rel = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
    const full = safeJoin(PUBLIC_DIR, rel);
    if (!full) throw new HttpError(404, 'Não encontrado.');
    return sendFile(req, res, full);
  } catch (e) {
    const code = e instanceof HttpError ? e.code : 500;
    if (!(e instanceof HttpError)) console.error(e);
    if (!res.headersSent) json(res, code, { error: e instanceof HttpError ? e.message : 'Erro interno: ' + (e.message || e) });
    else res.end();
  }
});

/* limpa envios antigos (mais de 1 dia) */
function sweep() {
  try {
    fs.mkdirSync(TMP_DIR, { recursive: true });
    fs.readdirSync(TMP_DIR).forEach(d => {
      const p = path.join(TMP_DIR, d);
      if (Date.now() - fs.statSync(p).mtimeMs > 86400000) fs.rmSync(p, { recursive: true, force: true });
    });
  } catch (e) { /* ignora */ }
}

module.exports = { server, PORT, HOST, ROOT };

if (require.main === module) {
  sweep();
  server.listen(PORT, HOST, () => {
    const addr = `http://127.0.0.1:${PORT}`;
    console.log(`\nPainel de vídeos da Lozy rodando em ${addr}\nPasta do site: ${ROOT}\nPara encerrar, pressione Ctrl+C.\n`);
    if (!process.argv.includes('--no-open') && process.platform === 'darwin') spawn('open', [addr], { stdio: 'ignore', detached: true }).unref();
  });
  server.on('error', e => {
    if (e.code === 'EADDRINUSE') console.error(`A porta ${PORT} já está em uso. O painel já está aberto em outra janela? Ou rode: PORT=4400 npm run admin`);
    else console.error(e);
    process.exit(1);
  });
}
