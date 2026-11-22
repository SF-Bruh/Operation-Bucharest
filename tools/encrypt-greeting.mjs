#!/usr/bin/env node
/* Operation Bucharest – krypterer velkomstvideoen, så den kun kan afspilles med en personlig kode.

   Brug (fra mappen med index.html og data.js):
     node tools/encrypt-greeting.mjs <video.mp4> [--codes <fil>]

   Uden --codes spørger scriptet efter koderne én ad gangen.
   --codes kan være:
     · builderens gemte opsætning (operation-bucharest-opsaetning.json)
     · en fil med én kode pr. linje
     · JSON: ["KODE-1", "KODE-2", …] eller { "1": "KODE-1", "2": "KODE-2", … }
   Læg filen et sted, git ignorerer, fx tools/codes.local.json. Den må aldrig på GitHub.

   Hver kode tjekkes mod data.js, så scriptet selv finder personnummeret og fanger tastefejl.
   Ud kommer to filer, som er dem, der skal på GitHub:
     assets/greeting/greeting.enc   videoen, krypteret (AES-GCM, tilfældig nøgle)
     assets/greeting/keys.json      den nøgle, pakket ind én gang pr. person (PBKDF2-SHA256 250.000, eget salt)
   Kør scriptet igen, når videoen eller en kode ændres. Den rå .mp4 må aldrig på GitHub.

   Ny video? Gør den klar til nettet først (H.264 + AAC, faststart, 720p, under 5 MB), fx:
     ffmpeg -i ny-video.mp4 -c:v libx264 -preset slow -profile:v high -level 3.1 -pix_fmt yuv420p \
       -b:v 2450k -maxrate 3600k -bufsize 5000k -c:a aac -b:a 128k -ac 2 -movflags +faststart greeting-web.mp4

   Kræver Node 18 eller nyere. Ingen pakker. */
import { webcrypto } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, resolve, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline/promises';

const { subtle } = webcrypto;
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'assets', 'greeting');
const ITER = 250000, MAX_BYTES = 5 * 1000 * 1000, PEOPLE = 5;

const enc = new TextEncoder(), dec = new TextDecoder();
const rnd = n => webcrypto.getRandomValues(new Uint8Array(n));
const b64 = u => Buffer.from(u).toString('base64');
const unb64 = s => new Uint8Array(Buffer.from(s, 'base64'));
const normCode = s => (s || '').normalize('NFC').toUpperCase().replace(/[^\p{L}\p{N}]/gu, '');   // same as the site
const mask = c => c.length <= 3 ? '***' : c.slice(0, 2) + '•'.repeat(Math.min(8, c.length - 2));
const mb = n => (n / 1e6).toFixed(2).replace('.', ',') + ' MB';
function fail(msg) { console.error('\n✗ ' + msg + '\n'); process.exit(1); }
const usage = () => console.log('Brug: node tools/encrypt-greeting.mjs <video.mp4> [--codes <fil>]\nSe forklaringen øverst i tools/encrypt-greeting.mjs.');

async function pbkdf2Key(code, salt, iter, usage) {
  const base = await subtle.importKey('raw', enc.encode(code), 'PBKDF2', false, ['deriveKey']);
  return subtle.deriveKey({ name: 'PBKDF2', salt, iterations: iter, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, [usage]);
}

// ── 1. Arguments ──
const args = process.argv.slice(2);
let videoPath = null, codesPath = null;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--codes') codesPath = args[++i];
  else if (args[i] === '-h' || args[i] === '--help') { usage(); process.exit(0); }
  else if (!videoPath) videoPath = args[i];
  else fail(`Ukendt argument: ${args[i]}`);
}
if (!videoPath) { usage(); process.exit(1); }
if (codesPath === undefined) fail('--codes mangler et filnavn.');

// ── 2. The video: must be a web-ready MP4 (faststart) under 5 MB ──
if (!existsSync(videoPath)) fail(`Fandt ikke videoen: ${videoPath}`);
const video = new Uint8Array(await readFile(videoPath));
if (video.length > MAX_BYTES) fail(`Videoen fylder ${mb(video.length)}. Den skal være under 5 MB – se ffmpeg-kommandoen øverst i scriptet.`);
const boxes = [];
for (let o = 0; o + 8 <= video.length && boxes.length < 64;) {
  const dv = new DataView(video.buffer, video.byteOffset + o);
  let size = dv.getUint32(0); const type = dec.decode(video.subarray(o + 4, o + 8));
  if (size === 1) size = Number(dv.getBigUint64(8)); else if (size === 0) size = video.length - o;
  if (size < 8) break;
  boxes.push(type); o += size;
}
if (boxes[0] !== 'ftyp') fail('Filen ligner ikke en MP4-video.');
if (boxes.indexOf('moov') < 0 || boxes.indexOf('moov') > boxes.indexOf('mdat')) fail('Videoen er ikke lavet med "-movflags +faststart" – se ffmpeg-kommandoen øverst i scriptet.');
const head = Buffer.from(video.subarray(0, 64 * 1024 * 16));
if (!head.includes('avc1') || !head.includes('mp4a')) console.warn('! Videoen ser ikke ud til at være H.264 + AAC. Den spiller måske ikke på iPhone.');

// ── 3. data.js: used to check each code and find its person number ──
let DATA = null;
const dataPath = join(ROOT, 'data.js');
if (existsSync(dataPath)) {
  const m = /window\.OB_DATA\s*=\s*(\{[\s\S]*\})\s*;?\s*$/.exec(await readFile(dataPath, 'utf8'));
  try { DATA = m && JSON.parse(m[1]); } catch (e) { DATA = null; }
  if (!DATA || !Array.isArray(DATA.entries)) fail('data.js kunne ikke læses.');
} else console.warn('! Fandt ikke data.js ved siden af index.html. Personnumrene tages fra rækkefølgen, og koderne kan ikke tjekkes.');
const count = DATA ? DATA.entries.length : PEOPLE;

