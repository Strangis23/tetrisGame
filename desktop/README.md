# Stackwave Defense — Desktop / Steam

Electron wrapper for Windows and Linux (Steam Deck) builds.

## Prerequisites

- Node.js 20+
- Steam client (for local Steam API testing)
- Steamworks partner account and App ID (use `480` / Spacewar for dev)

## Development

```bash
cd desktop
npm install
npm run start:steam
```

Environment variables:

| Variable | Default | Purpose |
|----------|---------|---------|
| `STEAM_APP_ID` | `480` | Steam App ID |
| `SWD_REQUIRE_STEAM` | off | Exit if Steam API fails to init |
| `SWD_DEVTOOLS` | off | Open Chromium DevTools |
| `SWD_ALLOW_RESIZE` | off | Allow window resizing (dev only; shipping builds are fixed **1280×800**) |

## Window size

Windows and Linux builds use a **fixed 1280×800** client area (Steam Deck landscape). The window is not resizable unless `SWD_ALLOW_RESIZE=1`. Edit [`window-config.js`](window-config.js) to change the size.

## Production builds

```bash
cd desktop
npm run build        # Windows + Linux
npm run build:win
npm run build:linux
```

Output: `desktop/dist/`

Copy build artifacts into `steam/content/windows/` and `steam/content/linux/` before SteamPipe upload.

## Steamworks setup

1. Copy `steam/content/app_build.vdf.example` → `app_build.vdf` and set App/depot IDs.
2. Define achievements from [`steam/achievements.json`](../steam/achievements.json) in the partner dashboard.
3. Enable Steam Cloud with root `SWD` and files matching keys in `achievements.json` → `cloudFiles`.
4. Upload: `SWD_STEAM_USER=... SWD_STEAM_PASS=... npm run steam:upload`

## QA checklist (Steam Deck)

- [ ] Launch only through Steam (`SWD_REQUIRE_STEAM=1` in shipping build)
- [ ] 1280×800 layout: HUD readable, canvas scales (`styles.css` `.platform-steam` rules)
- [ ] Steam Overlay (Shift+Tab) does not break keyboard input after closing
- [ ] Achievements unlock on partner test account
- [ ] Cloud save restores after deleting local profile / reinstall
- [ ] Offline: no CDN/ad network errors; bundled fonts load
- [ ] Touchscreen / Deck controls optional via HUD Pad toggle
