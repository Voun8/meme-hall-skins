/*!
 * 拾光司书 — 称号 + 气泡皮肤  v1.1
 * 无依赖。挂到 window.ShiguangSkin。
 *
 *   ShiguangSkin.init({ assets: { sticker, figure, sun, wax, reply, replyStill }, theme: 'dark' })
 *   ShiguangSkin.html.badge(level) / .sticker() / .bubble(text)   → HTML 字符串
 *   ShiguangSkin.enhance(rootEl, { level, animate })                        → 套用等级并接上动效
 *   ShiguangSkin.applyLevel(rootEl, level, { flash })                        → 只改等级
 *   ShiguangSkin.typeIn(bubbleEl, { delay })                                 → 逐字写出（返回 Promise）
 *   ShiguangSkin.ceremony({ container, from, onLevel })                      → 满级仪式（返回 Promise）
 *   ShiguangSkin.setTheme('dark' | 'light')                                  → 粒子配色
 */
export function createShiguangSkin(root) {
  const document = root.document;
  const requestAnimationFrame = root.requestAnimationFrame.bind(root), cancelAnimationFrame = root.cancelAnimationFrame.bind(root);
  const setTimeout = root.setTimeout.bind(root), clearTimeout = root.clearTimeout.bind(root);
  const getComputedStyle = root.getComputedStyle.bind(root), performance = root.performance;
  const ResizeObserver = root.ResizeObserver, IntersectionObserver = root.IntersectionObserver;
  'use strict';

  const MAX = 5200;
  const TIERS = [
    { lv: 1,    name: '扉页', desc: '素面皮革，米白书页边从右下角露出来。' },
    { lv: 800,  name: '烫金', desc: '描出双线金框与四角菱饰，右上角嵌上日轮，称号牌镶金边。' },
    { lv: 1600, name: '书签', desc: '橙、黑两条缎带书签垂下；日轮和等级签填上发色。' },
    { lv: 2600, name: '落笔', desc: '新消息逐字写出，橙色光标跟着笔尖走；右上角日轮先收拢蓄光，写字时光芒此起彼伏，写完绽开一圈涟漪；小螃蟹在书旁陪伴，跟着写字轻动；皮面有镜面反光。' },
    { lv: 3800, name: '翻页', desc: '书签轻轻摆动。' },
    { lv: 5200, name: '万卷', desc: '满级。翻书升级仪式与火漆印；烫金文字、流动金框、悬停倾斜反光；称号后的她有光晕，发饰与书轮流闪光；日轮常驻微光，小螃蟹轻轻起伏。' }
  ];
  const RM = false; // User preference: skin motion is independent of the OS/browser setting.

  const cfg = {
    name: '拾光司书',
    journal: '拾光手记',
    theme: 'dark',
    particles: false,
    assets: {
      sticker: 'assets/shiguang-sticker.webp',
      figure: 'assets/shiguang-figure.webp',
      sun: 'assets/sg-sunburst.svg',
      wax: 'assets/sg-wax-seal.svg',
      reply: 'assets/reply.webp',
      replyStill: ''
    }
  };

  /* ───────── shared SVG paint (injected once) ───────── */
  const LONG = 'M0-11.6C1.6-8.2 1.8-5 0-3-1.8-5-1.6-8.2 0-11.6Z';
  const SHORT = 'M0-8.2C1.1-6.3 1.2-4.6 0-3.3-1.2-4.6-1.1-6.3 0-8.2Z';
  const PETALS = Array.from({ length: 12 }, (_, k) =>
    `<path transform="rotate(${k * 30})" d="${LONG}"/><path transform="rotate(${k * 30 + 15})" d="${SHORT}"/>`).join('');
  const DEFS = `<svg id="sg-defs" width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>
    <linearGradient id="sg-gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F8E3AE"/><stop offset=".5" stop-color="#E0B26A"/><stop offset="1" stop-color="#A87634"/></linearGradient>
    <linearGradient id="sg-goldBright" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFF1CC"/><stop offset=".5" stop-color="#F2D08E"/><stop offset="1" stop-color="#C99A4E"/></linearGradient>
    <linearGradient id="sg-goldLive" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFF1CC"/><stop offset=".35" stop-color="#F2D08E"/><stop offset=".5" stop-color="#FFFBEE"/><stop offset=".65" stop-color="#F2D08E"/><stop offset="1" stop-color="#C99A4E"/>
      <animateTransform attributeName="gradientTransform" type="rotate" values="0 .5 .5;360 .5 .5" dur="4s" repeatCount="indefinite"/></linearGradient>
    <radialGradient id="sg-glowG" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#FFC48F" stop-opacity=".95"/><stop offset=".5" stop-color="#F28A48" stop-opacity=".45"/><stop offset="1" stop-color="#F28A48" stop-opacity="0"/></radialGradient>
    <radialGradient id="sg-sunFill" cx=".5" cy=".5" r=".55"><stop offset="0" stop-color="#FFD1A8"/><stop offset=".45" stop-color="#F28A48"/><stop offset="1" stop-color="#C9521B"/></radialGradient>
    <g id="sg-sun">${PETALS}</g>
  </defs></svg>`;
  function injectDefs() {
    if (document.getElementById('sg-defs')) return;
    const box = document.createElement('div'); box.innerHTML = DEFS;
    document.body.prepend(box.firstElementChild);
  }

  /* ───────── markup ───────── */
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  const STAR = '<svg viewBox="-8 -8 16 16" aria-hidden="true"><path fill="#FFF8EA" d="M0-7.5C.7-1.6 1.6-.7 7.5 0 1.6.7.7 1.6 0 7.5-.7 1.6-1.6.7-7.5 0-1.6-.7-.7-1.6 0-7.5Z"/></svg>';
  const sunStatic = cls => `<svg class="${cls}" viewBox="-12 -12 24 24" aria-hidden="true"><g class="sg-spin"><circle r="12.5" fill="none"/><use href="#sg-sun" fill="url(#sg-sunFill)" stroke="rgba(120,45,15,.55)" stroke-width=".4"/></g><circle r="3" fill="url(#sg-gold)"/></svg>`;
  // deterministic per-ray jitter, so every ray breathes on its own clock
  const prand = (k, n) => { const x = Math.sin(k * 12.9898 + n * 78.233) * 43758.5453; return x - Math.floor(x); };
  function replyIcon() {
    const A = cfg.assets;
    if (A.reply) {
      return `<span class="sg-reply sg-reply--img${A.replyStill ? ' has-still' : ''}" aria-hidden="true">`
           + `<img class="sg-reply__anim" src="${esc(A.reply)}" alt="">${A.replyStill ? `<img class="sg-reply__still" src="${esc(A.replyStill)}" alt="">` : ''}</span>`;
    }
    let rays = '';
    for (let k = 0; k < 12; k++) {
      const v = (n, a, b) => (a + prand(k, n) * (b - a)).toFixed(2);
      rays += `<g transform="rotate(${k * 30})"><path class="sg-ray" style="--i:${k};--rd:${v(1, .55, 1.05)}s;--rd2:${v(6, 2.4, 4)}s;--rdl:-${v(2, 0, 1.4)}s;--rlo:${v(3, .4, .62)};--rhi:${v(4, 1.06, 1.3)}" d="${LONG}"/></g>`
            + `<g transform="rotate(${k * 30 + 15})"><path class="sg-ray sg-ray--s" style="--i:${k};--rd:${v(5, .45, .9)}s;--rd2:${v(7, 2, 3.6)}s;--rdl:-${v(8, 0, 1.2)}s;--rlo:${v(9, .5, .7)};--rhi:${v(10, 1.1, 1.45)}" d="${SHORT}"/></g>`;
    }
    return `<span class="sg-reply" aria-hidden="true"><svg viewBox="-14 -14 28 28">`
         + `<circle class="sg-reply__glow" r="11" fill="url(#sg-glowG)"/>`
         + `<circle class="sg-reply__ring" r="8.5" fill="none" stroke="#FFB27A" stroke-width=".9"/>`
         + `<g class="sg-popg"><circle r="14" fill="none"/><g class="sg-spin"><circle r="14" fill="none"/>${rays}</g>`
         + `<g class="sg-core"><circle r="3" fill="url(#sg-gold)"/><circle r="3" fill="none" stroke="rgba(90,40,15,.5)" stroke-width=".5"/></g></g>`
         + `</svg></span>`;
  }
  // Classic Clawd pixel companion.
  const BIRD = `<span class="sg-bird" aria-hidden="true"><svg viewBox="0 0 14 8" shape-rendering="crispEdges"><g class="sg-bird__all"><path fill="#CD6E58" d="M3 0h8v6H3z M1 2h2v2H1z M3 6h1v2H3z M5 6h1v2H5z M8 6h1v2H8z M10 6h1v2h-1z"/><path class="sg-bird__arm" fill="#CD6E58" d="M11 2h2v2h-2z"/><g class="sg-bird__eye" fill="#000"><path d="M4 1h1v1H4z M9 1h1v1H9z"/></g></g></svg></span>`;
  const FRAME = '<svg class="sg-frame sg-frame--o" aria-hidden="true"><rect class="sg-fr" width="100%" height="100%" rx="10" pathLength="1"/></svg>'
    + '<svg class="sg-frame sg-frame--i" aria-hidden="true"><rect class="sg-fr" width="100%" height="100%" rx="6.5" pathLength="1"/></svg>'
    + '<span class="sg-dia sg-dia--tl"></span><span class="sg-dia sg-dia--tr"></span><span class="sg-dia sg-dia--bl"></span><span class="sg-dia sg-dia--br"></span>';

  const html = {
    badge(level = MAX) {
      return `<span class="sg-badge"><span class="sg-badge__main">${sunStatic('sg-badge__icon')}<span class="sg-badge__name">${esc(cfg.name)}</span></span>`
           + `<span class="sg-badge__lv"><i>Lv</i><b data-sg-lv>${level}</b></span></span>`;
    },
    sticker() {
      return `<span class="sg-sticker"><img src="${esc(cfg.assets.sticker)}" alt="${esc(cfg.name)}" decoding="async">`
           + `<span class="sg-glint sg-glint--hair">${STAR}</span><span class="sg-glint sg-glint--book">${STAR}</span></span>`;
    },
    bubble(text, { } = {}) {
      const t = esc(text);
      return `<div class="sg-bwrap"><span class="sg-halo"></span><span class="sg-back"></span>`
           + `<span class="sg-ribbon sg-ribbon--k"></span><span class="sg-ribbon sg-ribbon--o"></span><span class="sg-pages"></span>`
           + `<div class="sg-bubble" tabindex="0"><span class="sg-clip"><span class="sg-gloss"></span><span class="sg-glare"></span><span class="sg-flash"></span></span>`
           + FRAME + replyIcon()
           + `<p class="sg-text" data-sg-text="${t}"><span class="sg-text__sizer">${t}</span><span class="sg-text__type">${t}</span></p>`
           + `</div>${BIRD}</div>`;
    }
  };

  /* ───────── levels ───────── */
  const clamp = v => Math.max(1, Math.min(MAX, Math.round(+v || 1)));
  const tierOf = v => TIERS.reduce((t, x, i) => (v >= x.lv ? i + 1 : t), 1);

  function applyLevel(el, level, { flash = false } = {}) {
    level = clamp(level);
    const prev = +el.dataset.sgTier || 0, t = tierOf(level);
    el.dataset.sgLevel = level; el.dataset.sgTier = t;
    if (!el.classList.contains('sg-skin')) el.classList.add('sg-skin');
    for (let k = 2; k <= 6; k++) el.classList.toggle('sg-ge' + k, t >= k);
    el.querySelectorAll('[data-sg-lv]').forEach(n => { n.textContent = level; });
    el.querySelectorAll('[data-sg-tiername]').forEach(n => { n.textContent = TIERS[t - 1].name; });
    el.querySelectorAll('.sg-bwrap').forEach(w => syncFX(w, t));
    if (flash && prev && t > prev) {
      el.querySelectorAll('.sg-bubble').forEach(b => { b.classList.remove('sg-flashing'); void b.offsetWidth; b.classList.add('sg-flashing'); });
      setTimeout(() => el.querySelectorAll('.sg-bubble').forEach(b => b.classList.remove('sg-flashing')), 1000);
      if (t >= 4) el.querySelectorAll('.sg-bubble').forEach((b, i) => typeIn(b, { delay: 150 + i * 120 }));
    }
    if (t < 4) el.querySelectorAll('.sg-bubble').forEach(showFull);
    return t;
  }

  /* ───────── typewriter + reply icon ───────── */
  const typers = new WeakMap();
  function stopType(bubble) {
    const token = typers.get(bubble);
    if (token?.timers) for (const timer of token.timers) clearTimeout(timer);
    token?.resolve?.(); typers.delete(bubble);
  }
  const wrapOf = b => b.closest('.sg-bwrap') || b;
  function showFull(bubble) {
    const p = bubble.querySelector('.sg-text'); if (!p) return;
    stopType(bubble);
    wrapOf(bubble).classList.remove('sg-thinking', 'sg-replying', 'sg-done');
    const out=p.querySelector('.sg-text__type');
    // Avoid waking the chat visibility observer again for unchanged history.
    if(out.textContent!==p.dataset.sgText||out.children.length)out.textContent=p.dataset.sgText;
  }
  // when writing ends, let the star coast to its next symmetric pose (every 30°) instead of snapping back
  function settleSpin(wrap, later) {
    const g = wrap.querySelector('.sg-spin'); if (!g) return;
    const cur = parseFloat(getComputedStyle(g).rotate) || 0;
    g.style.animation = 'none'; g.style.rotate = cur + 'deg'; void g.getBoundingClientRect();
    g.style.transition = 'rotate .8s cubic-bezier(.2,1.3,.4,1)'; g.style.rotate = (Math.ceil((cur + 10) / 30) * 30) + 'deg';
    later(() => { g.style.transition = 'none'; g.style.rotate = '0deg'; void g.getBoundingClientRect(); g.style.transition = ''; g.style.animation = ''; g.style.rotate = ''; }, 850);
  }
  function typeIn(bubble, { delay = 0 } = {}) {
    const p = bubble.querySelector('.sg-text');
    if (!p || RM) { if (p) showFull(bubble); return Promise.resolve(); }
    const wrap = wrapOf(bubble), full = p.dataset.sgText, out = p.querySelector('.sg-text__type'), token = {timers:new Set()};
    stopType(bubble);
    const later = (fn,ms) => { const id=setTimeout(()=>{token.timers.delete(id);fn()},ms);token.timers.add(id);return id; };
    typers.set(bubble, token);
    wrap.classList.remove('sg-done', 'sg-replying');
    out.textContent = '';
    const txt = document.createTextNode(''), caret = document.createElement('span');
    caret.className = 'sg-caret'; out.append(txt, caret);
    later(() => { if (typers.get(bubble) === token) wrap.classList.add('sg-thinking'); }, Math.max(0, delay - 560));
    return new Promise(resolve => {
      token.resolve = resolve; let i = 0;
      const step = () => {
        if (typers.get(bubble) !== token) return resolve();
        if (i === 0) { wrap.classList.remove('sg-thinking'); wrap.classList.add('sg-replying'); }
        i++; txt.data = full.slice(0, i);
        if (i < full.length) {
          later(step, '，。！？,.!?\n'.includes(full[i - 1]) ? 160 : 34 + Math.random() * 34);
        } else {
          later(() => {
            if (typers.get(bubble) !== token) return;
            wrap.classList.remove('sg-replying'); settleSpin(wrap, later); wrap.classList.add('sg-done');
            later(() => { if (typers.get(bubble) === token) { caret.classList.add('is-done'); wrap.classList.remove('sg-done'); } }, 900);
          }, 120);
          resolve();
        }
      };
      later(step, delay);
    });
  }

  /* ───────── mirror tilt (max tier) ───────── */
  function attachTilt(bubble) {
    if (bubble._sgTilt) return; bubble._sgTilt = true;
    bubble.addEventListener('pointermove', e => {
      const skin = bubble.closest('.sg-skin');
      if (RM || !skin || skin.classList.contains('sg-paused') || !skin.classList.contains('sg-ge6')) return;
      const r = bubble.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      bubble.style.setProperty('--sg-rx', ((.5 - y) * 9).toFixed(2) + 'deg');
      bubble.style.setProperty('--sg-ry', ((x - .5) * 11).toFixed(2) + 'deg');
      bubble.style.setProperty('--sg-mx', (x * 100).toFixed(1) + '%');
      bubble.style.setProperty('--sg-my', (y * 100).toFixed(1) + '%');
    });
    bubble.addEventListener('pointerleave', () => { bubble.style.setProperty('--sg-rx', '0deg'); bubble.style.setProperty('--sg-ry', '0deg'); });
  }

  /* ───────── particles: one small canvas per bubble, only while on screen ───────── */
  const TAU = Math.PI * 2;
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = a => a[(Math.random() * a.length) | 0];
  const rgb = c => `rgb(${c.join(',')})`;
  const PAL = {
    dark:  { paper: [251, 245, 234], back: [226, 212, 190], line: [170, 128, 88], edge: null, sun: [[238, 123, 58], [247, 165, 108], [242, 208, 142]], mote: [[248, 227, 174], [255, 236, 210], [247, 165, 108]], add: true },
    light: { paper: [255, 253, 249], back: [238, 228, 212], line: [190, 155, 115], edge: [205, 185, 160], sun: [[214, 96, 38], [238, 123, 58], [190, 140, 60]], mote: [[200, 140, 60], [214, 96, 38]], add: false }
  };
  const spriteCache = new Map();
  function sprite(c) {
    const k = c.join(',');
    if (spriteCache.has(k)) return spriteCache.get(k);
    const s = document.createElement('canvas'); s.width = s.height = 32;
    const g = s.getContext('2d'), gr = g.createRadialGradient(16, 16, 0, 16, 16, 16);
    gr.addColorStop(0, `rgba(${k},1)`); gr.addColorStop(.25, `rgba(${k},.75)`); gr.addColorStop(1, `rgba(${k},0)`);
    g.fillStyle = gr; g.fillRect(0, 0, 32, 32); spriteCache.set(k, s); return s;
  }

  class FX {
    constructor(canvas, source) {
      this.cv = canvas; this.cx = canvas.getContext('2d'); this.src = source;
      this.ps = []; this.rate = 0; this.acc = 0; this.visible = true;
      this.size();
      if ('ResizeObserver' in root) { this.observer=new ResizeObserver(() => this.size());this.observer.observe(canvas); }
    }
    destroy() { this.observer?.disconnect(); this.visible=false;this.rate=0;this.ps=[];fxSet.delete(this);this.cx.clearRect(0,0,this.cv.width,this.cv.height); }
    mode() { const t = this.cv.closest('[data-sg-theme]'); return (t && t.dataset.sgTheme) || cfg.theme; }
    size() {
      const r = this.cv.getBoundingClientRect(); this.dpr = Math.min(2, root.devicePixelRatio || 1);
      this.w = r.width; this.h = r.height;
      this.cv.width = Math.max(1, Math.round(r.width * this.dpr)); this.cv.height = Math.max(1, Math.round(r.height * this.dpr));
    }
    particle(type, x, y, vx, vy, o = {}) {
      if (this.ps.length > 260) return;
      const pal = PAL[this.mode()] || PAL.dark;
      this.ps.push({ type, x, y, vx, vy, age: 0, life: o.life ?? rand(2.4, 4.2), size: o.size ?? 1,
        rot: rand(0, TAU), vr: o.vr ?? rand(-1.8, 1.8), flip: rand(0, TAU), vf: rand(2, 4.5), sway: o.sway ?? rand(4, 12), sf: rand(.5, 1.1),
        drag: o.drag ?? 1, g: o.g ?? 0, c: type === 'sun' ? pick(pal.sun) : type === 'paper' ? null : pick(pal.mote) });
    }
    emit(dt) {
      if (!this.rate || !this.src || !this.visible) return;
      this.acc += dt * this.rate;
      if (this.acc < 1) return;
      const b = this.cv.getBoundingClientRect(), r = this.src.getBoundingClientRect();
      const x0 = r.left - b.left, y0 = r.top - b.top, w = r.width, h = r.height;
      while (this.acc >= 1) {
        this.acc -= 1;
        const roll = Math.random(), e = Math.random(); let x, y;
        if (roll < .3) {            // loose pages drift down and away
          if (e < .55) { x = x0 + rand(.1, .95) * w; y = y0 + h + rand(2, 6); } else if (e < .78) { x = x0 - rand(0, 4); y = y0 + rand(.35, 1) * h; } else { x = x0 + w + rand(3, 7); y = y0 + rand(.35, 1) * h; }
          this.particle('paper', x, y, rand(-10, 10), rand(8, 18), { size: rand(2.6, 3.8) });
        } else if (roll < .58) {    // tiny embroidered suns, from her hem
          if (e < .5) { x = x0 + rand(.1, .95) * w; y = y0 - rand(0, 3); } else if (e < .75) { x = x0 - rand(0, 4); y = y0 + rand(0, 1) * h; } else { x = x0 + w + rand(3, 7); y = y0 + rand(0, 1) * h; }
          this.particle('sun', x, y, rand(-8, 8), rand(-14, 6), { size: rand(2.4, 3.8), vr: rand(-1.2, 1.2) });
        } else {                    // gold dust rises
          if (e < .6) { x = x0 + rand(.05, .95) * w; y = y0 - rand(0, 4); } else if (e < .8) { x = x0 - rand(0, 5); y = y0 + rand(0, .6) * h; } else { x = x0 + w + rand(3, 8); y = y0 + rand(0, .6) * h; }
          this.particle('mote', x, y, rand(-5, 5), rand(-26, -10), { size: rand(.6, 1.6), sway: rand(3, 8) });
        }
      }
    }
    burst(x, y, n, power = 1) {
      for (let i = 0; i < n; i++) {
        const a = rand(0, TAU), sp = rand(50, 210) * power, t = Math.random();
        const type = t < .42 ? 'paper' : t < .64 ? 'sun' : t < .9 ? 'mote' : 'spark';
        this.particle(type, x, y, Math.cos(a) * sp, Math.sin(a) * sp - 40, {
          drag: .955, g: type === 'paper' ? 40 : type === 'sun' ? 18 : -10,
          size: type === 'paper' ? rand(4.5, 7.5) : type === 'sun' ? rand(3.6, 6) : type === 'spark' ? rand(3, 5) : rand(1, 2.2),
          life: rand(1.4, 2.8), sway: type === 'paper' ? rand(6, 14) : 0, vr: rand(-3, 3)
        });
      }
      fxSet.add(this); kick();
    }
    step(dt) {
      this.emit(dt);
      for (let i = this.ps.length - 1; i >= 0; i--) {
        const p = this.ps[i]; p.age += dt;
        if (p.age >= p.life) { this.ps.splice(i, 1); continue; }
        const k = Math.pow(p.drag, dt * 60); p.vx *= k; p.vy = p.vy * k + p.g * dt;
        p.x += (p.vx + Math.sin(p.age * p.sf * TAU) * p.sway) * dt; p.y += p.vy * dt;
        p.rot += p.vr * dt; p.flip += p.vf * dt;
      }
    }
    draw() {
      const c = this.cx, mode = this.mode(), pal = PAL[mode] || PAL.dark;
      c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0); c.clearRect(0, 0, this.w, this.h);
      for (const p of this.ps) {
        const t = p.age / p.life, a = Math.min(1, p.age / .25) * (t > .6 ? 1 - (t - .6) / .4 : 1);
        if (p.type === 'paper') {
          const f = Math.cos(p.flip), w = p.size * 1.5, h = p.size * 2;
          c.globalAlpha = a * .88; c.save(); c.translate(p.x, p.y); c.rotate(p.rot); c.scale(Math.max(.14, Math.abs(f)), 1);
          c.fillStyle = rgb(f > 0 ? pal.paper : pal.back); c.fillRect(-w / 2, -h / 2, w, h);
          if (pal.edge) { c.strokeStyle = rgb(pal.edge); c.lineWidth = .6; c.strokeRect(-w / 2, -h / 2, w, h); }
          if (f > 0 && p.size > 2.6) {
            c.strokeStyle = `rgba(${pal.line.join(',')},.6)`; c.lineWidth = .5; c.beginPath();
            for (let k = 0; k < 3; k++) { const yy = -h / 2 + h * (.28 + k * .22); c.moveTo(-w / 2 + w * .16, yy); c.lineTo(w / 2 - w * (k === 2 ? .4 : .16), yy); }
            c.stroke();
          }
          c.restore();
        } else if (p.type === 'sun') {
          c.globalAlpha = a; c.save(); c.translate(p.x, p.y); c.rotate(p.rot); c.fillStyle = rgb(p.c);
          for (let k = 0; k < 8; k++) { c.rotate(TAU / 8); c.beginPath(); c.ellipse(0, -p.size * .55, p.size * .17, p.size * .45, 0, 0, TAU); c.fill(); }
          c.fillStyle = mode === 'light' ? '#B98A3E' : '#F8E3AE'; c.beginPath(); c.arc(0, 0, p.size * .2, 0, TAU); c.fill();
          c.restore();
        } else if (p.type === 'mote') {
          const tw = .65 + .35 * Math.sin(p.age * 9 + p.rot * 5), s = p.size * 7;
          c.globalCompositeOperation = pal.add ? 'lighter' : 'source-over';
          c.globalAlpha = a * tw; c.drawImage(sprite(p.c), p.x - s / 2, p.y - s / 2, s, s);
          c.globalCompositeOperation = 'source-over';
        } else {
          const tw = Math.sin(Math.min(1, t) * Math.PI), s = p.size * (.55 + .6 * tw), k = s * .14;
          c.save(); c.translate(p.x, p.y);
          if (pal.add) { c.globalCompositeOperation = 'lighter'; c.globalAlpha = a * tw * .55; const g = p.size * 6; c.drawImage(sprite(p.c), -g / 2, -g / 2, g, g); c.globalCompositeOperation = 'source-over'; }
          c.globalAlpha = a * tw; c.fillStyle = rgb(p.c); c.beginPath(); c.moveTo(0, -s);
          c.quadraticCurveTo(k, -k, s, 0); c.quadraticCurveTo(k, k, 0, s); c.quadraticCurveTo(-k, k, -s, 0); c.quadraticCurveTo(-k, -k, 0, -s); c.fill();
          c.restore();
        }
      }
      c.globalAlpha = 1;
    }
  }

  const fxSet = new Set();
  let running = false, last = 0;
  function kick() { if (!running && fxSet.size) { running = true; last = performance.now(); requestAnimationFrame(loop); } }
  function loop(now) {
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    for (const fx of fxSet) {
      if (!fx.visible && !fx.ps.length) { fx.cx.clearRect(0, 0, fx.cv.width, fx.cv.height); fxSet.delete(fx); continue; }
      if (!fx.rate && !fx.ps.length) { fx.draw(); fxSet.delete(fx); continue; }
      fx.step(dt); fx.draw();
    }
    if (fxSet.size) requestAnimationFrame(loop); else running = false;
  }
  const io = 'IntersectionObserver' in root ? new IntersectionObserver(entries => {
    for (const e of entries) {
      const fx = e.target._sgFx; if (!fx) continue;
      fx.visible = e.isIntersecting;
      if (fx.visible && fx.rate) { fxSet.add(fx); kick(); }
    }
  }, { rootMargin: '80px' }) : null;

  function syncFX(wrap, t) {
    if (!cfg.particles || RM) return;
    let fx = wrap._sgFx;
    if (t >= 5 && !fx) {
      const cv = document.createElement('canvas'); cv.className = 'sg-fx'; cv.setAttribute('aria-hidden', 'true');
      wrap.prepend(cv);
      fx = wrap._sgFx = new FX(cv, wrap.querySelector('.sg-bubble'));
      if (io) io.observe(wrap);
    }
    if (!fx) return;
    fx.rate = t >= 6 ? 9 : t >= 5 ? 4.5 : 0;
    if (fx.rate && fx.visible) { fxSet.add(fx); kick(); }
  }

  /* ───────── one call per message ───────── */
  function enhance(el, { level, animate = false, delay = 0 } = {}) {
    injectDefs();
    const t = applyLevel(el, level ?? el.dataset.sgLevel ?? MAX);
    el.querySelectorAll('.sg-bubble').forEach(attachTilt);
    if (animate) {
      el.style.setProperty('--sg-d', (delay / 1000) + 's');
      el.classList.remove('sg-enter'); void el.offsetWidth; el.classList.add('sg-enter');
      el.querySelectorAll('.sg-bubble').forEach((b, i) => {
        const len = (b.querySelector('.sg-text')?.dataset.sgText || '').length;
        if (t >= 4 && !RM) {
          typeIn(b, { delay: delay + 900 + i * 200 });
          b.style.setProperty('--sg-fd', ((900 + len * 55 + 300) / 1000) + 's');
        } else { showFull(b); b.style.setProperty('--sg-fd', '.6s'); }
      });
    }
    return t;
  }

  /* ───────── level-up ceremony: the book opens to page 5200 ───────── */
  let busy = false;
  const wait = ms => new Promise(r => setTimeout(r, ms));
  function buildCeremony(container) {
    const fixed = container === document.body;
    const el = document.createElement('div');
    el.className = 'sg-cer' + (fixed ? ' sg-cer--fixed' : '');
    el.dataset.base = el.className;
    el.setAttribute('aria-hidden', 'true');
    const A = cfg.assets;
    el.innerHTML = `<div class="sg-cer__bg"></div>
      <div class="sg-cer__fig"><img src="${esc(A.figure)}" alt="" decoding="async"><span class="sg-glint sg-gf-hair">${STAR}</span><span class="sg-glint sg-gf-brooch">${STAR}</span><span class="sg-glint sg-gf-book">${STAR}</span></div>
      <div class="sg-cer__right">
        <div class="sg-bookwrap"><div class="sg-book">
          <div class="sg-book__back"></div>
          <div class="sg-book__page"><div class="sg-pg-head">${esc(cfg.journal)}</div><div class="sg-pg-lv"><i>Lv</i><b>4400</b></div><div class="sg-pg-rule"></div><div class="sg-pg-title">满级「${TIERS[5].name}」</div><img class="sg-wax" src="${esc(A.wax)}" alt=""></div>
          <div class="sg-leaf sg-leaf--3"><i class="sg-f"></i><i class="sg-b"><img src="${esc(A.sun)}" alt=""><p>每次相遇，<br>都留有光芒。</p></i></div>
          <div class="sg-leaf sg-leaf--2"><i class="sg-f"></i><i class="sg-b"></i></div>
          <div class="sg-leaf sg-leaf--1"><i class="sg-f"></i><i class="sg-b"></i></div>
          <div class="sg-cover"><div class="sg-f"><img src="${esc(A.sun)}" alt=""></div><div class="sg-b"></div></div>
        </div></div>
        <p class="sg-cer__sub">第 ${MAX} 页，未完待续</p>
      </div>
      <canvas class="sg-cer__fx"></canvas>
      <div class="sg-cer__flash"></div>`;
    container.appendChild(el);
    el._fx = new FX(el.querySelector('.sg-cer__fx'), null);
    return el;
  }
  let cancelActive = null;
  function cancelCeremony(){ cancelActive?.(); }
  async function ceremony({container=document.body,from=4400,onLevel,signal}={}) {
    if(busy||signal?.aborted)return;
    busy=true;injectDefs();
    const el=buildCeremony(container),base=el.dataset.base,num=el.querySelector('.sg-pg-lv b');
    const timers=new Set(),settlers=new Set();let cancelled=false,raf=0;
    const cancel=()=>{cancelled=true;for(const id of timers)clearTimeout(id);timers.clear();cancelAnimationFrame(raf);for(const done of settlers)done();settlers.clear();el._fx.destroy();el.remove()};
    cancelActive=cancel;signal?.addEventListener('abort',cancel,{once:true});
    const later=(fn,ms)=>{const id=setTimeout(()=>{timers.delete(id);if(!cancelled)fn()},ms);timers.add(id);return id};
    const wait=ms=>new Promise(resolve=>{const done=()=>{settlers.delete(done);resolve()};settlers.add(done);later(done,ms)});
    const set=s=>{el.className=base+s},start=from<MAX?clamp(from):4400;
    try {
      num.textContent=start;onLevel?.(start);el._fx.size();set(' is-on');
      await wait(700);if(cancelled)return;
      set(' is-on is-open');await wait(420);if(cancelled)return;
      later(()=>el.classList.add('is-f1'),60);later(()=>el.classList.add('is-f2'),480);later(()=>el.classList.add('is-f3'),900);
      const t0=performance.now();
      await new Promise(resolve=>{
        const done=()=>{settlers.delete(done);resolve()};settlers.add(done);
        const tick=now=>{if(cancelled)return done();const t=Math.min(1,(now-t0)/1600),v=Math.round(start+(MAX-start)*(1-Math.pow(1-t,3)));num.textContent=v;onLevel?.(v);if(t<1)raf=requestAnimationFrame(tick);else done()};tick(performance.now());
      });if(cancelled)return;
      el.classList.add('is-max');
      const r=el.getBoundingClientRect(),bk=el.querySelector('.sg-book').getBoundingClientRect();
      later(()=>el._fx.burst(bk.left-r.left+10,bk.top-r.top+bk.height*.45,130,1.9),480);
      await wait(2600);if(cancelled)return;el.classList.remove('is-on');await wait(500);
    } finally {cancel();signal?.removeEventListener('abort',cancel);cancelActive=null;busy=false;}
  }
  function destroy(el){
    el.querySelectorAll('.sg-bubble').forEach(showFull);
    el.querySelectorAll('.sg-bwrap').forEach(w=>{io?.unobserve(w);w._sgFx?.destroy();delete w._sgFx});
  }

  function setTheme(t) { cfg.theme = t === 'light' ? 'light' : 'dark'; }
  function init(opts = {}) {
    if (opts.assets) Object.assign(cfg.assets, opts.assets);
    ['name', 'journal', 'theme', 'particles'].forEach(k => { if (k in opts) cfg[k] = opts[k]; });
    if (document.body) injectDefs(); else document.addEventListener('DOMContentLoaded', injectDefs, { once: true });
    return api;
  }

  const api = { MAX, TIERS, tierOf, init, html, applyLevel, enhance, typeIn, showFull, ceremony, cancelCeremony, destroy, setTheme, get busy() { return busy; } };
  return api;
}
