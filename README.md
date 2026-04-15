# Connect 5

Connect 5 is a static daily word game. There is no backend now: the daily board is generated locally from the date, practice mode is unlimited, and result sharing is done with copy/X/Bluesky links.

## Project Structure

- [index.html](/Users/macey/git/connect5/index.html): landing page
- [pages/daily.html](/Users/macey/git/connect5/pages/daily.html): daily puzzle
- [pages/practice.html](/Users/macey/git/connect5/pages/practice.html): practice mode
- [assets/js/app](/Users/macey/git/connect5/assets/js/app): shared config and constants
- [assets/js/core](/Users/macey/git/connect5/assets/js/core): reusable game engine modules
- [assets/js/features/daily](/Users/macey/git/connect5/assets/js/features/daily): daily puzzle generation and daily mode behavior
- [assets/js/pages](/Users/macey/git/connect5/assets/js/pages): page-level controllers

## Local Development

Serve the repo root with any static server.

```bash
python3 -m http.server 8000
```

Then open [http://localhost:8000/index.html](http://localhost:8000/index.html).

## Gameplay

- `Daily` gives everyone the same puzzle on a given date.
- `Practice` generates fresh local boards with no save state.
- Daily results can be copied or shared to X / Bluesky after the game ends.

The displayed daily puzzle number starts at `#1` on April 15, 2026.

## Deployment

This repo deploys as plain static files. GitHub Pages is enough.

### GitHub Pages

1. Publish the repo root from `main`.
2. Keep [CNAME](/Users/macey/git/connect5/CNAME) set to `connect5.co`.
3. Point your DNS at GitHub Pages.
4. Wait for TLS provisioning, then enable HTTPS in GitHub Pages settings.

## Notes

- The daily puzzle is deterministic client-side, so there is no server state to maintain.
- Word validation still uses `dictionaryapi.dev`. If that service is slow or unavailable, replacing it with a bundled word list would make the game more reliable.
