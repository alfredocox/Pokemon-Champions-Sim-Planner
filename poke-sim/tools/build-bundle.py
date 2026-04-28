#!/usr/bin/env python3
"""
build-bundle.py  --  Champions Sim bundle builder
Extracted from MASTER_PROMPT rebuild command so CI and humans use the same code path.

Usage:
  python3 tools/build-bundle.py               # writes pokemon-champion-2026.html
  python3 tools/build-bundle.py --to-stdout   # prints bundle to stdout (used by check-bundle.sh)
"""
import re, os, sys
import urllib.request

# Resolve BASE to the poke-sim/ directory (parent of tools/)
BASE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))

# Vendored supabase-js cache (single-file UMD, ~192 KB).
# Inlined into the bundle so the offline PWA does not need cdn.jsdelivr.net at runtime.
SUPABASE_JS_URL = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'
VENDOR_DIR      = os.path.join(BASE, 'tools', 'vendor')
VENDOR_FILE     = os.path.join(VENDOR_DIR, 'supabase-js.umd.js')

def read(path):
    with open(os.path.join(BASE, path), 'r', encoding='utf-8') as f:
        return f.read()

def fetch_supabase_umd():
    """Fetch supabase-js UMD bundle. Cache it at tools/vendor/ so subsequent
    builds and CI runs do not hit the network. Returns the JS source as a string.

    NOTE: All file I/O is forced to UTF-8 with newline='' so the script works
    identically on Linux, macOS, and Windows (which otherwise defaults to cp1252).
    """
    if os.path.exists(VENDOR_FILE):
        with open(VENDOR_FILE, 'r', encoding='utf-8') as f:
            return f.read()
    os.makedirs(VENDOR_DIR, exist_ok=True)
    print(f'Fetching supabase-js UMD from {SUPABASE_JS_URL} ...')
    req = urllib.request.Request(SUPABASE_JS_URL, headers={'User-Agent': 'champions-sim-build'})
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = resp.read().decode('utf-8')
    with open(VENDOR_FILE, 'w', encoding='utf-8', newline='') as f:
        f.write(data)
    print(f'Cached supabase-js UMD: {len(data):,} bytes -> {VENDOR_FILE}')
    return data

html    = read('index.html')
css     = read('style.css')
data    = read('data.js')
engine  = read('engine.js')
ui      = read('ui.js')
storage = read('storage_adapter.js')
supabase = read('supabase_adapter.js')
supabase_umd = fetch_supabase_umd()

html = html.replace('<script src="data.js"></script>', '')
html = html.replace('<script src="engine.js"></script>', '')
html = html.replace('<script src="ui.js"></script>', '')
html = html.replace('<script src="storage_adapter.js"></script>', '')
html = html.replace('<script src="supabase_adapter.js"></script>', '')
html = html.replace('<link rel="stylesheet" href="style.css"/>', '')
html = re.sub(r'<script>\nif \(.serviceWorker.\).*?</script>', '', html, flags=re.DOTALL)
html = html.replace('<link rel="manifest" href="manifest.json"/>', '')
html = html.replace('<link rel="apple-touch-icon" href="icon-192.png"/>', '')

# Strip ANY external supabase-js CDN <script> tag. Match jsdelivr / unpkg / esm.sh,
# with single or double quotes, with or without integrity/crossorigin attrs.
html = re.sub(
    r'<script\b[^>]*\bsrc=["\'](?:https?:)?//(?:cdn\.jsdelivr\.net|unpkg\.com|esm\.sh)/[^"\']*supabase[^"\']*["\'][^>]*>\s*</script>\s*',
    '',
    html,
    flags=re.IGNORECASE,
)

html = html.replace('</head>', '<style>\n' + css + '\n</style>\n</head>')

# Inline supabase-js UMD FIRST so window.supabase exists before our adapter runs.
inline_js = (
    '<script>\n/* vendored: @supabase/supabase-js UMD, inlined for offline PWA */\n'
    + supabase_umd
    + '\n</script>\n'
    + '<script>\n'
    + data + '\n\n' + engine + '\n\n' + ui + '\n\n' + storage + '\n\n' + supabase
    + '\n</script>\n</body>'
)
html = html.replace('</body>', inline_js)

if '--to-stdout' in sys.argv:
    # On Windows, sys.stdout defaults to cp1252; reconfigure to UTF-8 so
    # `python build-bundle.py --to-stdout > out.html` produces a clean bundle.
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except AttributeError:
        pass  # Python < 3.7 fallback (we require 3.x; this is defensive)
    sys.stdout.write(html)
else:
    out = os.path.join(BASE, 'pokemon-champion-2026.html')
    with open(out, 'w', encoding='utf-8', newline='') as f:
        f.write(html)
    print(f'Bundle: {os.path.getsize(out):,} bytes -> {out}')
