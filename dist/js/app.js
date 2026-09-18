(() => {
  'use strict';
  const root = document.getElementById('app');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const types = ['intro', 'envelope', 'envelope-open', 'letter', 'gallery', 'question', 'scratch-gift', 'result', 'music', 'ending'];
  const animations = ['fade', 'fade-up', 'slide-up', 'scale-in', 'paper-in', 'envelope-open'];
  const positions = ['top-left', 'top-center', 'top-right', 'bottom-left', 'bottom-center', 'bottom-right'];
  let data, current = -1, history = [], cleanup = () => {}, transitionBusy = false;
  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  };
  const isText = value => typeof value === 'string' && value.trim().length > 0;
  const relativePath = value => isText(value) && !/^(?:[a-z]+:|\/|\\)/i.test(value) && !value.split('/').includes('..');
  const log = (...args) => { if (data?.settings?.debug) console.info('[card]', ...args); };
  const ui = key => data.ui[key];
  // Retain decoded gallery assets so entering a page does not decode full photos mid-turn.
  const galleryAssets = new Map();
  async function warmGalleryAssets() {
    const sources = new Set(data.screens.filter(s => s.type === 'gallery').flatMap(s =>
      [s.template?.src, ...s.images.map(image => image.src)].filter(Boolean)));
    for (const src of sources) {
      if (galleryAssets.has(src)) continue;
      const image = new Image();
      image.decoding = 'async'; image.fetchPriority = 'low';
      galleryAssets.set(src, image);
      image.src = src;
      try { await image.decode(); } catch { galleryAssets.delete(src); }
    }
  }
  function galleryPhoto(item, fallback) {
    const image = el('img');
    image.alt = item.alt; image.loading = 'eager'; image.decoding = 'async';
    const reveal = () => { fallback.hidden = true; image.classList.add('loaded'); };
    image.addEventListener('load', reveal, {once: true});
    image.addEventListener('error', () => { image.remove(); fallback.hidden = false; }, {once: true});
    image.src = item.src;
    if (image.complete && image.naturalWidth) reveal();
    return image;
  }

  function celebrate() {
    const layer = el('div', 'celebration' + (reducedMotion.matches ? ' reduced' : ''));
    layer.setAttribute('aria-hidden', 'true');
    const glyphs = ['♥', '✦', '♡', '·'];
    for (let i = 0; i < 18; i++) {
      const piece = el('i', '', glyphs[i % glyphs.length]);
      piece.style.setProperty('--x', (5 + i * 5.2) + '%');
      piece.style.setProperty('--delay', ((i % 6) * 55) + 'ms');
      piece.style.setProperty('--drift', ((i % 5) - 2) * 18 + 'px');
      piece.style.setProperty('--turn', ((i % 2 ? 1 : -1) * (80 + i * 13)) + 'deg');
      layer.append(piece);
    }
    document.body.append(layer);
    const timer = setTimeout(() => layer.remove(), reducedMotion.matches ? 260 : 2500);
    return () => { clearTimeout(timer); layer.remove(); };
  }

  function validate(content) {
    const errors = [];
    const check = (condition, message) => { if (!condition) errors.push(message); };
    if (!content || typeof content !== 'object') throw new Error('Nội dung cần là một đối tượng JSON.');
    check(content.settings && typeof content.settings === 'object', 'Thiếu settings.');
    check(content.ui && typeof content.ui === 'object', 'Thiếu ui.');
    check(isText(content.settings?.recipientName), 'settings.recipientName không được để trống.');
    check(isText(content.settings?.anniversaryDate), 'settings.anniversaryDate không được để trống.');
    check(Number.isFinite(content.settings?.musicFadeDuration) && content.settings.musicFadeDuration >= 0 && content.settings.musicFadeDuration <= 5000, 'settings.musicFadeDuration phải từ 0 đến 5000.');
    if (!Array.isArray(content.screens) || !content.screens.length) throw new Error('screens phải là danh sách không rỗng.');
    const ids = new Set();
    content.screens.forEach((s, i) => {
      if (!s || typeof s !== 'object') { errors.push('Màn hình ' + i + ' không hợp lệ.'); return; }
      check(isText(s.id), 'Màn hình ' + i + ': thiếu id.');
      check(!ids.has(s.id), 'Trùng id: ' + s.id); ids.add(s.id);
      check(types.includes(s.type), s.id + ': loại màn hình không hỗ trợ.');
      if (s.paragraphs !== undefined) check(Array.isArray(s.paragraphs) && s.paragraphs.every(isText), s.id + ': paragraphs phải là danh sách chuỗi.');
      ['title', 'subtitle', 'eyebrow', 'note', 'signature', 'question', 'envelopeText', 'hint'].forEach(k => {
        if (s[k] !== undefined) check(typeof s[k] === 'string', s.id + ': ' + k + ' phải là chuỗi.');
      });
      if (['intro', 'gallery', 'question', 'music', 'ending'].includes(s.type)) check(isText(s.title), s.id + ': thiếu title.');
      if (['letter', 'result'].includes(s.type)) check(Array.isArray(s.paragraphs) && s.paragraphs.length, s.id + ': thiếu paragraphs.');
      if (s.type === 'question') {
        check(isText(s.question), s.id + ': thiếu question.');
        check(Array.isArray(s.buttons) && s.buttons.length >= 2, s.id + ': cần ít nhất hai lựa chọn.');
        check(s.tease && typeof s.tease === 'object', s.id + ': thiếu tease.');
        check(Array.isArray(s.tease?.messages) && s.tease.messages.length > 0 && s.tease.messages.every(isText), s.id + ': tease.messages phải là danh sách chuỗi không rỗng.');
        check(Array.isArray(s.tease?.reactions) && s.tease.reactions.length === s.tease?.messages?.length && s.tease.reactions.every(isText), s.id + ': tease.reactions phải khớp với tease.messages.');
        check(s.tease?.finalBehavior === 'hold', s.id + ': tease.finalBehavior chỉ hỗ trợ hold.');
      }
      if (['intro', 'envelope'].includes(s.type)) check(Array.isArray(s.buttons) && s.buttons.length, s.id + ': thiếu buttons.');
      if (s.type === 'envelope-open') check(s.autoAdvance && typeof s.autoAdvance === 'object', s.id + ': thiếu autoAdvance.');
      if (s.type === 'gallery') {
        check(['single-polaroid', 'polaroid-stack', 'two-polaroid', 'three-polaroid', 'photo-template'].includes(s.layout), s.id + ': layout không hợp lệ.');
        check(Array.isArray(s.images) && s.images.length, s.id + ': thiếu images.');
        if (s.layout === 'photo-template') {
          check(s.template && typeof s.template === 'object', s.id + ': thiếu template.');
          check(relativePath(s.template?.src), s.id + ': template.src phải là đường dẫn tương đối.');
          check(isText(s.template?.alt), s.id + ': template cần alt.');
          check(Number.isFinite(s.template?.width) && s.template.width > 0, s.id + ': template.width không hợp lệ.');
          check(Number.isFinite(s.template?.height) && s.template.height > 0, s.id + ': template.height không hợp lệ.');
          check(Array.isArray(s.template?.slots) && s.template.slots.length === s.images.length, s.id + ': số slot phải khớp số ảnh.');
          if (Array.isArray(s.template?.slots)) s.template.slots.forEach((slot, slotIndex) => {
            ['x', 'y', 'width', 'height'].forEach(key => check(Number.isFinite(slot?.[key]) && slot[key] >= 0 && slot[key] <= 100, s.id + ': slot ' + slotIndex + ' có ' + key + ' không hợp lệ.'));
            check(!slot || slot.x + slot.width <= 100, s.id + ': slot ' + slotIndex + ' vượt chiều rộng template.');
            check(!slot || slot.y + slot.height <= 100, s.id + ': slot ' + slotIndex + ' vượt chiều cao template.');
            if (slot?.rotation !== undefined) check(Number.isFinite(slot.rotation), s.id + ': rotation của slot phải là số.');
          });
        }
        if (Array.isArray(s.images)) s.images.forEach(img => {
          check(img && relativePath(img.src), s.id + ': đường dẫn ảnh phải tương đối.');
          check(img && isText(img.alt), s.id + ': ảnh cần alt.');
          if (img?.date !== undefined) check(isText(img.date), s.id + ': ngày ảnh không được để trống.');
        });
      }
      if (s.type === 'scratch-gift') {
        check(isText(s.title), s.id + ': thiếu title.');
        check(isText(s.instruction), s.id + ': thiếu instruction.');
        check(isText(s.revealText), s.id + ': thiếu revealText.');
        check(s.gift && typeof s.gift === 'object', s.id + ': thiếu gift.');
        check(relativePath(s.gift?.src), s.id + ': gift.src phải là đường dẫn tương đối.');
        check(isText(s.gift?.alt), s.id + ': gift.alt không được để trống.');
        check(isText(s.gift?.fallbackText), s.id + ': thiếu gift.fallbackText.');
        check(isText(s.gift?.coverText), s.id + ': thiếu gift.coverText.');
        check(isText(s.gift?.title), s.id + ': thiếu gift.title.');
        check(isText(s.gift?.promise), s.id + ': thiếu gift.promise.');
        check(isText(s.gift?.stampText), s.id + ': thiếu gift.stampText.');
        check(Array.isArray(s.gift?.progressMessages) && s.gift.progressMessages.length > 0 && s.gift.progressMessages.every(isText), s.id + ': gift.progressMessages phải là danh sách chuỗi không rỗng.');
        check(Number.isFinite(s.gift?.revealThreshold) && s.gift.revealThreshold >= 0.1 && s.gift.revealThreshold <= 0.9, s.id + ': gift.revealThreshold phải từ 0.1 đến 0.9.');
        check(Array.isArray(s.buttons) && s.buttons.length > 0, s.id + ': cần nút sau khi mở quà.');
        check(Array.isArray(s.buttons) && s.buttons.some(a => a?.showAfterReveal === true), s.id + ': cần ít nhất một nút showAfterReveal.');
      }
      if (s.type === 'music') check(relativePath(s.src), s.id + ': thiếu đường dẫn âm thanh tương đối.');
      if (s.endingParagraphs !== undefined) check(Array.isArray(s.endingParagraphs) && s.endingParagraphs.every(isText), s.id + ': endingParagraphs phải là danh sách chuỗi.');
      if (s.animation) {
        check(animations.includes(s.animation.enter), s.id + ': animation không hợp lệ.');
        check(Number.isFinite(s.animation.duration) && s.animation.duration >= 0 && s.animation.duration <= 5000, s.id + ': duration phải từ 0 đến 5000.');
      }
      if (s.buttons !== undefined) check(Array.isArray(s.buttons), s.id + ': buttons phải là danh sách.');
      if (s.navigation !== undefined) {
        check(s.navigation && typeof s.navigation === 'object', s.id + ': navigation không hợp lệ.');
        ['showBack', 'showNext'].forEach(k => { if (s.navigation?.[k] !== undefined) check(typeof s.navigation[k] === 'boolean', s.id + ': ' + k + ' phải là boolean.'); });
      }
      if (s.decorations !== undefined) {
        check(Array.isArray(s.decorations), s.id + ': decorations phải là danh sách.');
        if (Array.isArray(s.decorations)) s.decorations.forEach(d => {
          check(d && ['sticker', 'tape', 'note', 'doodle'].includes(d.type), s.id + ': decoration không hợp lệ.');
          if (!d) return;
          check(positions.includes(d.position), s.id + ': vị trí decoration không hợp lệ.');
          if (d.type === 'sticker' || d.src) check(relativePath(d.src), s.id + ': sticker cần đường dẫn tương đối.');
          if (d.type === 'note' || (d.type === 'doodle' && !d.src)) check(isText(d.text), s.id + ': decoration thiếu text.');
          if (d.size !== undefined) check(Number.isFinite(d.size) && d.size > 0 && d.size <= 240, s.id + ': size phải từ 1 đến 240.');
          if (d.rotation !== undefined) check(Number.isFinite(d.rotation), s.id + ': rotation phải là số.');
        });
      }
    });
    const checkAction = (a, screen, labelRequired = true) => {
      const id = screen.id;
      check(a && ['goto', 'next', 'previous', 'tease'].includes(a.action), id + ': action không hỗ trợ.');
      if (!a) return;
      if (labelRequired) check(isText(a.label), id + ': nút thiếu label.');
      if (a.action === 'goto') check(ids.has(a.target), id + ': đích không tồn tại: ' + a.target);
      if (a.action === 'tease') check(screen.type === 'question' && Array.isArray(screen.tease?.messages), id + ': action tease chỉ dùng cho màn question có tease.messages.');
      if (a.showAfterReveal !== undefined) check(typeof a.showAfterReveal === 'boolean', id + ': showAfterReveal phải là boolean.');
    };
    content.screens.filter(Boolean).forEach(s => {
      if (s.transition?.type === 'page-turn') {
        const t = s.transition;
        check(Number.isFinite(t.duration) && t.duration >= 100 && t.duration <= 3000, s.id + ': thời gian lật trang không hợp lệ.');
        check(t.forward?.origin === 'bottom-right' && t.forward?.direction === 'top-left' && t.backward?.origin === 'bottom-left' && t.backward?.direction === 'top-right', s.id + ': hướng lật trang không hợp lệ.');
      } else if (s.transition) {
        const t = s.transition, bg = t.background;
        check(s.type === 'envelope' && t.type === 'paper-burn-portal', s.id + ': transition không hỗ trợ.');
        const target = content.screens.find(item => item.id === t.target);
        check(target && !['envelope', 'envelope-open'].includes(target.type) && target.id !== s.id, s.id + ': đích portal không hợp lệ.');
        check(relativePath(bg?.src), s.id + ': background.src phải là đường dẫn tương đối.');
        check(bg?.width > 0 && bg?.height > 0, s.id + ': kích thước background không hợp lệ.');
        check(Array.isArray(bg?.window) && bg.window.length === 3 && bg.window.every(p => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite)), s.id + ': cần ba góc cửa sổ giấy.');
        check(Number.isFinite(t.duration) && t.duration >= 1000 && t.duration <= 6000 && t.zoomDuration > 0 && t.ignitionDuration >= 0 && t.zoomDuration + t.ignitionDuration < t.duration, s.id + ': thời gian portal không hợp lệ.');
        check(['x','y'].every(k => Number.isFinite(t.ignition?.[k]) && t.ignition[k] > 0 && t.ignition[k] < 1), s.id + ': ignition phải nằm trong giấy.');
      }
      if (Array.isArray(s.buttons)) s.buttons.forEach(a => checkAction(a, s));
      if (s.autoAdvance) {
        checkAction(s.autoAdvance, s, false);
        check(s.autoAdvance.action !== 'tease', s.id + ': autoAdvance không hỗ trợ tease.');
        check(Number.isFinite(s.autoAdvance.delay) && s.autoAdvance.delay >= 300 && s.autoAdvance.delay <= 10000, s.id + ': autoAdvance.delay phải từ 300 đến 10000.');
        check(s.autoAdvance.action !== 'goto' || s.autoAdvance.target !== s.id, s.id + ': tự chuyển không được trỏ về chính nó.');
      }
    });
    check(ids.has(content.settings?.startScreen), 'startScreen không tồn tại.');
    ['back', 'next', 'play', 'pause', 'seek', 'revealGift', 'scratchProgress', 'audioUnavailable', 'audioDisabled', 'audioLoading', 'audioReady', 'audioPlayError', 'imageFallback', 'navigationLabel', 'errorTitle', 'errorBody', 'retry'].forEach(k => check(isText(content.ui?.[k]), 'ui thiếu ' + k));
    if (errors.length) {
      if (content.settings?.debug) console.error('[card] invalid fields', errors);
      throw new Error(errors.join('\n'));
    }
  }
  function decorations(items = []) {
    const fragment = document.createDocumentFragment();
    items.forEach(d => {
      const node = el('div', 'decoration ' + d.type + ' ' + d.position);
      node.setAttribute('aria-hidden', 'true');
      node.style.setProperty('--rotation', (d.rotation || 0) + 'deg');
      if (d.size) node.style.setProperty('--size', d.size + 'px');
      if (d.src) {
        const image = el('img'); image.alt = ''; image.loading = 'lazy'; image.src = d.src;
        image.addEventListener('error', () => node.remove(), {once: true});
        node.append(image);
      } else if (d.text) node.textContent = d.text;
      fragment.append(node);
    });
    return fragment;
  }
  function paragraphs(s, parent) {
    const block = el('div', 'paragraphs');
    (s.paragraphs || []).forEach(text => block.append(el('p', '', text)));
    parent.append(block);
  }
  function buttons(s, parent, onAction) {
    if (!s.buttons?.length) return;
    const group = el('div', 'actions');
    s.buttons.forEach((a, i) => {
      const button = el('button', 'button' + (a.style === 'secondary' || i > 0 ? ' secondary' : ''), a.label);
      button.type = 'button';
      button.addEventListener('click', () => onAction ? onAction(a, button) : act(a));
      group.append(button);
    });
    parent.append(group);
    return group;
  }
  function paper(s) {
    const node = el('article', 'paper');
    if (s.eyebrow) node.append(el('div', 'page-mark', s.eyebrow));
    if (s.title) node.append(el('h2', '', s.title));
    paragraphs(s, node);
    if (s.note) node.append(el('p', 'paper-note', s.note));
    if (s.signature) node.append(el('p', 'signature', s.signature));
    node.append(decorations(s.decorations));
    return node;
  }
  function renderIntro(s, stage) {
    const node = el('div', 'intro-paper');
    if (s.eyebrow) node.append(el('div', 'eyebrow', s.eyebrow));
    node.append(el('h1', '', s.title));
    if (s.subtitle) node.append(el('p', 'subtitle', s.subtitle));
    paragraphs(s, node); node.append(el('div', 'rule'), decorations(s.decorations));
    stage.append(node); buttons(s, stage);
    if (s.note) stage.append(el('div', 'bottom-note', s.note));
  }
  function renderBurnPortal(s, stage) {
    const config = s.transition;
    const destination = data.screens.findIndex(item => item.id === config.target);
    const scene = el('div', 'travel-scene');
    const backdrop = el('img', 'travel-backdrop');
    backdrop.src = config.background.src; backdrop.alt = '';
    const portal = el('div', 'travel-portal');
    const prepared = buildScreen(destination, true);
    prepared.page.inert = true;
    prepared.page.setAttribute('aria-hidden', 'true');
    const cover = el('canvas', 'travel-paper-cover');
    cover.setAttribute('aria-hidden', 'true');
    portal.append(prepared.page, cover);
    const trigger = el('button', 'travel-trigger', s.hint);
    trigger.type = 'button';
    trigger.setAttribute('aria-label', s.buttons[0].label);
    const heart = el('span', 'travel-heart', '♡'); heart.setAttribute('aria-hidden', 'true');
    trigger.append(heart);
    const back = el('button', 'travel-back', ui('back')); back.type = 'button';
    back.setAttribute('aria-label', ui('back'));
    back.addEventListener('click', () => act({action:'previous'}));
    scene.append(backdrop, portal, trigger, back); stage.append(scene);
    let raf, started = false, promoted = false, disposed = false, zoom, fade, finishTimer;
    let width, height, transform, paperTexture;
    const context = cover.getContext('2d');
    const layout = () => {
      if (started || disposed) return;
      width = root.clientWidth; height = root.clientHeight;
      const bg = config.background;
      const scale = Math.max(width / bg.width, height / bg.height);
      const ox = (width - bg.width * scale) / 2, oy = (height - bg.height * scale) / 2;
      const [tl, tr, bl] = bg.window;
      transform = `matrix(${(tr[0]-tl[0])*scale/width},${(tr[1]-tl[1])*scale/width},${(bl[0]-tl[0])*scale/height},${(bl[1]-tl[1])*scale/height},${ox+tl[0]*scale},${oy+tl[1]*scale})`;
      portal.style.width = width + 'px'; portal.style.height = height + 'px'; portal.style.transform = transform;
      const dpr = Math.min(devicePixelRatio || 1, 2);
      cover.width = Math.round(width*dpr); cover.height = Math.round(height*dpr);
      paperTexture = document.createElement('canvas'); paperTexture.width = cover.width; paperTexture.height = cover.height;
      const paint = paperTexture.getContext('2d');
      paint.fillStyle = '#eee1cd'; paint.fillRect(0,0,cover.width,cover.height);
      if (backdrop.complete && backdrop.naturalWidth) {
        // Map the exact photograph's white insert into the live rectangular cover.
        const mapping = new DOMMatrix([(tr[0]-tl[0])/cover.width,(tr[1]-tl[1])/cover.width,(bl[0]-tl[0])/cover.height,(bl[1]-tl[1])/cover.height,tl[0],tl[1]]).inverse();
        paint.setTransform(mapping); paint.drawImage(backdrop,0,0,bg.width,bg.height);
      }
      context.drawImage(paperTexture,0,0);
    };
    backdrop.addEventListener('load', layout);
    const observer = new ResizeObserver(layout); observer.observe(root);
    const complete = () => {
      if (disposed) return;
      promoted = true; transitionBusy = false;
      show(destination, true, prepared);
    };
    const open = () => {
      if (started || transitionBusy || !width) return;
      started = true; transitionBusy = true;
      trigger.disabled = true; back.disabled = true; scene.classList.add('is-burning');
      if (reducedMotion.matches || !context) {
        portal.style.transform = 'none'; cover.hidden = true;
        fade = portal.animate([{opacity:0},{opacity:1}],{duration:200});
        finishTimer = setTimeout(complete,200); return;
      }
      const match = el('span', 'portal-match');
      match.style.left = config.ignition.x*100+'%'; match.style.top = config.ignition.y*100+'%';
      portal.append(match);
      const duration = config.duration, zoomStart = duration-config.zoomDuration;
      const start = performance.now();
      const draw = now => {
        const elapsed = now-start;
        const p = Math.min(1, Math.max(0,(elapsed-config.ignitionDuration)/(duration-config.ignitionDuration-150)));
        const w=cover.width,h=cover.height,cx=w*config.ignition.x,cy=h*config.ignition.y;
        context.clearRect(0,0,w,h); context.drawImage(paperTexture,0,0);
        if (p>0) {
          const radius = Math.pow(p,1.4)*Math.hypot(w,h)*.70;
          const path = new Path2D();
          for(let i=0;i<=160;i++) {
            const a=i/160*Math.PI*2;
            const r=radius*(1+.065*Math.sin(a*7)+.033*Math.sin(a*17+1)+.018*Math.sin(a*39));
            const x=cx+Math.cos(a)*r,y=cy+Math.sin(a)*r;
            i ? path.lineTo(x,y) : path.moveTo(x,y);
          }
          path.closePath();
          context.save();
          context.strokeStyle='#57311e'; context.lineWidth=10; context.stroke(path);
          context.strokeStyle='#a85824'; context.lineWidth=5; context.stroke(path);
          context.strokeStyle='#ffbd63'; context.lineWidth=1.8; context.shadowColor='#ef812c'; context.shadowBlur=8; context.stroke(path);
          context.shadowBlur=0; context.globalCompositeOperation='destination-out'; context.fill(path); context.restore();
          for(let i=0;i<9;i++) {
            const a=i*2.399,r=radius*(1+.065*Math.sin(a*7)+.033*Math.sin(a*17+1)+.018*Math.sin(a*39));
            const x=cx+Math.cos(a)*r,y=cy+Math.sin(a)*r;
            const flameHeight = (26 + 13*Math.sin(elapsed/85+i)) * Math.min(devicePixelRatio || 1, 2);
            const glow = context.createRadialGradient(x,y,1,x,y-flameHeight*.35,flameHeight);
            glow.addColorStop(0,'#fff4b2'); glow.addColorStop(.3,'#ffd16c'); glow.addColorStop(.65,'#ef872c'); glow.addColorStop(1,'#dd582000');
            context.fillStyle=glow; context.globalAlpha=.85;
            context.beginPath(); context.moveTo(x-6,y+3);
            context.bezierCurveTo(x-14,y-flameHeight*.35,x+8,y-flameHeight*.7,x+3,y-flameHeight);
            context.bezierCurveTo(x+18,y-flameHeight*.42,x+13,y-4,x+6,y+3);
            context.closePath(); context.fill();
            context.fillStyle='#ffd994';context.globalAlpha=.6*(1-p);
            context.beginPath();context.ellipse(x,y-(elapsed/18+i*7)%28,1.7,4+2*Math.sin(elapsed/90+i),-.2,0,Math.PI*2);context.fill();
          }
          context.globalAlpha=1;
        }
        if(elapsed>=zoomStart && !zoom) {
          match.remove();
          zoom=portal.animate([{transform},{transform:'matrix(1,0,0,1,0,0)'}],{duration:config.zoomDuration,easing:'cubic-bezier(.22,.68,.2,1)',fill:'forwards'});
          fade=backdrop.animate([{opacity:1},{opacity:0}],{duration:config.zoomDuration,easing:'ease-in',fill:'forwards'});
        }
        if(elapsed<duration) raf=requestAnimationFrame(draw); else complete();
      };
      raf=requestAnimationFrame(draw);
    };
    trigger.addEventListener('click',open);
    portal.addEventListener('click',open);
    return () => {
      disposed=true; cancelAnimationFrame(raf); clearTimeout(finishTimer); observer.disconnect();
      zoom?.cancel(); fade?.cancel(); transitionBusy=false;
      if(!promoted && typeof prepared.dispose==='function') prepared.dispose();
    };
  }
  function renderEnvelope(s, stage) {
    if (s.transition?.type === 'paper-burn-portal') return renderBurnPortal(s, stage);
    if (s.type === 'envelope') {
      const scene = el('div', 'photo-fold-scene');
      const card = el('button', 'photo-fold-card');
      card.type = 'button';
      card.setAttribute('aria-label', s.buttons[0].label);
      const photo = el('img', 'fold-photo');
      photo.src = 'assets/images/folding-card.png?v=2';
      photo.alt = '';
      const inside = el('span', 'fold-inside');
      const openAction = s.buttons[0];
      let destination = openAction.action === 'goto' ? data.screens.findIndex(item => item.id === openAction.target) : data.screens.indexOf(s) + 1;
      if (data.screens[destination]?.type === 'envelope-open') {
        const advance = data.screens[destination].autoAdvance;
        destination = advance?.action === 'goto' ? data.screens.findIndex(item => item.id === advance.target) : destination + 1;
      }
      const firstLetter = data.screens[destination];
      const preview = el('span', 'fold-preview');
      preview.setAttribute('aria-hidden', 'true');
      const miniature = el('section', 'screen ' + firstLetter.type);
      miniature.dataset.screen = firstLetter.id;
      const miniStage = el('div', 'stage');
      renderLetter(firstLetter, miniStage);
      miniature.append(miniStage);
      const miniNav = el('div', 'navigation');
      miniNav.append(el('span', 'nav-button', '←  ' + ui('back')), el('span', 'nav-button next', ui('next') + '  →'));
      miniature.append(miniNav);
      preview.append(miniature);
      inside.append(preview);
      card.append(photo, inside, el('span', 'fold-wing fold-left'), el('span', 'fold-wing fold-right'));
      scene.append(card, el('p', 'fold-hint', s.hint));
      stage.append(scene);
      let timer;
      let burnFrame;
      card.addEventListener('click', () => {
        if (card.classList.contains('unfolding')) return;
        card.classList.add('unfolding');
        card.setAttribute('aria-disabled', 'true');
        const frame = root.getBoundingClientRect(), bounds = card.getBoundingClientRect();
        preview.style.width = frame.width + 'px';
        preview.style.height = frame.height + 'px';
        preview.style.setProperty('--preview-scale', bounds.width * .60 / frame.width);
        scene.classList.add('is-open');
        card.classList.add('burning');
        if (!reducedMotion.matches) {
          const canvas = el('canvas', 'burn-canvas');
          canvas.setAttribute('aria-hidden', 'true');
          const ratio = Math.min(devicePixelRatio || 1, 2);
          const width = bounds.width, height = bounds.height;
          canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
          card.append(canvas, el('span', 'burn-match'));
          const context = canvas.getContext('2d');
          const start = performance.now();
          const draw = now => {
            const t = Math.min((now - start) / 1800, 1);
            const progress = Math.max(0, (t - .26) / .74);
            context.setTransform(ratio, 0, 0, ratio, 0, 0);
            context.clearRect(0, 0, width, height);
            if (photo.complete && photo.naturalWidth) context.drawImage(photo, 0, 0, width, height);
            if (progress > 0) {
              const radius = Math.pow(progress, .9) * height * .65;
              const cx = width * .51, cy = height * .57;
              const path = new Path2D();
              for (let i = 0; i <= 120; i++) {
                const a = i / 120 * Math.PI * 2;
                const edge = radius * (1 + .075 * Math.sin(a * 7 + .3) + .035 * Math.sin(a * 19) + .02 * Math.cos(a * 31));
                const x = cx + Math.cos(a) * edge * .78, y = cy + Math.sin(a) * edge;
                if (!i) path.moveTo(x, y); else path.lineTo(x, y);
              }
              path.closePath();
              context.save();
              context.strokeStyle = '#422316'; context.lineWidth = 9; context.stroke(path);
              context.strokeStyle = '#b85e22'; context.lineWidth = 4;
              context.shadowColor = '#fa9c3a'; context.shadowBlur = 9; context.stroke(path);
              context.globalCompositeOperation = 'destination-out'; context.shadowBlur = 0; context.fill(path);
              context.restore();
              for (let i = 0; i < 12; i++) {
                const a = i * 2.399;
                const r = radius * (1 + .08 * Math.sin(a * 7));
                const x = cx + Math.cos(a) * r * .78, y = cy + Math.sin(a) * r - (t * 40 + i * 7) % 22;
                context.fillStyle = i % 2 ? '#f5b85b' : '#d57834';
                context.globalAlpha = .65 * (1 - progress);
                context.fillRect(x, y, 1.4, 2.4);
              }
              context.globalAlpha = 1;
            }
            if (t < 1) burnFrame = requestAnimationFrame(draw);
          };
          burnFrame = requestAnimationFrame(draw);
        }
        timer = setTimeout(() => {
          const action = s.buttons[0];
          const nextIndex = action.action === 'goto' ? data.screens.findIndex(item => item.id === action.target) : current + 1;
          const nextScreen = data.screens[nextIndex];
          if (nextScreen?.type === 'envelope-open' && nextScreen.autoAdvance) {
            const advance = nextScreen.autoAdvance;
            const destination = advance.action === 'goto' ? data.screens.findIndex(item => item.id === advance.target) : nextIndex + 1;
            show(destination, true);
          } else act(action);
        }, reducedMotion.matches ? 300 : 1600);
      });
      return () => { clearTimeout(timer); cancelAnimationFrame(burnFrame); };
    }
    const opening = s.type === 'envelope-open';
    const wrap = el('div', 'envelope-scene' + (opening ? ' opening' : ''));
    const envelope = el(opening ? 'div' : 'button', 'envelope-object');
    if (!opening) {
      envelope.type = 'button'; envelope.setAttribute('aria-label', s.buttons[0].label);
      envelope.addEventListener('click', () => act(s.buttons[0]));
    } else envelope.setAttribute('aria-hidden', 'true');
    const letter = el('div', 'envelope-letter', s.title);
    const front = el('div', 'envelope-front');
    front.append(el('span', 'envelope-label', s.envelopeText));
    const meta = el('span', 'envelope-meta');
    meta.append(el('strong', '', 'Gửi ' + data.settings.recipientName), el('small', '', data.settings.anniversaryDate));
    envelope.append(letter, front, el('div', 'envelope-flap'), meta);
    wrap.append(envelope, decorations(s.decorations)); stage.append(wrap);
    if (s.hint) stage.append(el('p', 'envelope-hint', s.hint));
    if (opening) { stage.append(el('h2', 'sr-only', s.title)); buttons(s, stage); }
  }
  function renderLetter(s, stage) { stage.append(paper(s)); buttons(s, stage); }
  function renderGallery(s, stage) {
    if (s.layout === 'photo-template') {
      stage.append(el('h2', 'sr-only', s.title));
      const template = el('div', 'photo-template');
      template.style.setProperty('--template-ratio', s.template.width + ' / ' + s.template.height);
      template.style.setProperty('--template-aspect', s.template.width / s.template.height);
      const base = el('img', 'photo-template-base');
      base.src = s.template.src; base.alt = s.template.alt; base.decoding = 'async';
      template.append(base);
      s.images.forEach((item, i) => {
        const slotData = s.template.slots[i];
        const slot = el('figure', 'template-photo');
        slot.style.setProperty('--slot-x', slotData.x + '%');
        slot.style.setProperty('--slot-y', slotData.y + '%');
        slot.style.setProperty('--slot-width', slotData.width + '%');
        slot.style.setProperty('--slot-height', slotData.height + '%');
        slot.style.setProperty('--slot-rotation', (slotData.rotation || 0) + 'deg');
        if (slotData.clip) slot.style.clipPath = 'polygon(' + slotData.clip.map(([x,y]) => x + '% ' + y + '%').join(',') + ')';
        const fallback = el('span', 'template-photo-fallback', item.placeholder || ui('imageFallback'));
        const image = galleryPhoto(item, fallback);
        slot.append(fallback, image);
        if (item.caption) slot.append(el('figcaption', 'sr-only', item.caption));
        template.append(slot);
      });
      stage.append(template); paragraphs(s, stage); buttons(s, stage);
      return;
    }
    stage.append(el('h2', 'gallery-heading', s.title));
    const gallery = el('div', 'gallery-photos ' + s.layout);
    s.images.forEach((item, i) => {
      const frame = el('figure', 'polaroid');
      frame.style.setProperty('--photo-rotation', (item.rotation ?? (i % 2 ? 5 : -5)) + 'deg');
      const slot = el('div', 'photo-slot');
      const fallback = el('div', 'photo-fallback', item.placeholder || ui('imageFallback'));
      const image = galleryPhoto(item, fallback);
      slot.append(fallback, image); frame.append(slot);
      if (item.caption || item.date) {
        const caption = el('figcaption');
        if (item.caption) caption.append(el('span', '', item.caption));
        if (item.date) caption.append(el('small', '', item.date));
        frame.append(caption);
      }
      gallery.append(frame);
    });
    const wrap = el('div', 'gallery-wrap');
    wrap.append(gallery, decorations(s.decorations)); stage.append(wrap);
    paragraphs(s, stage); buttons(s, stage);
  }
  function renderQuestion(s, stage) {
    const node = paper(s);
    node.append(el('p', 'question-text', s.question));
    const teaseNote = el('p', 'tease-note');
    const reaction = el('span', 'tease-reaction', '\u00a0');
    const teaseText = el('span', 'tease-copy', '\u00a0');
    teaseNote.append(reaction, teaseText);
    teaseNote.setAttribute('aria-live', 'polite');
    teaseNote.setAttribute('aria-hidden', 'true');
    node.append(teaseNote);
    let teaseIndex = 0;
    let acceptButton;
    const actionGroup = buttons(s, node, action => {
      if (action.action !== 'tease') { celebrate(); act(action); return; }
      const messages = s.tease.messages;
      const index = Math.min(teaseIndex, messages.length - 1);
      teaseText.textContent = messages[index];
      reaction.textContent = s.tease.reactions[index];
      teaseNote.setAttribute('aria-hidden', 'false');
      teaseNote.classList.remove('show');
      requestAnimationFrame(() => teaseNote.classList.add('show'));
      teaseIndex = Math.min(teaseIndex + 1, messages.length - 1);
      if (teaseIndex >= 3) acceptButton?.classList.add('accept-glow');
    });
    acceptButton = actionGroup?.querySelector('.button');
    stage.append(node);
  }
  function renderScratchGift(s, stage) {
    const card = el('article', 'scratch-card');
    if (s.eyebrow) card.append(el('div', 'page-mark', s.eyebrow));
    card.append(el('h2', '', s.title), el('p', 'scratch-instruction', s.instruction));

    const frame = el('div', 'scratch-frame');
    const fallback = el('div', 'scratch-fallback', s.gift.fallbackText);
    const image = el('img', 'scratch-image');
    image.src = s.gift.src;
    image.alt = s.gift.alt;
    image.decoding = 'async';
    image.addEventListener('load', () => { fallback.hidden = true; image.classList.add('loaded'); });
    image.addEventListener('error', () => { image.remove(); fallback.hidden = false; }, {once: true});

    const canvas = el('canvas', 'scratch-cover');
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', s.gift.coverText);
    const status = el('p', 'scratch-status');
    status.setAttribute('aria-live', 'polite');
    const details = el('div', 'gift-details');
    details.hidden = true;
    details.append(el('h3', '', s.gift.title), el('p', '', s.gift.promise), el('span', 'gift-stamp', s.gift.stampText));
    const revealButton = el('button', 'reveal-access', ui('revealGift'));
    revealButton.type = 'button';
    const actionGroup = buttons({...s, buttons: s.buttons.filter(action => action.showAfterReveal)}, card);
    if (actionGroup) actionGroup.hidden = true;
    frame.append(fallback, image, canvas, el('span', 'scratch-tape'));
    card.insertBefore(frame, actionGroup || null);
    card.insertBefore(status, actionGroup || null);
    if (s.gift.showDetails !== false) card.insertBefore(details, actionGroup || null);
    card.insertBefore(revealButton, actionGroup || null);
    stage.append(card);

    let context, drawing = false, completed = false, moves = 0;
    const pointers = new Set();
    function sizeCanvas() {
      if (completed) return;
      const rect = canvas.getBoundingClientRect();
      const ratio = Math.min(devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(rect.width * ratio));
      canvas.height = Math.max(1, Math.round(rect.height * ratio));
      context = canvas.getContext('2d', {willReadFrequently: true});
      if (!context) { canvas.hidden = true; return; }
      context.globalCompositeOperation = 'source-over';
      context.fillStyle = '#b38d60';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = 'rgba(77, 57, 38, .12)';
      for (let y = 8; y < canvas.height; y += 18) {
        for (let x = (y / 18 % 2) * 7; x < canvas.width; x += 23) context.fillRect(x, y, 1.5 * ratio, 1.5 * ratio);
      }
      context.fillStyle = '#4f3d2d';
      context.font = Math.round(27 * ratio) + 'px "Patrick Hand", cursive';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(s.gift.coverText, canvas.width / 2, canvas.height / 2);
      context.globalCompositeOperation = 'destination-out';
      context.lineCap = 'round';
      context.lineJoin = 'round';
      context.lineWidth = Math.max(34, rect.width * .14) * ratio;
    }
    function point(event) {
      const rect = canvas.getBoundingClientRect();
      return {x: (event.clientX - rect.left) * canvas.width / rect.width, y: (event.clientY - rect.top) * canvas.height / rect.height};
    }
    function erase(from, to) {
      if (!context) return;
      context.beginPath(); context.moveTo(from.x, from.y); context.lineTo(to.x, to.y); context.stroke();
    }
    function scratchedRatio() {
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
      const step = Math.max(8, Math.round(Math.min(canvas.width, canvas.height) / 45));
      let clear = 0, sampled = 0;
      for (let y = 0; y < canvas.height; y += step) {
        for (let x = 0; x < canvas.width; x += step) {
          sampled++;
          if (pixels[(y * canvas.width + x) * 4 + 3] < 32) clear++;
        }
      }
      return sampled ? clear / sampled : 0;
    }
    function reveal() {
      if (completed) return;
      completed = true; drawing = false; pointers.clear();
      canvas.classList.add('revealed');
      canvas.setAttribute('aria-hidden', 'true');
      status.textContent = s.revealText;
      details.hidden = false;
      revealButton.hidden = true;
      if (actionGroup) actionGroup.hidden = false;
      const nextButton = actionGroup?.querySelector('button');
      if (nextButton) nextButton.focus({preventScroll: true});
    }
    let lastPoint;
    function start(event) {
      if (completed || !context) return;
      drawing = true; pointers.add(event.pointerId); canvas.setPointerCapture(event.pointerId);
      lastPoint = point(event); erase(lastPoint, lastPoint); event.preventDefault();
    }
    function move(event) {
      if (!drawing || completed || !pointers.has(event.pointerId)) return;
      const nextPoint = point(event); erase(lastPoint, nextPoint); lastPoint = nextPoint; event.preventDefault();
      moves++;
      if (moves % 5 === 0) {
        const ratio = scratchedRatio();
        const progress = Math.min(1, ratio / s.gift.revealThreshold);
        const promptIndex = Math.min(s.gift.progressMessages.length - 1, Math.floor(progress * s.gift.progressMessages.length));
        status.textContent = s.gift.progressMessages[promptIndex];
        if (ratio >= s.gift.revealThreshold) reveal();
      }
    }
    function stop(event) {
      pointers.delete(event.pointerId); drawing = pointers.size > 0;
      if (!completed && context && scratchedRatio() >= s.gift.revealThreshold) reveal();
    }
    canvas.addEventListener('pointerdown', start);
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerup', stop);
    canvas.addEventListener('pointercancel', stop);
    revealButton.addEventListener('click', reveal);
    const setupFrame = requestAnimationFrame(sizeCanvas);
    return () => { cancelAnimationFrame(setupFrame); pointers.clear(); drawing = false; };
  }
  function renderMusic(s, stage) {
    const node = paper(s), player = el('div', 'player'), audio = el('audio');
    if (s.layout === 'ending-player' || s.layout === 'ending-background') {
      node.classList.add('ending-paper');
      const heart = el('span', 'ending-heart', '♡'); heart.setAttribute('aria-hidden', 'true');
      node.prepend(heart);
    }
    if (s.playerLabel) player.append(el('p', 'player-label', s.playerLabel));
    audio.preload = s.autoplay ? 'auto' : 'metadata';
    audio.loop = s.loop === true;
    let disposed = false;
    const status = el('p', 'audio-status', ui('audioLoading')); status.setAttribute('role', 'status');
    const setAudioStatus = key => {
      status.hidden = key === 'audioReady' && !!s.playerLabel;
      status.textContent = status.hidden ? '' : ui(key);
    };
    const control = el('button', 'audio-toggle', ui('play')); control.type = 'button'; control.disabled = true;
    const seek = el('input', 'audio-seek');
    seek.type = 'range'; seek.min = '0'; seek.max = '100'; seek.value = '0'; seek.step = '.1';
    seek.setAttribute('aria-label', ui('seek')); seek.disabled = true;
    const times = el('div', 'audio-times'), elapsed = el('span', '', '0:00'), duration = el('span', '', '0:00');
    times.append(elapsed, duration);
    const format = seconds => Number.isFinite(seconds) ? Math.floor(seconds / 60) + ':' + String(Math.floor(seconds % 60)).padStart(2, '0') : '0:00';
    const ready = () => {
      if (!Number.isFinite(audio.duration) || audio.duration <= 0) return;
      control.disabled = false; seek.disabled = false; duration.textContent = format(audio.duration); setAudioStatus('audioReady');
    };
    const unavailable = () => { control.disabled = true; seek.disabled = true; control.textContent = ui('play'); setAudioStatus('audioUnavailable'); };
    audio.addEventListener('loadedmetadata', ready); audio.addEventListener('canplay', ready); audio.addEventListener('error', unavailable);
    audio.addEventListener('timeupdate', () => {
      elapsed.textContent = format(audio.currentTime); seek.value = audio.duration ? String(audio.currentTime / audio.duration * 100) : '0';
    });
    audio.addEventListener('play', () => { control.textContent = ui('pause'); control.setAttribute('aria-pressed', 'true'); });
    audio.addEventListener('pause', () => { control.textContent = ui('play'); control.setAttribute('aria-pressed', 'false'); });
    audio.addEventListener('ended', () => { control.textContent = ui('play'); control.setAttribute('aria-pressed', 'false'); });
    control.setAttribute('aria-pressed', 'false');
    let fadeFrame;
    const cancelFade = () => { if (fadeFrame) cancelAnimationFrame(fadeFrame); fadeFrame = undefined; };
    const fadeIn = () => {
      cancelFade();
      const duration = reducedMotion.matches ? 0 : data.settings.musicFadeDuration;
      if (!duration) { audio.volume = 1; return; }
      const started = performance.now();
      audio.volume = 0;
      const tick = now => {
        audio.volume = Math.min(1, (now - started) / duration);
        if (audio.volume < 1 && !audio.paused) fadeFrame = requestAnimationFrame(tick);
      };
      fadeFrame = requestAnimationFrame(tick);
    };
    const startPlayback = async () => {
      try {
        audio.volume = reducedMotion.matches ? 1 : 0;
        await audio.play();
        if (disposed) { audio.pause(); return; }
        fadeIn(); setAudioStatus('audioReady');
      } catch {
        if (disposed) return;
        audio.volume = 1;
        if (audio.error) unavailable();
        else setAudioStatus('audioPlayError');
      }
    };
    control.addEventListener('click', () => {
      if (!audio.paused) { cancelFade(); audio.pause(); return; }
      startPlayback();
    });
    seek.addEventListener('input', () => { if (Number.isFinite(audio.duration)) audio.currentTime = Number(seek.value) / 100 * audio.duration; });
    if (s.layout === 'ending-background') {
      const sound = el('div', 'ending-sound');
      sound.append(control);
      node.append(audio, sound);
    } else {
      player.append(status, control, seek, times, audio); node.append(player);
    }
    if (s.endingParagraphs) s.endingParagraphs.forEach(text => node.append(el('p', 'music-ending', text)));
    if (s.endingSignature) node.append(el('p', 'signature', s.endingSignature));
    stage.append(node);
    if (s.finalNote) stage.append(el('p', 'bottom-note', s.finalNote));
    buttons(s, stage);
    if (data.settings.musicEnabled) {
      audio.src = s.src;
      if (s.autoplay) startPlayback();
    } else setAudioStatus('audioDisabled');
    return () => { disposed = true; cancelFade(); audio.pause(); audio.removeAttribute('src'); audio.load(); };
  }
  const renderers = {
    intro: renderIntro, envelope: renderEnvelope, 'envelope-open': renderEnvelope, letter: renderLetter,
    gallery: renderGallery, question: renderQuestion, 'scratch-gift': renderScratchGift,
    result: renderLetter, music: renderMusic, ending: renderLetter
  };
  // Clip in a common right-corner coordinate system, then mirror for Back.
  function pageFoldGeometry(width, height, progress, direction) {
    const c = (width + height) * (1 - progress);
    const corners = [[0,0],[width,0],[width,height],[0,height]];
    const clip = side => {
      const result = [];
      corners.forEach((a,i) => {
        const b=corners[(i+1)%4], da=a[0]+a[1]-c, db=b[0]+b[1]-c;
        if(side*da>=0) result.push(a);
        if((da<0 && db>0)||(da>0 && db<0)) {
          const t=da/(da-db); result.push([a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])]);
        }
      });
      return result;
    };
    const mirror = ([x,y]) => [direction==='backward' ? width-x : x,y];
    const front = clip(-1);
    return {
      front:front.map(mirror),
      back:clip(1).map(([x,y])=>mirror([c-y,c-x])),
      crease:front.filter(([x,y])=>Math.abs(x+y-c)<.01).map(mirror)
    };
  }
  function runPageTurnTransition({fromScreen,toScreen,direction,config}) {
    if(reducedMotion.matches) { fromScreen.remove(); return () => {}; }
    const width=root.clientWidth,height=root.clientHeight;
    const svgNS='http://www.w3.org/2000/svg';
    const svg = (tag,attrs={}) => {
      const node=document.createElementNS(svgNS,tag);
      Object.entries(attrs).forEach(([k,v])=>node.setAttribute(k,String(v))); return node;
    };
    const layer=svg('svg',{viewBox:`0 0 ${width} ${height}`,'aria-hidden':'true',class:'notebook-curl'});
    layer.dataset.direction=direction;
    const defs=svg('defs');
    const gradient=svg('linearGradient',{id:'notebook-paper-shade',gradientUnits:'userSpaceOnUse'});
    [['0%','#a99170'],['12%','#d6c5a8'],['38%','#eee2cd'],['100%','#e8dbc4']].forEach(([offset,color])=>gradient.append(svg('stop',{offset,'stop-color':color})));
    const texture=svg('pattern',{id:'notebook-paper-grain',width:7,height:9,patternUnits:'userSpaceOnUse'});
    texture.append(svg('path',{d:'M1 2h1 M4 6h.6',stroke:'#8e7655','stroke-opacity':.13,'stroke-width':.6}));
    defs.append(gradient,texture);
    const back=svg('polygon',{fill:'url(#notebook-paper-shade)',class:'notebook-reverse'});
    const grain=svg('polygon',{fill:'url(#notebook-paper-grain)'});
    const crease=svg('path',{fill:'none',stroke:'#fff7e7','stroke-width':1.2});
    layer.append(defs,back,grain,crease);
    fromScreen.classList.add('page-turning'); fromScreen.inert=true; fromScreen.setAttribute('aria-hidden','true');
    toScreen.inert=true; toScreen.setAttribute('aria-hidden','true');
    root.append(fromScreen,layer); transitionBusy=true;
    let frame,finished=false;
    const finish = () => {
      if(finished)return; finished=true; cancelAnimationFrame(frame);
      fromScreen.remove();layer.remove();toScreen.inert=false;toScreen.removeAttribute('aria-hidden');transitionBusy=false;
      const heading=toScreen.querySelector('h1,h2');
      if(heading && toScreen.isConnected){heading.tabIndex=-1;heading.focus({preventScroll:true});}
    };
    // Invert the x component of cubic-bezier(.22,1,.36,1).
    const ease = x => {
      let lo=0,hi=1,t=.5;
      for(let i=0;i<15;i++) {
        t=(lo+hi)/2;
        const bx=3*(1-t)*(1-t)*t*.22+3*(1-t)*t*t*.36+t*t*t;
        if(bx<x)lo=t;else hi=t;
      }
      return 1-Math.pow(1-t,3);
    };
    const render = progress => {
      const geometry=pageFoldGeometry(width,height,progress,direction);
      fromScreen.style.clipPath='polygon('+geometry.front.map(([x,y])=>`${x}px ${y}px`).join(',')+')';
      const points=geometry.back.map(p=>p.join(',')).join(' ');
      back.setAttribute('points',points);grain.setAttribute('points',points);
      if(geometry.crease.length>=2) {
        const [a,b]=geometry.crease, x=(a[0]+b[0])/2,y=(a[1]+b[1])/2;
        crease.setAttribute('d',`M${a.join(',')} L${b.join(',')}`);
        gradient.setAttribute('x1',x);gradient.setAttribute('y1',y);
        gradient.setAttribute('x2',x+(direction==='backward'?65:-65));gradient.setAttribute('y2',y-65);
      }
    };
    render(0);
    const start=performance.now();
    const tick = now => {
      const t=Math.min(1,(now-start)/config.duration);
      if(t>=1){finish();return;}
      render(ease(t));frame=requestAnimationFrame(tick);
    };
    frame=requestAnimationFrame(tick);
    return finish;
  }
  function act(action) {
    if (transitionBusy) return;
    log('navigation', action);
    if (action.action === 'tease') return;
    if (action.action === 'previous') { const previous = history.pop(); if (previous !== undefined) show(previous, false, null, 'backward'); return; }
    const next = action.action === 'goto' ? data.screens.findIndex(s => s.id === action.target) : current + 1;
    if (next < 0 || next >= data.screens.length || next === current) return;
    show(next, true);
  }
  function buildScreen(index, prepared = false) {
    const s = data.screens[index];
    const page = el('section', 'screen ' + s.type); page.dataset.screen = s.id;
    page.setAttribute('aria-label', s.title || s.eyebrow || data.settings.title);
    page.style.setProperty('--duration', (s.animation?.duration ?? 450) + 'ms');
    page.style.animationName = s.animation?.enter === 'envelope-open' ? 'fade' : s.animation?.enter || 'fade-up';
    if (prepared) {
      page.style.animationName = 'none';
    } else if (!['intro', 'envelope', 'envelope-open'].includes(s.type)) {
      page.style.animationName = 'none';
    }
    const stage = el('div', 'stage'), dispose = renderers[s.type](s, stage);
    page.append(stage);
    const nav = s.navigation || {};
    if (nav.showBack || nav.showNext) {
      const navigation = el('nav', 'navigation'); navigation.setAttribute('aria-label', ui('navigationLabel'));
      if (nav.showBack) {
        const back = el('button', 'nav-button', '←  ' + (nav.backLabel || ui('back')));
        back.type = 'button'; back.disabled = !prepared && history.length === 0;
        back.addEventListener('click', () => act({action: 'previous'})); navigation.append(back);
      }
      if (nav.showNext) {
        const next = el('button', 'nav-button next', (nav.nextLabel || ui('next')) + '  →');
        next.type = 'button'; next.disabled = index === data.screens.length - 1;
        next.addEventListener('click', () => act({action: 'next'})); navigation.append(next);
      }
      page.append(navigation);
    }
    return {page, stage, dispose};
  }
  function show(index, remember = false, prepared = null, direction = 'forward') {
    const oldPage = root.querySelector(':scope > .screen');
    const oldConfig = data.screens[current]?.transition;
    const openingCard = root.querySelector(':scope > .screen:not(.opening-cover) .photo-fold-card.unfolding');
    const zoomFrame = openingCard?.getBoundingClientRect();
    const appFrame = root.getBoundingClientRect();
    const fromOpenedCard = !!openingCard;
    cleanup();
    // Opening frames are transient: Back must never get stuck in an auto-advance loop.
    if (remember && current >= 0 && !data.screens[current].autoAdvance) history.push(current);
    current = index;
    const s = data.screens[index]; log('current screen', s.id);
    const {page, stage, dispose} = prepared || buildScreen(index);
    page.inert = false;
    page.removeAttribute('aria-hidden');
    root.replaceChildren(page);
    let motion;
    let coverMotion;
    let turningPage;
    let cancelPageTurn;
    if (!reducedMotion.matches && fromOpenedCard && zoomFrame) {
      const dx = zoomFrame.left - appFrame.left + zoomFrame.width * .007;
      const dy = zoomFrame.top - appFrame.top + zoomFrame.height * .391;
      const scale = zoomFrame.width * .60 / appFrame.width;
      motion = page.animate([
        {transformOrigin:'0 0', transform:`translate(${dx}px, ${dy}px) rotate(-28deg) scale(${scale})`, borderRadius:'2px'},
        {transformOrigin:'0 0', transform:'translate(0, 0) rotate(0deg) scale(1)', borderRadius:'0'}
      ], {duration:1000, easing:'cubic-bezier(.22,.7,.2,1)'});
      turningPage = oldPage;
      turningPage.inert = true;
      turningPage.setAttribute('aria-hidden', 'true');
      turningPage.classList.add('opening-cover');
      root.append(turningPage);
      coverMotion = turningPage.animate([
        {transform:'scale(1)',opacity:1},
        {transform:'scale(2.3)',opacity:0}
      ], {duration:550,easing:'cubic-bezier(.22,.7,.2,1)',fill:'forwards'});
      coverMotion.onfinish = () => turningPage.remove();
    } else if (!prepared && oldPage && oldConfig?.type === 'page-turn' && s.transition?.type === 'page-turn') {
      cancelPageTurn = runPageTurnTransition({fromScreen:oldPage,toScreen:page,direction,config:oldConfig});
    }
    if (data.settings.debug) root.append(el('div', 'debug', 'screen: ' + s.id));
    const heading = page.querySelector('h1, h2') || page.querySelector('article');
    if (heading && !transitionBusy) { heading.tabIndex = -1; heading.focus({preventScroll: true}); }
    stage.scrollTop = 0;
    let timer;
    if (s.autoAdvance) timer = setTimeout(() => act(s.autoAdvance), reducedMotion.matches ? 300 : s.autoAdvance.delay);
    cleanup = () => { clearTimeout(timer); cancelPageTurn?.(); motion?.cancel(); coverMotion?.cancel(); turningPage?.remove(); if (typeof dispose === 'function') dispose(); };
  }
  async function boot() {
    try {
      const response = await fetch('data/content.json', {cache: 'no-cache'});
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const parsed = await response.json(); validate(parsed); data = parsed;
      Object.entries(data.theme || {}).forEach(([key, value]) => {
        if (['background', 'paper', 'text', 'accent'].includes(key) && typeof value === 'string' && CSS.supports('color', value)) root.style.setProperty('--' + key, value);
      });
      if (data.settings.title) document.title = data.settings.title;
      show(data.screens.findIndex(s => s.id === data.settings.startScreen));
      if ('requestIdleCallback' in window) requestIdleCallback(warmGalleryAssets, {timeout: 1500});
      else setTimeout(warmGalleryAssets, 800);
    } catch (error) {
      const card = el('section', 'error-card'); card.setAttribute('role', 'alert');
      card.append(el('h1', '', data?.ui?.errorTitle || 'Lá thư chưa mở được'), el('p', '', data?.ui?.errorBody || 'Em thử tải lại trang nhé. Nếu vẫn chưa được, anh sẽ kiểm tra lại lá thư.'));
      const retry = el('button', 'button', data?.ui?.retry || 'Thử lại');
      retry.type = 'button'; retry.addEventListener('click', boot); card.append(retry); root.replaceChildren(card);
      console.error('[card]', error.message);
    }
  }
  boot();
})();
