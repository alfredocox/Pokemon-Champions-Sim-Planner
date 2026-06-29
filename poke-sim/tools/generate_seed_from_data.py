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
MIGRATION_SQL = ROOT / "db" / "migrations" / "2026_04_28_seed_teams_v2.sql"
LIVE_ALIGN_SQL = ROOT / "db" / "migrations" / "2026_06_20_align_shared_27_team_catalog.sql"

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


def canonical_mode(team_id: str) -> str:
    if team_id == "player":
        return "player"
    if team_id.startswith("champions_arena_"):
        return "champion_pack"
    return "opponent"


def team_metadata(team: dict) -> dict:
    metadata = {}
    for key, value in team.items():
        if key in {"name", "label", "description", "members"}:
            continue
        metadata[key] = value
    return metadata


def canonical_team_row(team_id: str, team: dict) -> dict:
    label = team.get("label") or (team.get("name") or team_id).upper()
    name = team.get("name") or team_id
    source_ref = (
        team.get("source_ref")
        or team.get("champion_pack_id")
        or (team.get("provenance", {}) or {}).get("url")
        or None
    )
    if source_ref == "":
        source_ref = None
    return {
        "team_id": team_id,
        "name": name,
        "label": label,
        "mode": canonical_mode(team_id),
        "ruleset_id": CANONICAL_RULESET_ID,
        "source": "builtin",
        "source_ref": source_ref,
        "description": team.get("description") or "",
        "metadata": team_metadata(team),
    }


def render_team_members_block(w, teams: dict, team_ids: list[str]) -> None:
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
            for k in ("hp", "atk", "def", "spa", "spd", "spe"):
                evs.setdefault(k, 0)
            moves = list(m.get("moves") or [])[:4]
            if not moves:
                moves = ["Tackle"]
            tera = m.get("tera_type") or m.get("teraType")
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


def render_seed(teams: dict) -> str:
    out = io.StringIO()
    w = out.write

    team_ids = list(teams.keys())  # insertion order
    team_rows = [canonical_team_row(tid, teams[tid]) for tid in team_ids]

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
    w("INSERT INTO teams (team_id, name, label, mode, ruleset_id, source, source_ref, description, metadata)\n")
    w("VALUES\n")
    rows = []
    for row_data in team_rows:
        row = (
            "  ("
            + sql_str(row_data["team_id"]) + ", "
            + sql_str(row_data["name"]) + ", "
            + sql_str(row_data["label"]) + ", "
            + sql_str(row_data["mode"]) + ", "
            + sql_str(row_data["ruleset_id"]) + ", "
            + sql_str(row_data["source"]) + ", "
            + sql_str(row_data["source_ref"]) + ", "
            + sql_str(row_data["description"]) + ", "
            + jsonb_literal(row_data["metadata"])
            + ")"
        )
        rows.append(row)
    w(",\n".join(rows))
    w(";\n\n")

    render_team_members_block(w, teams, team_ids)

    text = out.getvalue()
    if not text.endswith("\n"):
        text += "\n"
    return text


