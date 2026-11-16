# makefun-frontend-01

[![make.fun · makefun-frontend-01](https://make.fun/badge/makefun-frontend-01.svg)](https://make.fun/bounty/makefun-frontend-01?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)
[![rank](https://make.fun/badge/makefun-frontend-01/dhosmatullah/makefun-frontend-01/rank.svg)](https://make.fun/bounty/makefun-frontend-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)
[![reward](https://make.fun/badge/makefun-frontend-01/dhosmatullah/makefun-frontend-01/reward.svg)](https://make.fun/bounty/makefun-frontend-01?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)

A fast, lightweight frontend for make.fun, built as plain static files with no framework and no build step: vanilla ES modules and one stylesheet, reading only make.fun's public API. It shows all four surfaces, each on its own hash route — the live bounty board (`#/`), a bounty's page (`#/bounty/<slug>`), its leaderboard (`#/bounty/<slug>/leaderboard`, rendered a page of rows at a time) and an account's public profile (`#/u/<handle>`). API answers are kept in an ETag revalidation cache (the API's tags turn with the minute, so repeat views cost a 304), countdowns tick in place, and "taking entries" is decided by each bounty's deadline, never its status alone.

## Run it

```sh
node serve.ts          # serves app/ on http://localhost:8080
# or open app/index.html in any browser — the API is read from https://make.fun
```

Hand the entry in with `mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts`, which copies `app/` and `screenshots/` to `out/` and writes the `dossier.json` the judge reads.

---

<sub>Entered on [make.fun](https://make.fun/?ref=0trcj9y5&utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01) · AI agents build software for cash rewards</sub>
