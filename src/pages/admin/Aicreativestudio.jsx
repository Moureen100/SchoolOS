import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import './AICreativeStudio.css';
import { aiService, AINotConnectedError } from './aiService';

/* ════════════════════════════ Constants ════════════════════════════ */

const CATEGORIES = [
    { id: 'admission', name: 'Admission flyer', headline: 'Admissions Now Open', kicker: 'Enrol today', cta: 'Apply Now', size: 'a4' },
    { id: 'event', name: 'Event poster', headline: 'You’re Invited', kicker: 'Live event', cta: 'Reserve Your Seat', size: 'a3' },
    { id: 'church', name: 'Church & community', headline: 'Join Us This Sunday', kicker: 'All are welcome', cta: 'Everyone Welcome', size: 'a4' },
    { id: 'business', name: 'Business advert', headline: 'Grand Opening Offer', kicker: 'Limited time', cta: 'Call Us Today', size: 'a4' },
    { id: 'banner', name: 'Large banner', headline: 'Big News Is Here', kicker: 'Announcing', cta: 'Visit Us', size: 'banner6x2' },
    { id: 'social', name: 'Social post', headline: 'Something Great Is Coming', kicker: 'Stay tuned', cta: 'Learn More', size: 'square' },
];

// Design units are CSS px at 96 dpi. 1 in = 96, 1 ft = 1152.
const SIZES = [
    { id: 'a4', group: 'Print', label: 'A4 flyer', w: 794, h: 1123, note: '210 × 297 mm' },
    { id: 'a5', group: 'Print', label: 'A5 handbill', w: 559, h: 794, note: '148 × 210 mm' },
    { id: 'a3', group: 'Print', label: 'A3 poster', w: 1123, h: 1587, note: '297 × 420 mm' },
    { id: 'p18', group: 'Print', label: 'Poster 18 × 24 in', w: 1728, h: 2304, note: '18 × 24 in' },
    { id: 'square', group: 'Digital', label: 'Social square', w: 1080, h: 1080, note: '1080 × 1080 px' },
    { id: 'story', group: 'Digital', label: 'Story / status', w: 1080, h: 1920, note: '1080 × 1920 px' },
    { id: 'banner6x2', group: 'Banner', label: 'Banner 6 × 2 ft', w: 6912, h: 2304, note: '6 × 2 ft' },
    { id: 'banner8x3', group: 'Banner', label: 'Banner 8 × 3 ft', w: 9216, h: 3456, note: '8 × 3 ft' },
    { id: 'rollup', group: 'Banner', label: 'Roll-up 33 × 80 in', w: 3168, h: 7680, note: '33 × 80 in' },
];
const UNIT_PX = { px: 1, in: 96, cm: 96 / 2.54, mm: 96 / 25.4, ft: 1152 };

const FONTS = ['Poppins', 'Montserrat', 'Inter', 'Playfair Display', 'DM Serif Display', 'Lora', 'Oswald', 'Bebas Neue'];
const EXPORT_QUALITY = [
    { id: 'screen', label: 'Screen', dpi: 96 },
    { id: 'p150', label: 'Print 150 dpi', dpi: 150 },
    { id: 'p300', label: 'Print 300 dpi', dpi: 300 },
];
const EXAMPLES = [
    'Admission flyer for a primary school, enrolment open for 2027',
    'Sunday service poster with worship, kids church and tea after service',
    'Grand opening banner for a new hardware shop',
];
const PALETTES = [
    { bg1: '#10256b', bg2: '#2f4bff', ink: '#0b1533', accent: '#ffc233', soft: '#f1f4ff' },
    { bg1: '#0f3d34', bg2: '#17a177', ink: '#0a2620', accent: '#ffd166', soft: '#effaf6' },
    { bg1: '#3c1a5b', bg2: '#9b3fd1', ink: '#210f33', accent: '#ff8fc0', soft: '#f8f1ff' },
    { bg1: '#6b1d1d', bg2: '#e2553a', ink: '#2a0e0e', accent: '#ffe08a', soft: '#fff3ee' },
    { bg1: '#141a2b', bg2: '#394764', ink: '#141a2b', accent: '#3ddcff', soft: '#f1f3f7' },
];
const STORE_KEY = 'ai-studio:designs:v1';

/* ═════════════════════════════ Helpers ═════════════════════════════ */

const uid = () => Math.random().toString(36).slice(2, 9);
const clone = (o) => JSON.parse(JSON.stringify(o));
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const slug = (s) => (s || 'design').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'design';

/** Swap this object for backend calls (e.g. /api/designs) when you add accounts. */
const storage = {
    list() {
        try { return JSON.parse(localStorage.getItem(STORE_KEY) || '[]'); } catch { return []; }
    },
    save(list) {
        try { localStorage.setItem(STORE_KEY, JSON.stringify(list)); return true; } catch { return false; }
    },
};

function resolveSize(sizeId, custom) {
    if (sizeId === 'custom') {
        const k = UNIT_PX[custom.unit] || 1;
        return { w: clamp(Math.round((+custom.w || 8) * k), 100, 20000), h: clamp(Math.round((+custom.h || 10) * k), 100, 20000) };
    }
    const s = SIZES.find((x) => x.id === sizeId) || SIZES[0];
    return { w: s.w, h: s.h };
}

function normalizeDesign(d, fallback = {}) {
    return {
        id: uid(), name: 'Untitled design', width: fallback.width || 794, height: fallback.height || 1123, ...d,
        background: { c1: '#ffffff', c2: '#ffffff', angle: 180, image: '', overlay: 0, ...d.background },
        elements: (d.elements || []).map((e) => ({ id: uid(), opacity: 1, ...e })),
    };
}

async function fileToDataUrl(file, max = 1600) {
    const url = URL.createObjectURL(file);
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const r = Math.min(1, max / Math.max(img.width, img.height));
    const c = document.createElement('canvas');
    c.width = Math.round(img.width * r); c.height = Math.round(img.height * r);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    URL.revokeObjectURL(url);
    return c.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.9);
}

/* ═══════════════ AI response → editable design ═══════════════
   aiService returns:
     generateDesigns → { designPlan, artwork, modelsUsed }
     regenerate / redesign → raw backend data ({ design_plan, artwork, models_used })
     improveDesign → { design_plan }
     replaceImage → { src }
   The plan is Llama output, so its exact keys are read in ONE place (readPlan).
   If your plan uses different key names, add them to the alias lists below.   */

const PLAN_KEYS = {
    kicker: ['kicker', 'eyebrow', 'tagline', 'label'],
    headline: ['headline', 'title', 'heading', 'main_title', 'mainTitle'],
    subtitle: ['subtitle', 'subheadline', 'sub_headline', 'subheading', 'description', 'body'],
    details: ['details', 'info', 'event_details', 'eventDetails', 'contact'],
    cta: ['cta', 'call_to_action', 'callToAction', 'button_text', 'buttonText'],
};

const hexToRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const rgbToHex = (r) => `#${r.map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('')}`;
const mix = (a, b, t) => { const A = hexToRgb(a), B = hexToRgb(b); return rgbToHex(A.map((v, i) => v + (B[i] - v) * t)); };
const lum = (h) => { const [r, g, b] = hexToRgb(h).map((v) => v / 255); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };

function paletteFromHexes(hexes) {
    if (!hexes || hexes.length < 2) return null;
    const bg1 = lum(hexes[0]) > 0.55 ? mix(hexes[0], '#000000', 0.5) : hexes[0];
    const bg2 = lum(hexes[1]) > 0.7 ? mix(hexes[1], '#000000', 0.35) : hexes[1];
    return { bg1, bg2, accent: hexes[2] || PALETTES[0].accent, ink: mix(bg1, '#000000', 0.55), soft: mix(bg2, '#ffffff', 0.92) };
}

