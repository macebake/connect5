# Connect 5

Connect 5 is a static daily word game. Practice mode is fully local, and the daily board is published as a single JSON file that GitHub Pages serves. Result sharing is done with copy/X/Bluesky links.

## Project Structure

- [index.html](/Users/macey/git/connect5/index.html): daily puzzle homepage
- [pages/daily.html](/Users/macey/git/connect5/pages/daily.html): redirect for old daily links
- [pages/practice.html](/Users/macey/git/connect5/pages/practice.html): practice mode
- [assets/js/app](/Users/macey/git/connect5/assets/js/app): shared config and constants
- [assets/js/core](/Users/macey/git/connect5/assets/js/core): reusable game engine modules
- [assets/js/features/daily](/Users/macey/git/connect5/assets/js/features/daily): daily puzzle generation and daily mode behavior
- [assets/data/daily-puzzle.json](/Users/macey/git/connect5/assets/data/daily-puzzle.json): the currently published daily puzzle
- [scripts/generate-daily-puzzle.mjs](/Users/macey/git/connect5/scripts/generate-daily-puzzle.mjs): secret-seeded daily puzzle generator
- [assets/js/pages](/Users/macey/git/connect5/assets/js/pages): page-level controllers

## Local Development

Serve the repo root with any static server.

```bash
python3 -m http.server 8000
```

Then open [http://localhost:8000/index.html](http://localhost:8000/index.html).

## Gameplay

- `Daily` gives everyone the same puzzle on a given UTC date.
- `Practice` generates fresh local boards with no save state.
- Daily results can be copied or shared to X / Bluesky after the game ends.

The displayed daily puzzle number starts at `#1` on April 15, 2026.

## Deployment

This repo deploys as plain static files. GitHub Pages is enough.

### GitHub Pages

1. Publish the repo root from `main`.
2. Keep [CNAME](/Users/macey/git/connect5/CNAME) set to `connect5.co`.
3. Point your DNS at GitHub Pages.
4. Add a repository secret named `CONNECT5_DAILY_SECRET`.
5. Run the `Update Daily Puzzle` GitHub Actions workflow once, then let the daily schedule keep it fresh.
6. Wait for TLS provisioning, then enable HTTPS in GitHub Pages settings.

## Notes

- The public site only exposes the current daily puzzle file. Future puzzles are generated in GitHub Actions from `CONNECT5_DAILY_SECRET`, so players cannot derive tomorrow's board from the shipped frontend code alone.
- Word validation still uses `dictionaryapi.dev`. If that service is slow or unavailable, replacing it with a bundled word list would make the game more reliable.
