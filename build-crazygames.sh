#!/usr/bin/env bash
# Builds the CrazyGames copy: crazygames/game/ and crazygames/boom-diggers-crazygames.zip.
# The one difference from the plain web build: the CrazyGames SDK v3 <script>
# goes into index.html ahead of the game, which src/platform.js then finds.
set -eu
cd "$(dirname "$0")"
SDK='https://sdk.crazygames.com/crazygames-sdk-v3.js'
OUT=crazygames/game
ZIP=crazygames/boom-diggers-crazygames.zip
npx vite build --logLevel warn
rm -rf "$OUT"; mkdir -p crazygames; cp -r dist "$OUT"
sed -i "s#<head>#<head><script src=\"$SDK\"></script>#" "$OUT/index.html"
grep -q "$SDK" "$OUT/index.html" || { echo "the SDK was not added"; exit 1; }
# CrazyGames only takes relative paths, and nothing but the SDK may come from outside
if grep -nE '(src|href)="/' "$OUT/index.html"; then echo "an absolute path is in index.html"; exit 1; fi
if grep -rnoE 'https?://[^"'"'"' )>]*' "$OUT" --include=*.html | grep -v 'sdk.crazygames.com'; then echo "an external address"; exit 1; fi
rm -f "$ZIP"; (cd "$OUT" && zip -q -X -r "../$(basename "$ZIP")" .)
echo "$ZIP  $(cd "$OUT" && find . -type f | wc -l) files, $(du -h "$ZIP" | cut -f1)"
