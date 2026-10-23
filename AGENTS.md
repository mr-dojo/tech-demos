# tech-demos

One demo per app, under `apps/<kebab-slug>/`. Each app is self-contained: `bun install && bun run dev` from that directory is enough to run it.

## Rules

- Use Bun for installs, scripts, and tests. Do not add npm, pnpm, or yarn lockfiles.
- Start a new app from the official `bunx create-*` scaffold for that framework. Do not hand-roll the project skeleton.
- Commit a `bunfig.toml` with `[install] minimumReleaseAge = 259200` at the repo root and in the app **before** the first `bun install` in that directory. Do not override the age check to pull a newer release.
- UI chrome uses shadcn/ui with the minimalist preset (neutral base color, CSS variables). Add components only when a slice needs them (`bunx shadcn@latest add …`).
- Prefer a prebuilt component or library over bespoke UI. Write custom code only for the glue the prebuilt piece does not cover.
- Every demo PR includes `apps/<slug>/PLAN.md` plus at least one screenshot and one video of the running app.
- Never create a new repository. Open a pull request against this one.
- After this bootstrap, agents only touch `apps/<slug>/` and `tracking/`. Root files (`AGENTS.md`, `bunfig.toml`, `README.md`, git hooks) stay as they are unless a change is explicitly about the monorepo skeleton.

## Layout

```
apps/<kebab-slug>/     # one demo
tracking/              # bookmark ledger shared by demo PRs
```

`tracking/seen-bookmarks.json` records proposals and demos that have already been built. Add a built entry when a demo lands; do not rebuild a slug that is already listed.
