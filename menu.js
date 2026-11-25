window.OB_MENU = {
  people: 5,
  tripLabel: '26.–29.11.2026 · București',   // static line on the login screen
  tripStart: '2026-11-26T18:30:00+01:00',    // countdown until here (Danish time), then "NU"
  tripEnd: '2026-11-29T00:00:00+01:00',      // from here: "Det var det. Tak for en god tur, boys."
  perWheel: 12,                              // slices drawn from each pool per wheel
  // "Bestil på rumænsk": order.ro / order.da are the sentences; {item} is the item's name (in Romanian without "(…)",
  // and " & " becomes " cu "). An item's own ro: '…' replaces that Romanian text when it sounds wrong.
  // After changing a sentence or a ro text, make the sound files again: python3 tools/make_ro_audio.py
  modes: [
    { id: 'beer', name: 'Øl', unit: 'mærker',
      order: { ro: 'Bună! Aș dori o bere {item}, vă rog.', da: 'Hej! Jeg vil gerne have en {item}, tak.' }, items: [
      // Big Romanian lagers
      'Ursus', 'Timișoreana', 'Ciuc', 'Silva', 'Bergenbier', 'Stejar',
      // Romanian everyday lagers
      'Ciucaș', 'Bucegi', 'Golden Brau', 'Neumarkt', 'Azuga', 'Noroc', 'Gambrinus', 'Albacher', 'Bürger',
      // Romanian variants
      'Silva Dark', { name: 'Ursus Black Grizzly', wheel: 'Black Grizzly' }, { name: 'Ursus Nefiltrată', wheel: 'Ursus Nefiltr.' },
      { name: 'Ursus Retro Carpatin', wheel: 'Ursus Retro' }, { name: 'Ursus Cireșar', wheel: 'Cireșar' }, 'Ursus Cooler',
      { name: 'Timișoreana Nepasteurizată', wheel: 'Timi Nepast.' }, { name: 'Ciucaș Malzbier', wheel: 'Malzbier' }, { name: 'Azuga Weissbier', wheel: 'Azuga Weiss' }, 'Ciuc Radler',
      // Romanian craft
      'Hop Hooligans', 'Ground Zero', 'Zăganu', 'Sikaru', 'Bereta', 'Grivița', 'Nenea Iancu',
      // International brands sold in Romania
      'Heineken', 'Tuborg', 'Stella Artois', 'Peroni', 'Carlsberg', { name: 'Pilsner Urquell', wheel: 'Urquell' }, 'Guinness',
      "Beck's", 'Staropramen', 'Amstel', 'Skol', 'Holsten', 'Kozel', 'Grolsch', 'Grolsch Weizen', 'Efes', "Redd's",
      'St. Stefanus', 'Asahi', 'Budweiser', 'Leffe', 'Paulaner', 'Löwenbräu', 'Grimbergen', 'Delirium',
      // Common elsewhere in Europe
      'Hoegaarden', 'Erdinger', 'Franziskaner', { name: 'Weihenstephaner', wheel: 'Weihenst.' }, 'Warsteiner', 'Bitburger',
      { name: 'Kronenbourg 1664', wheel: '1664' }, { name: 'Birra Moretti', wheel: 'Moretti' }, 'Corona', 'Desperados',
      'Krušovice', 'Duvel', 'Chimay', 'Kilkenny', { name: 'Mort Subite Kriek', wheel: 'Mort Subite' },
      { name: 'Estrella Damm', wheel: 'Estrella' }, 'San Miguel', 'Affligem'
    ] },
    { id: 'shots', name: 'Shots', unit: 'shots',
      order: { ro: 'Bună! Aș dori un shot de {item}, vă rog.', da: 'Hej! Jeg vil gerne have en shot {item}, tak.' }, items: [
      // Classics
      'Jägermeister', { name: 'Tequila (salt & lime)', wheel: 'Tequila' }, 'Sambuca', 'Vodka', 'B-52', 'Kamikaze', 'Jägerbomb',
      { name: 'Whiskey (Jameson)', wheel: 'Whiskey', ro: 'whiskey Jameson' }, { name: 'Absinth', ro: 'absint' },
      // Romanian and local
      'Pălincă', 'Țuică', 'Vișinată', 'Horincă', 'Rachiu', 'Afinată', 'Alexandrion',
      // Europe, regional favourites
      'Rakija', 'Slivovitz', 'Unicum', 'Becherovka', 'Ouzo', 'Grappa', 'Limoncello', 'Licor 43', 'Amaretto',
      { name: 'Fernet-Branca', wheel: 'Fernet' }, 'Metaxa', 'Aquavit',
      // Straight spirits and liqueurs
      'Tequila Gold', 'Mezcal', 'Bacardi', 'Captain Morgan', 'Havana Club', 'Gin', "Jack Daniel's", 'Jim Beam',
      { name: 'Southern Comfort', wheel: 'SoCo' }, { name: 'Cognac', ro: 'coniac' }, 'Baileys', 'Fireball', 'Malibu', 'Kahlúa', 'Cointreau',
      { name: 'Green Chartreuse', wheel: 'Chartreuse' }, 'Sourz',
      // Mixed and layered shots
      { name: 'Slippery Nipple', wheel: 'Slippery Nip.' }, 'Baby Guinness', 'Lemon Drop', { name: 'Brain Hemorrhage', wheel: 'Brain Hem.' }, { name: 'Tequila Slammer', wheel: 'Teq. Slammer' },
      { name: 'Flaming Sambuca', wheel: 'Flaming Samb.' }, 'Pickleback', { name: 'Washington Apple', wheel: 'Wash. Apple' },
      { name: 'Green Tea Shot', ro: 'Green Tea' }, { name: 'Alabama Slammer', wheel: 'Alabama Sl.' }, 'Oatmeal Cookie', 'Duck Fart', 'Mexican Flag',
      'Mind Eraser'
    ] },
    { id: 'drinks', name: 'Drinks', unit: 'drinks',
      order: { ro: 'Bună! Aș dori un {item}, vă rog.', da: 'Hej! Jeg vil gerne have en {item}, tak.' }, items: [
      // Core
      'Gin & Tonic', 'Aperol Spritz', 'Hugo', 'Mojito', 'Cuba Libre', 'Moscow Mule',
      { name: 'Whiskey & Cola', wheel: 'Whiskey Cola' }, { name: 'Vodka Red Bull', wheel: 'Vodka RB', ro: 'pahar de vodka cu Red Bull' },
      { name: 'Long Island Iced Tea', wheel: 'Long Island' }, 'Negroni', 'Espresso Martini', { name: 'Margarita', ro: 'cocktail Margarita' },
      // Romanian and seasonal
      { name: 'Șpriț (wine + soda)', wheel: 'Șpriț' }, { name: 'Vin fiert (mulled wine)', wheel: 'Vin fiert' },
      // Classics
      'Old Fashioned', 'Whiskey Sour', 'Amaretto Sour', 'Pisco Sour', 'Daiquiri', { name: 'Piña Colada', ro: 'cocktail Piña Colada' },
      { name: 'Caipirinha', ro: 'cocktail Caipirinha' }, { name: 'Caipiroska', ro: 'cocktail Caipiroska' },
      { name: 'Sex on the Beach', wheel: 'Sex on Beach' }, { name: 'Cosmopolitan', wheel: 'Cosmo' },
      { name: 'Pornstar Martini', wheel: 'Pornstar' }, 'Bloody Mary', 'Tom Collins', "Dark 'n' Stormy", { name: 'Paloma', ro: 'cocktail Paloma' },
      { name: 'Tequila Sunrise', wheel: 'Teq. Sunrise' }, 'Screwdriver', 'White Russian', 'Black Russian', 'Mai Tai',
      'Zombie', 'Manhattan', 'Dry Martini', 'Mojito Royale',
      // Spritz and bubbles
      'Campari Spritz', { name: 'Limoncello Spritz', wheel: 'Limon. Spritz' }, 'Kir Royal', 'Bellini', { name: 'Mimosa', ro: 'cocktail Mimosa' }, 'French 75',
      // Bartender favourites
      'Americano', 'Boulevardier', 'Sidecar', 'Gin Fizz', 'Bramble', 'Clover Club',
      { name: 'Gin Basil Smash', wheel: 'Basil Smash' }, 'Penicillin', 'Paper Plane', 'Sazerac', 'Mint Julep',
      { name: 'Singapore Sling', wheel: 'Singapore' }, 'Godfather', 'Rusty Nail',
      // Simple long drinks
      { name: 'Vodka Soda Lime', wheel: 'Vodka Soda', ro: 'pahar de vodka cu sifon și lime' }, { name: 'Rum & Ginger', ro: 'rom cu ginger ale' }, 'Jäger Tonic', 'Blue Lagoon', 'Irish Coffee', 'Hot Toddy'
    ] }
  ]
};
