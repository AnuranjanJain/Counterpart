# Connect the free services

Create `.env.local` beside `package.json` using the variable names in `.env.example`. It is ignored by Git. Never send credentials in chat or include them in screenshots.

## Supabase

1. Create a free project at https://supabase.com/dashboard and wait for provisioning.
2. Open Settings > Data API (or the project's Connect dialog). Copy Project URL into `NEXT_PUBLIC_SUPABASE_URL`.
3. Open Settings > API Keys. In the legacy API keys section, copy `anon` into `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `service_role` into `SUPABASE_SERVICE_ROLE_KEY`.
4. The anon key is designed for browser use with RLS. The service-role key bypasses RLS and must only be available on the server. Never name it with `NEXT_PUBLIC_`.
5. Open SQL Editor, run `supabase/migrations/202609180001_counterpart.sql` once in the new project, and confirm success.

## Google sign-in

1. In Supabase Authentication > Sign In / Providers, enable Google and note the callback URL shown there (`https://YOUR_PROJECT.supabase.co/auth/v1/callback`).
2. In Google Cloud Console, configure the OAuth consent screen for an external application. While in testing, add the accounts allowed to sign in. Public judge access requires the application's publishing/access configuration to permit their accounts.
3. Create an OAuth client of type Web application. Add the Supabase callback URL as an authorized redirect URI. Enter the Google client ID and secret in Supabase's Google provider settings, not in browser code.
4. In Supabase Authentication > URL Configuration, set the deployed site URL and add both `http://127.0.0.1:3000/auth/callback` and your deployed `https://.../auth/callback` to allowed redirect URLs. Add localhost separately if using it.

## Gemini

1. Go to https://aistudio.google.com/api-keys and create a Gemini API key in a project with available free-tier quota.
2. Set `GEMINI_API_KEY` in `.env.local`. Keep `GEMINI_MODEL=gemini-2.5-flash` unless you intentionally select and evaluate another supported model.
3. Check your actual model's quota in AI Studio. Set `GLOBAL_DAILY_GENERATION_LIMIT` and `generation_settings.daily_limit` in Supabase conservatively. The application defaults to 30 admitted operations but retries may make additional provider requests.

Restart `npm run dev` after configuring variables. Test sign-in, create a fictional agreement, and run a real analysis. A catalog listing or key creation alone does not prove inference works.

## Vercel

Import the public repository as a Next.js project. Set the same environment variables in Project Settings > Environment Variables, with the service-role and Gemini keys restricted to server use. Set `NEXT_PUBLIC_SITE_URL` to the deployed URL and redeploy after changes to public variables.

Complete Supabase's redirect configuration for this URL. Turn off deployment protection for the public submission URL if enabled. Verify from a fresh/private browser session. Never record secrets in the walkthrough.