def render_live_alignment(teams: dict) -> str:
    out = io.StringIO()
    w = out.write

    team_ids = list(teams.keys())
    team_rows = [canonical_team_row(tid, teams[tid]) for tid in team_ids]
    id_list = ",\n  ".join("'" + tid + "'" for tid in team_ids)

    w("-- Align shared " + str(len(team_ids)) + "-team catalog across Y Factor, Alfredo, and live Supabase. (auto-generated)\n")
    w("-- Source: poke-sim/data.js TEAMS literal and poke-sim/tools/generate_seed_from_data.py\n")
    w("-- Preferred live-DB catalog alignment path. Re-run the generator instead of editing by hand.\n")
    w("-- Safe shape: transaction + ruleset/team UPSERTs + team_members replace for canonical team IDs only.\n")
    w("-- No schema changes. No secrets. No destructive delete from teams/rulesets.\n")
    w("\n")
    w("BEGIN;\n\n")
    w("INSERT INTO rulesets (ruleset_id, format_group, engine_formatid, description, custom_rules)\n")
    w("VALUES (\n")
    w("  " + sql_str(RULESET_ROW["ruleset_id"]) + ",\n")
    w("  " + sql_str(RULESET_ROW["format_group"]) + ",\n")
    w("  " + sql_str(RULESET_ROW["engine_formatid"]) + ",\n")
    w("  " + sql_str(RULESET_ROW["description"]) + ",\n")
    w("  " + jsonb_literal(RULESET_ROW["custom_rules"]) + "\n")
    w(")\n")
    w("ON CONFLICT (ruleset_id) DO UPDATE SET\n")
    w("  format_group = EXCLUDED.format_group,\n")
    w("  engine_formatid = EXCLUDED.engine_formatid,\n")
    w("  description = EXCLUDED.description,\n")
    w("  custom_rules = EXCLUDED.custom_rules;\n\n")

    w("INSERT INTO teams (team_id, name, label, mode, ruleset_id, source, source_ref, description, metadata)\n")
    w("VALUES\n")
    rows = []
    for row_data in team_rows:
        row = (
            "  ("
            + sql_str(row_data["team_id"]) + ", "
            + sql_str(row_data["name"]) + ", "
            + sql_str(row_data["label"]) + ", "
            + sql_str(row_data["mode"]) + ", "
            + sql_str(row_data["ruleset_id"]) + ", "
            + sql_str(row_data["source"]) + ", "
            + sql_str(row_data["source_ref"]) + ", "
            + sql_str(row_data["description"]) + ", "
            + jsonb_literal(row_data["metadata"])
            + ")"
        )
        rows.append(row)
    w(",\n".join(rows))
    w("\n")
    w("ON CONFLICT (team_id) DO UPDATE SET\n")
    w("  name = EXCLUDED.name,\n")
    w("  label = EXCLUDED.label,\n")
    w("  mode = EXCLUDED.mode,\n")
    w("  ruleset_id = EXCLUDED.ruleset_id,\n")
    w("  source = EXCLUDED.source,\n")
    w("  source_ref = EXCLUDED.source_ref,\n")
    w("  description = EXCLUDED.description,\n")
    w("  metadata = EXCLUDED.metadata;\n\n")

    w("-- Retire stale built-in rows that are no longer part of the reviewed repo catalog.\n")
    w("-- They stay available for historical FK references but cannot remain active selector/training rows.\n")
    w("UPDATE teams\n")
    w("SET metadata = COALESCE(metadata, '{}'::jsonb) || '{\"retired\":true,\"retired_reason\":\"not_in_current_legal_repo_catalog\"}'::jsonb\n")
    w("WHERE team_id NOT IN (\n  " + id_list + "\n)\n")
    w("  AND source = 'builtin'\n")
    w("  AND COALESCE(metadata->>'retired', 'false') <> 'true';\n\n")

    w("-- Replace normalized members for shared canonical repo teams only.\n")
    w("DELETE FROM team_members WHERE team_id IN (\n  " + id_list + "\n);\n\n")

    render_team_members_block(w, teams, team_ids)
    w("\nCOMMIT;\n")

    # Trailing newline for clean diff
    text = out.getvalue()
    if not text.endswith("\n"):
        text += "\n"
    return text


def main(argv=None):
    parser = argparse.ArgumentParser(description="Generate seed_teams_v2.sql from data.js")
    parser.add_argument("--stdout", action="store_true", help="Print to stdout instead of writing file")
    parser.add_argument("--stdout-live-align", action="store_true", help="Print the preferred live alignment migration to stdout")
    args = parser.parse_args(argv)

    # Force UTF-8 stdout/stderr — Windows cp1252 lesson from M1
    if args.stdout or args.stdout_live_align:
        sys.stdout.reconfigure(encoding="utf-8", newline="\n")

    src = DATA_JS.read_text(encoding="utf-8")
    teams = extract_teams_object(src)
    seed_sql = render_seed(teams)
    live_align_sql = render_live_alignment(teams)

    if args.stdout:
        sys.stdout.write(seed_sql)
        return 0

    if args.stdout_live_align:
        sys.stdout.write(live_align_sql)
        return 0

    for out_path in (OUT_SQL, MIGRATION_SQL):
        out_path.parent.mkdir(parents=True, exist_ok=True)
        with open(out_path, "w", encoding="utf-8", newline="\n") as f:
            f.write(seed_sql)
    LIVE_ALIGN_SQL.parent.mkdir(parents=True, exist_ok=True)
    with open(LIVE_ALIGN_SQL, "w", encoding="utf-8", newline="\n") as f:
        f.write(live_align_sql)
    print(
        "wrote "
        + str(OUT_SQL.relative_to(ROOT.parent))
        + " and "
        + str(MIGRATION_SQL.relative_to(ROOT.parent))
        + ", "
        + str(LIVE_ALIGN_SQL.relative_to(ROOT.parent))
        + " (seed "
        + str(len(seed_sql))
        + " bytes, live-align "
        + str(len(live_align_sql))
        + " bytes, "
        + str(len(teams))
        + " teams)"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
