#!/usr/bin/env python3
"""Operation Bucharest – laver de rumænske bestillinger som lyd: én MP3 pr. vare i menu.js.

Brug (fra mappen med index.html og menu.js):
  pip install edge-tts
  python3 tools/make_ro_audio.py                # laver de filer, der mangler eller er ændret
  python3 tools/make_ro_audio.py --force        # laver alle forfra
  python3 tools/make_ro_audio.py --list         # viser alle sætninger, laver ingen lyd
  python3 tools/make_ro_audio.py --samples DIR  # 3 prøvesætninger med begge stemmer, til at vælge stemme
  python3 tools/make_ro_audio.py --prune        # sletter også lydfiler for varer, der ikke er i menuen mere

Lyden kommer fra Microsofts neurale stemmer via edge-tts: gratis, ingen nøgle, kun når scriptet kører.
Siden selv bruger kun de færdige filer i audio/ro/, og en fil hentes først, når nogen trykker.

Sætningen bygges af menu.js, præcis som på siden:
  · hver kategori har en skabelon:  order: { ro: 'Bună! Aș dori o bere {item}, vă rog.', da: 'Hej! … {item}, tak.' }
  · {item} på rumænsk er varens navn uden "(…)", og " & " bliver " cu " (med små bogstaver: "gin cu tonic")
  · en vare kan have  ro: '…'  i menu.js, som så bruges i stedet (til navne, der lyder forkert)
  · {item} på dansk er varens fulde navn
Filerne hedder audio/ro/{kategori}-{navn}.mp3, fx audio/ro/beer-ursus.mp3.

Kør scriptet igen, når menuen ændres: det springer filer over, der allerede passer, og laver dem, hvor
sætningen, stemmen eller tempoet er ændret (det står i audio/ro/manifest.json, som skal med på GitHub).
Kræver Python 3.8 eller nyere og edge-tts. Bruger HTTPS_PROXY, hvis den er sat.
"""
import argparse
import asyncio
import json
import os
import re
import sys
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MENU = ROOT / 'menu.js'
OUT = ROOT / 'audio' / 'ro'
MANIFEST = OUT / 'manifest.json'

VOICES = ['ro-RO-EmilNeural', 'ro-RO-AlinaNeural']
DEFAULT_VOICE = 'ro-RO-EmilNeural'
DEFAULT_RATE = '-5%'                  # a little slower, so a bartender hears it clearly
FORMAT = 'audio-24khz-48kbitrate-mono-mp3'   # edge-tts' default: mono, 48 kbps
JOBS = 4                              # files made at the same time
SAMPLES = [('beer', 'Ursus'), ('shots', 'Tequila (salt & lime)'), ('drinks', 'Gin & Tonic')]


def fail(msg):
    print(f'\n✗ {msg}\n', file=sys.stderr)
    sys.exit(1)


# ── menu.js: a JavaScript object, read without Node ──
def js_to_json(src):
    """The small part of JavaScript that menu.js uses (comments, 'strings', bare keys, trailing commas) → JSON."""
    out, i, n = [], 0, len(src)

    def skip_space(k):
        while k < n:
            if src[k] in ' \t\r\n':
                k += 1
            elif src.startswith('//', k):
                k = src.find('\n', k)
                k = n if k < 0 else k
            elif src.startswith('/*', k):
                k = src.find('*/', k)
                k = n if k < 0 else k + 2
            else:
                break
        return k

    while i < n:
        c = src[i]
        if c in '\'"`':
            q, i, buf = c, i + 1, []
            while i < n and src[i] != q:
                if src[i] == '\\':
                    i += 1
                    e = src[i]
                    if e == 'u':
                        buf.append(chr(int(src[i + 1:i + 5], 16)))
                        i += 4
                    else:
                        buf.append({'n': '\n', 't': '\t', 'r': '\r', '0': '\0'}.get(e, e))
                else:
                    buf.append(src[i])
                i += 1
            i += 1
            out.append(json.dumps(''.join(buf), ensure_ascii=False))
        elif src.startswith('//', i) or src.startswith('/*', i):
            i = skip_space(i)
        elif c == ',':
            k = skip_space(i + 1)
            if k < n and src[k] in '}]':      # trailing comma
                i = k
            else:
                out.append(c)
                i += 1
        elif c.isalpha() or c in '_$':
            j = i
            while j < n and (src[j].isalnum() or src[j] in '_$'):
                j += 1
            word = src[i:j]
            k = skip_space(j)
            out.append(json.dumps(word) if k < n and src[k] == ':' else word)
            i = j
        else:
            out.append(c)
            i += 1
    return ''.join(out)


