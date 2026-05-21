#!/usr/bin/env bash
# Convert Markdown client docs to Word (.docx) using a local pandoc binary.
# Pandoc is installed under docs/.tools/ on first run (gitignored, not pushed to GitHub).
# Usage:
#   ./scripts/md-to-docx.sh REQUIREMENTS-CLIENT.md
#   ./scripts/md-to-docx.sh REQUIREMENTS-CLIENT.md REQUIREMENTS-CLIENT-EN.md

set -euo pipefail

DOCS_DIR="$(cd "$(dirname "$0")/.." && pwd)"
TOOLS_DIR="$DOCS_DIR/.tools"
PANDOC_VER="3.6.4"
PANDOC_BIN="$TOOLS_DIR/pandoc-${PANDOC_VER}-arm64/bin/pandoc"

ensure_pandoc() {
  if [[ -x "$PANDOC_BIN" ]]; then
    return 0
  fi
  echo "Downloading pandoc ${PANDOC_VER} (arm64 macOS)..."
  mkdir -p "$TOOLS_DIR"
  local zip="$TOOLS_DIR/pandoc-${PANDOC_VER}-arm64-macOS.zip"
  curl -fsSL -o "$zip" \
    "https://github.com/jgm/pandoc/releases/download/${PANDOC_VER}/pandoc-${PANDOC_VER}-arm64-macOS.zip"
  unzip -qo "$zip" -d "$TOOLS_DIR"
}

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <file.md> [file2.md ...]" >&2
  exit 1
fi

ensure_pandoc

cd "$DOCS_DIR"
for md in "$@"; do
  if [[ ! -f "$md" ]]; then
    echo "Not found: $md" >&2
    exit 1
  fi
  base="${md%.md}"
  out="${base}.docx"
  echo "Converting $md -> $out"
  "$PANDOC_BIN" "$md" -o "$out" --from=markdown --to=docx
done

echo "Done."
