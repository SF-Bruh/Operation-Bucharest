/* Operation Bucharest – Bar-hjulet: hvad hjulet kan lande på.
   Almindelig kode, ingen hemmeligheder. Ret listerne her.
   Et punkt er enten et navn, eller { name, wheel } hvor "wheel" er en kortere tekst til hjulet.
   Resultatet viser altid det fulde navn. Hver liste kan have 6–16 punkter.
   Tallet i "sub" regnes ud fra listen, så det passer altid.
   "Fuck it" er ikke en liste: den bruger alle kategorierne herunder. */
window.OB_MENU = {
  people: 5,
  tripLabel: '26.–29.11.2026 · București',   // static line on the login screen
  modes: [
    { id: 'beer', name: 'Øl', sub: '12 mærker', items: [
      'Ursus', 'Timișoreana', 'Ciuc', 'Silva', 'Bergenbier',          // 🇷🇴 the big Romanian lagers
      'Heineken', 'Tuborg', 'Stella Artois', 'Peroni', 'Carlsberg',
      { name: 'Pilsner Urquell', wheel: 'Urquell' }, 'Guinness'
    ] },
    { id: 'shots', name: 'Shots', sub: '12 shots', items: [
      'Jägermeister', { name: 'Tequila (salt & lime)', wheel: 'Tequila' }, 'Sambuca',
      'Vodka', 'B-52', 'Kamikaze', 'Jägerbomb',
      'Pălincă', 'Țuică', 'Vișinată',                                  // 🇷🇴 local spirits/liqueur
      { name: 'Whiskey (Jameson)', wheel: 'Whiskey' }, 'Absinth'
    ] },
    { id: 'drinks', name: 'Drinks', sub: '12 drinks', items: [
      'Gin & Tonic', 'Aperol Spritz', 'Hugo', 'Mojito', 'Cuba Libre', 'Moscow Mule',
      { name: 'Whiskey & Cola', wheel: 'Whiskey Cola' }, { name: 'Vodka Red Bull', wheel: 'Vodka RB' },
      { name: 'Long Island Iced Tea', wheel: 'Long Island' }, 'Negroni',
      'Espresso Martini', 'Margarita'
    ] }
  ]
};
