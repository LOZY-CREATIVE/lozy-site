/* Painel de vídeos da Lozy: interface. Fala só com o servidor local (admin/server.js). */
(function () {
  'use strict';
  var $ = function (s) { return document.querySelector(s); };
  var S = { data: null, tools: {}, videosMB: 0, year: new Date().getFullYear(), tab: 'work', filter: 'all', editing: null, up: null, xhr: null, slugTouched: false, posterTouched: false, posterTimer: 0, posterUrl: null, videoDuration: 0 };

  /* ───────── utilidades ───────── */
  function el(tag, attrs) {
    var n = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'text') n.textContent = attrs[k];
      else if (k === 'class') n.className = attrs[k];
      else if (k.slice(0, 2) === 'on') n.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] !== false && attrs[k] != null) n.setAttribute(k, attrs[k] === true ? '' : attrs[k]);
    });
    for (var i = 2; i < arguments.length; i++) { var c = arguments[i]; if (c != null) n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); }
    return n;
  }
  function api(method, url, body) {
    return fetch(url, { method: method, headers: Object.assign({ 'X-Lozy-Admin': '1' }, body !== undefined ? { 'Content-Type': 'application/json' } : {}), body: body !== undefined ? JSON.stringify(body) : undefined })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok) throw new Error(j.error || ('Erro ' + r.status)); return j; }); });
  }
  var toastTimer = 0;
  function toast(msg, err) {
    var t = $('#toast'); t.textContent = msg; t.className = 'toast' + (err ? ' err' : ''); t.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.hidden = true; }, err ? 7000 : 3500);
  }
  function fmtTime(s) { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
  function slugify(s) {
    return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/&/g, ' e ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60).replace(/-+$/, '');
  }
  function nichoLabel(id) { var n = S.data.nichos.filter(function (x) { return x.id === id; })[0]; return n ? n.label : id; }
  function byId(id) { return S.data.projects.filter(function (p) { return p.id === id; })[0]; }
  function posterSrc(p) { return '/preview/assets/videos/projects/' + p.id + '-poster.jpg' + (p.posterV ? '?v=' + p.posterV : ''); }
  function describeInfo(i) { return i.width + '×' + i.height + ' · ' + fmtTime(i.duration) + ' · ' + (i.codec || '').toUpperCase(); }

  /* ───────── carregar e desenhar ───────── */
  function load() {
    return api('GET', '/api/state').then(function (st) {
      S.data = st.data; S.tools = st.tools; S.videosMB = st.videosMB; S.year = st.year;
      render(); refreshPending();
    }).catch(function (e) { showNotice('Não consegui falar com o painel: ' + e.message); });
  }
  function showNotice(msg) { var n = $('#notice'); n.textContent = msg; n.hidden = !msg; }

  function render() {
    var d = S.data;
    var notes = [];
    if (!/^(127\.0\.0\.1|localhost)$/.test(location.hostname)) notes.push('Este painel só funciona no computador onde o servidor está rodando. No terminal, na pasta do site, rode: npm run admin');
    if (S.tools.ffmpeg === false || S.tools.ffprobe === false) notes.push('O ffmpeg não foi encontrado neste computador. Sem ele não dá para comprimir vídeos nem escolher capas. Instale com: brew install ffmpeg');
    if (S.tools.git === false) notes.push('O git não foi encontrado: não será possível publicar.');
    showNotice(notes.join(' '));
    var nHidden = d.projects.filter(function (p) { return p.hidden; }).length;
    var hiddenIds = {}; d.projects.forEach(function (p) { if (p.hidden) hiddenIds[p.id] = 1; });
    var homeHidden = d.home.filter(function (id) { return hiddenIds[id]; }).length;
    $('#countWork').textContent = d.projects.length + (nHidden ? ' (' + nHidden + ' oculto' + (nHidden > 1 ? 's' : '') + ')' : '');
    $('#countHome').textContent = d.home.length + (homeHidden ? ' (' + homeHidden + ' oculto' + (homeHidden > 1 ? 's' : '') + ')' : '');

    var chips = $('#chips'); chips.textContent = '';
    [{ id: 'all', label: 'Todos' }].concat(d.nichos).forEach(function (n) {
      chips.appendChild(el('button', { type: 'button', class: 'chip' + (S.filter === n.id ? ' on' : ''), text: n.label, onclick: function () { S.filter = n.id; render(); } }));
    });
    var canReorder = S.filter === 'all';
    $('#orderNote').textContent = canReorder ? 'Arraste pela alça (⠿) ou use as setas para reordenar. A ordem aqui é a do carrossel do Work.' : 'Para reordenar, escolha “Todos”. Com um nicho filtrado, a ordem fica travada.';
    var list = $('#listWork'); list.textContent = '';
    var items = d.projects.filter(function (p) { return S.filter === 'all' || p.nicho === S.filter; });
    if (!items.length) list.appendChild(el('li', { class: 'small', text: 'Nenhum vídeo neste nicho.' }));
    items.forEach(function (p, i) { list.appendChild(row(p, { reorder: canReorder, home: true, first: i === 0, last: i === items.length - 1 })); });
    if (canReorder) enableDnD(list, d.projects.map(function (p) { return p.id; }), function (ids) { saveOrder({ projects: ids }); });

    var hl = $('#listHome'); hl.textContent = '';
    if (!d.home.length) hl.appendChild(el('li', { class: 'small', text: 'A home está sem vídeos. Adicione abaixo.' }));
    d.home.forEach(function (id, i) { var p = byId(id); if (p) hl.appendChild(row(p, { reorder: true, removeHome: true, first: i === 0, last: i === d.home.length - 1 })); });
    enableDnD(hl, d.home.slice(), function (ids) { saveOrder({ home: ids }); });

    var sel = $('#homeAdd'); sel.textContent = '';
    var notIn = d.projects.filter(function (p) { return d.home.indexOf(p.id) < 0; });
    sel.appendChild(el('option', { value: '', text: notIn.length ? 'Escolha um vídeo…' : 'Todos já estão na home' }));
    notIn.forEach(function (p) { sel.appendChild(el('option', { value: p.id, text: p.client + (p.title ? ' — ' + p.title : '') + (p.hidden ? ' (oculto)' : '') })); });
    $('#btnHomeAdd').disabled = !notIn.length;

    var tags = {}; d.projects.forEach(function (p) { if (p.tag) tags[p.tag] = 1; });
    var dl = $('#tagList'); dl.textContent = ''; Object.keys(tags).forEach(function (t) { dl.appendChild(el('option', { value: t })); });

    var tn = $('#fNicho'); tn.textContent = ''; d.nichos.forEach(function (n) { tn.appendChild(el('option', { value: n.id, text: n.label })); });
    $('#foot').textContent = 'Vídeos no site: ' + S.videosMB + ' MB. O GitHub Pages recomenda sites de até cerca de 1 GB (1024 MB).';
  }

  function row(p, o) {
    var inHome = S.data.home.indexOf(p.id) >= 0;
    var li = el('li', { class: 'row' + (o.reorder ? '' : ' locked') + (p.hidden ? ' is-hidden' : ''), 'data-id': p.id, draggable: o.reorder ? 'true' : false },
      el('span', { class: 'handle', title: 'Arraste para reordenar', text: '⠿' }),
      el('img', { class: 'thumb', src: posterSrc(p), alt: '', loading: 'lazy' }),
      el('div', { class: 'info' },
        el('strong', { text: p.client }, p.title ? '' : null),
        el('span', { class: 'meta', text: [p.title, nichoLabel(p.nicho), p.tag, p.year].filter(Boolean).join(' · ') }),
        (o.home && inHome && !p.hidden) ? el('span', { class: 'tag', text: 'Home' }) : null,
        p.hidden ? el('span', { class: 'tag off', text: 'Oculto', title: 'Não aparece no site' }) : null
      ),
      el('div', { class: 'rowact' },
        o.reorder ? el('button', { type: 'button', class: 'mini', title: 'Subir', text: '↑', disabled: o.first, onclick: function () { move(p.id, -1, o.home ? 'projects' : 'home'); } }) : null,
        o.reorder ? el('button', { type: 'button', class: 'mini', title: 'Descer', text: '↓', disabled: o.last, onclick: function () { move(p.id, 1, o.home ? 'projects' : 'home'); } }) : null,
        o.removeHome ? el('button', { type: 'button', class: 'mini', text: 'Tirar da home', onclick: function () { saveOrder({ home: S.data.home.filter(function (x) { return x !== p.id; }) }); } }) : null,
        p.hidden ? null : el('a', { class: 'mini', href: '/preview/projeto.html?id=' + p.id, target: '_blank', rel: 'noopener', text: 'Ver', style: 'text-decoration:none' }),
        o.home ? el('button', { type: 'button', class: 'mini', title: p.hidden ? 'Voltar a aparecer no site' : 'Tirar do site sem apagar', text: p.hidden ? 'Mostrar' : 'Ocultar', onclick: function () { toggleHidden(p); } }) : null,
        el('button', { type: 'button', class: 'mini', text: 'Editar', onclick: function () { openEdit(p.id); } }),
        o.home ? el('button', { type: 'button', class: 'mini del', text: 'Remover', onclick: function () { openDelete(p.id); } }) : null
      ));
    return li;
  }

  /* ───────── ocultar / mostrar ───────── */
  function toggleHidden(p) {
    var hide = !p.hidden;
    api('PUT', '/api/projects/' + p.id + '/hidden', { hidden: hide }).then(function () {
      toast(hide ? '“' + p.client + '” ocultado. Falta revisar e publicar.' : '“' + p.client + '” volta a aparecer. Falta revisar e publicar.');
      return load();
    }).catch(function (e) { toast(e.message, true); });
  }

  /* ───────── ordem ───────── */
  function move(id, dir, key) {
    var ids = (key === 'home' ? S.data.home : S.data.projects.map(function (p) { return p.id; })).slice();
    var i = ids.indexOf(id), j = i + dir;
    if (i < 0 || j < 0 || j >= ids.length) return;
    ids.splice(i, 1); ids.splice(j, 0, id);
    var o = {}; o[key] = ids; saveOrder(o);
  }
  function saveOrder(o) {
    return api('PUT', '/api/order', o).then(load).then(function () { toast('Ordem salva.'); }).catch(function (e) { toast(e.message, true); load(); });
  }
  function enableDnD(ul, ids, onReorder) {
    var dragId = null;
    function clearMarks() { ul.querySelectorAll('.row').forEach(function (r) { r.classList.remove('drag-over-top', 'drag-over-bottom'); }); }
    ul.querySelectorAll('li.row[draggable="true"]').forEach(function (li) {
      li.addEventListener('dragstart', function (e) { dragId = li.getAttribute('data-id'); li.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', dragId); });
      li.addEventListener('dragend', function () { li.classList.remove('dragging'); clearMarks(); dragId = null; });
      li.addEventListener('dragover', function (e) {
        if (!dragId) return; e.preventDefault(); clearMarks();
        var r = li.getBoundingClientRect(); li.classList.add(e.clientY > r.top + r.height / 2 ? 'drag-over-bottom' : 'drag-over-top');
      });
      li.addEventListener('drop', function (e) {
        if (!dragId) return; e.preventDefault();
        var target = li.getAttribute('data-id'); var r = li.getBoundingClientRect(); var after = e.clientY > r.top + r.height / 2;
        clearMarks();
        if (target === dragId) return;
        var out = ids.filter(function (x) { return x !== dragId; });
        var t = out.indexOf(target); out.splice(after ? t + 1 : t, 0, dragId);
        if (JSON.stringify(out) !== JSON.stringify(ids)) onReorder(out);
      });
    });
  }

  /* ───────── abas ───────── */
  document.querySelectorAll('.tab').forEach(function (b) {
    b.addEventListener('click', function () {
      S.tab = b.getAttribute('data-tab');
      document.querySelectorAll('.tab').forEach(function (x) { x.classList.toggle('on', x === b); });
      $('#tabWork').hidden = S.tab !== 'work'; $('#tabHome').hidden = S.tab !== 'home';
    });
  });
  $('#btnHomeAdd').addEventListener('click', function () {
    var id = $('#homeAdd').value; if (!id) return;
    saveOrder({ home: S.data.home.concat([id]) });
  });

  /* ───────── formulário de vídeo ───────── */
  var dlg = $('#dlgProject');
  function field(id) { return $('#' + id); }
  function resetForm() {
    ['fClient', 'fTitle', 'fTag', 'fDelivery', 'fDesc', 'fSlug'].forEach(function (i) { field(i).value = ''; });
    field('fYear').value = String(S.year); field('fHome').checked = false; field('optCompress').checked = true;
    field('fNicho').value = S.filter !== 'all' ? S.filter : (S.data.nichos[0] && S.data.nichos[0].id);
    S.up = null; S.slugTouched = false; S.posterTouched = false; S.videoDuration = 0;
    $('#prog').hidden = true; $('#posterBlock').hidden = true; $('#currentVideo').hidden = true; $('#formError').hidden = true;
    $('#dzText').innerHTML = '<strong>Arraste o vídeo aqui</strong> ou clique para escolher';
    if (S.posterUrl) { URL.revokeObjectURL(S.posterUrl); S.posterUrl = null; }
    $('#posterPreview').removeAttribute('src');
  }
  function openNew() {
    resetForm(); S.editing = null;
    $('#dlgTitle').textContent = 'Novo vídeo'; $('#slugRow').hidden = false; field('fSlug').readOnly = false;
    updateSave(); dlg.showModal();
  }
  function openEdit(id) {
    var p = byId(id); if (!p) return;
    resetForm(); S.editing = id;
    $('#dlgTitle').textContent = 'Editar vídeo'; $('#slugRow').hidden = false; field('fSlug').value = p.id; field('fSlug').readOnly = true;
    field('fClient').value = p.client; field('fTitle').value = p.title || ''; field('fTag').value = p.tag || ''; field('fNicho').value = p.nicho;
    field('fYear').value = p.year || ''; field('fDelivery').value = p.delivery || ''; field('fDesc').value = p.desc || '';
    field('fHome').checked = S.data.home.indexOf(id) >= 0;
    $('#currentPoster').src = posterSrc(p); $('#currentVideo').hidden = false; $('#currentInfo').textContent = 'Vídeo atual. Para trocar, envie outro arquivo abaixo.';
    $('#dzText').innerHTML = '<strong>Trocar o vídeo (opcional)</strong>: arraste um arquivo ou clique';
    api('GET', '/api/video-info?id=' + encodeURIComponent(id)).then(function (r) {
      S.videoDuration = r.info.duration; $('#currentInfo').textContent = 'Vídeo atual: ' + describeInfo(r.info) + ' · ' + r.sizeMB + ' MB';
      setupPoster(r.info.duration, null, p);
    }).catch(function () { /* ffmpeg ausente: segue sem capa */ });
    updateSave(); dlg.showModal();
  }
  $('#btnNew').addEventListener('click', openNew);

  field('fClient').addEventListener('input', autoSlug); field('fTitle').addEventListener('input', autoSlug);
  field('fSlug').addEventListener('input', function () { S.slugTouched = true; field('fSlug').value = slugify(field('fSlug').value); updateSave(); });
  function autoSlug() { if (!S.editing && !S.slugTouched) field('fSlug').value = slugify(field('fClient').value + ' ' + field('fTitle').value); updateSave(); }
  ['fClient', 'fNicho'].forEach(function (i) { field(i).addEventListener('input', updateSave); field(i).addEventListener('change', updateSave); });

  function updateSave() {
    var ok = field('fClient').value.trim() && field('fNicho').value;
    if (!S.editing) ok = ok && S.up && S.up.ready && field('fSlug').value;
    if (S.up && !S.up.ready) ok = false;
    $('#btnSave').disabled = !ok;
  }

  /* envio do arquivo */
  var dz = $('#dz'), fi = $('#fileInput');
  dz.addEventListener('click', function () { fi.click(); });
  dz.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fi.click(); } });
  dz.addEventListener('dragover', function (e) { e.preventDefault(); dz.classList.add('over'); });
  dz.addEventListener('dragleave', function () { dz.classList.remove('over'); });
  dz.addEventListener('drop', function (e) { e.preventDefault(); dz.classList.remove('over'); if (e.dataTransfer.files[0]) startUpload(e.dataTransfer.files[0]); });
  fi.addEventListener('change', function () { if (fi.files[0]) startUpload(fi.files[0]); fi.value = ''; });

  function setProg(frac, text) { $('#prog').hidden = false; $('#progBar').style.width = Math.round(frac * 100) + '%'; $('#progText').textContent = text; }
  function dropUpload() {
    if (S.xhr) { try { S.xhr.abort(); } catch (e) { /* já terminou */ } S.xhr = null; }
    if (S.up && S.up.uploadId) api('DELETE', '/api/uploads/' + S.up.uploadId).catch(function () {});
    S.up = null;
  }
  function startUpload(file) {
    dropUpload();
    var tk = { ready: false, token: Math.random() }; S.up = tk; updateSave();
    $('#formError').hidden = true; $('#posterBlock').hidden = true;
    setProg(0, 'Enviando ' + file.name + '…');
    var x = new XMLHttpRequest(); S.xhr = x;
    x.open('POST', '/api/upload?filename=' + encodeURIComponent(file.name));
    x.setRequestHeader('X-Lozy-Admin', '1');
    x.upload.onprogress = function (e) { if (e.lengthComputable) setProg(e.loaded / e.total * 0.5, 'Enviando… ' + Math.round(e.loaded / e.total * 100) + '%'); };
    x.onerror = function () { failUpload('Falha no envio. O painel ainda está rodando?'); };
    x.onabort = function () { /* cancelado */ };
    x.onload = function () {
      S.xhr = null; var j = {}; try { j = JSON.parse(x.responseText); } catch (e) { /* vazio */ }
      if (x.status !== 200) return failUpload(j.error || ('Erro ' + x.status));
      if (S.up !== tk) { api('DELETE', '/api/uploads/' + j.uploadId).catch(function () {}); return; }
      tk.uploadId = j.uploadId; tk.info = j.info;
      var compress = field('optCompress').checked;
      setProg(0.5, 'Processando… ' + describeInfo(j.info));
      api('POST', '/api/process', { uploadId: j.uploadId, compress: compress }).then(function (r) { poll(r.jobId, tk); }).catch(function (e) { failUpload(e.message); });
    };
    x.send(file);
  }
  function failUpload(msg) {
    S.xhr = null; S.up = null; $('#prog').hidden = true; updateSave();
    var e = $('#formError'); e.textContent = msg; e.hidden = false;
  }
  function poll(jobId, tk) {
    if (S.up !== tk) return;
    api('GET', '/api/jobs/' + jobId).then(function (j) {
      if (S.up !== tk) return;
      if (j.status === 'running') { setProg(0.5 + j.progress * 0.5, 'Comprimindo para a web… ' + Math.round(j.progress * 100) + '%'); return setTimeout(function () { poll(jobId, tk); }, 700); }
      if (j.status === 'error') return failUpload(j.message || 'Falha ao processar.');
      tk.ready = true; tk.duration = j.info.duration;
      setProg(1, 'Pronto: ' + describeInfo(j.info) + ' · ' + j.sizeMB + ' MB' + (j.sizeMB > 95 ? ' ⚠ Acima de 95 MB: o GitHub recusa arquivos acima de 100 MB. Use um vídeo mais curto.' : ''));
      setupPoster(j.info.duration, tk.uploadId, null); updateSave();
    }).catch(function (e) { failUpload(e.message); });
  }

  /* capa */
  var range = $('#posterRange');
  function setupPoster(duration, uploadId, project) {
    S.videoDuration = duration;
    range.max = Math.max(0.1, duration - 0.1).toFixed(1); range.value = Math.min(1, duration / 2).toFixed(1);
    $('#posterTime').textContent = fmtTime(range.value); S.posterTouched = false;
    $('#posterBlock').hidden = false;
    if (uploadId || !project) loadFrame(); else $('#posterPreview').src = posterSrc(project);
  }
  function frameUrl() {
    var base = S.up && S.up.ready ? '/api/frame?uploadId=' + S.up.uploadId : '/api/frame?id=' + encodeURIComponent(S.editing);
    return base + '&t=' + range.value + '&_=' + Date.now();
  }
  function loadFrame() {
    fetch(frameUrl()).then(function (r) { if (!r.ok) throw new Error('frame'); return r.blob(); }).then(function (b) {
      if (S.posterUrl) URL.revokeObjectURL(S.posterUrl);
      S.posterUrl = URL.createObjectURL(b); $('#posterPreview').src = S.posterUrl;
    }).catch(function () { toast('Não consegui carregar este quadro.', true); });
  }
  range.addEventListener('input', function () { $('#posterTime').textContent = fmtTime(range.value); S.posterTouched = true; clearTimeout(S.posterTimer); S.posterTimer = setTimeout(loadFrame, 250); });

  /* salvar / cancelar */
  $('#btnCancel').addEventListener('click', function () { dropUpload(); dlg.close(); });
  dlg.addEventListener('cancel', function () { dropUpload(); });
  $('#btnSave').addEventListener('click', function () {
    var body = {
      client: field('fClient').value, title: field('fTitle').value, tag: field('fTag').value, nicho: field('fNicho').value,
      year: field('fYear').value, delivery: field('fDelivery').value, desc: field('fDesc').value, home: field('fHome').checked
    };
    var hasNew = S.up && S.up.ready;
    if (hasNew) { body.uploadId = S.up.uploadId; body.posterAt = Number(range.value); }
    else if (S.editing && S.posterTouched) body.posterAt = Number(range.value);
    var req;
    if (S.editing) req = api('PUT', '/api/projects/' + S.editing, body);
    else { body.id = field('fSlug').value; req = api('POST', '/api/projects', body); }
    $('#btnSave').disabled = true; $('#formError').hidden = true;
    req.then(function () {
      S.up = null; dlg.close(); toast('Salvo. Falta revisar e publicar.'); return load();
    }).catch(function (e) { var er = $('#formError'); er.textContent = e.message; er.hidden = false; updateSave(); });
  });

  /* ───────── remover ───────── */
  var dd = $('#dlgDelete'), delId = null;
  function openDelete(id) {
    delId = id; var p = byId(id);
    $('#delText').textContent = 'Você vai remover “' + p.client + (p.title ? ' — ' + p.title : '') + '” do site (Work e Home).';
    $('#delFiles').checked = true; dd.showModal();
  }
  $('#delCancel').addEventListener('click', function () { dd.close(); });
  $('#delOk').addEventListener('click', function () {
    api('DELETE', '/api/projects/' + delId + '?files=' + ($('#delFiles').checked ? '1' : '0')).then(function () { dd.close(); toast('Removido. Falta revisar e publicar.'); return load(); }).catch(function (e) { toast(e.message, true); });
  });

  /* ───────── revisar e publicar ───────── */
  var rd = $('#dlgReview');
  function refreshPending() {
    api('GET', '/api/review').then(function (r) {
      var b = $('#pendingBadge'); b.hidden = !r.files.length; b.textContent = r.files.length;
    }).catch(function () { /* sem git */ });
  }
  function section(title, items) {
    var box = el('div', {}, el('h3', { text: title }));
    var ul = el('ul'); items.forEach(function (t) { ul.appendChild(el('li', { text: t })); }); box.appendChild(ul); return box;
  }
  $('#btnReview').addEventListener('click', function () {
    var body = $('#reviewBody'); body.textContent = 'Carregando…';
    $('#pubError').hidden = true; $('#pubConfirm').checked = false; $('#pubGo').disabled = true; $('#pubGo').hidden = false; $('#publishBlock').hidden = true;
    rd.showModal();
    api('GET', '/api/review').then(function (r) {
      body.textContent = '';
      r.warnings.forEach(function (w) { body.appendChild(el('div', { class: 'warn', text: w })); });
      if (!r.files.length) {
        body.appendChild(el('div', { class: 'okbox', text: 'Nada para publicar. O que está no painel já está no site.' }));
      } else {
        var s = r.summary;
        if (s.added.length) body.appendChild(section('Novos vídeos', s.added));
        if (s.changed.length) body.appendChild(section('Alterados', s.changed.map(function (c) { return c.name + ' (' + c.fields.join(', ') + ')'; })));
        if (s.removed.length) body.appendChild(section('Removidos', s.removed));
        if (s.hidden && s.hidden.length) body.appendChild(section('Ocultados (saem do site, ficam guardados)', s.hidden));
        if (s.shown && s.shown.length) body.appendChild(section('Voltam a aparecer no site', s.shown));
        if (s.reordered) body.appendChild(section('Ordem', ['A ordem do Work foi alterada.']));
        if (s.homeChanged) body.appendChild(section('Home', ['Os destaques da home foram alterados.']));
        var t = el('table');
        r.files.forEach(function (f) { t.appendChild(el('tr', {}, el('td', { text: f.kind }), el('td', { text: f.path }), el('td', { text: f.sizeMB ? f.sizeMB + ' MB' : '' }))); });
        body.appendChild(el('h3', { text: 'Arquivos que serão publicados (' + r.files.length + ')' })); body.appendChild(t);
        body.appendChild(el('p', { class: 'small', text: 'Vídeos novos: ' + r.addedMB + ' MB · total de vídeos no site depois: ' + r.totalMB + ' MB' }));
      }
      if (r.others.length) body.appendChild(section('Mudanças fora do painel (NÃO serão publicadas agora)', r.others.slice(0, 12).map(function (f) { return f.path; })));
      $('#pubMessage').value = r.message;
      $('#publishBlock').hidden = !r.files.length; rd.dataset.can = r.canPublish ? '1' : '';
    }).catch(function (e) { body.textContent = ''; body.appendChild(el('div', { class: 'warn', text: e.message })); });
  });
  $('#pubConfirm').addEventListener('change', function () { $('#pubGo').disabled = !($('#pubConfirm').checked && rd.dataset.can === '1'); });
  $('#pubClose').addEventListener('click', function () { rd.close(); });
  $('#pubGo').addEventListener('click', function () {
    var go = $('#pubGo'); go.disabled = true; go.textContent = 'Publicando…'; $('#pubError').hidden = true;
    api('POST', '/api/publish', { confirm: true, message: $('#pubMessage').value }).then(function (r) {
      var body = $('#reviewBody'); body.textContent = '';
      body.appendChild(el('div', { class: 'okbox', text: 'Publicado! (registro ' + r.sha + ': ' + r.message + '). O site leva de 1 a 3 minutos para atualizar; depois use recarregar forçado no navegador.' }));
      $('#publishBlock').hidden = true; $('#pubGo').hidden = true; refreshPending(); load();
    }).catch(function (e) { var er = $('#pubError'); er.textContent = e.message; er.hidden = false; go.disabled = false; })
      .then(function () { go.textContent = 'Publicar no site'; });
  });

  load();
})();
