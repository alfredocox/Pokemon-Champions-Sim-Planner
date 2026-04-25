# Master Prompt for Kevin's Agent

**Purpose:** Paste this entire prompt into your AI assistant (Claude, ChatGPT, Cursor, Copilot, etc.). The agent will then walk you through applying branch protection to `main` on the Pokemon-Champions-Sim-Planner repo.

**You'll need:**
- Admin access to the GitHub repo, OR an admin who can grant it
- Either GitHub CLI (`gh`) installed locally, OR just a web browser
- ~2 minutes

---

## ===== COPY EVERYTHING BELOW THIS LINE INTO YOUR AGENT =====

You are helping me apply GitHub branch protection rules to a repository I am an admin/collaborator on. Follow these instructions exactly. Do not improvise rule values.

### Context

- **Repo:** `alfredocox/Pokemon-Champions-Sim-Planner` (public)
- **Branch to protect:** `main`
- **Why:** A separate AI agent (running as `@TheYfactora12`, write access) needs branch protection in place before continuing automated work. Branch protection requires admin access. Alfredo is the repo owner. I am Kevin Medeiros (@TheYfactora12), a collaborator. We need an admin (Alfredo OR me, if I have admin) to apply the rules once.

### Step 0 — Preflight: confirm tooling and auth

Run:

```bash
gh --version && gh auth status
```

- If `gh` is not installed: install via https://cli.github.com or skip to the **browser fallback** at the bottom of this document.
- If `gh auth status` shows I'm NOT logged in, run `gh auth login` and complete the browser flow.
- Confirm which account I'm authenticated as. If it's not the account that holds admin on the repo (`alfredocox`), and I myself am not an admin collaborator, I cannot proceed -- use the browser fallback or hand back to Alfredo.

### Step 1 — Determine my access level

Find out which user my token belongs to and what role that user has on the repo:

```bash
ME=$(gh api user --jq .login)
echo "Authenticated as: $ME"
gh api "repos/alfredocox/Pokemon-Champions-Sim-Planner/collaborators/$ME/permission" --jq '.role_name'
```

If the role is `admin`, proceed to Step 2.
If the role is `write`, `triage`, `read`, or anything else, stop and tell me: "You don't have admin access on this repo. Two options: (a) ask Alfredo to apply protection himself using the manual steps in `docs/HANDOFF_2026-04-25.md`, or (b) ask Alfredo to upgrade your role to admin via repo Settings -> Collaborators, then rerun this prompt."

### Step 2 — Apply branch protection

Use this exact command. Do not change any values:

```bash
cat > /tmp/protection.json << 'EOF'
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["Verify bundle is fresh", "Verify sw.js CACHE_NAME bumped"]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "dismiss_stale_reviews": false,
    "require_code_owner_reviews": false,
    "required_approving_review_count": 0
  },
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "required_conversation_resolution": false,
  "lock_branch": false,
  "allow_fork_syncing": true
}
EOF

gh api -X PUT repos/alfredocox/Pokemon-Champions-Sim-Planner/branches/main/protection \
  --input /tmp/protection.json
```

Expected output: a large JSON object describing the new protection rules. No `"message": "Not Found"`, no errors.

If you see `404 Not Found`, my account does NOT have admin permission despite what Step 1 said -- the token may be scoped differently. Stop and tell me to ask Alfredo to apply it directly.

### Step 3 — Verify it took effect

Run:

```bash
gh api repos/alfredocox/Pokemon-Champions-Sim-Planner/branches/main/protection \
  --jq '{required_checks: .required_status_checks.contexts, strict: .required_status_checks.strict, enforce_admins: .enforce_admins.enabled, approvals: .required_pull_request_reviews.required_approving_review_count, force_push: .allow_force_pushes.enabled, deletions: .allow_deletions.enabled}'
```

Confirm the output matches EXACTLY:
```json
{
  "required_checks": ["Verify bundle is fresh", "Verify sw.js CACHE_NAME bumped"],
  "strict": true,
  "enforce_admins": true,
  "approvals": 0,
  "force_push": false,
  "deletions": false
}
```

The order of `required_checks` may vary -- as long as both strings are present, that's fine.

If anything else mismatches, re-run Step 2 once. If it still mismatches, stop and report what you see.

### Step 4 — Test that protection is live (optional but recommended)

Try a DRY-RUN push to confirm it gets rejected. This will not actually push anything even if protection somehow failed -- safe to run.

```bash
cd /tmp && rm -rf test-protect && \
git clone https://github.com/alfredocox/Pokemon-Champions-Sim-Planner.git test-protect && \
cd test-protect && \
echo "" >> README.md && \
git -c user.email=test@test.com -c user.name=test commit -am "test: should be rejected" && \
git push --dry-run origin main
```

Expected: push is REJECTED with a message mentioning branch protection (e.g. "protected branch hook declined" or "required status check"). If it reports success, protection is NOT in place -- redo Step 2.

Clean up:
```bash
cd /tmp && rm -rf test-protect
```

### Step 5 — Report back

Once Step 3 verification passes, tell me: "Branch protection is live on `main`. Required checks, no force-push, no deletions, enforced for admins."

I'll forward that confirmation back to Alfredo and the AI agent will resume Phase 4c work.

### Rules for you (the agent)

- Use only the exact JSON / values above. Do not "improve" them.
- Do not enable extra options I didn't list (no signed commits, no linear history, no code owner reviews, etc.).
- If any step fails with an unexpected error, stop and report it -- do not retry blindly.
- Do not modify any other repo settings, secrets, webhooks, or files.
- Do not push directly to main; this whole exercise is to prevent that.

## ===== END OF AGENT PROMPT =====

---

## Fallback if agent path doesn't work

If the agent gets stuck or you don't want to use one, do this manually in the browser:

1. Visit https://github.com/alfredocox/Pokemon-Champions-Sim-Planner/settings/branches
2. Add branch protection rule, pattern: `main`
3. Check these boxes (and ONLY these):
   - Require a pull request before merging (0 approvals)
   - Require status checks to pass before merging
     - Require branches to be up to date
     - Add required checks: `Verify bundle is fresh`, `Verify sw.js CACHE_NAME bumped`
   - Do not allow bypassing the above settings
4. Make sure these are UNCHECKED:
   - Allow force pushes
   - Allow deletions
5. Save.

Done. Reply on the repo or to Alfredo when complete.
