// Isolated PostgreSQL semantics only; no URL, credentials or production connection.
// Pass the directory containing a validation-only @electric-sql/pglite install.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
if (!process.argv[2]) throw new Error('Provide the isolated PGlite tooling directory');
const require = createRequire(resolve(process.argv[2], 'package.json'));
const { PGlite } = require('@electric-sql/pglite');
const db = new PGlite();
const tables = ['teams', 'team_members', 'analyses', 'analysis_win_conditions', 'analysis_logs', 'branch_coverage_runs'];
let denied = 0;
try {
  await db.exec('CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS; GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;');
  for (const table of tables) {
    await db.exec(`CREATE TABLE public.${table} (id integer PRIMARY KEY, body text);
      INSERT INTO public.${table} VALUES (1, 'fixture');
      ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY;
      CREATE POLICY legacy_allow_all ON public.${table} FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
      GRANT ALL ON public.${table} TO PUBLIC, anon, authenticated, service_role;
      GRANT INSERT (body), UPDATE (body) ON public.${table} TO PUBLIC, anon, authenticated;`);
  }
  const migration = readFileSync(new URL('../db/migrations/2026_09_08_shared_evidence_write_containment.sql', import.meta.url), 'utf8');
  await db.exec(migration);
  await db.exec(migration);
  for (const role of ['anon', 'authenticated']) {
    await db.exec(`SET ROLE ${role}`);
    for (const table of tables) {
      assert.equal((await db.query(`SELECT body FROM public.${table} WHERE id=1`)).rows[0].body, 'fixture');
      for (const sql of [
        `INSERT INTO public.${table} VALUES (2, 'bad')`,
        `INSERT INTO public.${table} (body) VALUES ('bad')`,
        `UPDATE public.${table} SET body='bad' WHERE id=1`,
        `DELETE FROM public.${table} WHERE id=1`,
        `TRUNCATE public.${table}`
      ]) {
        await assert.rejects(db.exec(sql), error => error.code === '42501');
        denied++;
      }
    }
    await db.exec('RESET ROLE');
  }
  await db.exec('SET ROLE service_role');
  for (const table of tables) {
    await db.exec(`INSERT INTO public.${table} VALUES (2, 'trusted')`);
    assert.equal((await db.query(`SELECT count(*)::int AS n FROM public.${table}`)).rows[0].n, 2);
  }
  await db.exec('RESET ROLE');
  // Re-granted DML still cannot bypass the restrictive RLS boundary.
  await db.exec('GRANT INSERT, UPDATE, DELETE ON public.analyses TO anon; SET ROLE anon;');
  await assert.rejects(db.exec("INSERT INTO public.analyses VALUES (3, 'bad')"), error => error.code === '42501');
  assert.equal((await db.query("UPDATE public.analyses SET body='bad' RETURNING id")).rows.length, 0);
  assert.equal((await db.query('DELETE FROM public.analyses RETURNING id')).rows.length, 0);
  await db.exec('RESET ROLE');
  assert.deepEqual((await db.query('SELECT body FROM public.analyses ORDER BY id')).rows.map(r => r.body), ['fixture', 'trusted']);
  await db.exec('CREATE ROLE containment_parent; GRANT containment_parent TO anon; GRANT INSERT ON public.analyses TO containment_parent;');
  await assert.rejects(db.exec(migration), /Unexpected inherited write grants/);
  await db.exec('ROLLBACK');
  assert.equal((await db.query("SELECT has_table_privilege('anon', 'public.analyses', 'INSERT') AS allowed")).rows[0].allowed, true);
  await db.exec('REVOKE INSERT ON public.analyses FROM containment_parent; ALTER TABLE public.analysis_logs RENAME TO absent_logs; GRANT UPDATE ON public.teams TO anon;');
  await assert.rejects(db.exec(migration), /Missing required shared table/);
  await db.exec('ROLLBACK');
  assert.equal((await db.query("SELECT has_table_privilege('anon', 'public.teams', 'UPDATE') AS allowed")).rows[0].allowed, true);
  console.log(`PASS: migration applies twice; ${denied} browser writes denied, reads preserved, six trusted writes succeed, restrictive RLS blocks re-granted DML.`);
  console.log('PASS: inherited grants and missing required tables abort with earlier revocations rolled back.');
  console.log('Scope: isolated PostgreSQL fixture; not live Supabase, real Auth users, private saves or complete-schema security proof.');
} finally {
  await db.close();
}
