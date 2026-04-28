#!/usr/bin/env python3
# generate_seed_from_data.py
#
# Reads poke-sim/data.js, parses the TEAMS literal, and emits
# poke-sim/db/seed_teams_v2.sql with deterministic, byte-identical output.
#
# Determinism rules:
#   - Teams are emitted in the order they appear in data.js (insertion order).
#   - Members are emitted in slot order (1..N, N <= 6).
#   - JSONB blobs use json.dumps(..., separators=(',', ':'), sort_keys=True)
#     so EVs and moves are byte-identical across Python versions.
#   - Newlines forced to '\n', encoding forced to UTF-8.
#   - No timestamps. No machine-specific paths. No randomness.
#
# Hard rules (from MASTER_PROMPT):
#   - team_members is normalized (members live there, not in teams JSONB).
#   - Adapter global is window.SupabaseAdapter (this script touches no JS).
#   - All teams reference ruleset_id = 'champions_reg_m_doubles_bo3'.
#
# Usage:
#   python3 tools/generate_seed_from_data.py            # writes db/seed_teams_v2.sql
#   python3 tools/generate_seed_from_data.py --stdout   # prints to stdout (for tests)

from __future__ import annotations

import argparse
import io
import json
import os
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_JS = ROOT / "data.js"
OUT_SQL = ROOT / "db" / "seed_teams_v2.sql"

CANONICAL_RULESET_ID = "champions_reg_m_doubles_bo3"
RULESET_ROW = {
    "ruleset_id": CANONICAL_RULESET_ID,
    "format_group": "Champion",
    "engine_formatid": "gen9championsvgc2026regma",
    "description": "Champions 2026 Reg M A — Doubles, bring 6 pick 4, level 50, Bo3",
    "custom_rules": {"levelCap": 50, "bring": 6, "choose": 4, "gameMode": "doubles"},
}


def extract_teams_object(src: str) -> dict:
    """Extract the TEAMS = { ... } literal from data.js by walking braces."""
    needle = "const TEAMS = {"
    i = src.index(needle) + len("const TEAMS = ")
    depth = 0
    end = i
    for j in range(i, len(src)):
        c = src[j]
        if c == "{":
            depth += 1
        elif c == "}":
            depth -= 1
            if depth == 0:
                end = j + 1
                break
    teams_text = src[i:end]
    return json.loads(teams_text)


def sql_str(s):
    """Render a string as a single-quoted SQL literal with quotes escaped, or NULL."""
    if s is None:
        return "NULL"
    return "'" + str(s).replace("'", "''") + "'"


def jsonb_literal(obj) -> str:
    """Emit a deterministic JSONB literal."""
    payload = json.dumps(obj, separators=(",", ":"), sort_keys=True, ensure_ascii=False)
    return "'" + payload.replace("'", "''") + "'::jsonb"


