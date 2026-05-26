// Player's deck. Holds a list of cards and provides a single shuffled draw
// queue that cycles through the entire deck before reshuffling. Buying a card
// at the shop calls `replace(removeId, newCard)`.
class Deck {
  constructor(cards) {
    this.cards = cards.slice();
    this._queue = [];
    this._reshuffle();
  }

  size() { return this.cards.length; }

  list() { return this.cards.slice(); }

  has(id) { return this.cards.some((c) => c.id === id); }

  _reshuffle() {
    this._queue = this.cards.slice();
    for (let i = this._queue.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this._queue[i], this._queue[j]] = [this._queue[j], this._queue[i]];
    }
    this._peekTail = null;
  }

  draw() {
    if (this._queue.length === 0) this._reshuffle();
    return this._queue.shift();
  }

  // Stable preview of the next reshuffle when the queue runs dry (cached until
  // draw/reshuffle/replace invalidates it).
  _ensurePeekTail() {
    if (this._peekTail) return;
    this._peekTail = this.cards.slice();
    for (let i = this._peekTail.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this._peekTail[i], this._peekTail[j]] = [this._peekTail[j], this._peekTail[i]];
    }
  }

  // Look ahead at the next n cards without consuming them.
  peek(n = 1) {
    if (this._queue.length >= n) return this._queue.slice(0, n);
    this._ensurePeekTail();
    return [...this._queue, ...this._peekTail].slice(0, n);
  }

  // Swap one card out of the deck for another. Also strips the removed card
  // from any pending queue position so it doesn't get drawn after being sold.
  replace(removeId, newCard) {
    const idx = this.cards.findIndex((c) => c.id === removeId);
    if (idx < 0) return false;
    this.cards.splice(idx, 1, newCard);
    this._queue = this._queue.filter((c) => c.id !== removeId);
    this._peekTail = null;
    return true;
  }

  serialize() {
    return this.cards.map((c) => ({
      id: c.id, shape: c.shape, role: c.role, rarity: c.rarity, stats: { ...c.stats },
    }));
  }
}
