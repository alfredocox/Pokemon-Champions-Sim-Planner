#!/usr/bin/env python3
"""
T5 — Extend TEAMS schema with Showdown-inspired legality + provenance fields.
Idempotent: skips any team block that already contains `"champion_pack_id":`.
"""
import re, sys, json, pathlib

DATA_PATH = pathlib.Path(__file__).parent / "poke-sim" / "data.js"

# Per-team metadata. Keys match TEAMS object keys.
TEAM_META = {
    "player": {
        "champion_pack_id": "player_tr_counter_v1",
        "format": "sv",
        "formatid": "gen9vgc2024regh",
        "gametype": "doubles",
        "ruleset": ["Species Clause", "Item Clause", "Bring 6 Pick 4", "Level 50"],
        "provenance": {
            "roster_source": "user-authored",
            "spread_source": "user-authored",
            "author": "user",
            "url": "",
            "status": "unproven"
        },
        "legality_status": "illegal",
        "legality_notes": "Species Clause violation: duplicate Garchomp. Fixed in T7.",
        "assumption_register": ["Team is SV-format; validated against gen9vgc rules not Champions."]
    },
    "mega_altaria": {
        "champion_pack_id": "mega_altaria_champions_regma_v1",
        "format": "champions",
        "formatid": "champions-vgc-2026-regma",
        "gametype": "doubles",
        "ruleset": ["Species Clause", "Item Clause", "Bring 6 Pick 4", "Level 50"],
        "provenance": {
            "roster_source": "https://pokepast.es/dfdfa66d317cf9d7",
            "spread_source": "https://pokepast.es/dfdfa66d317cf9d7",
            "author": "community",
            "url": "https://pokepast.es/dfdfa66d317cf9d7",
            "status": "exact"
        },
        "legality_status": "legal",
        "legality_notes": "Remove invented gen9championsvgc2026regma tag in T10.",
        "assumption_register": []
    },
    "mega_dragonite": {
        "champion_pack_id": "mega_dragonite_champions_regma_v1",
        "format": "champions",
        "formatid": "champions-vgc-2026-regma",
        "gametype": "doubles",
        "ruleset": ["Species Clause", "Item Clause", "Bring 6 Pick 4", "Level 50"],
        "provenance": {
            "roster_source": "https://pokepast.es/dd101585183c9ed6",
            "spread_source": "https://pokepast.es/dd101585183c9ed6",
            "author": "community",
            "url": "https://pokepast.es/dd101585183c9ed6",
            "status": "unproven"
        },
        "legality_status": "illegal",
        "legality_notes": "Contains Dragonite-Mega (fakemon). Quarantined in T9.",
        "assumption_register": ["Dragonite has no Mega Evolution in any official game."]
    },
    "mega_houndoom": {
        "champion_pack_id": "mega_houndoom_champions_regma_v1",
        "format": "champions",
        "formatid": "champions-vgc-2026-regma",
        "gametype": "doubles",
        "ruleset": ["Species Clause", "Item Clause", "Bring 6 Pick 4", "Level 50"],
        "provenance": {
            "roster_source": "https://pokepast.es/4a87b07998f6c0c4",
            "spread_source": "https://pokepast.es/4a87b07998f6c0c4",
            "author": "community",
            "url": "https://pokepast.es/4a87b07998f6c0c4",
            "status": "unproven"
        },
        "legality_status": "illegal",
        "legality_notes": "Contains Drampa-Mega (fakemon). Quarantined in T9.",
        "assumption_register": ["Drampa has no Mega Evolution in any official game."]
    },
    "rin_sand": {
        "champion_pack_id": "rin_sand_champions_regma_v1",
        "format": "champions",
        "formatid": "champions-vgc-2026-regma",
        "gametype": "doubles",
        "ruleset": ["Species Clause", "Item Clause", "Bring 6 Pick 4", "Level 50"],
        "provenance": {
            "roster_source": "https://pokepast.es/e97ac67f1ce79c33",
            "spread_source": "https://pokepast.es/e97ac67f1ce79c33",
            "author": "community",
            "url": "https://pokepast.es/e97ac67f1ce79c33",
            "status": "unproven"
        },
        "legality_status": "illegal",
        "legality_notes": "Contains Meganium-Mega (fakemon). Quarantined in T9.",
        "assumption_register": ["Meganium has no Mega Evolution in any official game."]
    },
    "suica_sun": {
        "champion_pack_id": "suica_sun_champions_regma_v1",
        "format": "champions",
        "formatid": "champions-vgc-2026-regma",
        "gametype": "doubles",
        "ruleset": ["Species Clause", "Item Clause", "Bring 6 Pick 4", "Level 50"],
        "provenance": {
            "roster_source": "https://pokepast.es/cb48d8b06c73d33b",
            "spread_source": "https://pokepast.es/cb48d8b06c73d33b",
            "author": "community",
            "url": "https://pokepast.es/cb48d8b06c73d33b",
            "status": "exact"
        },
        "legality_status": "legal",
        "legality_notes": "",
        "assumption_register": []
    },
    "cofagrigus_tr": {
        "champion_pack_id": "cofagrigus_tr_champions_regma_v1",
        "format": "champions",
        "formatid": "champions-vgc-2026-regma",
        "gametype": "doubles",
        "ruleset": ["Species Clause", "Item Clause", "Bring 6 Pick 4", "Level 50"],
        "provenance": {
            "roster_source": "community",
            "spread_source": "community",
            "author": "community",
            "url": "",
            "status": "assumed"
        },
        "legality_status": "illegal",
        "legality_notes": "Contains Flutter Mane (Paradox, banned). Fixed in T8.",
        "assumption_register": ["Spreads inferred from meta norms, not a pinned paste."]
    },
    "champions_arena_1st": {
        "champion_pack_id": "champions_arena_1st_v1",
        "format": "champions",
        "formatid": "champions-vgc-2026-regma",
        "gametype": "doubles",
        "ruleset": ["Species Clause", "Item Clause", "Bring 6 Pick 4", "Level 50"],
        "provenance": {
            "roster_source": "Victory Road Champions Arena coverage",
            "spread_source": "Victory Road Champions Arena coverage",
            "author": "Hyungwoo Shin",
            "url": "https://victoryroad.pro/champions-regulations/",
            "status": "exact"
        },
        "legality_status": "legal",
        "legality_notes": "Champions Arena Winner.",
        "assumption_register": []
    },
    "champions_arena_2nd": {
        "champion_pack_id": "champions_arena_2nd_v1",
        "format": "champions",
        "formatid": "champions-vgc-2026-regma",
        "gametype": "doubles",
        "ruleset": ["Species Clause", "Item Clause", "Bring 6 Pick 4", "Level 50"],
        "provenance": {
            "roster_source": "Victory Road Champions Arena coverage",
            "spread_source": "Victory Road Champions Arena coverage",
            "author": "Jorge Tabuyo",
            "url": "https://victoryroad.pro/champions-regulations/",
            "status": "exact"
        },
        "legality_status": "legal",
        "legality_notes": "Champions Arena Finalist.",
        "assumption_register": []
    },
    "champions_arena_3rd": {
        "champion_pack_id": "champions_arena_3rd_v1",
        "format": "champions",
        "formatid": "champions-vgc-2026-regma",
        "gametype": "doubles",
        "ruleset": ["Species Clause", "Item Clause", "Bring 6 Pick 4", "Level 50"],
        "provenance": {
            "roster_source": "Victory Road Champions Arena coverage",
            "spread_source": "Victory Road Champions Arena coverage",
            "author": "Juan Benitez",
            "url": "https://victoryroad.pro/champions-regulations/",
            "status": "exact"
        },
        "legality_status": "legal",
        "legality_notes": "Champions Arena Top 3.",
        "assumption_register": []
    },
    "chuppa_balance": {
        "champion_pack_id": "chuppa_balance_sv_v1",
        "format": "sv",
        "formatid": "gen9vgc2024regh",
        "gametype": "doubles",
        "ruleset": ["Species Clause", "Item Clause", "Bring 6 Pick 4", "Level 50"],
        "provenance": {
            "roster_source": "community",
            "spread_source": "community",
            "author": "Chuppa Cross IV",
            "url": "",
            "status": "unproven"
        },
        "legality_status": "legal",
        "legality_notes": "SV-format. Fabricated 'Pittsburgh Regional' description removed in T10.",
        "assumption_register": ["Team attribution to Chuppa Cross IV not verified from a pinned source."]
    },
    "aurora_veil_froslass": {
        "champion_pack_id": "aurora_veil_froslass_champions_regma_v1",
        "format": "champions",
        "formatid": "champions-vgc-2026-regma",
        "gametype": "doubles",
        "ruleset": ["Species Clause", "Item Clause", "Bring 6 Pick 4", "Level 50"],
        "provenance": {
            "roster_source": "community",
            "spread_source": "community",
            "author": "community",
            "url": "",
            "status": "unproven"
        },
        "legality_status": "illegal",
        "legality_notes": "Contains Froslass-Mega (fakemon). Quarantined in T9.",
        "assumption_register": ["Froslass has no Mega Evolution in any official game."]
    },
    "kingambit_sneasler": {
        "champion_pack_id": "kingambit_sneasler_sv_v1",
        "format": "sv",
        "formatid": "gen9vgc2024regh",
        "gametype": "doubles",
        "ruleset": ["Species Clause", "Item Clause", "Bring 6 Pick 4", "Level 50"],
        "provenance": {
            "roster_source": "community meta core",
            "spread_source": "community meta norms",
            "author": "community",
            "url": "",
            "status": "prior_filled"
        },
        "legality_status": "legal",
        "legality_notes": "SV-format meta core.",
        "assumption_register": ["Spreads are meta-typical, not pinned to a specific paste."]
    }
}