def read_menu():
    if not MENU.exists():
        fail(f'Fandt ikke {MENU}')
    text = MENU.read_text(encoding='utf-8')
    m = re.search(r'OB_MENU\s*=\s*', text)
    if not m:
        fail('menu.js ser ikke ud som forventet (window.OB_MENU = { … }).')
    body = text[m.end():].strip().rstrip(';').strip()
    try:
        menu = json.loads(js_to_json(body))
    except ValueError as e:
        fail(f'menu.js kunne ikke læses: {e}')
    return menu


# ── The sentence: the same rules as in index.html (orderPhrase) ──
def clean(s):
    return re.sub(r'\s+', ' ', s).strip()


def ro_item(item):
    """The item as said in Romanian: its own ro text if it has one, else the name without "(…)", & → cu."""
    if item.get('ro'):
        return clean(item['ro'])
    s = re.sub(r'\s*\([^)]*\)', '', item['name'])
    if ' & ' in s:
        s = s.replace(' & ', ' cu ').lower()
    return clean(s)


SPECIAL = {'ß': 'ss', 'ø': 'o', 'Ø': 'o', 'æ': 'ae', 'Æ': 'ae', 'œ': 'oe', 'Œ': 'oe', 'ł': 'l', 'Ł': 'l', 'đ': 'd', 'Đ': 'd', 'ı': 'i'}


def slug(name):
    s = ''.join(SPECIAL.get(ch, ch) for ch in name)
    s = ''.join(ch for ch in unicodedata.normalize('NFD', s) if not unicodedata.combining(ch)).lower()
    s = re.sub(r"['’]", '', s)
    return re.sub(r'[^a-z0-9]+', '-', s).strip('-')


def entries(menu):
    """Every item in every category that has an order template: file name, Romanian and Danish sentence."""
    out, seen = [], {}
    for mode in menu.get('modes', []):
        tpl = mode.get('order') or {}
        if not tpl.get('ro'):
            print(f"! Kategorien {mode.get('id')} har ingen order-skabelon i menu.js og springes over.")
            continue
        for raw in mode.get('items', []):
            item = {'name': raw} if isinstance(raw, str) else raw
            name = clean(item['name'])
            file = f"{mode['id']}-{slug(name)}.mp3"
            if file in seen:
                fail(f'To varer giver samme filnavn {file}: "{seen[file]}" og "{name}". Omdøb den ene.')
            seen[file] = name
            out.append({
                'category': mode['id'], 'name': name, 'file': file,
                'ro': tpl['ro'].replace('{item}', ro_item(item)),
                'da': (tpl.get('da') or '').replace('{item}', name),
                'override': bool(item.get('ro')),
            })
    return out


# ── Speech ──
async def synth(text, voice, rate):
    import edge_tts
    proxy = os.environ.get('HTTPS_PROXY') or os.environ.get('https_proxy') or None
    last = None
    for attempt in range(3):
        try:
            data = bytearray()
            async for chunk in edge_tts.Communicate(text, voice, rate=rate, proxy=proxy).stream():
                if chunk['type'] == 'audio':
                    data += chunk['data']
            if len(data) < 2000:
                raise RuntimeError(f'kun {len(data)} bytes lyd')
            return bytes(data)
        except Exception as e:                       # network hiccup or rate limit: wait and try again
            last = e
            await asyncio.sleep(1.5 * (attempt + 1) ** 2)
    raise last


def write_atomic(path, data):
    tmp = path.with_suffix(path.suffix + '.tmp')
    tmp.write_bytes(data)
    tmp.replace(path)                                # never a half-written MP3 that looks finished


async def make_samples(target, rate):
    target = Path(target)
    target.mkdir(parents=True, exist_ok=True)
    menu = read_menu()
    found = {(e['category'], e['name']): e for e in entries(menu)}
    for n, key in enumerate(SAMPLES, 1):
        e = found.get(key)
        if not e:
            fail(f'Prøvevaren {key[1]} findes ikke i menu.js.')
        for voice in VOICES:
            short = voice.split('-')[2].replace('Neural', '').lower()
            path = target / f"{n}-{e['category']}-{short}.mp3"
            write_atomic(path, await synth(e['ro'], voice, rate))
            print(f'  {path.name:<26} {e["ro"]}')
    print(f'\nFærdig: {len(SAMPLES) * len(VOICES)} prøver i {target}')


