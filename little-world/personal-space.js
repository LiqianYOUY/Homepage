import {raiseDialog, topDialog, isTopDialog, consumeDialogEscape, flattenDialogRoot} from './dialog-stack.js';
/** Personal space windows. Import personal-space.css once in the host page.
 * State patches: {notes}, {papers}, {musicFavorites}. Audio blobs stay in IDB.
 * onMusicState({playing, source, title, status}) only reports local playback as
 * playing; the cross-origin Spotify player's state is deliberately unknown.
 */
const SPOTIFY = 'https://open.spotify.com/track/6RaJbbhKDOuBGQhbZCubCW';
const SPOTIFY_EMBED = 'https://open.spotify.com/embed/track/6RaJbbhKDOuBGQhbZCubCW';
const YOUTUBE = 'https://www.youtube.com/watch?v=3ZIFNKYQj7g';
const COLORS = ['cream', 'sage', 'rose', 'blue', 'sand'];
const COLOR_NAMES = ['奶油白', '鼠尾草绿', '淡玫瑰', '雾蓝', '浅麦色'];
const uid = () => globalThis.crypto?.randomUUID?.() || `personal-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const clamp = (n, low, high) => Math.min(Math.max(Number(n) || 0, low), Math.max(low, high));

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value == null) continue;
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (key.startsWith('on') && typeof value === 'function') node.addEventListener(key.slice(2), value);
    else if (key in node && !key.startsWith('aria-') && key !== 'role') node[key] = value;
    else node.setAttribute(key, value);
  }
  for (const child of children.flat()) {
    if (child != null) node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}
const button = (label, action, kind = '') => el('button', {type: 'button', class: `ps-button ${kind}`, text: label, onclick: action});
const link = (label, url, kind = '') => el('a', {class: `ps-button ${kind}`, text: label, href: url, target: '_blank', rel: 'noopener noreferrer'});

const BUILTIN_BOOKS = new Set(['flatland.html', 'time-machine.html', 'origin-of-species.html', 'short-history-of-astronomy.html']);
const isLoopback = host => ['localhost', '127.0.0.1', '[::1]'].includes(host.toLowerCase());

/** Keep book paths portable across local ports and hosting; never proxy publishers. */
export function validatePersonalURL(raw, {paper = false} = {}) {
  const value = String(raw || '').trim();
  if (!value || /[\u0000-\u0020]/.test(value)) return null;
  try {
    const url = new URL(value, document.baseURI);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return null;
    const absolute = /^https?:\/\//i.test(value);
    if (!paper) return absolute ? url.href : null;
    let decodedPath = url.pathname;
    for (let pass = 0; pass < 3; pass++) {
      const next = decodeURIComponent(decodedPath);
      if (next === decodedPath) break;
      decodedPath = next;
    }
    if (decodedPath.split(/[\\/]/).some(segment => segment === '.' || segment === '..')) return null;
    const base = new URL('.', document.baseURI);
    const sameOrigin = url.origin === location.origin;
    // Migrate only book/paper paths on loopback hosts, never arbitrary remote URLs.
    const localMatch = isLoopback(url.hostname) && url.pathname.match(/\/(books|papers)\/(.+)$/);
    if (localMatch) return `${localMatch[1]}/${localMatch[2]}${url.search}${url.hash}`;
    if (sameOrigin) {
      for (const folder of ['papers/', 'books/']) {
        const prefix = new URL(folder, base).pathname;
        if (url.pathname.startsWith(prefix)) return `${folder}${url.pathname.slice(prefix.length)}${url.search}${url.hash}`;
        if (url.pathname.startsWith('/' + folder)) return `${url.pathname.slice(1)}${url.search}${url.hash}`;
      }
    }
    if (absolute) return url.href;
  } catch { /* Display validation feedback at the form. */ }
  return null;
}

export function createPersonalSpace({getState = () => ({}), setState = () => {}, onNotesChange = () => {}, onMusicState = () => {}, toast = () => {}} = {}) {
  const root = el('div', {class: 'ps-root', 'data-personal-space': '', 'aria-label': '我的个人空间'});
  flattenDialogRoot(root);
  document.body.append(root);
  const windows = new Map();
  const cleanups = new Set();
  let disposed = false, noteTimer = 0, saveNotes = null, dbPromise = null;
  const sessionTracks = new Map();
  const state = () => getState() || {};
  const notify = message => toast(message);
  function patch(value) {
    try {
      const result = setState(value);
      if (result?.catch) result.catch(() => notify('保存没有完成，请检查浏览器的本地存储空间。'));
    } catch { notify('保存没有完成，请检查浏览器的本地存储空间。'); }
  }
  function libraryPapers() {
    const current = Array.isArray(state().papers) ? state().papers : [];
    let changed = false;
    const papers = current.map(item => {
      const paper = item && typeof item === 'object' ? item : {title: String(item || ''), url: ''};
      const id = String(paper.id || uid());
      const safe = validatePersonalURL(paper.url, {paper: true});
      const url = safe || String(paper.url || '');
      if (id !== paper.id || url !== paper.url || item !== paper) changed = true;
      return {...paper, id, title: String(paper.title || ''), url};
    });
    if (changed) patch({papers});
    return papers;
  }
  // Repair stored local addresses without replacing user-added books or metadata.
  libraryPapers();
  function reportMusic(playing, source, title, status) { onMusicState({playing, source, title, status}); }
  function flushNotes() { clearTimeout(noteTimer); if (saveNotes) saveNotes(); }
  function focusWindow(win) { raiseDialog(win.panel); }

  function drag(handle, read, move, finish = () => {}) {
    let pointer = null, start;
    function down(event) {
      if (event.button !== 0 || event.target.closest('button, input, textarea, a, select')) return;
      pointer = event.pointerId;
      start = {...read(), clientX: event.clientX, clientY: event.clientY};
      handle.setPointerCapture(pointer);
      handle.classList.add('is-dragging');
      event.preventDefault();
    }
    function moving(event) {
      if (pointer !== event.pointerId) return;
      move(start.x + event.clientX - start.clientX, start.y + event.clientY - start.clientY);
    }
    function end(event) {
      if (event.pointerId !== pointer) return;
      if (handle.hasPointerCapture(pointer)) handle.releasePointerCapture(pointer);
      pointer = null;
      handle.classList.remove('is-dragging');
      finish();
    }
    handle.addEventListener('pointerdown', down);
    handle.addEventListener('pointermove', moving);
    handle.addEventListener('pointerup', end);
    handle.addEventListener('pointercancel', end);
  }

  function makeWindow(key, title, subtitle, type = '', onClose = () => {}) {
    if (disposed) return null;
    if (windows.has(key)) { const old = windows.get(key); focusWindow(old); old.panel.focus(); return old; }
    const previousFocus = document.activeElement;
    const titleId = `ps-title-${uid()}`;
    const panel = el('section', {class: `ps-window ${type}`, role: 'dialog', 'aria-modal': 'false', 'aria-labelledby': titleId, tabIndex: -1});
    const heading = el('div', {class: 'ps-window-heading'}, el('h2', {id: titleId, text: title}), el('p', {text: subtitle}));
    const header = el('header', {class: 'ps-titlebar'}, heading);
    const content = el('div', {class: 'ps-content'});
    const tools = el('div', {class: 'ps-window-tools'});
    let expanded = false, savedRect;
    const win = {panel, content, close, cleanup: []};
    const zoom = button('↗', () => {
      if (!expanded) {
        const rect = panel.getBoundingClientRect();
        savedRect = {left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px`};
        panel.classList.add('is-expanded');
        panel.style.left = '12px'; panel.style.top = '12px'; panel.style.width = 'calc(100vw - 24px)'; panel.style.height = 'calc(100dvh - 24px)';
      } else { panel.classList.remove('is-expanded'); Object.assign(panel.style, savedRect); }
      expanded = !expanded;
      zoom.textContent = expanded ? '↙' : '↗';
      zoom.setAttribute('aria-label', expanded ? '还原窗口大小' : '放大窗口');
      focusWindow(win);
    }, 'ps-icon-button');
    zoom.setAttribute('aria-label', '放大窗口');
    const closeButton = button('×', close, 'ps-icon-button');
    closeButton.setAttribute('aria-label', `关闭${title}`);
    tools.append(zoom, closeButton); header.append(tools); panel.append(header, content);
    const offset = windows.size * 23;
    panel.style.left = `${Math.max(12, Math.min(72 + offset, innerWidth - 440))}px`;
    panel.style.top = `${Math.max(12, Math.min(72 + offset, innerHeight - 240))}px`;
    panel.addEventListener('pointerdown', () => focusWindow(win));
    panel.addEventListener('focusin', () => focusWindow(win));
    // Inputs and dialog shortcuts never bubble into the host's 3D controls.
    panel.addEventListener('keydown', event => event.stopPropagation());
    panel.addEventListener('keyup', event => event.stopPropagation());
    panel.addEventListener('wheel', event => event.stopPropagation());
    root.append(panel); windows.set(key, win); focusWindow(win);
    panel.style.top = `${clamp(panel.offsetTop, 12, innerHeight - panel.offsetHeight - 12)}px`;
    drag(header, () => ({x: panel.offsetLeft, y: panel.offsetTop}), (x, y) => {
      if (expanded) return;
      panel.style.left = `${clamp(x, 8, innerWidth - Math.min(panel.offsetWidth, innerWidth) - 8)}px`;
      panel.style.top = `${clamp(y, 8, innerHeight - 72)}px`;
    });
    requestAnimationFrame(() => { if (panel.isConnected) panel.focus(); });
    function close() {
      if (!windows.has(key)) return;
      flushNotes();
      for (const fn of win.cleanup) fn();
      onClose(); panel.remove(); windows.delete(key);
      if (previousFocus?.isConnected && typeof previousFocus.focus === 'function') previousFocus.focus({preventScroll: true});
    }
    return win;
  }

  function openNotes() {
    if (windows.has('notes')) { const existing = windows.get('notes'); focusWindow(existing); existing.panel.focus(); return; }
    const win = makeWindow('notes', '桌边便利贴', '随手写下想法，留给未来的自己', 'ps-notes-window', () => { saveNotes = null; });
    if (!win) return;
    let notes = (Array.isArray(state().notes) ? state().notes : []).map((n, i) => ({id: String(n.id || uid()), text: String(n.text ?? ''), color: COLORS.includes(n.color) ? n.color : 'cream', x: clamp(n.x ?? 24 + (i % 2) * 230, 0, 3000), y: clamp(n.y ?? 24 + Math.floor(i / 2) * 225, 0, 4000), updatedAt: n.updatedAt || Date.now()}));
    const board = el('div', {class: 'ps-notes-board', 'aria-label': '可拖动的便利贴'});
    const scroller = el('div', {class: 'ps-notes-scroller'}, board);
    const saved = el('span', {class: 'ps-save-status', text: '自动保存在这台设备', 'aria-live': 'polite'});
    saveNotes = () => { const copy = notes.map(n => ({...n})); patch({notes: copy}); onNotesChange(copy); saved.textContent = '已保存到这台设备'; };
    const changed = (immediate = false) => {
      saved.textContent = '正在保存…'; clearTimeout(noteTimer);
      if (immediate) saveNotes?.(); else noteTimer = setTimeout(() => saveNotes?.(), 240);
    };
    const add = button('＋ 新建便签', () => {
      notes.push({id: uid(), text: '', color: COLORS[notes.length % COLORS.length], x: 24 + (notes.length % 2) * 230, y: 24 + Math.floor(notes.length / 2) * 225, updatedAt: Date.now()});
      render(); changed(true); board.lastElementChild?.querySelector('textarea')?.focus();
    }, 'ps-primary');
    win.content.append(el('div', {class: 'ps-toolbar'}, add, saved), scroller);
    function render() {
      board.replaceChildren();
      board.style.width = `${Math.max(510, ...notes.map(n => n.x + 240))}px`;
      board.style.height = `${Math.max(360, ...notes.map(n => n.y + 245))}px`;
      if (!notes.length) board.append(el('div', {class: 'ps-empty'}, el('strong', {text: '这里还很安静'}), el('p', {text: '新建一张便签。拖动便签顶部，可以把想法摆在顺手的位置。'})));
      notes.forEach((note, index) => {
        const card = el('article', {class: `ps-note ps-note-${note.color}`});
        card.style.left = `${note.x}px`; card.style.top = `${note.y}px`;
        const handle = el('div', {class: 'ps-note-handle'}, el('span', {text: `便签 ${index + 1}`}));
        const remove = button('×', () => { notes = notes.filter(n => n.id !== note.id); render(); changed(true); }, 'ps-note-delete');
        remove.setAttribute('aria-label', `删除便签 ${index + 1}`); handle.append(remove);
        const text = el('textarea', {value: note.text, placeholder: '今天想到的事…', 'aria-label': `便签 ${index + 1} 内容`, spellcheck: false});
        text.addEventListener('input', () => { note.text = text.value; note.updatedAt = Date.now(); changed(); });
        text.addEventListener('blur', () => changed(true));
        const palette = el('div', {class: 'ps-note-palette', role: 'group', 'aria-label': '便签颜色'});
        COLORS.forEach((color, i) => {
          const swatch = button('', () => { note.color = color; card.className = `ps-note ps-note-${color}`; palette.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b === swatch))); changed(true); }, `ps-swatch ps-note-${color}`);
          swatch.setAttribute('aria-label', COLOR_NAMES[i]); swatch.setAttribute('aria-pressed', String(note.color === color)); palette.append(swatch);
        });
        card.append(handle, text, palette); board.append(card);
        drag(handle, () => ({x: note.x, y: note.y}), (x, y) => {
          note.x = clamp(x, 0, 3000); note.y = clamp(y, 0, 4000);
          card.style.left = `${note.x}px`; card.style.top = `${note.y}px`; card.style.zIndex = '2';
        }, () => { note.updatedAt = Date.now(); render(); changed(true); });
      });
    }
    render();
  }

  function openReader(paper) {
    paper = libraryPapers().find(item => String(item.id) === String(paper.id)) || paper;
    const safe = validatePersonalURL(paper.url, {paper: true});
    if (!safe) { notify('这个书籍链接还不能打开，请在书架中编辑地址。'); return; }
    const url = new URL(safe, document.baseURI);
    const local = url.origin === location.origin;
    const bundled = local && BUILTIN_BOOKS.has(url.pathname.split('/').pop()) && /\/books\//.test(url.pathname);
    const key = `reader:${String(paper.id)}`;
    if (windows.has(key)) { const existing = windows.get(key); focusWindow(existing); existing.panel.focus(); return; }
    const win = makeWindow(key, String(paper.title || '书籍阅读'), '在自己的书桌上，慢慢读', 'ps-reader-window');
    if (!win) return;
    const hint = el('p', {class: 'ps-hint', text: bundled ? '本地完整原著 · 英文原版。目录、字号和阅读进度保存在这台设备。' : '外部书籍由原站提供；若小窗无法显示，请使用“新标签页打开”。'});
    const status = el('p', {class: 'ps-reader-status', role: 'status', 'aria-live': 'polite', text: local ? '正在检查本地书籍…' : '请稍候；若页面空白，使用上方的新标签页入口。'});
    const frame = el('iframe', {class: 'ps-paper-frame', title: `阅读：${paper.title || '书籍'}`, loading: 'eager', referrerPolicy: 'no-referrer'});
    // Only the four bundled readers need same-origin storage for reading progress.
    frame.setAttribute('sandbox', `allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads${bundled ? ' allow-same-origin' : ''}`);
    const retry = button('重新加载', loadBook, 'ps-quiet'); retry.hidden = true;
    win.content.append(el('div', {class: 'ps-toolbar'}, link('新标签页打开 ↗', url.href, 'ps-primary'), button('我的书架', () => openLibrary())), hint, status, retry, frame);
    let request = null;
    async function loadBook() {
      request?.abort(); request = new AbortController();
      status.hidden = false; status.textContent = local ? '正在检查本地书籍…' : '请稍候；若页面空白，使用上方的新标签页入口。';
      status.classList.remove('is-error'); retry.hidden = true;
      try {
        if (local) {
          const response = await fetch(url.href, {method: 'HEAD', cache: 'no-store', signal: request.signal});
          if (!response.ok) throw new Error(`找不到这本书的本地文件（${response.status}）。请在书架中编辑链接，或恢复 books 文件夹。`);
        }
        if (win.panel.isConnected) frame.src = url.href;
      } catch (error) {
        if (error.name === 'AbortError' || !win.panel.isConnected) return;
        status.classList.add('is-error');
        status.textContent = error.message?.startsWith('找不到') ? error.message : '本地书籍暂时无法连接，请确认小小栖居的本地服务仍在运行。';
        retry.hidden = false;
      }
    }
    frame.addEventListener('load', () => {
      if (!frame.getAttribute('src')) return;
      if (bundled && !frame.contentDocument?.querySelector('#book .book-block')) {
        status.textContent = '这个地址没有返回书籍正文，请在书架中检查链接。'; status.classList.add('is-error'); retry.hidden = false; return;
      }
      if (local) status.hidden = true;
    });
    const readerMessage = event => {
      if (bundled && event.source === frame.contentWindow && event.origin === location.origin && event.data?.type === 'little-home-reader:close' && isTopDialog(win.panel)) win.close();
    };
    window.addEventListener('message', readerMessage);
    win.cleanup.push(() => { request?.abort(); window.removeEventListener('message', readerMessage); });
    loadBook();
  }

  function openLibrary(paperId) {
    const papersNow = libraryPapers();
    if (paperId != null) {
      const paper = papersNow.find(p => String(p.id) === String(paperId));
      if (paper) { openReader(paper); return; }
    }
    if (windows.has('library')) { const existing = windows.get('library'); existing.refresh?.(); focusWindow(existing); existing.panel.focus(); return; }
    const win = makeWindow('library', '我的书架', '把想继续读的书籍，放在这里', 'ps-library-window');
    if (!win) return;
    let papers = papersNow, editing = null;
    const titleId = `paper-title-${uid()}`, urlId = `paper-url-${uid()}`;
    const title = el('input', {id: titleId, type: 'text', required: true, placeholder: '书籍标题', maxLength: 400});
    const url = el('input', {id: urlId, type: 'text', required: true, inputMode: 'url', placeholder: 'https://… 或 books/文件.html'});
    const message = el('p', {class: 'ps-form-message', 'aria-live': 'polite'});
    const submit = el('button', {type: 'submit', class: 'ps-button ps-primary', text: '放入书架'});
    const cancel = button('取消编辑', reset); cancel.hidden = true;
    const form = el('form', {class: 'ps-form'}, el('label', {htmlFor: titleId, text: '标题'}), title, el('label', {htmlFor: urlId, text: '书籍链接'}), url, el('div', {class: 'ps-actions'}, submit, cancel), message);
    const list = el('div', {class: 'ps-paper-list'});
    form.addEventListener('submit', event => {
      event.preventDefault(); const safe = validatePersonalURL(url.value, {paper: true});
      if (!title.value.trim() || !safe) { message.textContent = '请填写标题，并使用 http / https 链接或同源 books/ 或 papers/ 文件路径。'; return; }
      papers = libraryPapers();
      if (editing && !papers.some(p => p.id === editing)) { message.textContent = '这本书已被移除，请取消编辑后重新添加。'; return; }
      const paper = {...papers.find(p => p.id === editing), id: editing || uid(), title: title.value.trim(), url: safe};
      papers = editing ? papers.map(p => p.id === editing ? paper : p) : [...papers, paper];
      if (editing) windows.get(`reader:${editing}`)?.close();
      patch({papers}); reset(); render();
    });
    function reset() { editing = null; title.value = ''; url.value = ''; submit.textContent = '放入书架'; cancel.hidden = true; message.textContent = ''; }
    function render() {
      papers = libraryPapers();
      list.replaceChildren();
      if (!papers.length) list.append(el('div', {class: 'ps-empty'}, el('strong', {text: '书架等你放下第一本书'}), el('p', {text: '可以放入本地原著，也可以添加想读的外部链接。'})));
      papers.forEach(paper => {
        const safe = validatePersonalURL(paper.url, {paper: true});
        const actions = el('div', {class: 'ps-actions'}, button('小窗阅读', () => openReader(paper), 'ps-primary'));
        if (safe) actions.append(link('新标签页 ↗', safe));
        actions.append(button('编辑', () => { const current = libraryPapers().find(p => p.id === paper.id); if (!current) { render(); return; } editing = current.id; title.value = current.title; url.value = current.url; submit.textContent = '保存修改'; cancel.hidden = false; form.closest('details').open = true; title.focus(); }), button('移除', () => { papers = libraryPapers().filter(p => p.id !== paper.id); patch({papers}); windows.get(`reader:${paper.id}`)?.close(); if (editing === paper.id) reset(); render(); }, 'ps-quiet'));
        list.append(el('article', {class: 'ps-paper'}, el('span', {class: 'ps-book-mark', 'aria-hidden': 'true', text: '≡'}), el('div', {class: 'ps-paper-info'}, el('h3', {text: paper.title || '未命名书籍'}), el('p', {text: /^(?:\.\/)?books\//.test(paper.url) ? '公版原著 · 离线阅读' : paper.url}), actions)));
      });
    }
    win.content.append(list, el('details', {class: 'ps-add-paper', open: !papers.length}, el('summary', {text: '添加 / 编辑书籍'}), form));
    win.refresh = render;
    render();
  }

  function database() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      if (!globalThis.indexedDB) { reject(new Error('IndexedDB unavailable')); return; }
      const request = indexedDB.open('recovered-home-personal-audio', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('tracks', {keyPath: 'id'});
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error('Audio database is busy'));
    });
    return dbPromise;
  }
  async function dbOp(mode, action) {
    const db = await database();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('tracks', mode);
      const request = action(transaction.objectStore('tracks'));
      let result;
      request.onsuccess = () => { result = request.result; };
      transaction.oncomplete = () => resolve(result);
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error || new Error('Audio storage aborted'));
    });
  }

  function openMusic() {
    if (windows.has('music')) { const existing = windows.get('music'); focusWindow(existing); existing.panel.focus(); return; }
    const win = makeWindow('music', '窗边的小音响', '给今天，选一张唱片', 'ps-music-window');
    if (!win) return;
    let objectURL = null, currentId = null, tracks = [], mode = 'online';
    let favorites = (Array.isArray(state().musicFavorites) ? state().musicFavorites : []).map(v => ({id: String(v.id || uid()), title: String(v.title || ''), url: String(v.url || '')}));
    const disc = el('div', {class: 'ps-disc', 'aria-hidden': 'true'}, el('div', {class: 'ps-disc-label', text: 'A SIDE'}));
    const status = el('p', {class: 'ps-music-status', text: '播放由 Spotify 原平台控制', 'aria-live': 'polite'});
    const now = el('h3', {text: 'Flower Dance'});
    const online = el('div', {class: 'ps-online-music'});
    const local = el('div', {class: 'ps-local-music'}); local.hidden = true;
    const embed = el('iframe', {class: 'ps-spotify', title: 'Flower Dance · Spotify 官方播放器', src: SPOTIFY_EMBED, height: '152', loading: 'lazy', allow: 'autoplay; encrypted-media', referrerPolicy: 'strict-origin-when-cross-origin'});
    online.append(embed, el('div', {class: 'ps-actions'}, link('在 Spotify 打开 ↗', SPOTIFY, 'ps-primary'), link('YouTube 原平台 ↗', YOUTUBE)), el('p', {class: 'ps-hint', text: '若播放器未显示，可在 Spotify 打开。试听范围由平台、账号与地区决定。'}));
    const audio = el('audio', {controls: true, preload: 'metadata', class: 'ps-audio', 'aria-label': '本地音乐播放器'});
    const fileId = `audio-file-${uid()}`;
    const files = el('input', {id: fileId, type: 'file', accept: 'audio/*,.mp3,.m4a,.wav,.ogg,.flac,.aac,.opus', multiple: true, class: 'ps-file-input'});
    const trackList = el('div', {class: 'ps-track-list'});
    const storageInfo = el('p', {class: 'ps-hint', text: '导入的音频只存入此浏览器，不上传。清理网站数据会移除这些副本。'});
    local.append(el('label', {htmlFor: fileId, class: 'ps-button ps-primary ps-file-label', text: '＋ 导入本地音频'}), files, storageInfo, audio, trackList);
    const onlineTab = button('在线唱片', () => changeMode('online'));
    const localTab = button('本地音频', () => changeMode('local'));
    onlineTab.setAttribute('aria-pressed', 'true'); localTab.setAttribute('aria-pressed', 'false');
    function actualPlayback(playing, text) {
      disc.classList.toggle('is-playing', playing); status.textContent = text;
      reportMusic(playing, 'local', now.textContent, playing ? 'playing' : text);
    }
    audio.addEventListener('playing', () => actualPlayback(true, '正在播放本地音频'));
    audio.addEventListener('pause', () => actualPlayback(false, '已暂停'));
    audio.addEventListener('ended', () => actualPlayback(false, '播放结束'));
    audio.addEventListener('waiting', () => actualPlayback(false, '音频缓冲中'));
    audio.addEventListener('stalled', () => actualPlayback(false, '音频暂时停顿'));
    audio.addEventListener('error', () => { actualPlayback(false, '这个音频暂时无法播放'); notify('浏览器无法播放这个音频格式，请尝试 MP3、M4A 或 WAV。'); });
    function changeMode(next) {
      if (next === mode) return;
      mode = next; online.hidden = mode !== 'online'; local.hidden = mode !== 'local';
      onlineTab.setAttribute('aria-pressed', String(mode === 'online')); localTab.setAttribute('aria-pressed', String(mode === 'local'));
      if (mode === 'local') {
        embed.removeAttribute('src'); disc.classList.remove('is-playing');
        now.textContent = tracks.find(track => track.id === currentId)?.name || '本地音频';
        status.textContent = currentId ? '本地音频已就绪' : '选择一首留在设备里的音乐';
        reportMusic(false, 'local', currentId ? now.textContent : '', 'paused');
      } else {
        audio.pause(); embed.src = SPOTIFY_EMBED; now.textContent = 'Flower Dance'; status.textContent = '播放由 Spotify 原平台控制';
        reportMusic(false, 'spotify', 'Flower Dance', 'unknown');
      }
    }
    async function choose(track, play = false) {
      audio.pause(); if (objectURL) URL.revokeObjectURL(objectURL);
      objectURL = URL.createObjectURL(track.blob); currentId = track.id;
      audio.src = objectURL; now.textContent = track.name; status.textContent = '本地音频已就绪';
      if (play) { try { await audio.play(); } catch { status.textContent = '请按播放器的播放按钮'; } }
    }
    function renderTracks() {
      trackList.replaceChildren();
      if (!tracks.length) trackList.append(el('p', {class: 'ps-empty-small', text: '还没有本地音频。把喜欢的音乐文件留在这里。'}));
      tracks.forEach(track => {
        const row = el('article', {class: 'ps-track'}, el('div', {}, el('strong', {text: track.name}), el('small', {text: `${(track.size / 1024 / 1024).toFixed(1)} MB${track.temporary ? ' · 仅本次可用' : ' · 保存在本机'}`})));
        row.append(button('播放', () => choose(track, true)), button('移除', async () => {
          if (!track.temporary) {
            try { await dbOp('readwrite', store => store.delete(track.id)); }
            catch { notify('音频未能移除，请稍后再试。'); return; }
          }
          if (currentId === track.id) { audio.pause(); audio.removeAttribute('src'); audio.load(); if (objectURL) URL.revokeObjectURL(objectURL); objectURL = null; currentId = null; now.textContent = '本地音频'; }
          sessionTracks.delete(track.id); tracks = tracks.filter(t => t.id !== track.id); renderTracks();
        }, 'ps-quiet')); trackList.append(row);
      });
    }
    files.addEventListener('change', async () => {
      const selected = Array.from(files.files || []); files.value = '';
      for (const file of selected) {
        if (!file.type.startsWith('audio/') && !/\.(mp3|m4a|wav|ogg|flac|aac|opus)$/i.test(file.name)) { notify(`${file.name} 不是可识别的音频文件。`); continue; }
        const track = {id: uid(), name: file.name, type: file.type, size: file.size, addedAt: Date.now(), blob: file};
        try { await dbOp('readwrite', store => store.put(track)); }
        catch { track.temporary = true; sessionTracks.set(track.id, track); storageInfo.textContent = '这次未能存入浏览器。已导入的文件仍可在当前页面播放。'; }
        tracks.push(track);
      }
      if (!win.panel.isConnected) return;
      renderTracks(); if (!currentId && tracks.length && mode === 'local') choose(tracks[0]);
    });
    const favoritesList = el('div', {class: 'ps-favorites'});
    const favoriteTitleId = `cd-title-${uid()}`, favoriteURLId = `cd-url-${uid()}`;
    const favoriteTitle = el('input', {id: favoriteTitleId, type: 'text', placeholder: '唱片或歌单名称', required: true});
    const favoriteURL = el('input', {id: favoriteURLId, type: 'text', inputMode: 'url', placeholder: 'https://…', required: true});
    const favoriteError = el('p', {class: 'ps-form-message', 'aria-live': 'polite'});
    const favoriteForm = el('form', {class: 'ps-form ps-compact-form'}, el('label', {htmlFor: favoriteTitleId, text: '唱片名称'}), favoriteTitle, el('label', {htmlFor: favoriteURLId, text: '原平台链接'}), favoriteURL, el('button', {type: 'submit', class: 'ps-button', text: '加入喜欢'}), favoriteError);
    function renderFavorites() {
      favoritesList.replaceChildren();
      if (!favorites.length) favoritesList.append(el('p', {class: 'ps-empty-small', text: '喜欢的唱片，可以从下方加入。'}));
      favorites.forEach(favorite => {
        const url = validatePersonalURL(favorite.url);
        const name = url ? link(favorite.title || '打开唱片 ↗', url) : el('span', {text: favorite.title || '待修复链接'});
        favoritesList.append(el('div', {class: 'ps-favorite'}, name, button('移除', () => { favorites = favorites.filter(f => f.id !== favorite.id); patch({musicFavorites: favorites}); renderFavorites(); }, 'ps-quiet')));
      });
    }
    favoriteForm.addEventListener('submit', event => {
      event.preventDefault(); const url = validatePersonalURL(favoriteURL.value);
      if (!favoriteTitle.value.trim() || !url) { favoriteError.textContent = '请填写名称和有效的 http / https 原平台链接。'; return; }
      favorites.push({id: uid(), title: favoriteTitle.value.trim(), url}); patch({musicFavorites: favorites}); favoriteForm.reset(); favoriteError.textContent = ''; renderFavorites();
    });
    win.content.append(el('div', {class: 'ps-record'}, disc, el('div', {}, el('span', {class: 'ps-eyebrow', text: 'YOUR LITTLE SOUNDTRACK'}), now, status)), el('div', {class: 'ps-music-tabs', role: 'group', 'aria-label': '音乐来源'}, onlineTab, localTab), online, local, el('details', {class: 'ps-cd-library'}, el('summary', {text: '我的唱片收藏'}), favoritesList, favoriteForm));
    renderTracks(); renderFavorites();
    reportMusic(false, 'spotify', 'Flower Dance', 'unknown');
    dbOp('readonly', store => store.getAll()).then(records => {
      if (!win.panel.isConnected) return;
      const merged = new Map([...records, ...sessionTracks.values(), ...tracks].filter(t => t?.blob instanceof Blob).map(t => [t.id, t]));
      tracks = [...merged.values()].sort((a, b) => a.addedAt - b.addedAt); renderTracks();
    }).catch(() => { if (win.panel.isConnected) storageInfo.textContent = '当前浏览器暂不能持久保存音频；导入后仍可在本次页面内播放。'; });
    win.cleanup.push(() => { audio.pause(); audio.removeAttribute('src'); audio.load(); embed.remove(); if (objectURL) URL.revokeObjectURL(objectURL); reportMusic(false, null, '', 'closed'); });
  }

  function escape(event) {
    if (event.key !== 'Escape' || !windows.size) return;
    const top = topDialog();
    const last = [...windows.values()].find(win => win.panel === top);
    if (last && consumeDialogEscape(event, last.panel)) last.close();
  }
  function keepVisible() {
    for (const win of windows.values()) {
      if (win.panel.classList.contains('is-expanded')) continue;
      const r = win.panel.getBoundingClientRect();
      win.panel.style.left = `${clamp(r.left, 8, innerWidth - Math.min(r.width, innerWidth) - 8)}px`;
      win.panel.style.top = `${clamp(r.top, 8, innerHeight - 72)}px`;
    }
  }
  document.addEventListener('keydown', escape, true);
  window.addEventListener('resize', keepVisible);
  window.addEventListener('pagehide', flushNotes);
  cleanups.add(() => document.removeEventListener('keydown', escape, true));
  cleanups.add(() => window.removeEventListener('resize', keepVisible));
  cleanups.add(() => window.removeEventListener('pagehide', flushNotes));
  function closeAll() { [...windows.values()].reverse().forEach(win => win.close()); }
  function dispose() {
    if (disposed) return;
    closeAll(); disposed = true; clearTimeout(noteTimer);
    cleanups.forEach(fn => fn()); root.remove();
    if (dbPromise) dbPromise.then(db => db.close()).catch(() => {});
    sessionTracks.clear();
  }
  return {openNotes, openLibrary, openMusic, closeAll, dispose};
}