def render(teams: dict) -> str:
    out = io.StringIO()
    w = out.write

    team_ids = list(teams.keys())  # insertion order

    # ============================================================
    # HEADER
    # ============================================================
    w("-- Champions Sim seed data v2 (auto-generated)\n")
    w("-- Source: poke-sim/data.js (TEAMS literal, " + str(len(team_ids)) + " teams)\n")
    w("-- Generator: poke-sim/tools/generate_seed_from_data.py\n")
    w("-- DO NOT EDIT BY HAND. Re-run the generator and commit the diff.\n")
    w("-- Run order: schema_v1.sql -> 2026_04_28_add_teams_metadata_column.sql -> THIS FILE -> rls_policies_v1.sql\n")
    w("\n")

    # ============================================================
    # CLEAN SLATE (idempotent re-run)
    # ============================================================
    id_list = ",\n  ".join("'" + tid + "'" for tid in team_ids)
    w("-- ============================================================\n")
    w("-- CLEAN SLATE: delete in reverse FK order (all " + str(len(team_ids)) + " team IDs)\n")
    w("-- ============================================================\n")
    w("DELETE FROM team_members WHERE team_id IN (\n  " + id_list + "\n);\n")
    w("DELETE FROM teams WHERE team_id IN (\n  " + id_list + "\n);\n")
    w("DELETE FROM rulesets WHERE ruleset_id = '" + CANONICAL_RULESET_ID + "';\n")
    w("\n")

    # ============================================================
    # RULESET
    # ============================================================
    w("-- ============================================================\n")
    w("-- RULESET\n")
    w("-- ============================================================\n")
    w("INSERT INTO rulesets (ruleset_id, format_group, engine_formatid, description, custom_rules)\n")
    w("VALUES (\n")
    w("  " + sql_str(RULESET_ROW["ruleset_id"]) + ",\n")
    w("  " + sql_str(RULESET_ROW["format_group"]) + ",\n")
    w("  " + sql_str(RULESET_ROW["engine_formatid"]) + ",\n")
    w("  " + sql_str(RULESET_ROW["description"]) + ",\n")
    w("  " + jsonb_literal(RULESET_ROW["custom_rules"]) + "\n")
    w(");\n")
    w("\n")

    # ============================================================
    # TEAMS
    # ============================================================
    w("-- ============================================================\n")
    w("-- TEAMS (all " + str(len(team_ids)) + ")\n")
    w("-- ============================================================\n")
    w("INSERT INTO teams (team_id, name, label, mode, ruleset_id, source, source_ref, description)\n")
    w("VALUES\n")
    rows = []
    for tid in team_ids:
        t = teams[tid]
        # Mode mapping: data.js does not have a 'mode' field; derive from team metadata.
        # 'player' -> 'player'; champions_arena_*/chuppa_balance -> 'champion_pack'; rest -> 'opponent'
        if tid == "player":
            mode = "player"
        elif tid.startswith("champions_arena_") or tid == "chuppa_balance":
            mode = "champion_pack"
        else:
            mode = "opponent"

        # Label mapping: prefer the 'label' field if present; else uppercase name fallback.
        label = t.get("label") or (t.get("name") or tid).upper()
        name = t.get("name") or tid
        # source_ref mapping: prefer 'champion_pack_id' or any url-like ref
        source_ref = (
            t.get("source_ref")
            or t.get("champion_pack_id")
            or (t.get("provenance", {}) or {}).get("url")
            or None
        )
        # If source_ref is empty string, treat as None
        if source_ref == "":
            source_ref = None
        description = t.get("description") or ""

        row = (
            "  ("
            + sql_str(tid) + ", "
            + sql_str(name) + ", "
            + sql_str(label) + ", "
            + sql_str(mode) + ", "
            + sql_str(CANONICAL_RULESET_ID) + ", "
            + sql_str("builtin") + ", "
            + sql_str(source_ref) + ", "
            + sql_str(description)
            + ")"
        )
        rows.append(row)
    w(",\n".join(rows))
    w(";\n\n")

    # ============================================================
    # TEAM MEMBERS
    # ============================================================
    w("-- ============================================================\n")
    w("-- TEAM MEMBERS\n")
    w("-- ============================================================\n")
    for tid in team_ids:
        t = teams[tid]
        members = (t.get("members") or [])[:6]  # cap to 6
        if not members:
            continue
        w("\n-- " + tid + "\n")
        w("INSERT INTO team_members (team_id, slot, species, item, ability, nature, level, evs, moves, tera_type, role_tag) VALUES\n")
        member_rows = []
        for slot, m in enumerate(members, start=1):
            species = m.get("name") or ""
            item = m.get("item")
            ability = m.get("ability")
            nature = m.get("nature")
            level = int(m.get("level") or 50)
            evs = m.get("evs") or {"hp": 0, "atk": 0, "def": 0, "spa": 0, "spd": 0, "spe": 0}
            # Ensure all six keys are present (zero-fill missing) — required by T-seed-12
            for k in ("hp", "atk", "def", "spa", "spd", "spe"):
                evs.setdefault(k, 0)
            moves = m.get("moves") or []
            # Cap moves to 4 (T-seed-13)
            moves = list(moves)[:4]
            if not moves:
                moves = ["Tackle"]  # fallback to satisfy 1..4
            tera = m.get("tera_type")
            role_tag = m.get("role")
            row = (
                "  ("
                + sql_str(tid) + ", "
                + str(slot) + ", "
                + sql_str(species) + ", "
                + sql_str(item) + ", "
                + sql_str(ability) + ", "
                + sql_str(nature) + ", "
                + str(level) + ", "
                + jsonb_literal(evs) + ", "
                + jsonb_literal(moves) + ", "
                + sql_str(tera) + ", "
                + sql_str(role_tag)
                + ")"
            )
            member_rows.append(row)
        w(",\n".join(member_rows))
        w(";\n")

    # Trailing newline for clean diff
    text = out.getvalue()
    if not text.endswith("\n"):
        text += "\n"
    return text


def main(argv=None):
    parser = argparse.ArgumentParser(description="Generate seed_teams_v2.sql from data.js")
    parser.add_argument("--stdout", action="store_true", help="Print to stdout instead of writing file")
    args = parser.parse_args(argv)

    # Force UTF-8 stdout/stderr — Windows cp1252 lesson from M1
    if args.stdout:
        sys.stdout.reconfigure(encoding="utf-8", newline="\n")

    src = DATA_JS.read_text(encoding="utf-8")
    teams = extract_teams_object(src)
    sql = render(teams)

    if args.stdout:
        sys.stdout.write(sql)
        return 0

    OUT_SQL.parent.mkdir(parents=True, exist_ok=True)
    # Write with explicit UTF-8 + \n line endings for stable diff across platforms
    with open(OUT_SQL, "w", encoding="utf-8", newline="\n") as f:
        f.write(sql)
    print("wrote " + str(OUT_SQL.relative_to(ROOT.parent)) + " (" + str(len(sql)) + " bytes, " + str(len(teams)) + " teams)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
