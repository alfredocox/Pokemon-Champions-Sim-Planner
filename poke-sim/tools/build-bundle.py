#!/usr/bin/env python3
"""
build-bundle.py  --  Champions Sim bundle builder
Extracted from MASTER_PROMPT rebuild command so CI and humans use the same code path.

Usage:
  python3 tools/build-bundle.py               # writes pokemon-champion-2026.html
  python3 tools/build-bundle.py --to-stdout   # prints bundle to stdout (used by check-bundle.sh)
"""
import re, os, sys

# Resolve BASE to the poke-sim/ directory (parent of tools/)
BASE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))

def read(path):
    with open(os.path.join(BASE, path), 'r') as f:
        return f.read()

html   = read('index.html')
css    = read('style.css')
data   = read('data.js')
engine = read('engine.js')
ui     = read('ui.js')

html = html.replace('<script src="data.js"></script>', '')
html = html.replace('<script src="engine.js"></script>', '')
html = html.replace('<script src="ui.js"></script>', '')
html = html.replace('<link rel="stylesheet" href="style.css"/>', '')
html = re.sub(r'<script>\nif \(.serviceWorker.\).*?</script>', '', html, flags=re.DOTALL)
html = html.replace('<link rel="manifest" href="manifest.json"/>', '')
html = html.replace('<link rel="apple-touch-icon" href="icon-192.png"/>', '')
html = html.replace('</head>', '<style>\n' + css + '\n</style>\n</head>')
html = html.replace('</body>', '<script>\n' + data + '\n\n' + engine + '\n\n' + ui + '\n</script>\n</body>')

if '--to-stdout' in sys.argv:
    sys.stdout.write(html)
else:
    out = os.path.join(BASE, 'pokemon-champion-2026.html')
    with open(out, 'w') as f:
        f.write(html)
    print(f'Bundle: {os.path.getsize(out):,} bytes -> {out}')