async def make_all(voice, rate, force, prune):
    try:
        import edge_tts  # noqa: F401
    except ImportError:
        fail('edge-tts mangler. Installer den med:  pip install edge-tts')
    menu = read_menu()
    todo_all = entries(menu)
    OUT.mkdir(parents=True, exist_ok=True)
    old = {}
    if MANIFEST.exists():
        try:
            old = json.loads(MANIFEST.read_text(encoding='utf-8')).get('files', {})
        except ValueError:
            print('! audio/ro/manifest.json kunne ikke læses: alle filer laves forfra.')
    files = {}
    todo, skipped = [], 0
    for e in todo_all:
        prev = old.get(e['file'])
        same = prev and prev.get('ro') == e['ro'] and prev.get('voice') == voice and prev.get('rate') == rate
        if not force and same and (OUT / e['file']).exists():
            files[e['file']] = prev
            skipped += 1
        else:
            todo.append(e)
    print(f"{len(todo_all)} varer · {skipped} passer allerede · {len(todo)} skal laves · stemme {voice}, tempo {rate}")

    made, failed, sem = 0, [], asyncio.Semaphore(JOBS)

    async def one(e):
        nonlocal made
        async with sem:
            try:
                write_atomic(OUT / e['file'], await synth(e['ro'], voice, rate))
                files[e['file']] = {'category': e['category'], 'name': e['name'], 'ro': e['ro'], 'da': e['da'], 'voice': voice, 'rate': rate}
                made += 1
                print(f"  ✓ {e['file']:<44} {e['ro']}")
            except Exception as err:
                failed.append((e['file'], f'{type(err).__name__}: {err}'))
                print(f"  ✗ {e['file']:<44} {type(err).__name__}: {err}")

    try:
        await asyncio.gather(*(one(e) for e in todo))
    finally:
        known = {e['file'] for e in todo_all}
        orphans = sorted(p.name for p in OUT.glob('*.mp3') if p.name not in known)
        if prune:
            for name in orphans:
                (OUT / name).unlink()
        manifest = {'v': 1, 'voice': voice, 'rate': rate, 'format': FORMAT,
                    'files': {k: files[k] for k in sorted(files)}}
        write_atomic(MANIFEST, (json.dumps(manifest, ensure_ascii=False, indent=1) + '\n').encode('utf-8'))

    have = sum(1 for e in todo_all if (OUT / e['file']).exists() and e['file'] in files)
    print(f"\nResultat: {have}/{len(todo_all)} varer har lyd · {made} lavet nu · {skipped} sprunget over · {len(failed)} fejlede")
    for f, why in failed:
        print(f'  fejl: {f}: {why}')
    if orphans:
        print(f"{'Slettet' if prune else 'Ikke i menuen mere (slet med --prune)'}: {', '.join(orphans)}")
    if failed:
        print('Kør scriptet igen for at prøve de fejlede en gang til.')
        sys.exit(1)


def main():
    ap = argparse.ArgumentParser(description='Laver rumænske bestillinger som MP3 til Operation Bucharest.')
    ap.add_argument('--voice', default=DEFAULT_VOICE, help=f'stemme (standard {DEFAULT_VOICE}; også {", ".join(v for v in VOICES if v != DEFAULT_VOICE)})')
    ap.add_argument('--rate', default=DEFAULT_RATE, help=f'tempo, fx --rate=-5%% (standard {DEFAULT_RATE})')
    ap.add_argument('--force', action='store_true', help='lav alle filer forfra')
    ap.add_argument('--prune', action='store_true', help='slet lydfiler for varer, der ikke er i menuen mere')
    ap.add_argument('--list', action='store_true', help='vis alle sætninger, lav ingen lyd')
    ap.add_argument('--samples', metavar='DIR', help='lav 3 prøvesætninger med begge stemmer i DIR')
    a = ap.parse_args()

    if a.list:
        all_e = entries(read_menu())
        for e in all_e:
            print(f"{e['category']:<7} {e['file']:<44} {e['ro']}{'   [ro]' if e['override'] else ''}\n{'':<52} {e['da']}")
        print(f'\n{len(all_e)} sætninger')
        return
    if a.samples:
        asyncio.run(make_samples(a.samples, a.rate))
        return
    asyncio.run(make_all(a.voice, a.rate, a.force, a.prune))


if __name__ == '__main__':
    main()
