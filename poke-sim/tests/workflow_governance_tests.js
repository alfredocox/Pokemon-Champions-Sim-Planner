const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');
const ci = read('.github/workflows/ci.yml');
const pages = read('.github/workflows/pages.yml');
const news = read('.github/workflows/news-feed-sync.yml');
const migrate = read('.github/workflows/db-migrate.yml');

let pass = 0;
function check(name, condition) {
  if (!condition) throw new Error(name);
  pass += 1;
}

check('CI live writes use isolated test-project secrets', /SUPABASE_TEST_URL/.test(ci) && /SUPABASE_TEST_ANON_KEY/.test(ci));
check('Migration input crosses shell boundary through environment only', migrate.includes('MIGRATION_FILENAME: ${{ inputs.migration }}') && migrate.includes('migration="$MIGRATION_FILENAME"') && !migrate.includes('migration="${{ inputs.migration }}"'));
check('Migration filenames use a bounded SQL filename alphabet', migrate.includes('^[A-Za-z0-9][A-Za-z0-9_.-]*\\.sql$'));
check('CI cleanup runs even after failure', /Clean up isolated Supabase test data[\s\S]*if: always\(\)/.test(ci));
check('CI installs locked dependencies once per test job', (ci.match(/\bnpm ci\b/g) || []).length === 1);
check('CI cleanup requires a completed dependency install', /if: always\(\) && steps\.dependencies\.outcome == 'success'/.test(ci));
check('CI cleanup is skipped for mock-only runs', /steps\.suite\.outputs\.live_db == 'true'/.test(ci) && /echo "live_db=true" >> "\$GITHUB_OUTPUT"/.test(ci));
check('CI shared-project users are serialized without cancelling active jobs', /concurrency:[\s\S]*champions-supabase-test-project[\s\S]*cancel-in-progress: false/.test(ci));
check('CI does not mutate an unused credential-injected deployment bundle', !/html = html\.replace|Building production bundle|fs\.writeFileSync\(file, html\)/.test(ci));
check('mechanics audit watches runtime and move support', /poke-sim\/runtime_data\.js/.test(ci) && /poke-sim\/move_support\.js/.test(ci));
check('Pages uses reproducible install', /npm ci/.test(pages) && !/npm install/.test(pages));
check('Pages deploys an explicit runtime allowlist', /runtime_files=\(/.test(pages) && /generated_files=\(/.test(pages));
check('Pages excludes internal trees', /test ! -e pages-dist\/poke-sim\/tests/.test(pages) && /test ! -e pages-dist\/poke-sim\/db/.test(pages) && /test ! -e pages-dist\/poke-sim\/reports/.test(pages));
check('News refresh creates a review PR, never dispatches a production release', /gh pr create/.test(news) && !/gh workflow run pages|actions: write|--force/.test(news));
check('News refresh is bounded, uses locked tooling and runs the offline gate', /timeout-minutes: 20/.test(news) && /npm ci/.test(news) && /npm run test:fast/.test(news));
check('News refresh preserves history and updates one automation PR', /git merge --no-edit origin\/main/.test(news) && /automation\/home-news-/.test(news) && /gh pr list/.test(news));
check('News PR discovery paginates and rejects duplicates', /gh api --paginate --slurp/.test(news) && /"\$count" -le 1/.test(news));
check('News PR origin, author and head identity are checked', /head\.repo\.full_name/.test(news) && /user\.login == "github-actions\[bot\]"/.test(news) && /head\.sha/.test(news));
check('Existing PR is checked before checkout and untrusted generated code restored before tooling', news.indexOf('Existing PR changes non-news files') < news.indexOf('git checkout -b') && news.indexOf('git restore --source=origin/main') < news.indexOf('Install locked tooling'));
check('News final diff cannot exceed the generated artifact allowlist', /Final PR exceeds the news-only boundary/.test(news) && /git diff --name-only origin\/main\.\.\.HEAD/.test(news));
check('News checks must pass before human merge', /Approve workflows to run/.test(news) && /BEFORE merging/.test(news));
check('News checkout does not persist token credentials', /persist-credentials: false/.test(news));

const diagnostics = read('poke-sim/db/diagnostics/cleanup_preflight.sql').replace(/--[^\r\n]*/g, '');
check('DB cleanup diagnostics use a read-only transaction', /BEGIN TRANSACTION READ ONLY;/.test(diagnostics) && /COMMIT;/.test(diagnostics));
check('DB diagnostics have local execution limits', /SET LOCAL statement_timeout = '10s';/.test(diagnostics) && /SET LOCAL lock_timeout = '2s';/.test(diagnostics));
check('DB diagnostics contain no write/maintenance commands', !/\b(?:INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|CREATE|GRANT|REVOKE|VACUUM|ANALYZE|DO|CALL)\b/i.test(diagnostics));
check('DB inventories report size limits and full matching counts', (diagnostics.match(/LIMIT 200/g) || []).length === 3 && (diagnostics.match(/count\(\*\) OVER \(\)/g) || []).length === 3);

console.log(`workflow governance: ${pass} pass, 0 fail`);
require('../tools/verify-migration-input.cjs');
