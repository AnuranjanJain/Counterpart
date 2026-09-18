# Database setup and verification

Apply `migrations/202609180001_counterpart.sql` in a new Supabase project's SQL editor. Enable Google in Authentication > Providers, configure the Google OAuth client, and allow the deployed `/auth/callback` URL plus the local callback URL in Authentication > URL Configuration. Copy the project URL and anonymous key into the public environment variables. Set `SUPABASE_SERVICE_ROLE_KEY` only in server environment variables; never prefix it with `NEXT_PUBLIC_` or expose it to the browser.

Browser roles can only read their own reviews. All writes and both generation RPCs require the server-only service-role client after `getUser()` authentication. The server supplies the verified owner ID, scopes every write by owner, and the RPCs independently check owner membership. This prevents browser clients from forging saved AI results or directly spending the generation allowance through database RPCs.

Reviews are protected by row-level security. Every application request additionally verifies the authenticated user and filters by owner. A review deletion removes its cached generation results. The quota ledger retains the user ID, operation kind, and timestamp (no document text) so deleting a review cannot reset daily limits. The ledger is inaccessible to browser roles. Deleting the authentication account removes its reviews, cached results, quota history, and active lease.

`generation_settings.daily_limit` is an administrator-controlled upper bound (30 by default). `GLOBAL_DAILY_GENERATION_LIMIT` may lower this bound; changing client input cannot raise it. Set both to fit the actual Gemini project's quota. Limits reset at midnight UTC. Each admitted attempt counts, including provider failures. Exact completed requests are cached without an additional allowance; failed identical requests can retry after two minutes. A separate expiring lease prevents deleting a review from bypassing the one-active-call rule.

## Local SQL verification

Use a fresh, disposable PostgreSQL database. `tests/bootstrap-local.sql` creates minimal stand-ins for Supabase's auth schema and roles; **never run that bootstrap against a real Supabase project**.

```sh
psql "$TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/bootstrap-local.sql -f supabase/migrations/202609180001_counterpart.sql -f supabase/tests/ownership.sql
```

The assertions cover cross-owner reads, updates, deletions and generation calls, same-user concurrent admission, cached idempotency, daily analysis allowance, and deletion-resistant usage counts. All fixtures roll back. The SQL was executed successfully against local PostgreSQL 18 using these auth stand-ins; this does not establish live Supabase OAuth configuration or cloud deployment behavior.

For an already migrated disposable Supabase database, run only `tests/ownership.sql`. Live OAuth, real Gemini inference, and hosted configuration still require their own checks.
