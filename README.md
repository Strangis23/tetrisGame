# Stackwave Defense — Deck-Builder Edition

A pure-vanilla HTML5 Canvas game that fuses polyomino stacking with a tower-defense deck-builder. Drop tetromino-shaped modules from your **deck of 20 cards** to build defenses, then survive a wave of A\*-pathing enemies trying to reach your home base. Every five waves, a **rarity-weighted shop** offers ten random upgraded cards. Buy any one — but you must remove an existing card from your deck in exchange.

No build tools required for the web version. Open `index.html` (or serve the folder over HTTP) and play.

## Steam / Desktop

See [`desktop/README.md`](desktop/README.md) for the Electron wrapper, Steamworks integration, and build instructions (Windows + Linux / Steam Deck).

## How to Play

1. **Place your home base.** The first piece you drop is your home base. Protect it.
2. **Build phase.** Each round, four pieces are drawn from your deck. Place them on the grid. Filled rows clear (and award points), but the towers in those rows are destroyed.
3. **Wave phase.** Cells act as towers based on the role on their card. Walkers and brutes path with A\*; flyers ignore terrain; brutes break walls. Reach zero enemies to clear the wave.
4. **Shop (every 5 waves).** Browse 10 random cards across 5 rarities. Click **Buy**, then click any of your existing 20 deck cards to swap it out. Repeat for as many purchases as you can afford.
5. **Win** by clearing all 100 waves. **Lose** if your **home base HP** reaches zero or blocks reach the spawn area. Only a **completely full row** clears (non-base blocks in that row are removed; home base cells remain and fall with gravity).

Your home base has a shared **HP pool** (from the HP of the piece you place first). Enemies that reach base cells **siege** it over time instead of ending the run instantly. In the shop, spend points on **Fortify Base** (+30 max HP per level, escalating cost) in addition to card swaps.

## The Deck

Your starting deck has **20 commons**: 10 walls and 10 basic shooters, all with random tetromino shapes. The deck is shuffled into a single draw queue; you'll see every card once before reshuffling.

Behaviour is tied to the **card's role**, not the shape. Any shape can carry any role — only the placement footprint depends on the shape.

### Roles

- `wall` — no attack, high HP, passive income (+pts at the start of every wave)
- `shooter` — basic single-target attack with mediocre range and damage
- `sniper` — long range, high damage, slow fire rate, optional pierce
- `splash` — homing AoE shells
- `slow` — slows enemies in an aura; legendaries also pulse damage
- `gunner` — fast fire rate, omnidirectional
- `piercer` — ultra-fast bullets that pass through multiple enemies
- `multishot` — fires a spread of N projectiles

### Rarities

| Rarity | Color | Cost | Notes |
| --- | --- | --- | --- |
| common | gray | 220 | Walls and shooters at baseline stats |
| uncommon | green | 500 | Beefier walls/shooters |
| rare | blue | 1100 | First specialist roles unlock |
| epic | purple | 2800 | Strong specialists, piercer, multishot |
| legendary | gold | 7500 | Game-changing effects |

Points come from **enemy kills**, **line clears** (50 / 150 / 250 / 400 for 1–4 lines), and **wall passive income** at the start of each wave (+2–9 per wall cell by rarity).

Higher rarity slots become more common in the shop as you progress:

- Wave 5: 70 / 25 / 5 / 0 / 0
- Wave 25: 30 / 35 / 25 / 9 / 1
- Wave 50: 12 / 25 / 33 / 25 / 5
- Wave 75: 5 / 15 / 30 / 35 / 15
- Wave 100: 0 / 5 / 25 / 40 / 30

Weights interpolate linearly between waves.

## Difficulty

- **Piece fall speed** accelerates every 10 waves (10 tiers, max ~10× faster).
- **Enemy speed** mirrors fall-speed tiers via `CONFIG.ENEMY_SPEED_MUL` — late waves have enemies that are ~74% faster than wave 1.
- **Enemy HP** grows linearly: `base × (1 + (wave - 1) × 0.07)`.
- **Spawn interval** tightens with wave: `max(0.18, 0.7 - wave × 0.014)` seconds.
- **Build budget**: only 4 pieces per build phase — every placement matters.
- Bosses appear from wave 10 onward.

The starter `Pellet Gun` is intentionally weaker than late-game alternatives. Survival past wave ~10 depends on **smart shopping** and **deck pruning**.

## Controls

- ← / → — move piece
- ↑ / X — rotate clockwise
- Z — rotate counter-clockwise
- ↓ — soft drop
- Space — hard drop
- C — hold piece
- F — cycle wave speed (during waves)
- P — pause
- **?** (HUD) — open help (pauses the game; Esc or Close to resume)
- **★** (HUD) — opens [highscores.html](highscores.html) showing your best run (wave + points)
- Mouse hover — preview a placed cell's range circle

## High scores

Runs are saved automatically when you win or lose. Tap **★** in the HUD to open **highscores.html**, which shows your best run (highest **wave**, then **points remaining**). Scores persist in your browser (`localStorage`, up to 100 entries). Steam builds sync saves via Steam Cloud when signed in.

**Synergy:** adjacent same-role blocks boost HP and attack. Synergized cells show a **gold outline** on the board (no pop-up text).

**Counters:** tower roles deal 1.5× damage to “weak” enemy types and 0.55× to “resist” types — e.g. sniper and piercer vs flyers; shooters are weak against flyers. See in-game help (?).

On mobile, the board stays on top; deck and extra panels collapse under **▸** sections. Enable touch controls in the HUD when needed.

## File Layout

```
index.html
highscores.html
styles.css
assets/fonts/     bundled Exo 2 + Orbitron (offline)
desktop/          Electron + Steamworks wrapper
steam/            Achievement API names + SteamPipe templates
js/
  platform.js     web vs desktop/Steam detection + cloud bridge
  config.js       constants, rarity colors, speed/HP scaling tables
  ...
```

## Running (web)

Any static HTTP server works. From the project root:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

Or just double-click `index.html` (older browsers may block `file://` access).

## Tips

- A wall in front of your shooters tanks brute hits and gives passive income each wave — but it occupies space your line clears could collapse.
- Line clears destroy towers but the *card* stays in your deck — you'll just draw it again.
- The first piece you drop becomes your home base. Pick a card you can defend, not necessarily the strongest one.
- Cancelling a swap from the shop is free — your points aren't spent until you click a deck card to remove.
- Sell off duplicate basic shooters once you have rare specialists; the deck stays at 20, so every slot counts.
