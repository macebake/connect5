# Connect 5

Connect 5 is a static word game with:

- A daily puzzle backed by Supabase
- Practice mode with unlimited local play
- Email/password auth
- Daily and all-time leaderboards
- Player profile stats

There is no build step. The app is plain HTML, CSS, and browser-side ES modules.

## Project Structure

- [index.html](/Users/macey/git/connect5/index.html): landing page and auth/dashboard
- [daily.html](/Users/macey/git/connect5/daily.html): daily puzzle
- [practice.html](/Users/macey/git/connect5/practice.html): practice mode
- [leaderboard.html](/Users/macey/git/connect5/leaderboard.html): leaderboards
- [profile.html](/Users/macey/git/connect5/profile.html): player profile
- [reset-password.html](/Users/macey/git/connect5/reset-password.html): password reset flow
- [assets/js](/Users/macey/git/connect5/assets/js): game logic, auth, API calls
- [database_setup.sql](/Users/macey/git/connect5/database_setup.sql): Supabase schema and helper functions

## Local Development

Use a static file server from the repo root.

```bash
python3 -m http.server 8000
```

Then open:

- `http://localhost:8000/index.html`

## Configuration

Supabase is configured in [assets/js/config.js](/Users/macey/git/connect5/assets/js/config.js).

By default the app ships with the current public project URL and anon key. If you want to point the frontend at a different Supabase project without editing the file, define `window.CONNECT5_CONFIG` before loading the app:

```html
<script>
  window.CONNECT5_CONFIG = {
    SUPABASE_URL: 'https://YOUR_PROJECT.supabase.co',
    SUPABASE_ANON_KEY: 'YOUR_PUBLIC_ANON_KEY'
  };
</script>
```

This is a browser app, so the anon key is public by design. Do not put a service role key in the frontend.

## Supabase Setup

1. Create a Supabase project.
2. Open the SQL editor.
3. Run [database_setup.sql](/Users/macey/git/connect5/database_setup.sql).
4. In Authentication settings:
   - Add your deployed site URL to the allowed site URLs.
   - Add your local dev URL, for example `http://localhost:8000`.
   - Add `http://localhost:8000/reset-password.html` and your deployed `reset-password.html` URL to the redirect URLs.

## Deployment

This repo can be deployed to any static host that serves the repository root as the site root:

- Netlify
- Vercel
- Cloudflare Pages
- GitHub Pages
- Supabase Storage + CDN

The important part is that `index.html` is served at the site root.

### Deploy Checklist

1. Publish the repo root as static files.
2. Confirm `index.html` is the landing page.
3. Confirm `daily.html`, `practice.html`, `leaderboard.html`, `profile.html`, and `reset-password.html` are all reachable.
4. Update Supabase auth settings with your production site URL and password reset redirect URL.
5. Run the optional `pg_cron` schedule statements from [database_setup.sql](/Users/macey/git/connect5/database_setup.sql) so daily puzzles and leaderboard snapshots keep running automatically.

## Notes

- The app uses UTC dates for the daily puzzle key, which matches the database scheduling examples.
- The dictionary check uses `dictionaryapi.dev`. If that service is unavailable, gameplay should still remain usable, but production quality is better if you eventually replace it with a first-party word list or Supabase-hosted dictionary source.
