#!/usr/bin/env bash
# Copy electron-builder output into SteamPipe content folders.
# Usage: ./scripts/stage-steam-content.sh

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIST="$ROOT/dist"
CONTENT="$ROOT/../steam/content"

mkdir -p "$CONTENT/windows" "$CONTENT/linux"

win_zip=$(find "$DIST" -maxdepth 1 -name '*win*.zip' 2>/dev/null | head -1)
linux_app=$(find "$DIST" -maxdepth 1 -name '*.AppImage' 2>/dev/null | head -1)
linux_tar=$(find "$DIST" -maxdepth 1 -name '*.tar.gz' 2>/dev/null | head -1)

if [[ -n "$win_zip" ]]; then
  echo "Staging Windows build from $win_zip"
  rm -rf "$CONTENT/windows"/*
  unzip -q -o "$win_zip" -d "$CONTENT/windows"
fi

if [[ -n "$linux_app" ]]; then
  echo "Staging Linux AppImage: $linux_app"
  cp -f "$linux_app" "$CONTENT/linux/"
fi

if [[ -n "$linux_tar" ]]; then
  echo "Staging Linux tar.gz: $linux_tar"
  rm -rf "$CONTENT/linux/extracted"
  mkdir -p "$CONTENT/linux/extracted"
  tar -xzf "$linux_tar" -C "$CONTENT/linux/extracted"
fi

echo "Done. Edit steam/content/app_build.vdf and run npm run steam:upload"
