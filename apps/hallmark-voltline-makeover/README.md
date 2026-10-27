# Hallmark Voltline makeover

A static before/after of one Voltline 1440p gaming-build page. The left page is a plain product page. The right page is that same offer after [Hallmark](https://github.com/Nutlope/hallmark) (MIT, skill 2.0.0) dealt a theme, scaffolded the tokens, and audited the result in Chrome.

```bash
cd apps/hallmark-voltline-makeover
bun install && bun run dev
```

`bun run typecheck`, `bun run lint`, `bun run test`, and `bun run build` cover the checks. The Pages build sets `VITE_BASE_PATH=/tech-demos/hallmark-voltline-makeover/`.

Prices, part names, and Harbor shelf counts are sample catalog data. The audit cards quote the committed `sloplint --render --before` run. See `PLAN.md` for the deal, the three themes, and what the run did not do.

The product pages load Chivo, Ultra, Bungee, Silkscreen, Inter, Playfair Display, and Poppins from `public/fonts/`. Those files are the SIL Open Font License 1.1 builds, except Ultra, which is Apache-2.0. Each family's copyright and license sit beside the files.

Chillax stays on the Fontshare stylesheet. Its ITF Free Font License 2.0 allows self-hosting on a site you run, and it forbids distributing the font files through a repository. This demo is a public git repo, so the Chillax files are not in the tree.