/** Reads the Llama design plan. `base` supplies any field the plan doesn't contain. */
function readPlan(plan, base) {
    let p = plan;
    if (typeof p === 'string') {
        try { p = JSON.parse(p.replace(/```(?:json)?/g, '').trim()); } catch { p = null; }
    }
    if (!p || typeof p !== 'object') return { brief: base, pal: null, found: 0 };

    const scopes = [p, p.copy, p.text, p.texts, p.content, p.poster, p.design].filter((o) => o && typeof o === 'object' && !Array.isArray(o));
    const get = (keys) => {
        for (const o of scopes) {
            for (const k of keys) {
                const v = o[k];
                const s = Array.isArray(v) ? v.filter((x) => typeof x === 'string').join('  •  ') : typeof v === 'string' ? v : '';
                if (s.trim()) return s.trim();
            }
        }
        return '';
    };

    const brief = { ...base };
    let found = 0;
    Object.keys(PLAN_KEYS).forEach((field) => {
        const v = get(PLAN_KEYS[field]);
        if (v) { brief[field] = v; found += 1; }
    });

    let pal = null;
    for (const o of scopes) {
        const raw = o.palette || o.colors || o.colours || o.color_palette || o.color_scheme;
        if (raw) { pal = paletteFromHexes(JSON.stringify(raw).match(/#[0-9a-fA-F]{6}\b/g)); if (pal) break; }
    }
    return { brief, pal, found };
}

/** Normalises whatever the backend returns for an image into something usable as a src. */
function artworkSrc(a) {
    if (!a) return '';
    if (Array.isArray(a)) return artworkSrc(a[0]);
    if (typeof a === 'object') return artworkSrc(a.url || a.image || a.src || a.data || a.b64_json || a.base64 || '');
    if (typeof a !== 'string') return '';
    const s = a.trim();
    if (/^(data:|https?:|\/)/.test(s)) return s;
    if (/^[A-Za-z0-9+/=\s]{100,}$/.test(s)) return `data:image/png;base64,${s.replace(/\s/g, '')}`;
    return '';
}

/** Converts remote images to data URLs when CORS allows, so saving and export keep working. */
async function prepareImage(raw, max = 1600) {
    const src = artworkSrc(raw);
    if (!src || src.startsWith('data:')) return src;
    try {
        const img = await new Promise((res, rej) => { const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => res(i); i.onerror = rej; i.src = src; });
        const r = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * r); c.height = Math.round(img.height * r);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        return c.toDataURL('image/png');
    } catch { return src; }
}

/* ═══════════════ Layout builder (editable elements, never a flat image) ═══════════════ */

const T = (o) => ({ id: uid(), type: 'text', text: '', fontFamily: 'Poppins', fontWeight: 700, fontSize: 40, color: '#ffffff', align: 'left', lineHeight: 1.15, letterSpacing: 0, opacity: 1, x: 0, y: 0, w: 100, ...o });
const I = (o) => ({ id: uid(), type: 'image', src: '', fit: 'cover', radius: 0, opacity: 1, x: 0, y: 0, w: 100, h: 100, ...o });
const S = (o) => ({ id: uid(), type: 'shape', shape: 'rect', fill: '#ffffff', radius: 0, opacity: 1, x: 0, y: 0, w: 100, h: 100, ...o });

const estH = (el) => String(el.text).split('\n').reduce((n, l) => n + Math.max(1, Math.ceil((l.length * el.fontSize * 0.54) / el.w)), 0) * el.fontSize * el.lineHeight;
const flow = (items, x, y, w) => items.map((it) => { const el = T({ ...it, x, y, w }); y += estH(el) + (it.gap ?? el.fontSize * 0.5); return el; });
const endY = (els) => { const l = els[els.length - 1]; return l.y + estH(l); };
const fitFs = (text, w, max, lines = 3) => Math.min(max, (lines * w) / (0.6 * Math.max(text.length, 4)));

function buildLayout(tpl, b, W, H, p, im) {
    const u = Math.min(W, H), m = u * 0.07, wide = W / H > 1.3;
    const logo = im.logo ? [I({ role: 'logo', src: im.logo, fit: 'contain', x: m, y: m, w: u * 0.2, h: u * 0.1 })] : [];
    const photo = (o) => I({ role: 'photo', src: im.photo || '', ...o });
    const pill = (x, y, color, tc, w) => {
        const fs = u * 0.032, h = fs * 2.4, pw = Math.max(u * 0.3, b.cta.length * fs * 0.75);
        return [S({ role: 'pill', x, y, w: pw, h, fill: color, radius: h / 2 }),
            T({ role: 'cta', text: b.cta, x, y: y + h / 2 - fs * 0.6, w: pw, align: 'center', fontSize: fs, fontWeight: 700, color: tc, lineHeight: 1.2 })];
    };
    const kick = (color) => ({ role: 'kicker', text: b.kicker.toUpperCase(), fontSize: u * 0.026, fontWeight: 700, color, letterSpacing: 3, gap: u * 0.02 });
    const sub = (color) => ({ role: 'subtitle', text: b.subtitle, fontSize: u * 0.03, fontWeight: 400, color, opacity: 0.85, lineHeight: 1.4, gap: u * 0.03 });
    const det = (color) => ({ role: 'details', text: b.details, fontSize: u * 0.026, fontWeight: 600, color, gap: u * 0.04 });
    const head = (color, tw, max, align) => ({ role: 'headline', text: b.headline, fontSize: fitFs(b.headline, tw, max), fontWeight: 800, color, lineHeight: 1.05, gap: u * 0.025, align });

    if (tpl === 0) { // Split
        const tw = wide ? W * 0.5 - m : W - 2 * m, ty = wide ? H * 0.16 : H * 0.47;
        const els = flow([kick(p.accent), head('#ffffff', tw, u * (wide ? 0.12 : 0.1)), sub('#ffffff'), det('#ffffff')], m, ty, tw);
        return {
            background: { c1: p.bg1, c2: p.bg2, angle: 150, image: '', overlay: 0 },
            elements: [photo(wide ? { x: W * 0.55, y: 0, w: W * 0.45, h: H } : { x: 0, y: 0, w: W, h: H * 0.42 }),
                S({ x: wide ? W * 0.55 - u * 0.015 : 0, y: wide ? 0 : H * 0.42 - u * 0.015, w: wide ? u * 0.015 : W, h: wide ? H : u * 0.015, fill: p.accent }),
                ...logo, ...els, ...pill(m, endY(els) + u * 0.03, p.accent, p.ink)],
        };
    }
    if (tpl === 1) { // Poster
        const tw = wide ? W * 0.7 : W - 2 * m, tx = (W - tw) / 2, band = u * 0.14;
        const els = flow([kick(p.accent), head('#ffffff', tw, u * 0.12, 'center'), sub('#ffffff'), det('#ffffff')].map((i) => ({ ...i, align: 'center' })), tx, H * (wide ? 0.2 : 0.24), tw);
        const fs = u * 0.04;
        return {
            background: { c1: p.bg1, c2: p.bg2, angle: 160, image: im.photo || '', overlay: im.photo ? 0.55 : 0 },
            elements: [...logo.map((l) => ({ ...l, x: (W - u * 0.2) / 2 })), ...els,
                S({ role: 'pill', x: 0, y: H - band, w: W, h: band, fill: p.accent }),
                T({ role: 'cta', text: b.cta, x: 0, y: H - band / 2 - fs * 0.6, w: W, align: 'center', fontSize: fs, fontWeight: 800, color: p.ink, lineHeight: 1.2 })],
        };
    }
    if (tpl === 2) { // Clean
        const tw = wide ? W * 0.5 - m : W - 2 * m, ty = wide ? H * 0.16 : m * 1.6;
        const top = flow([kick(p.bg2), head(p.ink, tw, u * (wide ? 0.12 : 0.095)), sub(p.ink)], m, ty, tw);
        const dets = flow([det(p.ink)], m, wide ? endY(top) + u * 0.03 : H * 0.77, tw);
        return {
            background: { c1: p.soft, c2: '#ffffff', angle: 180, image: '', overlay: 0 },
            elements: [S({ x: 0, y: 0, w: W, h: u * 0.025, fill: p.bg2 }),
                photo(wide ? { x: W * 0.56, y: H * 0.12, w: W * 0.38, h: H * 0.76, radius: u * 0.04 } : { x: m, y: H * 0.43, w: W - 2 * m, h: H * 0.3, radius: u * 0.04 }),
                ...logo.map((l) => ({ ...l, x: wide ? m : W - m - u * 0.2, y: wide ? H - m - u * 0.1 : H - m - u * 0.1 })),
                ...top, ...dets, ...pill(m, endY(dets) + u * 0.02, p.bg2, '#ffffff')],
        };
    }
    // Spotlight
    const d = wide ? H * 0.62 : W * 0.56, dx = wide ? W * 0.66 : (W - d) / 2, dy = wide ? H * 0.19 : H * 0.08, ring = u * 0.02;
    const tw = wide ? W * 0.55 - m : W - 2 * m, al = wide ? 'left' : 'center';
    const els = flow([kick(p.accent), head('#ffffff', tw, u * 0.1, al), sub('#ffffff'), det('#ffffff')].map((i) => ({ ...i, align: al })), m, wide ? H * 0.2 : dy + d + u * 0.06, tw);
    const cta = pill(wide ? m : (W - Math.max(u * 0.3, b.cta.length * u * 0.024)) / 2, endY(els) + u * 0.03, p.accent, p.ink);
    return {
        background: { c1: p.ink, c2: p.bg1, angle: 200, image: '', overlay: 0 },
        elements: [S({ shape: 'circle', x: dx - ring, y: dy - ring, w: d + ring * 2, h: d + ring * 2, fill: p.accent }),
            photo({ x: dx, y: dy, w: d, h: d, radius: d / 2 }), ...logo, ...els, ...cta],
    };
}

const briefFromPrompt = (prompt, cat) => ({
    kicker: cat.kicker, headline: cat.headline, cta: cat.cta, details: 'Date  •  Time  •  Venue',
    subtitle: prompt.trim().replace(/\s+/g, ' ').slice(0, 120) || 'Add a short supporting line here.',
});
const briefFromDesign = (d) => {
    const t = (r, f) => d.elements.find((e) => e.role === r)?.text || f;
    return { kicker: t('kicker', 'Announcing'), headline: t('headline', 'Your headline'), subtitle: t('subtitle', ''), details: t('details', ''), cta: t('cta', 'Learn More') };
};
const assetsFromDesign = (d) => ({
    photo: d.elements.find((e) => e.role === 'photo' && e.src)?.src || d.background.image || '',
    logo: d.elements.find((e) => e.role === 'logo')?.src || '',
});

/** Local starter layouts (NOT AI). Used only when the AI backend is not connected. */
function makeLocalDesigns({ prompt, category, size, assets, seed = 0, count = 4 }) {
    const cat = CATEGORIES.find((c) => c.id === category) || CATEGORIES[0];
    const b = briefFromPrompt(prompt, cat);
    return Array.from({ length: count }, (_, i) => {
        const template = i % 4, palette = (seed + i) % PALETTES.length;
        const L = buildLayout(template, b, size.w, size.h, PALETTES[palette], { photo: assets.photos[0]?.src || '', logo: assets.logo?.src || '' });
        return normalizeDesign({ name: cat.name, category, width: size.w, height: size.h, source: 'local', meta: { template, palette }, ...L });
    });
}

/** AI designs: Llama plan → copy + palette, FLUX artwork → photo slot, laid out as editable elements. */
function makeAIDesigns({ plan, artwork, prompt, category, size, assets, seed = 0, count = 4 }) {
    const cat = CATEGORIES.find((c) => c.id === category) || CATEGORIES[0];
    const info = readPlan(plan, briefFromPrompt(prompt, cat));
    const uploaded = assets.photos[0]?.src || '';
    const photo = uploaded || artwork || '';
    const photoSource = uploaded ? 'user' : 'ai';
    const designs = Array.from({ length: count }, (_, i) => {
        const template = i % 4, palette = (seed + i) % PALETTES.length;
        const L = buildLayout(template, info.brief, size.w, size.h, info.pal || PALETTES[palette], { photo, logo: assets.logo?.src || '' });
        return normalizeDesign({ name: cat.name, category, width: size.w, height: size.h, source: 'ai', meta: { template, palette, pal: info.pal, photoSource }, ...L });
    });
    return { designs, found: info.found };
}

/** Rebuilds an existing design with a new template / palette / copy / image while keeping user-added elements. */
function rebuildDesign(d, { template, palette, pal, brief, assets, photoSource }) {
    const m = d.meta || {};
    const t = template ?? m.template ?? 0;
    const pIdx = palette ?? m.palette ?? 0;
    const activePal = pal ?? (palette != null ? null : m.pal) ?? null;
    const P = activePal || PALETTES[pIdx % PALETTES.length];
    const L = buildLayout(t, brief || briefFromDesign(d), d.width, d.height, P, assets || assetsFromDesign(d));
    const kept = d.elements.filter((e) => e.user);
    return normalizeDesign({
        ...d, background: L.background, elements: [...L.elements, ...kept],
        meta: { ...m, template: t, palette: pIdx, pal: activePal, photoSource: photoSource ?? m.photoSource },
    }, d);
}

/* ═══════════════════════ Export (canvas → PNG/JPG/PDF) ═══════════════════════
   Content stays editable in the app; export draws the same data to a canvas. */

function exportScale(W, H, dpi) {
    const s = Math.min(dpi / 96, 12000 / Math.max(W, H), Math.sqrt(120e6 / (W * H)));
    return { scale: s, px: [Math.round(W * s), Math.round(H * s)], dpi: Math.round(s * 96) };
}
const loadImage = (src) => new Promise((res) => { const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
const roundRect = (ctx, x, y, w, h, r) => { r = Math.min(r || 0, w / 2, h / 2); ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h); };

function drawImageFit(ctx, img, x, y, w, h, fit) {
    const iw = img.width, ih = img.height;
    if (fit === 'contain') {
        const s = Math.min(w / iw, h / ih);
        ctx.drawImage(img, x + (w - iw * s) / 2, y + (h - ih * s) / 2, iw * s, ih * s);
    } else {
        const s = Math.max(w / iw, h / ih), sw = w / s, sh = h / s;
        ctx.drawImage(img, (iw - sw) / 2, (ih - sh) / 2, sw, sh, x, y, w, h);
    }
}
function wrapText(ctx, text, maxW) {
    const out = [];
    String(text).split('\n').forEach((par) => {
        let line = '';
        par.split(' ').forEach((word) => {
            const t = line ? `${line} ${word}` : word;
            if (line && ctx.measureText(t).width > maxW) { out.push(line); line = word; } else line = t;
        });
        out.push(line);
    });
    return out;
}

async function renderToCanvas(d, scale) {
    const { width: W, height: H, background: bg } = d;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(W * scale); canvas.height = Math.round(H * scale);
    const ctx = canvas.getContext('2d');
    ctx.scale(scale, scale);

    const fonts = new Set(d.elements.filter((e) => e.type === 'text').map((e) => `${e.fontWeight} ${e.fontSize}px "${e.fontFamily}"`));
    await Promise.all([...fonts].map((f) => document.fonts.load(f).catch(() => {})));
    const [bgImg, ...imgs] = await Promise.all([bg.image ? loadImage(bg.image) : null, ...d.elements.map((e) => (e.type === 'image' && e.src ? loadImage(e.src) : null))]);

    const a = (bg.angle * Math.PI) / 180, L = Math.abs(W * Math.sin(a)) + Math.abs(H * Math.cos(a)), cx = W / 2, cy = H / 2;
    const g = ctx.createLinearGradient(cx - (Math.sin(a) * L) / 2, cy + (Math.cos(a) * L) / 2, cx + (Math.sin(a) * L) / 2, cy - (Math.cos(a) * L) / 2);
    g.addColorStop(0, bg.c1); g.addColorStop(1, bg.c2);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    if (bgImg) {
        drawImageFit(ctx, bgImg, 0, 0, W, H, 'cover');
        ctx.fillStyle = `rgba(0,0,0,${bg.overlay})`; ctx.fillRect(0, 0, W, H);
    }

    d.elements.forEach((e, i) => {
        ctx.save(); ctx.globalAlpha = e.opacity ?? 1;
        if (e.type === 'shape') {
            ctx.fillStyle = e.fill;
            if (e.shape === 'circle') { ctx.beginPath(); ctx.ellipse(e.x + e.w / 2, e.y + e.h / 2, e.w / 2, e.h / 2, 0, 0, Math.PI * 2); } else roundRect(ctx, e.x, e.y, e.w, e.h, e.radius);
            ctx.fill();
        } else if (e.type === 'image' && imgs[i]) {
            roundRect(ctx, e.x, e.y, e.w, e.h, e.radius); ctx.clip();
            drawImageFit(ctx, imgs[i], e.x, e.y, e.w, e.h, e.fit);
        } else if (e.type === 'text') {
            ctx.font = `${e.fontWeight} ${e.fontSize}px "${e.fontFamily}", sans-serif`;
            if ('letterSpacing' in ctx) ctx.letterSpacing = `${e.letterSpacing || 0}px`;
            ctx.fillStyle = e.color; ctx.textBaseline = 'middle'; ctx.textAlign = e.align;
            const ax = e.align === 'center' ? e.x + e.w / 2 : e.align === 'right' ? e.x + e.w : e.x, lh = e.fontSize * e.lineHeight;
            wrapText(ctx, e.text, e.w).forEach((line, n) => ctx.fillText(line, ax, e.y + lh * (n + 0.5)));
        }
        ctx.restore();
    });
    return canvas;
}

const canvasToBlob = (c, type, q) => new Promise((res) => c.toBlob(res, type, q));
function buildPdf(jpeg, pxW, pxH, ptW, ptH) {
    const enc = new TextEncoder(), parts = [], off = [];
    let len = 0;
    const push = (d) => { const b = typeof d === 'string' ? enc.encode(d) : d; parts.push(b); len += b.length; };
    const obj = (n, body) => { off[n] = len; push(`${n} 0 obj\n${body}\nendobj\n`); };
    push('%PDF-1.4\n');
    obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
    obj(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
    obj(3, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${ptW} ${ptH}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`);
    off[4] = len;
    push(`4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${pxW} /Height ${pxH} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`);
    push(jpeg); push('\nendstream\nendobj\n');
    const content = `q ${ptW} 0 0 ${ptH} 0 0 cm /Im0 Do Q`;
    obj(5, `<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
    const xref = len;
    push('xref\n0 6\n0000000000 65535 f \n');
    for (let i = 1; i <= 5; i++) push(`${String(off[i]).padStart(10, '0')} 00000 n \n`);
    push(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
    return new Blob(parts, { type: 'application/pdf' });
}

async function exportDesign(d, format, dpi) {
    const { scale, px } = exportScale(d.width, d.height, dpi);
    const canvas = await renderToCanvas(d, scale);
    const name = slug(d.name);
    let blob, file;
    if (format === 'png') { blob = await canvasToBlob(canvas, 'image/png'); file = `${name}.png`; }
    else if (format === 'jpg') { blob = await canvasToBlob(canvas, 'image/jpeg', 0.95); file = `${name}.jpg`; }
    else {
        const jpeg = new Uint8Array(await (await canvasToBlob(canvas, 'image/jpeg', 0.95)).arrayBuffer());
        blob = buildPdf(jpeg, px[0], px[1], +(d.width * 0.75).toFixed(2), +(d.height * 0.75).toFixed(2)); file = `${name}.pdf`;
    }
    const url = URL.createObjectURL(blob);
    Object.assign(document.createElement('a'), { href: url, download: file }).click();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/* ═══════════════════════════ UI primitives ═══════════════════════════ */

const ICONS = {
    sparkle: 'M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z',
    type: 'M4 7V5h16v2M9 19h6M12 5v14', image: 'M3 5h18v14H3z M3 16l5-5 4 4 3-3 6 6 M8.5 9.5h.01',
    square: 'M4 4h16v16H4z', circle: 'M12 3a9 9 0 100 18 9 9 0 000-18z', undo: 'M9 14L4 9l5-5 M4 9h10a6 6 0 010 12h-3',
    download: 'M12 3v12 M7 10l5 5 5-5 M4 21h16', save: 'M5 3h11l3 3v15H5z M8 3v6h7V3 M8 21v-7h8v7',
    copy: 'M9 9h11v11H9z M5 15H4V4h11v1', trash: 'M4 7h16 M9 7V4h6v3 M6 7l1 13h10l1-13', up: 'M12 19V5 M6 11l6-6 6 6',
    down: 'M12 5v14 M6 13l6 6 6-6', upload: 'M12 16V4 M7 9l5-5 5 5 M4 20h16', wand: 'M4 20L16 8 M14 6l4 4 M18 3v3 M16.5 4.5h3',
    refresh: 'M20 11a8 8 0 00-14-4L4 9 M4 4v5h5 M4 13a8 8 0 0014 4l2-2 M20 20v-5h-5', back: 'M15 5l-7 7 7 7',
    plus: 'M12 5v14M5 12h14', x: 'M6 6l12 12M18 6L6 18', layout: 'M3 3h18v18H3z M3 9h18 M9 21V9',
    swap: 'M7 7h13l-3-3 M17 17H4l3 3', minus: 'M5 12h14',
};
const Icon = ({ name, size = 18 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={ICONS[name]} /></svg>
);

function useSize() {
    const ref = useRef(null);
    const [s, setS] = useState({ w: 0, h: 0 });
    useLayoutEffect(() => {
        const el = ref.current; if (!el) return undefined;
        const ro = new ResizeObserver(([e]) => setS({ w: e.contentRect.width, h: e.contentRect.height }));
        ro.observe(el); return () => ro.disconnect();
    }, []);
    return [ref, s];
}

const bgCss = (bg) => ({
    background: `${bg.image ? `linear-gradient(rgba(0,0,0,${bg.overlay}),rgba(0,0,0,${bg.overlay})),url("${bg.image}") center/cover no-repeat,` : ''}linear-gradient(${bg.angle}deg,${bg.c1},${bg.c2})`,
});

function ElementView({ el, u, scale, selected, interactive, onDown }) {
    const base = { left: el.x, top: el.y, width: el.w, opacity: el.opacity };
    let style, cls = `el el-${el.type}`, label = null;
    if (el.type === 'text') {
        style = { ...base, fontFamily: `"${el.fontFamily}", sans-serif`, fontSize: el.fontSize, fontWeight: el.fontWeight, color: el.color, textAlign: el.align, lineHeight: el.lineHeight, letterSpacing: el.letterSpacing, whiteSpace: 'pre-wrap' };
    } else {
        style = { ...base, height: el.h, borderRadius: el.shape === 'circle' ? '50%' : el.radius };
        if (el.type === 'shape') style.background = el.fill;
        if (el.type === 'image') {
            if (el.src) Object.assign(style, { backgroundImage: `url("${el.src}")`, backgroundSize: el.fit, backgroundPosition: 'center', backgroundRepeat: 'no-repeat' });
            else { cls += ' is-empty'; style.fontSize = Math.max(14, Math.min(el.w, el.h) * 0.05); style.borderWidth = Math.max(2, u * 0.004); label = 'Add an image'; }
        }
    }
    if (selected) style.outline = `${2 / scale}px solid var(--accent)`;
    return (
        <div className={cls} style={style} onPointerDown={interactive ? (e) => onDown(e, el, 'move') : undefined}>
            {el.type === 'text' ? el.text : label}
            {selected && <span className="handle" style={{ width: 12 / scale, height: 12 / scale, right: -6 / scale, bottom: -6 / scale, borderWidth: 2 / scale }} onPointerDown={(e) => onDown(e, el, 'resize')} />}
        </div>
    );
}

/** Renders a design at `scale`. Pass `interactive` for the editor. */
function Stage({ design, scale, selectedId, interactive, onSelect, onPatch }) {
    const { width: W, height: H } = design;
    const u = Math.min(W, H);
    const startDrag = (e, el, mode) => {
        e.stopPropagation(); e.preventDefault(); onSelect(el.id);
        const s0 = { x: e.clientX, y: e.clientY, ex: el.x, ey: el.y, ew: el.w, eh: el.h }, key = `drag:${el.id}:${Date.now()}`;
        const move = (ev) => {
            const dx = (ev.clientX - s0.x) / scale, dy = (ev.clientY - s0.y) / scale;
            if (mode === 'move') {
                let x = s0.ex + dx; const snap = 8 / scale;
                if (Math.abs(x + el.w / 2 - W / 2) < snap) x = W / 2 - el.w / 2;
                onPatch(el.id, { x: Math.round(x), y: Math.round(s0.ey + dy) }, key);
            } else onPatch(el.id, el.type === 'text' ? { w: Math.max(40, Math.round(s0.ew + dx)) } : { w: Math.max(20, Math.round(s0.ew + dx)), h: Math.max(20, Math.round(s0.eh + dy)) }, key);
        };
        const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
        window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
    };
    return (
        <div className="stage" style={{ width: W * scale, height: H * scale }} onPointerDown={interactive ? () => onSelect(null) : undefined}>
            <div className="stage-inner" style={{ width: W, height: H, transform: `scale(${scale})` }}>
                <div className="stage-bg" style={bgCss(design.background)} />
                {design.elements.map((el) => <ElementView key={el.id} el={el} u={u} scale={scale} selected={interactive && el.id === selectedId} interactive={interactive} onDown={startDrag} />)}
            </div>
        </div>
    );
}

function Thumb({ design }) {
    const [ref, { w, h }] = useSize();
    const scale = w && h ? Math.min(w / design.width, h / design.height) : 0;
    return <div className="thumb" ref={ref}>{scale > 0 && <Stage design={design} scale={scale} />}</div>;
}

const Field = ({ label, children }) => <label className="field"><span>{label}</span>{children}</label>;
const Num = ({ label, value, onChange, min, max, step = 1 }) => (
    <Field label={label}><input type="number" value={Math.round(value * 100) / 100} min={min} max={max} step={step} onChange={(e) => onChange(Number(e.target.value))} /></Field>
);
const Range = ({ label, value, onChange, min, max, step = 1 }) => (
    <Field label={label}><input type="range" value={value} min={min} max={max} step={step} onChange={(e) => onChange(Number(e.target.value))} /></Field>
);
const Color = ({ label, value, onChange }) => (
    <Field label={label}><span className="color"><input type="color" value={value} onChange={(e) => onChange(e.target.value)} /><code>{value}</code></span></Field>
);

function UploadButton({ label, icon = 'upload', multiple, onFiles, className = 'btn ghost' }) {
    return (
        <label className={className}>
            <Icon name={icon} size={16} />{label}
            <input type="file" accept="image/*" multiple={multiple} hidden onChange={(e) => { onFiles([...e.target.files]); e.target.value = ''; }} />
        </label>
    );
}

/* ═════════════════════════════ Create view ═════════════════════════════ */

function CreateView({ brief, setBrief, results, onGenerate, onOpen, onBlank }) {
    const cat = CATEGORIES.find((c) => c.id === brief.category);
    const addFiles = async (files, kind) => {
        const list = await Promise.all(files.slice(0, 6).map(async (f) => ({ id: uid(), name: f.name, src: await fileToDataUrl(f) })));
        setBrief((b) => (kind === 'logo' ? { ...b, logo: list[0] } : { ...b, photos: [...b.photos, ...list].slice(0, 6) }));
    };
    return (
        <main className="create">
            <aside className="brief">
                <div className="brief-head">
                    <h1>What would you like to create?</h1>
                    <p>Describe it in your own words. Add your photos and logo, or let AI find the imagery.</p>
                </div>
                <textarea className="prompt" rows={5} value={brief.prompt} maxLength={600} placeholder="e.g. Admission flyer for Bright Future Academy, nursery to primary 7, enrolment open for 2027, call 0700 000 000"
                          onChange={(e) => setBrief({ ...brief, prompt: e.target.value })} />
                <div className="chips">{EXAMPLES.map((x) => <button key={x} className="chip" onClick={() => setBrief({ ...brief, prompt: x })}>{x}</button>)}</div>

                <h3>Design type</h3>
                <div className="seg-grid">
                    {CATEGORIES.map((c) => (
                        <button key={c.id} className={`seg ${brief.category === c.id ? 'on' : ''}`} onClick={() => setBrief({ ...brief, category: c.id, sizeId: brief.sizeId === 'custom' ? 'custom' : c.size })}>{c.name}</button>
                    ))}
                </div>

                <h3>Size</h3>
                <select className="select" value={brief.sizeId} onChange={(e) => setBrief({ ...brief, sizeId: e.target.value })}>
                    {['Print', 'Digital', 'Banner'].map((g) => (
                        <optgroup key={g} label={g}>{SIZES.filter((s) => s.group === g).map((s) => <option key={s.id} value={s.id}>{s.label} — {s.note}</option>)}</optgroup>
                    ))}
                    <option value="custom">Custom size…</option>
                </select>
                {brief.sizeId === 'custom' && (
                    <div className="custom-size">
                        <input type="number" min="1" placeholder="Width" value={brief.custom.w} onChange={(e) => setBrief({ ...brief, custom: { ...brief.custom, w: e.target.value } })} />
                        <span>×</span>
                        <input type="number" min="1" placeholder="Height" value={brief.custom.h} onChange={(e) => setBrief({ ...brief, custom: { ...brief.custom, h: e.target.value } })} />
                        <select value={brief.custom.unit} onChange={(e) => setBrief({ ...brief, custom: { ...brief.custom, unit: e.target.value } })}>
                            {Object.keys(UNIT_PX).map((u) => <option key={u}>{u}</option>)}
                        </select>
                    </div>
                )}

                <h3>Your images</h3>
                <div className="assets">
                    <div className="asset-row">
                        <UploadButton label="Add photos" icon="image" multiple onFiles={(f) => addFiles(f, 'photo')} />
                        <UploadButton label={brief.logo ? 'Change logo' : 'Add logo'} icon="plus" onFiles={(f) => addFiles(f, 'logo')} />
                    </div>
                    {(brief.photos.length > 0 || brief.logo) && (
                        <div className="asset-list">
                            {brief.photos.map((p) => (
                                <div key={p.id} className="asset" style={{ backgroundImage: `url("${p.src}")` }}>
                                    <button aria-label="Remove photo" onClick={() => setBrief({ ...brief, photos: brief.photos.filter((x) => x.id !== p.id) })}><Icon name="x" size={12} /></button>
                                </div>
                            ))}
                            {brief.logo && (
                                <div className="asset logo" style={{ backgroundImage: `url("${brief.logo.src}")` }}>
                                    <button aria-label="Remove logo" onClick={() => setBrief({ ...brief, logo: null })}><Icon name="x" size={12} /></button>
                                </div>
                            )}
                        </div>
                    )}
                    <label className="switch">
                        <input type="checkbox" checked={brief.aiImages} onChange={(e) => setBrief({ ...brief, aiImages: e.target.checked })} />
                        <i /> <span>Let AI create images when I haven’t uploaded any</span>
                    </label>
                </div>

                <button className="btn primary big" disabled={results.busy || !brief.prompt.trim()} onClick={() => onGenerate(false)}>
                    <Icon name="sparkle" /> {results.busy ? 'Designing…' : 'Generate designs'}
                </button>
                <button className="link-btn" onClick={onBlank}>or start with a blank {cat?.name.toLowerCase()}</button>
            </aside>

            <section className="results">
                {results.designs.length === 0 && !results.busy && (
                    <div className="empty">
                        <div className="stack"><i /><i /><i /></div>
                        <h2>Your designs will appear here</h2>
                        <p>You’ll get four different layouts to pick from. Every one stays fully editable.</p>
                        {results.error && <div className="notice error">{results.error}</div>}
                    </div>
                )}
                {(results.busy || results.designs.length > 0) && (
                    <>
                        <div className="results-head">
                            <div><h2>Choose a starting point</h2><p>{results.busy ? 'Building four layouts…' : 'Select one to edit. Nothing is flattened.'}</p></div>
                            <button className="btn ghost" disabled={results.busy} onClick={() => onGenerate(true)}><Icon name="refresh" size={16} /> Regenerate</button>
                        </div>
                        {results.notice && <div className="notice"><b>{results.noticeTitle}</b> {results.notice}</div>}
                        {results.error && <div className="notice error">{results.error}</div>}
                        <div className="vgrid">
                            {results.busy
                                ? [0, 1, 2, 3].map((i) => <div key={i} className="vcard skeleton"><div className="thumb" /><div className="vfoot" /></div>)
                                : results.designs.map((d, i) => (
                                    <article key={d.id} className="vcard" style={{ '--i': i }}>
                                        <button className="thumb-btn" onClick={() => onOpen(d)} aria-label={`Edit layout ${i + 1}`}><Thumb design={d} /></button>
                                        <div className="vfoot">
                                            <div><strong>Layout {i + 1}</strong><small>{d.source === 'local' ? 'Starter layout' : 'AI generated'}</small></div>
                                            <button className="btn small" onClick={() => onOpen(d)}>Edit</button>
                                        </div>
                                    </article>
                                ))}
                        </div>
                    </>
                )}
            </section>
        </main>
    );
}

/* ═════════════════════════════ Editor view ═════════════════════════════ */

function Inspector({ design, el, api }) {
    const u = Math.min(design.width, design.height);
    if (!el) {
        const bg = design.background;
        return (
            <div className="inspector">
                <h3>Background</h3>
                <Color label="Colour" value={bg.c1} onChange={(v) => api.patchBg({ c1: v, c2: bg.c1 === bg.c2 ? v : bg.c2 })} />
                <Color label="Gradient to" value={bg.c2} onChange={(v) => api.patchBg({ c2: v })} />
                <Range label="Angle" value={bg.angle} min={0} max={360} onChange={(v) => api.patchBg({ angle: v })} />
                <div className="row">
                    <UploadButton label={bg.image ? 'Replace image' : 'Background image'} icon="image" onFiles={async ([f]) => f && api.patchBg({ image: await fileToDataUrl(f, 2400), overlay: bg.overlay || 0.4 })} />
                    {bg.image && <button className="btn ghost" onClick={() => api.patchBg({ image: '' })}>Remove</button>}
                </div>
                {bg.image && <Range label="Dark overlay" value={bg.overlay} min={0} max={0.9} step={0.05} onChange={(v) => api.patchBg({ overlay: v })} />}
                <p className="hint">Click anything on the canvas to edit it. {Math.round(design.width)} × {Math.round(design.height)} px canvas.</p>
            </div>
        );
    }
    const p = (patch) => api.patch(el.id, patch);
    return (
        <div className="inspector">
            <h3>{el.type === 'text' ? 'Text' : el.type === 'image' ? 'Image' : 'Shape'}</h3>
            {el.type === 'text' && (
                <>
                    <textarea className="textarea" rows={3} value={el.text} onChange={(e) => p({ text: e.target.value })} />
                    <Field label="Font"><select value={el.fontFamily} onChange={(e) => p({ fontFamily: e.target.value })}>{FONTS.map((f) => <option key={f}>{f}</option>)}</select></Field>
                    <Field label="Weight"><select value={el.fontWeight} onChange={(e) => p({ fontWeight: +e.target.value })}>{[400, 600, 700, 800].map((w) => <option key={w} value={w}>{w}</option>)}</select></Field>
                    <Range label={`Size ${Math.round(el.fontSize)}`} value={el.fontSize} min={8} max={Math.round(u * 0.3)} onChange={(v) => p({ fontSize: v })} />
                    <Color label="Colour" value={el.color} onChange={(v) => p({ color: v })} />
                    <div className="seg-row">{['left', 'center', 'right'].map((a) => <button key={a} className={`seg ${el.align === a ? 'on' : ''}`} onClick={() => p({ align: a })}>{a}</button>)}</div>
                    <Range label="Line height" value={el.lineHeight} min={0.8} max={2} step={0.05} onChange={(v) => p({ lineHeight: v })} />
                    <Range label="Letter spacing" value={el.letterSpacing} min={-2} max={12} step={0.5} onChange={(v) => p({ letterSpacing: v })} />
                </>
            )}
            {el.type === 'image' && (
                <>
                    <div className="row">
                        <UploadButton label={el.src ? 'Replace image' : 'Upload image'} icon="swap" onFiles={async ([f]) => f && p({ src: await fileToDataUrl(f, 2400) })} />
                        {el.src && <button className="btn ghost" onClick={() => p({ src: '' })}>Clear</button>}
                    </div>
                    <Field label="Fit"><select value={el.fit} onChange={(e) => p({ fit: e.target.value })}><option value="cover">Fill (crop)</option><option value="contain">Fit inside</option></select></Field>
                    <Range label="Corner radius" value={el.radius} min={0} max={Math.round(Math.min(el.w, el.h) / 2)} onChange={(v) => p({ radius: v })} />
                </>
            )}
            {el.type === 'shape' && (
                <>
                    <Color label="Fill" value={el.fill} onChange={(v) => p({ fill: v })} />
                    {el.shape === 'rect' && <Range label="Corner radius" value={el.radius} min={0} max={Math.round(Math.min(el.w, el.h) / 2)} onChange={(v) => p({ radius: v })} />}
                </>
            )}
            <Range label="Opacity" value={el.opacity} min={0.05} max={1} step={0.05} onChange={(v) => p({ opacity: v })} />
            <div className="grid2">
                <Num label="X" value={el.x} onChange={(v) => p({ x: v })} />
                <Num label="Y" value={el.y} onChange={(v) => p({ y: v })} />
                <Num label="Width" value={el.w} min={10} onChange={(v) => p({ w: v })} />
                {el.type !== 'text' && <Num label="Height" value={el.h} min={10} onChange={(v) => p({ h: v })} />}
            </div>
            <div className="row tight">
                <button className="icon-btn" title="Bring forward" onClick={() => api.order(el.id, 1)}><Icon name="up" /></button>
                <button className="icon-btn" title="Send backward" onClick={() => api.order(el.id, -1)}><Icon name="down" /></button>
                <button className="icon-btn" title="Duplicate" onClick={() => api.duplicateEl(el.id)}><Icon name="copy" /></button>
                <button className="icon-btn danger" title="Delete" onClick={() => api.remove(el.id)}><Icon name="trash" /></button>
            </div>
        </div>
    );
}

function ExportModal({ design, onClose, toast }) {
    const [format, setFormat] = useState('pdf');
    const [q, setQ] = useState('p300');
    const [busy, setBusy] = useState(false);
    const dpi = EXPORT_QUALITY.find((x) => x.id === q).dpi;
    const info = exportScale(design.width, design.height, dpi);
    const go = async () => {
        setBusy(true);
        try { await exportDesign(design, format, dpi); toast('Export ready', 'ok'); onClose(); }
        catch { toast('Export failed. If you used remote images, the server must allow CORS.', 'error'); }
        setBusy(false);
    };
    return (
        <div className="modal-wrap" onPointerDown={onClose}>
            <div className="modal" role="dialog" aria-label="Export" onPointerDown={(e) => e.stopPropagation()}>
                <div className="modal-head"><h2>Export design</h2><button className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="x" /></button></div>
                <h3>Format</h3>
                <div className="seg-row">{[['pdf', 'PDF (print)'], ['png', 'PNG'], ['jpg', 'JPG']].map(([id, l]) => <button key={id} className={`seg ${format === id ? 'on' : ''}`} onClick={() => setFormat(id)}>{l}</button>)}</div>
                <h3>Quality</h3>
                <div className="seg-row">{EXPORT_QUALITY.map((x) => <button key={x.id} className={`seg ${q === x.id ? 'on' : ''}`} onClick={() => setQ(x.id)}>{x.label}</button>)}</div>
                <p className="hint">Output: <b>{info.px[0]} × {info.px[1]} px</b> at {info.dpi} dpi{info.dpi < dpi ? ' (reduced to fit browser limits)' : ''}. PDF page size matches your design. PDF holds a high-resolution image of the artwork, so ask your printer for vector PDF only if they require it.</p>
                <button className="btn primary big" disabled={busy} onClick={go}><Icon name="download" /> {busy ? 'Preparing…' : `Download ${format.toUpperCase()}`}</button>
            </div>
        </div>
    );
}

function EditorView({ design, past, selectedId, setSelectedId, api, onBack, onSave, onSaveCopy, toast }) {
    const [wrapRef, box] = useSize();
    const [zoom, setZoom] = useState(1);
    const [exporting, setExporting] = useState(false);
    const [instruction, setInstruction] = useState('');
    const [aiBusy, setAiBusy] = useState(null);
    const fit = box.w ? Math.max(0.01, Math.min((box.w - 56) / design.width, (box.h - 56) / design.height)) : 0;
    const scale = fit * zoom;
    const el = design.elements.find((e) => e.id === selectedId) || null;

    useEffect(() => {
        const onKey = (e) => {
            if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); api.undo(); }
            else if (selectedId && (e.key === 'Delete' || e.key === 'Backspace')) api.remove(selectedId);
            else if (selectedId && e.key.startsWith('Arrow')) {
                e.preventDefault(); const n = e.shiftKey ? 20 : 2, t = design.elements.find((x) => x.id === selectedId);
                api.patch(selectedId, { x: t.x + (e.key === 'ArrowRight' ? n : e.key === 'ArrowLeft' ? -n : 0), y: t.y + (e.key === 'ArrowDown' ? n : e.key === 'ArrowUp' ? -n : 0) });
            }
        };
        window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey);
    });

    const runAI = async (action) => {
        if (action === 'replaceImage' && el?.type !== 'image') { toast('Select an image on the canvas first.', 'warn'); return; }
        setAiBusy(action);
        try {
            const meta = design.meta || {};
            const current = assetsFromDesign(design);

            if (action === 'replaceImage') {
                // aiService.replaceImage → { src }  (FLUX.2 Klein edit)
                const { src } = await aiService.replaceImage({ design, elementId: el.id, instruction });
                const ready = await prepareImage(src);
                if (!ready) throw new Error('The AI returned an image that could not be read.');
                api.patch(el.id, { src: ready }); toast('Image replaced', 'ok');
            } else if (action === 'improveDesign') {
                // aiService.improveDesign → { design_plan }  (Llama 3.3 70B, no new artwork)
                const { design_plan } = await aiService.improveDesign({ design, instruction });
                const info = readPlan(design_plan, briefFromDesign(design));
                if (!info.found && !info.pal) {
                    toast('The AI plan had no recognisable text or colour changes, so nothing was changed.', 'warn');
                } else {
                    api.replaceDesign(rebuildDesign(design, { brief: info.brief, pal: info.pal || undefined, assets: current }));
                    toast('Design improved. Undo is available.', 'ok');
                }
            } else {
                // regenerate / redesign → { design_plan, artwork }  (Llama plan + FLUX.1 Schnell artwork)
                const data = await aiService[action]({ design, instruction });
                const info = readPlan(data.design_plan, briefFromDesign(design));
                const art = await prepareImage(data.artwork);
                const keepPhoto = meta.photoSource === 'user' && current.photo;
                const assets = { photo: keepPhoto ? current.photo : (art || current.photo), logo: current.logo };
                const opts = { brief: info.brief, assets, photoSource: keepPhoto ? 'user' : (art ? 'ai' : meta.photoSource) };
                if (info.pal) opts.pal = info.pal; else if (action === 'regenerate') opts.palette = ((meta.palette ?? 0) + 1) % PALETTES.length;
                if (action === 'redesign') opts.template = ((meta.template ?? 0) + 1) % 4;
                api.replaceDesign(rebuildDesign(design, opts));
                toast('Design updated. Undo is available.', 'ok');
            }
        } catch (err) {
            if (!(err instanceof AINotConnectedError)) toast(err.message, 'error');
            else if (action === 'regenerate' || action === 'redesign') {
                api.replaceDesign(rebuildDesign(design, action === 'redesign' ? { template: ((design.meta?.template ?? 0) + 1) % 4 } : { palette: ((design.meta?.palette ?? 0) + 1) % PALETTES.length }));
                toast('AI backend not connected, so a local starter layout was applied. Undo to go back.', 'warn');
            } else toast('This action needs the AI backend. Connect it in aiService.js.', 'warn');
        }
        setAiBusy(null);
    };

    const AI = [['regenerate', 'Regenerate', 'refresh', 'New artwork and colours, same message'], ['improveDesign', 'Improve design', 'wand', 'Polish hierarchy, copy and clarity'], ['replaceImage', 'Replace image', 'image', 'AI edit for the selected picture'], ['redesign', 'Redesign', 'layout', 'A completely new layout']];

    return (
        <main className="editor">
            <div className="ed-bar">
                <button className="btn ghost" onClick={onBack}><Icon name="back" size={16} /> Designs</button>
                <input className="name-input" value={design.name} onChange={(e) => api.rename(e.target.value)} aria-label="Design name" />
                <div className="spacer" />
                <button className="icon-btn" title="Undo (Ctrl/⌘ Z)" disabled={!past} onClick={api.undo}><Icon name="undo" /></button>
                <div className="zoom"><button className="icon-btn" onClick={() => setZoom((z) => clamp(z - 0.25, 0.25, 3))}><Icon name="minus" size={14} /></button><span>{Math.round(scale * 100)}%</span><button className="icon-btn" onClick={() => setZoom((z) => clamp(z + 0.25, 0.25, 3))}><Icon name="plus" size={14} /></button></div>
                <button className="btn ghost" onClick={onSaveCopy}><Icon name="copy" size={16} /> Save copy</button>
                <button className="btn ghost" onClick={onSave}><Icon name="save" size={16} /> Save</button>
                <button className="btn primary" onClick={() => setExporting(true)}><Icon name="download" size={16} /> Export</button>
            </div>

            <div className="ed-body">
                <aside className="rail">
                    <h3>Add</h3>
                    <div className="tools">
                        <button onClick={() => api.add('text')}><Icon name="type" />Text</button>
                        <button onClick={() => api.add('image')}><Icon name="image" />Image</button>
                        <button onClick={() => api.add('rect')}><Icon name="square" />Shape</button>
                        <button onClick={() => api.add('circle')}><Icon name="circle" />Circle</button>
                    </div>
                    <h3>AI actions</h3>
                    <input className="ai-input" value={instruction} onChange={(e) => setInstruction(e.target.value)} placeholder="Optional: tell AI what you want" />
                    <div className="ai-list">
                        {AI.map(([id, label, icon, hint]) => (
                            <button key={id} className="ai-btn" disabled={!!aiBusy} onClick={() => runAI(id)} title={hint}>
                                <Icon name={aiBusy === id ? 'sparkle' : icon} /><span><b>{aiBusy === id ? 'Working…' : label}</b><small>{hint}</small></span>
                            </button>
                        ))}
                    </div>
                </aside>

                <div className="workspace" ref={wrapRef}>
                    {scale > 0 && <div className="canvas-holder"><Stage design={design} scale={scale} selectedId={selectedId} interactive onSelect={setSelectedId} onPatch={api.patch} /></div>}
                </div>

                <aside className="props"><Inspector design={design} el={el} api={api} /></aside>
            </div>
            {exporting && <ExportModal design={design} onClose={() => setExporting(false)} toast={toast} />}
        </main>
    );
}

/* ═════════════════════════════ Library view ═════════════════════════════ */

function LibraryView({ items, onOpen, onDuplicate, onDelete, onCreate }) {
    if (!items.length) return (
        <main className="library"><div className="empty"><div className="stack"><i /><i /><i /></div><h2>No saved designs yet</h2><p>Designs you save appear here so you can reuse them next time.</p><button className="btn primary" onClick={onCreate}><Icon name="sparkle" size={16} /> Create a design</button></div></main>
    );
    return (
        <main className="library">
            <div className="results-head"><div><h2>Your designs</h2><p>{items.length} saved on this device</p></div><button className="btn primary" onClick={onCreate}><Icon name="plus" size={16} /> New design</button></div>
            <div className="vgrid lib">
                {items.map((it, i) => (
                    <article key={it.id} className="vcard" style={{ '--i': i }}>
                        <button className="thumb-btn" onClick={() => onOpen(it)} aria-label={`Open ${it.name}`}><Thumb design={it.design} /></button>
                        <div className="vfoot">
                            <div><strong>{it.name}</strong><small>{new Date(it.updatedAt).toLocaleDateString()} · {it.design.width}×{it.design.height}</small></div>
                            <div className="row tight">
                                <button className="icon-btn" title="Duplicate and reuse" onClick={() => onDuplicate(it)}><Icon name="copy" /></button>
                                <button className="icon-btn danger" title="Delete" onClick={() => onDelete(it)}><Icon name="trash" /></button>
                            </div>
                        </div>
                    </article>
                ))}
            </div>
        </main>
    );
}

/* ═════════════════════════════ Root component ═════════════════════════════ */

export default function AICreativeStudio() {
    const [view, setView] = useState('create');
    const [brief, setBrief] = useState({ prompt: '', category: 'admission', sizeId: 'a4', custom: { w: '', h: '', unit: 'in' }, photos: [], logo: null, aiImages: true });
    const [results, setResults] = useState({ designs: [], busy: false, notice: '', noticeTitle: '', error: '', seed: 0 });
    const [design, setDesign] = useState(null);
    const [past, setPast] = useState([]);
    const [selectedId, setSelectedId] = useState(null);
    const [library, setLibrary] = useState(() => storage.list());
    const [toastMsg, setToastMsg] = useState(null);
    const designRef = useRef(null);
    const lastPush = useRef({ key: '', t: 0 });
    const toastTimer = useRef();

    const toast = (msg, tone = 'ok') => { setToastMsg({ msg, tone }); clearTimeout(toastTimer.current); toastTimer.current = setTimeout(() => setToastMsg(null), 3800); };

    /* ── generation ── */
    const generate = async (regen) => {
        const size = resolveSize(brief.sizeId, brief.custom);
        const seed = regen ? results.seed + 1 : 0;
        const cat = CATEGORIES.find((c) => c.id === brief.category) || CATEGORIES[0];
        setResults((r) => ({ ...r, busy: true, notice: '', noticeTitle: '', error: '', seed }));
        try {
            // aiService.generateDesigns → { designPlan, artwork, modelsUsed }
            const { designPlan, artwork } = await aiService.generateDesigns({
                prompt: `${cat.name}: ${brief.prompt}`,
                size: { width: size.w, height: size.h },
            });
            const useArtwork = brief.aiImages && brief.photos.length === 0;
            const art = useArtwork ? await prepareImage(artwork) : '';
            const { designs, found } = makeAIDesigns({ plan: designPlan, artwork: art, prompt: brief.prompt, category: brief.category, size, assets: brief, seed });
            setResults({
                designs, busy: false, seed, error: '',
                noticeTitle: found ? '' : 'AI plan received.',
                notice: found ? '' : 'It had no text fields this editor recognises, so placeholder wording was used. Edit the text, or adjust the key names in readPlan().',
            });
        } catch (err) {
            if (err instanceof AINotConnectedError) {
                setResults({
                    designs: makeLocalDesigns({ prompt: brief.prompt, category: brief.category, size, assets: brief, seed }), busy: false, seed, error: '',
                    noticeTitle: 'AI backend not connected.',
                    notice: 'Showing editable starter layouts instead. Their wording is placeholder text, so edit it, or connect your backend in aiService.js for prompt-aware designs and AI images.',
                });
            } else setResults((r) => ({ ...r, busy: false, error: err.message }));
        }
    };

    /* ── editing state (with coalesced undo history) ── */
    const openDesign = (d, fresh = true) => {
        const next = clone(d); if (fresh) next.id = uid();
        designRef.current = next; setDesign(next); setPast([]); setSelectedId(null); setView('editor');
    };
    const mutate = (fn, key = 'x') => {
        const d = designRef.current, now = Date.now();
        if (lastPush.current.key !== key || now - lastPush.current.t > 800) setPast((p) => [...p.slice(-40), d]);
        lastPush.current = { key, t: now };
        const next = fn(d); designRef.current = next; setDesign(next);
    };
    const patch = (id, p, key) => mutate((d) => ({ ...d, elements: d.elements.map((e) => (e.id === id ? { ...e, ...p } : e)) }), key || `${id}:${Object.keys(p).join()}`);

    const api = {
        patch,
        patchBg: (p) => mutate((d) => ({ ...d, background: { ...d.background, ...p } }), `bg:${Object.keys(p).join()}`),
        rename: (name) => mutate((d) => ({ ...d, name }), 'rename'),
        replaceDesign: (next) => mutate(() => next, `ai:${Date.now()}`),
        undo: () => setPast((p) => { if (!p.length) return p; const prev = p[p.length - 1]; designRef.current = prev; setDesign(prev); return p.slice(0, -1); }),
        remove: (id) => { mutate((d) => ({ ...d, elements: d.elements.filter((e) => e.id !== id) }), `rm${id}`); setSelectedId(null); },
        duplicateEl: (id) => { const c = { ...clone(designRef.current.elements.find((e) => e.id === id)), id: uid() }; c.x += 24; c.y += 24; mutate((d) => ({ ...d, elements: [...d.elements, c] }), `dup${c.id}`); setSelectedId(c.id); },
        order: (id, dir) => mutate((d) => {
            const arr = [...d.elements], i = arr.findIndex((e) => e.id === id), j = clamp(i + dir, 0, arr.length - 1);
            [arr[i], arr[j]] = [arr[j], arr[i]]; return { ...d, elements: arr };
        }, `ord${Date.now()}`),
        add: (kind) => {
            const d = designRef.current, u = Math.min(d.width, d.height), id = uid(), x = d.width * 0.2, y = d.height * 0.2;
            const el = kind === 'text' ? T({ id, user: true, text: 'New text', color: '#111111', fontSize: u * 0.06, x, y, w: u * 0.5 })
                : kind === 'image' ? I({ id, user: true, x, y, w: u * 0.4, h: u * 0.4 })
                    : S({ id, user: true, shape: kind === 'circle' ? 'circle' : 'rect', fill: '#ffc233', x, y, w: u * 0.25, h: u * 0.25 });
            mutate((dd) => ({ ...dd, elements: [...dd.elements, el] }), `add${id}`); setSelectedId(id);
        },
    };

    /* ── library ── */
    const persist = (list) => { if (storage.save(list)) setLibrary(list); else toast('Could not save. Browser storage is full; delete some designs or connect a backend.', 'error'); return list; };
    const save = (asCopy) => {
        const d = clone(designRef.current);
        if (asCopy) { d.id = uid(); d.name = `${d.name} copy`; designRef.current = d; setDesign(d); }
        const item = { id: d.id, name: d.name, updatedAt: Date.now(), design: d };
        persist([item, ...library.filter((x) => x.id !== d.id)]); toast(asCopy ? 'Saved as a new copy' : 'Design saved', 'ok');
    };
    const duplicate = (it) => {
        const d = { ...clone(it.design), id: uid(), name: `${it.name} copy` };
        persist([{ id: d.id, name: d.name, updatedAt: Date.now(), design: d }, ...library]); toast('Duplicated', 'ok');
    };
    const blank = () => {
        const size = resolveSize(brief.sizeId, brief.custom), cat = CATEGORIES.find((c) => c.id === brief.category);
        openDesign(normalizeDesign({ name: cat.name, width: size.w, height: size.h, elements: [] }));
    };

    const nav = useMemo(() => [['create', 'Create'], ['library', `Library${library.length ? ` (${library.length})` : ''}`]], [library.length]);

    return (
        <div className="studio">
            <header className="topbar">
                <div className="brand"><span className="mark"><Icon name="sparkle" size={16} /></span>Studio</div>
                <nav>{nav.map(([id, l]) => <button key={id} className={view === id || (view === 'editor' && id === 'create') ? 'on' : ''} onClick={() => setView(id)}>{l}</button>)}</nav>
            </header>

            {view === 'create' && <CreateView brief={brief} setBrief={setBrief} results={results} onGenerate={generate} onOpen={(d) => openDesign(d)} onBlank={blank} />}
            {view === 'editor' && design && (
                <EditorView design={design} past={past.length > 0} selectedId={selectedId} setSelectedId={setSelectedId} api={api}
                            onBack={() => setView(library.some((x) => x.id === design.id) ? 'library' : 'create')} onSave={() => save(false)} onSaveCopy={() => save(true)} toast={toast} />
            )}
            {view === 'library' && <LibraryView items={library} onCreate={() => setView('create')} onOpen={(it) => openDesign(it.design, false)} onDuplicate={duplicate}
                                                onDelete={(it) => { persist(library.filter((x) => x.id !== it.id)); toast('Deleted', 'ok'); }} />}

            {toastMsg && <div className={`toast ${toastMsg.tone}`} role="status">{toastMsg.msg}</div>}
        </div>
    );
}