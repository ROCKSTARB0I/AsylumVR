// Keep: what takes the headset longest to make at load (the painted walls, the faces, the recorded
// sound) is kept in the browser's IndexedDB after the first run. Each bundle is stamped with a hash of
// the source files that make it, so changing that code quietly rebuilds it on the next load.
const DB = 'asylumvr-keep', ST = 'k';
let dbP = null;
function db() {
  return dbP ||= new Promise((res) => {
    try { const r = indexedDB.open(DB, 1); r.onupgradeneeded = () => r.result.createObjectStore(ST); r.onsuccess = () => res(r.result); r.onerror = () => res(null); r.onblocked = () => res(null); } catch (e) { res(null); }
  });
}
export async function keepGet(key) {
  const d = await db(); if (!d) return null;
  return new Promise((res) => { try { const q = d.transaction(ST).objectStore(ST).get(key); q.onsuccess = () => res(q.result || null); q.onerror = () => res(null); } catch (e) { res(null); } });
}
export async function keepPut(key, val) {
  const d = await db(); if (!d) return;
  return new Promise((res) => { try { const tx = d.transaction(ST, 'readwrite'); tx.objectStore(ST).put(val, key); tx.oncomplete = tx.onerror = tx.onabort = () => res(); } catch (e) { res(); } });
}
// a hash of our own source files (same version tag as this module, so it's the code actually running)
const VER = new URL(import.meta.url).search;
export async function sourceHash(...files) {
  let h = 2166136261 >>> 0;
  for (const f of files) {
    let t; try { const r = await fetch(new URL('./' + f + VER, import.meta.url)); if (!r.ok) return null; t = await r.text(); } catch (e) { return null; }
    t = t.replace(/\?v=\d+/g, '');   // the version tags change every deploy; only real code changes should rebuild
    for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  }
  return h.toString(36);
}

// ---- pictures: loaded before the world is built, then handed out synchronously
const pics = new Map(), data = new Map(); let picHash = null, fresh = 0;
export async function loadPictures() {
  picHash = await sourceHash('surfaces.js', 'visage.js'); if (!picHash) return 0;
  const k = await keepGet('pics'); if (!k || k.hash !== picHash) return 0;
  await Promise.all(Object.entries(k.blobs).map(async ([key, blob]) => {
    try {
      const bm = await createImageBitmap(blob, { premultiplyAlpha: 'none', colorSpaceConversion: 'none' });
      const cv = document.createElement('canvas'); cv.width = bm.width; cv.height = bm.height; cv.getContext('2d').drawImage(bm, 0, 0); if (bm.close) bm.close(); pics.set(key, cv);
    } catch (e) {}
  }));
  for (const [key, v] of Object.entries(k.data || {})) data.set(key, v);
  return pics.size;
}
export const picture = (key) => pics.get(key) || null;
export function keepPicture(key, cv) { if (picHash && !pics.has(key)) { pics.set(key, cv); fresh++; } return cv; }
export const keptData = (key) => data.get(key);
export function keepData(key, v) { if (picHash && !data.has(key)) { data.set(key, v); fresh++; } }
export async function savePictures() {
  if (!fresh || !picHash) return; fresh = 0;
  const blobs = {};
  for (const [key, cv] of pics) { const b = await new Promise((r) => cv.toBlob(r, 'image/png')); if (!b) return; blobs[key] = b; }
  await keepPut('pics', { hash: picHash, blobs, data: Object.fromEntries(data) });
}

// ---- sound: every recorded buffer, as 16-bit
export function packSound(rec) {
  const pack = (b) => b && { sr: b.sampleRate, n: b.length, ch: Array.from({ length: b.numberOfChannels }, (_, c) => { const f = b.getChannelData(c), o = new Int16Array(f.length); for (let i = 0; i < f.length; i++) o[i] = Math.max(-32768, Math.min(32767, Math.round(f[i] * 32767))); return o; }) };
  const one = {}; for (const [k, l] of Object.entries(rec.one)) one[k] = l.map(pack);
  const music = {}; for (const [k, b] of Object.entries(rec.music)) music[k] = pack(b);
  return { one, music, amb: pack(rec.amb), fear: pack(rec.fear), menu: pack(rec.menu) };
}
export function unpackSound(p) {
  const un = (q) => { if (!q) return null; const b = new AudioBuffer({ length: q.n, numberOfChannels: q.ch.length, sampleRate: q.sr }); q.ch.forEach((s, c) => { const f = new Float32Array(s.length); for (let i = 0; i < s.length; i++) f[i] = s[i] / 32767; b.copyToChannel(f, c); }); return b; };
  const one = {}; for (const [k, l] of Object.entries(p.one)) one[k] = l.map(un);
  const music = {}; for (const [k, q] of Object.entries(p.music)) music[k] = un(q);
  return { one, music, amb: un(p.amb), fear: un(p.fear), menu: un(p.menu) };
}
