#!/usr/bin/env python3
"""
tools/build.py — Champions Sim 2026 bundle builder

Builds (or verifies) poke-sim/poke-sim/pokemon-champion-2026.html by inlining
all source files into a single self-contained HTML bundle.

Usage:
  # Normal build (writes bundle in place)
  python3 tools/build.py

  # Check mode (CI) — exits 1 if committed bundle differs from a fresh build
  python3 tools/build.py --check

Run from the repo root.
Refs #88
"""

import argparse
import os
import re
import sys
import tempfile

# ── Paths (all relative to repo root) ────────────────────────────────────────
SOURCE_DIR  = os.path.join("poke-sim", "poke-sim")
INDEX       = os.path.join(SOURCE_DIR, "index.html")
STYLE       = os.path.join(SOURCE_DIR, "style.css")
DATA        = os.path.join(SOURCE_DIR, "data.js")
ENGINE      = os.path.join(SOURCE_DIR, "engine.js")
UI          = os.path.join(SOURCE_DIR, "ui.js")
STRATEGY    = os.path.join(SOURCE_DIR, "strategy-injectable.js")
BUNDLE_OUT  = os.path.join(SOURCE_DIR, "pokemon-champion-2026.html")

SOURCE_FILES = [INDEX, STYLE, DATA, ENGINE, UI, STRATEGY]


def read(path: str) -> str:
    if not os.path.exists(path):
        print(f"ERROR: source file not found: {path}", file=sys.stderr)
        sys.exit(1)
    with open(path, "r", encoding="utf-8") as f:
        return f.read()


def build() -> str:
    """Assemble and return the full bundle as a string."""
    html     = read(INDEX)
    css      = read(STYLE)
    data_js  = read(DATA)
    engine_js = read(ENGINE)
    ui_js    = read(UI)
    strategy_js = read(STRATEGY)

    # Remove external script tags
    html = html.replace('<script src="data.js"></script>', '')
    html = html.replace('<script src="engine.js"></script>', '')
    html = html.replace('<script src="ui.js"></script>', '')
    html = html.replace('<script src="strategy-injectable.js"></script>', '')

    # Remove external stylesheet link
    html = html.replace('<link rel="stylesheet" href="style.css"/>', '')

    # Remove service worker registration block
    html = re.sub(
        r'<script>\nif \(.serviceWorker.\).*?</script>',
        '',
        html,
        flags=re.DOTALL
    )

    # Remove PWA manifest + apple touch icon links
    html = html.replace('<link rel="manifest" href="manifest.json"/>', '')
    html = html.replace('<link rel="apple-touch-icon" href="icon-192.png"/>', '')

    # Inline CSS before </head>
    html = html.replace(
        '</head>',
        '<style>\n' + css + '\n</style>\n</head>'
    )

    # Inline all JS before </body>
    combined_js = data_js + '\n\n' + engine_js + '\n\n' + ui_js + '\n\n' + strategy_js
    html = html.replace(
        '</body>',
        '<script>\n' + combined_js + '\n</script>\n</body>'
    )

    return html


def write_bundle(content: str, path: str) -> None:
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    size_kb = os.path.getsize(path) / 1024
    print(f"Bundle written: {path} ({size_kb:,.1f} KB)")


def check_mode() -> None:
    """
    CI check: build to a temp file, diff against committed bundle.
    Exit 1 if they differ.
    """
    if not os.path.exists(BUNDLE_OUT):
        print(f"ERROR: committed bundle not found at {BUNDLE_OUT}", file=sys.stderr)
        sys.exit(1)

    fresh = build()

    with open(BUNDLE_OUT, 'r', encoding='utf-8') as f:
        committed = f.read()

    if fresh == committed:
        committed_kb = len(committed.encode('utf-8')) / 1024
        print(f"✅  Bundle is fresh — committed bundle matches a clean rebuild ({committed_kb:,.1f} KB).")
        sys.exit(0)
    else:
        committed_kb = len(committed.encode('utf-8')) / 1024
        fresh_kb     = len(fresh.encode('utf-8'))     / 1024

        # Find which source files changed (passed via env by CI workflow)
        changed = os.environ.get('CHANGED_SOURCE_FILES', '(see workflow output)')

        print("", file=sys.stderr)
        print("❌  Bundle is STALE — the committed bundle does not match a clean rebuild.", file=sys.stderr)
        print("", file=sys.stderr)
        print(f"    Committed bundle : {committed_kb:,.1f} KB", file=sys.stderr)
        print(f"    Fresh build      : {fresh_kb:,.1f} KB", file=sys.stderr)
        print("", file=sys.stderr)
        print("    Source files that changed in this PR:", file=sys.stderr)
        print(f"      {changed}", file=sys.stderr)
        print("", file=sys.stderr)
        print("    Fix: rebuild the bundle and commit it alongside your source changes:", file=sys.stderr)
        print("      cd poke-sim/poke-sim && python3 ../../tools/build.py && cd ../..", file=sys.stderr)
        print("      git add poke-sim/poke-sim/pokemon-champion-2026.html", file=sys.stderr)
        print("      git commit --amend --no-edit", file=sys.stderr)
        print("", file=sys.stderr)
        print("    See MASTER_PROMPT.md > REBUILD WARNING for full steps.", file=sys.stderr)
        sys.exit(1)


def main() -> None:
    parser = argparse.ArgumentParser(
        description='Champions Sim 2026 bundle builder'
    )
    parser.add_argument(
        '--check',
        action='store_true',
        help='CI mode: verify committed bundle matches a clean rebuild (exit 1 if stale)'
    )
    args = parser.parse_args()

    # Must be run from repo root
    if not os.path.isdir(SOURCE_DIR):
        print(
            f"ERROR: source dir '{SOURCE_DIR}' not found.\n"
            "Run this script from the repository root.",
            file=sys.stderr
        )
        sys.exit(1)

    if args.check:
        check_mode()
    else:
        content = build()
        write_bundle(content, BUNDLE_OUT)


if __name__ == '__main__':
    main()
