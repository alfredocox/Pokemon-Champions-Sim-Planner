#!/usr/bin/env python3
"""T9a: retract fakemon classification for 4 real new-Champions Mega teams."""
import re, json

PATH = '/home/user/workspace/poke-sim/poke-sim/data.js'
with open(PATH) as f:
    src = f.read()

patches = {
    'mega_dragonite': {
        'legality_notes': "Mega Dragonite is a new Champions-introduced Mega Evolution (Dragoninite, Shop: 2000 VP). Legal in Reg M-A. Source: Game8 Items List; Victory Road Reg M-A.",
        'old_note': "Contains Dragonite-Mega (fakemon). Quarantined in T9.",
        'new_assumptions': [
            "Dragonite Mega form verified via Game8 Items List and Victory Road Reg M-A docs.",
            "Mega activation consumes team's once-per-match Mega slot."
        ],
        'old_assumptions': ["Dragonite has no Mega Evolution in any official game."],
    },
    'mega_houndoom': {
        'legality_notes': "Mega Houndoom (Houndoominite, Gen 6 classic) plus secondary Drampa with Drampanite (new Champions Mega). Both Mega Stones legal; only one can activate per match per Reg M-A rules. Item Clause satisfied: Houndoominite != Drampanite.",
        'old_note': "Contains Drampa-Mega (fakemon). Quarantined in T9.",
        'new_assumptions': [
            "Team carries two Mega Stones; only one activation per match per Reg M-A rules.",
            "Item Clause satisfied: Houndoominite and Drampanite are distinct items.",
            "Drampa Mega form verified via Game8 Items List."
        ],
        'old_assumptions': ["Drampa has no Mega Evolution in any official game."],
    },
    'rin_sand': {
        'legality_notes': "Mega Meganium is a new Champions-introduced Mega Evolution (Meganiumite, Shop: 2000 VP or Battle Pass M-1 reward). Legal in Reg M-A. Source: Game8 Items List.",
        'old_note': "Contains Meganium-Mega (fakemon). Quarantined in T9.",
        'new_assumptions': [
            "Meganium Mega form verified via Game8 Items List.",
            "Mega activation consumes team's once-per-match Mega slot."
        ],
        'old_assumptions': ["Meganium has no Mega Evolution in any official game."],
    },
    'aurora_veil_froslass': {
        'legality_notes': "Mega Froslass is a new Champions-introduced Mega Evolution (Froslassite, Shop: 2000 VP). Legal in Reg M-A. Source: Game8 Items List.",
        'old_note': "Contains Froslass-Mega (fakemon). Quarantined in T9.",
        'new_assumptions': [
            "Froslass Mega form verified via Game8 Items List.",
            "Mega activation consumes team's once-per-match Mega slot."
        ],
        'old_assumptions': ["Froslass has no Mega Evolution in any official game."],
    },
}

def replace_block(text, team_key, patch):
    # find team block start
    m = re.search(r'"' + re.escape(team_key) + r'":\s*\{', text)
    if not m:
        print(f"!! {team_key}: opening not found")
        return text
    start = m.start()
    # flip legality_status
    # find first legality_status after start
    end_of_team = text.find('\n  "', m.end())  # next team key
    if end_of_team == -1:
        end_of_team = len(text)
    block = text[start:end_of_team]
    new_block = block

    # 1) legality_status
    new_block = re.sub(
        r'"legality_status":\s*"illegal"',
        '"legality_status": "legal"',
        new_block, count=1
    )
    # 2) legality_notes
    old_note_escaped = re.escape(patch['old_note'])
    new_block = re.sub(
        r'"legality_notes":\s*"' + old_note_escaped + r'"',
        '"legality_notes": ' + json.dumps(patch['legality_notes']),
        new_block, count=1
    )
    # 3) assumption_register: replace the array body
    # find assumption_register array (multi-line)
    ar_match = re.search(r'"assumption_register":\s*\[(.*?)\]', new_block, re.DOTALL)
    if ar_match:
        new_arr = '"assumption_register": [\n        ' + ',\n        '.join(
            json.dumps(s) for s in patch['new_assumptions']
        ) + '\n    ]'
        new_block = new_block[:ar_match.start()] + new_arr + new_block[ar_match.end():]

    return text[:start] + new_block + text[end_of_team:]

for key, patch in patches.items():
    src = replace_block(src, key, patch)
    print(f"OK: {key}")

with open(PATH, 'w') as f:
    f.write(src)
print("DONE")
