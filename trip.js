/* Operation Bucharest – turplan, kategorier og rotation.
   Det her er almindelig kode (ingen hemmeligheder). Ret datoer og steder her.
   data.js afgør kun, hvem en kode tilhører (navn + personnummer 1–5). */
window.OB_TRIP = (() => {
  const START = '2026-11-26';        // dag 1, efter Bukarest-tid
  const DAYS = 4;                    // 26.–29. november
  const TZ = 'Europe/Bucharest';     // dagen skifter ved midnat Bukarest-tid
  const PEOPLE = 5;

  // Et sted er enten et navn, eller { name, wheel } hvor "wheel" er en kortere tekst
  // til hjulet. Resultatet viser altid det fulde navn.
  const CATEGORIES = [
    { name: 'Morgenmad', places: [
      'Origo', 'Frudisiac', 'M60', 'Pukka Tukka', 'Boutique du Pain', 'Fior di Latte',
      'Grand Café Van Gogh', 'Atelierul de Tarte', 'Trofic', 'Bread & Spices', 'Beans & Dots', 'Covrigi Luca'
    ] },
    { name: 'Frokost', places: [
      'Simbio', 'Gram Bistro', 'Alt Shift', 'Balls.', 'Modelier', "J'ai Bistrot",
      { name: 'Animaletto Pizza Bar', wheel: 'Animaletto' },
      { name: 'Berăria Hanul cu Tei', wheel: 'Hanul cu Tei' },
      { name: 'Caju by Joseph Hadad', wheel: 'Caju' },
      'Piața Obor', 'La Mama Lipscani', 'Dristor Kebap'
    ] },
    { name: 'Aftensmad', places: [
      "Caru' cu Bere", 'Zexe', 'Lacrimi și Sfinți', 'Vatra', "Hanu' lui Manuc", 'Bistro Ateneu',
      'Kaiamo', 'Kané', 'Berăria H', 'NOUA', 'Energiea', 'Le Bistrot Français'
    ] },
    { name: 'Underholdning', places: [
      { name: 'TROLL Escape Rooms', wheel: 'TROLL Escape' },
      'The Void', 'Trapped',
      { name: 'Breakout Escape Rooms', wheel: 'Breakout Escape' },
      'Next Level Escape', 'Therme București',
      { name: 'Palace of Parliament tour', wheel: 'Palace of Parliament' },
      { name: 'Romanian Athenaeum concert', wheel: 'Athenaeum concert' },
      { name: 'Bucharest Christmas Market', wheel: 'Christmas Market' },
      { name: 'VMAX indoor karting', wheel: 'VMAX karting' },
      { name: 'Gateway VR Studio', wheel: 'Gateway VR' },
      'TrickShot'
    ] },
    { name: 'Barer', places: [
      { name: 'Hop Hooligans Taproom', wheel: 'Hop Hooligans' },
      'Fabrica de Bere Bună',
      { name: 'Ground Zero Taproom', wheel: 'Ground Zero' },
      'Fabrica Grivița', 'Interbelic', 'Oficiul 1',
      { name: 'The Vault Bar at The Marmorosch', wheel: 'The Vault Bar' },
      'Frank', 'English Bar', 'Nomad Skybar', 'Control Club', 'Zeppelin Pub'
    ] }
  ];

  const place = x => typeof x === 'string' ? { name: x, wheel: x } : { name: x.name, wheel: x.wheel || x.name };
  const categories = CATEGORIES.map(c => ({ name: c.name, places: c.places.map(place) }));

  // ── Bukarest-tid uden at stole på telefonens egen tidszone ──
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
  function parts(ms) {
    const o = {};
    for (const p of fmt.formatToParts(new Date(ms))) if (p.type !== 'literal') o[p.type] = +p.value;
    if (o.hour === 24) o.hour = 0;
    return { y: o.year, m: o.month, d: o.day, h: o.hour, mi: o.minute, s: o.second };
  }
  // Bukarest-vægur (y, m, d, h, mi, s) -> tidspunkt i ms
  function zoned(y, m, d, h = 0, mi = 0, s = 0) {
    const want = Date.UTC(y, m - 1, d, h, mi, s);
    let t = want;
    for (let i = 0; i < 3; i++) {
      const p = parts(t), got = Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi, p.s);
      if (got === want) break;
      t += want - got;
    }
    return t;
  }
  const [SY, SM, SD] = START.split('-').map(Number);
  const startMs = zoned(SY, SM, SD);
  const dayNo = (y, m, d) => Math.round((Date.UTC(y, m - 1, d) - Date.UTC(SY, SM - 1, SD)) / 864e5) + 1;

  // Hvor er vi på turen? Før turen: dag 1 (+ nedtælling). Efter turen: sidste dag.
  function state(ms) {
    const p = parts(ms), raw = dayNo(p.y, p.m, p.d);
    const phase = raw < 1 ? 'before' : raw > DAYS ? 'after' : 'during';
    const day = Math.min(DAYS, Math.max(1, raw));
    return { phase, day, days: DAYS, msToStart: Math.max(0, startMs - ms), clock: p };
  }

  // Forskudt rotation: dag d, person p -> kategori ((p - 1) + (d - 1)) mod 5
  const categoryIndex = (person, day) => (((person - 1) + (day - 1)) % categories.length + categories.length) % categories.length;
  const category = (person, day) => categories[categoryIndex(person, day)];

  // Kalenderdato for en given turdag (til visning)
  function dateOfDay(day) {
    const d = new Date(Date.UTC(SY, SM - 1, SD + day - 1));
    return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate() };
  }

  // Testdato fra adresselinjen: "2026-11-27" eller "2026-11-27T23:59" (Bukarest-tid)
  function parseTestDate(str, realMs) {
    const m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?$/.exec(String(str || '').trim());
    if (!m) return null;
    const now = parts(realMs);
    const h = m[4] != null ? +m[4] : now.h, mi = m[5] != null ? +m[5] : now.mi, s = m[6] != null ? +m[6] : (m[4] != null ? 0 : now.s);
    const t = zoned(+m[1], +m[2], +m[3], h, mi, s);
    return Number.isFinite(t) ? t : null;
  }

  return { START, DAYS, TZ, PEOPLE, categories, state, category, categoryIndex, dateOfDay, parts, zoned, parseTestDate };
})();
