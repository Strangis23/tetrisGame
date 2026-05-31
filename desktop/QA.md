# Steam Deck / desktop QA checklist

Use this list before submitting a Steam build. Run the desktop app with:

```bash
cd desktop
STEAM_APP_ID=480 npm run start:steam
```

For shipping builds, set `SWD_REQUIRE_STEAM=1` and your real App ID.

## Display (1280×800)

- [ ] Game board and HUD fit without excessive scrolling at 1280×800
- [ ] `.platform-steam` layout keeps canvas and HUD side-by-side on Deck landscape
- [ ] Text remains readable on the 7" screen (stats, deck chips, shop)

## Input

- [ ] Keyboard controls work (arrows, rotate, hold, pause)
- [ ] Steam Overlay (Shift+Tab) opens and closes; input works afterward
- [ ] Optional: enable HUD **Pad** for touch / Deck touchscreen

## Steam integration

- [ ] App initializes Steam API when launched via Steam (or with App ID 480 in dev)
- [ ] Achievements unlock (verify in Steam client overlay → Achievements)
- [ ] Steam Cloud: change settings, quit, reinstall — settings restore
- [ ] Rich presence updates during build/wave phases

## Offline

- [ ] No requests to Google Fonts or AdSense (bundled fonts only)
- [ ] No service worker registration in desktop build
- [ ] Ad banner hidden

## Lifecycle

- [ ] **Quit Game** in Settings exits cleanly
- [ ] Window close quits the app
- [ ] Pause blocks piece movement (keyboard, touch, mobile pad)
