'use strict';

// Fixed client size for Windows/Linux desktop builds (matches Steam Deck landscape).
const WIDTH = 1280;
const HEIGHT = 800;

module.exports = {
  WIDTH,
  HEIGHT,
  MIN_WIDTH: 960,
  MIN_HEIGHT: 600,
  HUD_PANEL_WIDTH: 250,
  LAYOUT_PADDING: 18,
  LAYOUT_GAP: 18,
  /** Set SWD_FIXED_WINDOW=1 to lock size (dev/testing). */
  RESIZABLE: process.env.SWD_FIXED_WINDOW !== '1',
};
