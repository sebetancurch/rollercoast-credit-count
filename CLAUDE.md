# AI Agent Instructions (Koin Credit Count)

## 1. System of Record & Truth
- **Read First:** The ultimate source of truth for this project lives in the `docs/` folder (SOW and TDD). Always consult these files before making broad architectural decisions.
- **Tech Stack:** Next.js (front-end), Supabase (Auth, Postgres DB, RLS), and pnpm for dependency management.

## 2. Hard Security & RLS Rules (DO NOT BREAK)
Privacy is the most critical requirement of this application. You must enforce these rules strictly at the database level using Postgres Row Level Security (RLS), not just in the UI:

*   **Enthusiasts (Users):**
    *   Can only read, insert, update, and delete their *own* records in the `ride` table (`auth.uid() = user_id`).
    *   Under no circumstances can one user access another user's ride history.
*   **Admins:**
    *   Have exclusive `INSERT`, `UPDATE`, and `DELETE` access to the `coasters` catalogue table.
    *   Admins **do not** have access to users' personal `ride` histories.
*   **Visitors (Unauthenticated):**
    *   Can only read the `public_leaderboard` view.
    *   No access to catalogue management or ride histories.
*   **Leaderboard Visibility:**
    *   Only users with `opt_in_leaderboard = true` may appear on the public leaderboard. 
    *   The leaderboard must only expose the `display_name` and `credit_count`—never specific coasters ridden.

## 3. Data Architecture Constraints
- **No Manual Credit Syncing:** Do not create a static `credit_count` column or a `credit` table. Credits (unique coasters ridden) and total rides must be calculated dynamically via SQL Views or Supabase RPC functions to prevent data desynchronization.

## 4. Agent Workflow & Execution
- **Context Management:** Keep file modifications small and modular to manage token usage effectively. If a feature is complex, break it down into sub-tasks rather than executing massive, multi-file rewrites in a single step.
- **Test-Driven Iteration:** Write the tests/verification steps for the database schema or API endpoints before implementing the Next.js UI components.
- **No Hallucinations:** If a package or tool is not strictly necessary to fulfill the `docs/` requirements, do not install it.