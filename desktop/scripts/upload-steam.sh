#!/usr/bin/env bash
# Upload Windows/Linux builds to Steam via steamcmd + Steamworks SDK ContentBuilder.
# Prerequisites:
#   - SteamCMD installed and on PATH (or set STEAMCMD)
#   - steam/content/ configured with app_build.vdf + depot_build_*.vdf
#   - SWD_STEAM_USER / SWD_STEAM_PASS env vars (or steamcmd cached login)
#
# Usage:
#   ./scripts/upload-steam.sh [app_build.vdf]

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STEAMCMD="${STEAMCMD:-steamcmd}"
BUILD_VDF="${1:-$ROOT/steam/content/app_build.vdf}"

if [[ ! -f "$BUILD_VDF" ]]; then
  echo "Missing $BUILD_VDF — copy steam/content/app_build.vdf.example and edit AppID/depots."
  exit 1
fi

CONTENT_ROOT="$(dirname "$BUILD_VDF")"
echo "Uploading from $CONTENT_ROOT using $BUILD_VDF"

"$STEAMCMD" +login "${SWD_STEAM_USER:?Set SWD_STEAM_USER}" "${SWD_STEAM_PASS:-}" \
  +run_app_build "$BUILD_VDF" \
  +quit
