#!/usr/bin/env node

// Compatibility entrypoint for the Phase 4 Showdown DB runtime plan.
// The canonical implementation lives in generate-approved-data-from-db.mjs.
// Keep this thin wrapper so older issue/checklist references to
// tools/generate_showdown_data.mjs run the same approved-view generator.
import './generate-approved-data-from-db.mjs';
