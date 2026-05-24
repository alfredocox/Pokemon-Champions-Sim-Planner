-- Fix the source-backed item transcription for Jorge Tabuyo's Champions Arena
-- finalist team. Public rental mirror P08QQ5NU9C shows Sinistcha holding
-- Kouba Berry, not Sitrus Berry. This preserves Item Clause in the live DB.

BEGIN;

UPDATE team_members
SET item = 'Kouba Berry'
WHERE team_id = 'champions_arena_2nd'
  AND species = 'Sinistcha'
  AND item <> 'Kouba Berry';

COMMIT;