def format_block(meta):
    """Render the metadata block as JS-compatible JSON lines, indented 4 spaces."""
    # Use JSON to build each field, then strip outer braces and reindent.
    lines = []
    for key in ["champion_pack_id","format","formatid","gametype","ruleset",
                "provenance","legality_status","legality_notes","assumption_register"]:
        val = meta[key]
        rendered = json.dumps(val, ensure_ascii=False, indent=4)
        # Reindent multi-line values to fit 4-space team-block indent.
        if "\n" in rendered:
            rendered_lines = rendered.split("\n")
            rendered = rendered_lines[0] + "\n" + "\n".join("    " + l for l in rendered_lines[1:])
        lines.append(f'    "{key}": {rendered}')
    return ",\n".join(lines) + ","


def main():
    src = DATA_PATH.read_text(encoding="utf-8")
    added = 0
    for key, meta in TEAM_META.items():
        # Find the team block header.
        header_pat = re.compile(r'(  "' + re.escape(key) + r'": \{\n)')
        m = header_pat.search(src)
        if not m:
            print(f"WARN: key {key!r} not found", file=sys.stderr)
            continue
        # Skip if already extended.
        # Find closing brace index of this block (balance braces).
        start = m.end()
        depth = 1
        i = start
        while i < len(src) and depth > 0:
            c = src[i]
            if c == '{': depth += 1
            elif c == '}': depth -= 1
            i += 1
        block = src[start:i-1]
        if '"champion_pack_id"' in block:
            print(f"SKIP: {key} already has champion_pack_id")
            continue
        # Find the "description": "..." line end and insert our block right after it.
        desc_m = re.search(r'"description": "[^"]*",\n', block)
        if not desc_m:
            # Fallback: insert right after the header (before any field).
            insert_at = start
        else:
            insert_at = start + desc_m.end()
        new_block = format_block(meta) + "\n"
        src = src[:insert_at] + new_block + src[insert_at:]
        added += 1
        print(f"OK: extended {key}")
    DATA_PATH.write_text(src, encoding="utf-8")
    print(f"Done. Extended {added} team(s).")

if __name__ == "__main__":
    main()
