# Guardrails

`guard.mjs` is a PreToolUse hook wired from `../settings.json`. It receives the tool
call as JSON on stdin and answers `allow` (silence), `ask`, or `deny`.

## What is enforced where

Two layers, deliberately. Anything that can be expressed declaratively is, because
declarative rules cost nothing per tool call and do not depend on a script being
correct.

| Concern | Enforced by | Notes |
|---|---|---|
| Reading/writing `.env`, `*.pem`, `*.key`, `.npmrc` | `permissions.deny` in `settings.json` | `.env.example` stays readable on purpose |
| Secrets referenced in a shell command (`cat .env`, `curl -d @.env`) | `guard.mjs` | `cp .env.example .env` is allowed |
| `npm` / `npx` / `yarn` / `bun` | `guard.mjs` | denied with the pnpm equivalent in the message |
| Force-push, recursive force-delete, `git reset --hard`, `supabase db reset/push/link` | `guard.mjs` | deny for the unrecoverable ones, ask for the rest |
| `DROP`, `TRUNCATE`, unbounded `DELETE`/`UPDATE` via MCP | `guard.mjs` | always denied |
| Disabling RLS, granting `anon` access to `ride`/`profiles`, `USING (true)` policies | `guard.mjs` | CLAUDE.md §2 |
| Stored `credit_count` column or `credits` table | `guard.mjs` | CLAUDE.md §3 |
| Ad-hoc DDL through `execute_sql` | `guard.mjs` | steered to `supabase/migrations/` |
| Everything reaching the hosted project | `--read-only` in `.mcp.json` | the strongest of these |

## This is a guardrail, not a security boundary

It stops accidents and drift. It does not stop a determined process: hooks are skipped
under `--dangerously-skip-permissions`, `disableAllHooks` turns them off, and command
rules match text, so obfuscation defeats them.

The actual boundaries are elsewhere, and they are what to rely on:

1. The service-role key never exists in a file the agent can reach.
2. The MCP server runs `--read-only` against a **development** project, never production.
3. RLS policies in the database, tested by the RLS suite.

## Changing the rules

Every rule has a case in the self-test. Add yours there — both the thing that should
be blocked and the near-miss that should not — then:

```bash
node .claude/hooks/guard.mjs --selftest
```

The near-miss cases are the ones that matter. `pnpm install` contains the substring
`npm install`; the negative lookbehind in `PACKAGE_MANAGERS` is what keeps it from
matching, and there is a test pinning that.

To check the wire format by hand:

```bash
echo '{"tool_name":"Bash","tool_input":{"command":"npm install"}}' | node .claude/hooks/guard.mjs
```

A deny prints a JSON object; an allow prints nothing and exits 0.

## After editing settings.json

Claude Code only watches `.claude/` for settings changes if a settings file was already
there when the session started. Restart Claude Code after adding or changing hooks, or
they will silently not fire.

## Loosening a rule

The two most likely:

- **Applying migrations through the MCP.** Drop `--read-only` from `.mcp.json` and use
  `apply_migration` (never `execute_sql`) for DDL — `guard.mjs` already enforces that
  split. Put it back afterwards.
- **A false positive on a package-manager rule.** The check ignores quoted strings, so
  `git commit -m "drop npm"` is fine. If a real command trips it, add a case to the
  self-test showing what should pass before adjusting the regex.

Do not loosen the RLS or `credit_count` rules. They encode requirements from
`CLAUDE.md`, not preferences.

## Windows note

`.mcp.json` invokes `pnpm dlx`. If the server fails to start because the `pnpm` shim
is not resolved, change `"command": "pnpm"` to `"command": "cmd"` and prepend `"/c",
"pnpm"` to `args`. Keep the portable form if the project is shared across platforms.