async function whoIs(code) {           // { n, p } from data.js, or null
  const key = await pbkdf2Key(code, unb64(DATA.salt), DATA.iter, 'decrypt');
  for (const e of DATA.entries) {
    try { return JSON.parse(dec.decode(await subtle.decrypt({ name: 'AES-GCM', iv: unb64(e.iv) }, key, unb64(e.ct)))); } catch (err) { /* not this one */ }
  }
  return null;
}

// ── 4. The codes: from a file or typed in ──
let given = [];   // { code, p (number or null), n (label or null) }
if (codesPath) {
  if (!existsSync(codesPath)) fail(`Fandt ikke kodefilen: ${codesPath}`);
  const text = await readFile(codesPath, 'utf8');
  let j = null; try { j = JSON.parse(text); } catch (e) { /* plain text */ }
  if (j && Array.isArray(j.people)) given = j.people.map((x, i) => ({ code: x && x.c, p: i + 1, n: x && x.n }));      // builder setup
  else if (Array.isArray(j)) given = j.map(x => typeof x === 'string' ? { code: x, p: null, n: null } : { code: x && x.c, p: null, n: x && x.n });
  else if (j && typeof j === 'object') given = Object.entries(j).map(([k, v]) => ({ code: v, p: Number(k), n: null }));
  else given = text.split(/\r?\n/).map(l => l.trim()).filter(l => l && !l.startsWith('#')).map(code => ({ code, p: null, n: null }));
} else {
  if (!process.stdin.isTTY) fail('Ingen --codes-fil, og der kan ikke spørges her. Brug --codes <fil>.');
  console.log(`Skriv de ${count} koder (tom linje = spring personen over). De gemmes ikke.`);
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  for (let i = 1; i <= count; i++) given.push({ code: await rl.question(`  Kode ${i} af ${count}: `), p: DATA ? null : i, n: null });
  rl.close();
}
given = given.map(g => ({ ...g, code: normCode(String(g.code || '')) })).filter(g => g.code);
if (!given.length) fail('Ingen koder.');

const people = new Map();   // person number → { code, n }
for (const g of given) {
  let p = g.p, n = g.n;
  if (DATA) {
    const who = await whoIs(g.code);
    if (!who) fail(`Koden ${mask(g.code)} åbner ikke nogen i data.js. Tjek for tastefejl, eller byg data.js igen i builderen.`);
    if (p && Number(who.p) !== p) fail(`Koden ${mask(g.code)} hører til person ${who.p} (${who.n}) i data.js, ikke person ${p}. Er data.js og kodefilen fra samme opsætning?`);
    p = Number(who.p); n = who.n;
  }
  if (!Number.isInteger(p) || p < 1) fail(`Mangler personnummer for koden ${mask(g.code)}.`);
  if (people.has(p)) fail(`To koder hører til person ${p}.`);
  people.set(p, { code: g.code, n });
}
const missing = []; for (let p = 1; p <= count; p++) if (!people.has(p)) missing.push(p);
if (missing.length) console.warn(`! Ingen kode for person ${missing.join(', ')}. De ser ikke videoen (siden går bare videre til hjulet).`);

// ── 5. Encrypt: one random content key for the video, wrapped once per person ──
const contentKey = rnd(32), vIv = rnd(12);
const ck = await subtle.importKey('raw', contentKey, 'AES-GCM', false, ['encrypt']);
const sealed = new Uint8Array(await subtle.encrypt({ name: 'AES-GCM', iv: vIv }, ck, video));
const out = { v: 1, made: new Date().toISOString(), type: 'video/mp4', iv: b64(vIv), iter: ITER, people: {} };
for (const [p, { code }] of [...people].sort((a, b) => a[0] - b[0])) {
  const salt = rnd(16), iv = rnd(12);
  const wk = await pbkdf2Key(code, salt, ITER, 'encrypt');
  out.people[p] = { salt: b64(salt), iv: b64(iv), key: b64(new Uint8Array(await subtle.encrypt({ name: 'AES-GCM', iv }, wk, contentKey))) };
}
contentKey.fill(0);

// ── 6. Check every code opens the video again, exactly as the site does, before writing anything ──
for (const [p, { code, n }] of [...people].sort((a, b) => a[0] - b[0])) {
  const e = out.people[p];
  const wk = await pbkdf2Key(code, unb64(e.salt), ITER, 'decrypt');
  const raw = await subtle.decrypt({ name: 'AES-GCM', iv: unb64(e.iv) }, wk, unb64(e.key));
  const vk = await subtle.importKey('raw', raw, 'AES-GCM', false, ['decrypt']);
  const back = new Uint8Array(await subtle.decrypt({ name: 'AES-GCM', iv: vIv }, vk, sealed));
  if (Buffer.compare(Buffer.from(back), Buffer.from(video)) !== 0) fail(`Tjek mislykkedes for person ${p}.`);
  console.log(`  ✓ ${n ? n + ' ' : ''}(person ${p})`);
}

await mkdir(OUT, { recursive: true });
await writeFile(join(OUT, 'greeting.enc'), sealed);
await writeFile(join(OUT, 'keys.json'), JSON.stringify(out, null, 2) + '\n');
console.log(`\nFærdig: ${relative(process.cwd(), join(OUT, 'greeting.enc'))} (${mb(sealed.length)}) og ${relative(process.cwd(), join(OUT, 'keys.json'))}.`);
console.log('Læg de to filer på GitHub i mappen assets/greeting. Ikke .mp4-filen, og ikke kodefilen.\n');
