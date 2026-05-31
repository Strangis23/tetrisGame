// Alternate game modes — shape restrictions, shop rules, deck reshuffles.

const GAME_MODES = {
  classic: {
    id: 'classic',
    name: 'Classic',
    shortDesc: 'All shapes. Shop every 5 waves.',
    shapes: null,
    shopEnabled: true,
    randomDeck: false,
  },
  straights: {
    id: 'straights',
    name: 'Straights Only',
    shortDesc: 'I pieces in deck and shop.',
    shapes: ['I'],
    shopEnabled: true,
    randomDeck: false,
  },
  bendy: {
    id: 'bendy',
    name: 'Bendy Only',
    shortDesc: 'S and Z pieces in deck and shop.',
    shapes: ['S', 'Z'],
    shopEnabled: true,
    randomDeck: false,
  },
  lebron: {
    id: 'lebron',
    name: 'Lebron James',
    shortDesc: 'L and J pieces in deck and shop.',
    shapes: ['L', 'J'],
    shopEnabled: true,
    randomDeck: false,
  },
  big_o: {
    id: 'big_o',
    name: 'Big O',
    shortDesc: 'O pieces in deck and shop.',
    shapes: ['O'],
    shopEnabled: true,
    randomDeck: false,
  },
  t_piece: {
    id: 't_piece',
    name: 'T',
    shortDesc: 'T pieces in deck and shop.',
    shapes: ['T'],
    shopEnabled: true,
    randomDeck: false,
  },
  random: {
    id: 'random',
    name: 'Random',
    shortDesc: 'No shop. Full deck swap every 5 waves.',
    shapes: null,
    shopEnabled: false,
    randomDeck: true,
  },
};

function getGameMode(id) {
  return GAME_MODES[id] || GAME_MODES.classic;
}

function getGameModeList() {
  return Object.values(GAME_MODES);
}

function formatGameModeName(id) {
  const mode = getGameMode(id);
  return mode.name;
}
