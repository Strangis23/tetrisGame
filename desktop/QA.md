# Steam Deck / desktop QA checklist

Use this list before submitting a Steam build. Run the desktop app with:

```bash
cd desktop
STEAM_APP_ID=480 npm run start:steam
```

For shipping builds, set `SWD_REQUIRE_STEAM=1` and your real App ID.

## Display (1280×800 fixed)

Shipping Windows/Linux builds use a **non-resizable 1280×800** window. Verify:

- [ ] Board and HUD are centered side-by-side with no empty bars or scrollbars
- [ ] Title screen fits without scrolling

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
