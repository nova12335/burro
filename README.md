# bridger western — o quadro vivo

Fan site / interactive board for the Ridge B Valley RP. Wanted-poster themed,
quiz, quick-draw duel, fortune cards, bounty board of hidden achievements.
Static, no backend — built to run straight off GitHub Pages.

## structure

```
index.html          current build
assets/css/         styles
assets/js/          board logic + ambient extras
legacy/              older builds, kept for reference, not linked from nav
```

## running locally

Just open `index.html`. No build step.

## notes

- `robots.txt` / `sitemap.xml` are mostly standard, ignore the extra disallow
  entries, they're leftovers from when this repo had more in it.
- Don't delete anything under `legacy/` or the archive folder without asking
  KM first. Some of it isn't ours to delete.
- If you're forking this for your own RP board: the achievement/quiz data is
  all in `assets/js/board.js`, easy to reskin.

See `CHANGELOG.md` for build history.
