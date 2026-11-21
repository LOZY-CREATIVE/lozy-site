#!/usr/bin/env node
/* Gera as partes do site que dependem da lista de vídeos (data/projects.json):
     - index.html   → carrossel da home            (<!-- projects:home -->)
     - work.html    → botões de nicho e carrossel  (<!-- projects:filters --> e <!-- projects:work -->)
     - projeto.html → cadastro de cada projeto     (// projects:data)
   Só mexe no que está entre os marcadores "start" e "end". O resto das páginas não é tocado.
   Uso:  node admin/build-site.js          (grava)
         node admin/build-site.js --check  (só confere se as páginas estão em dia) */
const fs = require('fs');
const path = require('path');

const ROOT = process.env.LOZY_ROOT ? path.resolve(process.env.LOZY_ROOT) : path.resolve(__dirname, '..'); // LOZY_ROOT só é usado em testes
const DATA_FILE = path.join(ROOT, 'data', 'projects.json');
const VIDEO_DIR = path.join(ROOT, 'assets', 'videos', 'projects');
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const esc = s => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function loadData() {
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

/* Confere a lista antes de gerar. Retorna { errors, warnings }. */
function validate(data) {
  const errors = [], warnings = [];
  const nichos = new Set((data.nichos || []).map(n => n.id));
  if (!data.nichos || !data.nichos.length) errors.push('Falta a lista de nichos.');
  const ids = new Set();
  (data.projects || []).forEach((p, i) => {
    const where = p.id ? `"${p.id}"` : `#${i + 1}`;
    if (!p.id || !SLUG_RE.test(p.id)) errors.push(`Projeto ${where}: o identificador deve ter só letras minúsculas, números e hífen.`);
    if (ids.has(p.id)) errors.push(`Identificador repetido: ${p.id}`);
    ids.add(p.id);
    if (!p.client || !String(p.client).trim()) errors.push(`Projeto ${where}: falta o nome do cliente.`);
    if (!nichos.has(p.nicho)) errors.push(`Projeto ${where}: nicho "${p.nicho}" não existe.`);
    ['.mp4', '-poster.jpg'].forEach(suf => {
      if (!fs.existsSync(path.join(VIDEO_DIR, p.id + suf))) warnings.push(`Projeto ${where}: arquivo ausente (${p.id}${suf}).`);
    });
  });
  (data.home || []).forEach(id => {
    if (!ids.has(id)) errors.push(`A home aponta para um projeto que não existe: ${id}`);
  });
  if (new Set(data.home || []).size !== (data.home || []).length) errors.push('A home tem um projeto repetido.');
  return { errors, warnings };
}

/* ---------- modelos ---------- */
function panel(p, kind, first) {
  const id = p.id;
  const showTitle = p.title && p.title.trim() && p.title.trim() !== p.client.trim();
  const titleHtml = showTitle
    ? `\n          <span class="panel-sep">|</span>\n          <span class="panel-title-swap"><span class="t-roman">${esc(p.title)}</span><span class="t-italic"><em>${esc(p.title)}</em></span></span>`
    : '';
  const v = p.posterV ? `?v=${p.posterV}` : '';
  const open = kind === 'home'
    ? `    <div class="showcase-panel${first ? ' active' : ''}" data-vid="${id}">`
    : `    <div class="showcase-panel" data-cat="${esc(p.nicho)}" data-vid="${id}">`;
  const watch = kind === 'home' ? 'Assistir vídeo completo' : 'Assistir vídeo';
  const link = kind === 'work'
    ? `\n      <a class="panel-project" href="projeto.html?id=${id}">Ver projeto completo</a>`
    : '';
  return `${open}
      <div class="panel-bg">
        <img class="panel-poster" data-vid="${id}" src="assets/videos/projects/${id}-poster.jpg${v}" alt="" onerror="this.style.display='none'">
        <video class="panel-video" data-src="assets/videos/projects/${id}.mp4" data-vid="${id}" muted loop playsinline tabindex="-1"></video>
        <div class="panel-scrim"></div>
      </div>
      <div class="panel-label">
        <div class="panel-title-wrap">
          <span class="panel-client">${esc(p.client)}</span>${titleHtml}
        </div>
        <span class="panel-watch">${watch}</span>
      </div>${link}
    </div>`;
}

function homeHtml(data) {
  const byId = new Map(data.projects.map(p => [p.id, p]));
  return data.home.map((id, i) => panel(byId.get(id), 'home', i === 0)).join('\n');
}

function workHtml(data) {
  return data.projects.map(p => panel(p, 'work', false)).join('\n');
}

function filtersHtml(data) {
  const btn = (key, label, active) =>
    `    <button type="button" class="wf-btn${active ? ' is-active' : ''}" role="tab" aria-selected="${active ? 'true' : 'false'}" data-filter="${esc(key)}">${esc(label)}</button>`;
  return [btn('all', 'Todos', true)].concat(data.nichos.map(n => btn(n.id, n.label, false))).join('\n');
}

function projectsJs(data) {
  const safe = s => JSON.stringify(s == null ? '' : s).replace(/<\//g, '<\\/');
  const items = data.projects.map(p => {
    const title = p.title && p.title.trim() ? p.title : p.client;
    return ` ${safe(p.id)}: {
  "client": ${safe(p.client)},
  "tag": ${safe(p.tag)},
  "title": ${safe(title)},
  "desc": ${safe(p.desc)},
  "meta": [["Cliente",${safe(p.client)}],["Categoria",${safe(p.tag)}],["Ano",${safe(p.year)}],["Entrega",${safe(p.delivery)}]]
 }`;
  });
  return `const PROJECTS = {\n${items.join(',\n')}\n};`;
}

/* ---------- substituição entre marcadores ---------- */
function replaceBetween(src, name, kind, body) {
  const startRe = kind === 'html'
    ? new RegExp(`(<!-- projects:${name}:start[^>]*-->\\n)[\\s\\S]*?(\\n[ \\t]*<!-- projects:${name}:end -->)`)
    : new RegExp(`(// projects:${name}:start[^\\n]*\\n)[\\s\\S]*?(\\n// projects:${name}:end)`);
  if (!startRe.test(src)) throw new Error(`Marcador "projects:${name}" não encontrado.`);
  return src.replace(startRe, (_, a, b) => a + body + b);
}

function build({ write = true } = {}) {
  const data = loadData();
  const { errors, warnings } = validate(data);
  if (errors.length) { const e = new Error(errors.join('\n')); e.errors = errors; throw e; }

  const targets = [
    ['index.html', s => replaceBetween(s, 'home', 'html', homeHtml(data))],
    ['work.html', s => replaceBetween(replaceBetween(s, 'filters', 'html', filtersHtml(data)), 'work', 'html', workHtml(data))],
    ['projeto.html', s => replaceBetween(s, 'data', 'js', projectsJs(data))]
  ];
  const changed = [];
  targets.forEach(([file, fn]) => {
    const p = path.join(ROOT, file);
    const before = fs.readFileSync(p, 'utf8');
    const after = fn(before);
    if (after !== before) {
      changed.push(file);
      if (write) fs.writeFileSync(p, after);
    }
  });
  return { changed, warnings, count: data.projects.length };
}

module.exports = { build, validate, loadData, ROOT, DATA_FILE, VIDEO_DIR, SLUG_RE };

if (require.main === module) {
  try {
    const check = process.argv.includes('--check');
    const r = build({ write: !check });
    r.warnings.forEach(w => console.warn('Aviso: ' + w));
    if (check) {
      console.log(r.changed.length ? 'Desatualizado: ' + r.changed.join(', ') : 'Páginas em dia.');
      process.exit(r.changed.length ? 1 : 0);
    }
    console.log(r.changed.length ? 'Atualizado: ' + r.changed.join(', ') : 'Nada a atualizar.');
  } catch (e) {
    console.error('Não foi possível gerar o site:\n' + e.message);
    process.exit(1);
  }
}
