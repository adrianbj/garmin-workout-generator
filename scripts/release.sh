#!/usr/bin/env bash
# Publishes a GitHub release for the current package.json version:
#   1. Verifies working tree is clean and on main.
#   2. Verifies the tag doesn't already exist.
#   3. Verifies manifest.config.ts version matches package.json.
#   4. Runs typecheck + tests.
#   5. Packs fresh CRX + ZIP via `npm run pack`.
#   6. Generates release notes from commits since the previous tag.
#   7. Creates a draft GitHub release with both artifacts attached, so you can
#      review the notes in the web UI before publishing.
#
# Usage:
#   bump version in package.json AND manifest.config.ts, commit, push, then:
#   npm run release

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

VERSION="$(node -p "require('./package.json').version")"
NAME="$(node -p "require('./package.json').name")"
TAG="v$VERSION"
ZIP="$NAME-$VERSION.zip"
CRX="$NAME-$VERSION.crx"

step() { echo ""; echo "→ $*"; }
die() { echo "ERROR: $*" >&2; exit 1; }

step "Sanity checks"

if [ -n "$(git status --porcelain)" ]; then
  die "Working tree has uncommitted changes. Commit or stash first."
fi

BRANCH="$(git branch --show-current)"
if [ "$BRANCH" != "main" ]; then
  die "Not on main (currently on '$BRANCH'). Release from main."
fi

if git rev-parse "$TAG" >/dev/null 2>&1; then
  die "Tag $TAG already exists. Bump version in package.json and manifest.config.ts first."
fi

MANIFEST_VERSION="$(grep -E '^[[:space:]]+version:' manifest.config.ts | sed -E 's/.*"([^"]+)".*/\1/')"
if [ "$MANIFEST_VERSION" != "$VERSION" ]; then
  die "Version mismatch: package.json=$VERSION  manifest.config.ts=$MANIFEST_VERSION"
fi

step "typecheck"
npm run typecheck

step "tests"
npm test

step "pack"
rm -f *.crx *.zip
npm run pack >/dev/null

[ -f "$ZIP" ] || die "Missing $ZIP after pack"
[ -f "$CRX" ] || die "Missing $CRX after pack"

step "Generate release notes"

NOTES_FILE="$(mktemp)"
trap "rm -f $NOTES_FILE" EXIT

PREV_TAG="$(git tag --sort=-v:refname | head -1 || echo "")"
if [ -n "$PREV_TAG" ]; then
  echo "## Changes since $PREV_TAG" >  "$NOTES_FILE"
  echo "" >> "$NOTES_FILE"
  git log "$PREV_TAG..HEAD" --pretty=format:"- %s" >> "$NOTES_FILE"
  echo "" >> "$NOTES_FILE"
else
  echo "Initial release." > "$NOTES_FILE"
fi

cat >> "$NOTES_FILE" <<EOF


## Install

1. Download \`$ZIP\` below.
2. Open \`chrome://extensions\` → enable Developer mode → drag the zip onto the page.

See [README](../blob/main/README.md) for setup (Gemini API key + pace zones).
EOF

step "Create draft release $TAG"
URL="$(gh release create "$TAG" "$ZIP" "$CRX" \
  --title "$TAG" \
  --notes-file "$NOTES_FILE" \
  --draft)"

echo ""
echo "Draft release created: $URL"
echo "Review and publish it in the web UI when ready."
