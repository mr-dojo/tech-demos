# PLAN — apps/hallmark-voltline-makeover

> Demo of **Hallmark** by Together AI (https://github.com/Nutlope/hallmark, MIT), skill version **2.0.0**.
> Hallmark is a design skill for coding agents. It is not a runtime library. A build follows `skills/hallmark/SKILL.md`, and the mechanical checks are `scripts/sloplint.mjs` and `scripts/theme.mjs`.
>
> The catalog in this checkout has **50 themes**. The bookmark text said 48. The running skill's `references/themes/index.json` lists 50, and this plan uses that count.
>
> `skills/project-planning` is not in this repository (local `main` and `origin/main` were checked). This file follows the same sections as `apps/graphify-code-map/PLAN.md`.

## Goal (one sentence)

A static page where someone drags a before/after slider across one Voltline 1440p gaming-build product page, flips the "after" side between three themes Hallmark actually dealt, and reads the audit findings `sloplint` recorded on the default page.

## What Hallmark actually does (researched before this design)

Checked against the clone of `Nutlope/hallmark` at `main` on 27 Oct 2026 (`skills/hallmark/SKILL.md` version 2.0.0, MIT). Installed with the repo's installer:

```bash
node skills/hallmark/scripts/install.mjs --cursor
```

That copies the skill to `~/.agents/skills/hallmark` after `theme.mjs index`, `refcheck.mjs --errors`, and `theme.mjs validate`. Cursor finds that copy. There is no Hallmark npm package that renders a page. `/hallmark redesign` and `/hallmark audit` are verbs in `references/redesign.md`: the agent runs the scripts, then writes or reports the page.

- **Deal.** `node scripts/theme.mjs deal --genre playful --prompt "game shop retail page selling one gaming computer build with a price and a parts list"`. Genre is playful because the skill maps "games" there. The project salt is `apps/hallmark-voltline-makeover/.hallmark/salt` (`65bd4afd`), so the hand is stable. Deal seed `game-shop-retail-selling-253e·65bd4afd·2026-10-27·r0` returned three themes, each with a real keyword hit:
  1. **Halftone** (`halftone`) — fits `retail`. Butter-cream stock, Ultra over Chivo, one vermilion.
  2. **Arcade** (`arcade`) — fits `game`. Aubergine CRT, Bungee over Chivo, Silkscreen figures.
  3. **Hum** (`hum`) — fits `game`. Cream paper, Chillax, pear / blue / coral.
- The skill says to pick one of the three. This demo builds **all three** so the theme switch is the dealt hand, not a later hand-pick. Each stamp says `by request` for that reason and names the deal seed.
- **Draw.** `theme.mjs draw --material product --job buy --theme <slug>` deals shape, hero, nav, footer, and where the buy action sits. Each theme takes its own draw.
- **Scaffold.** `theme.mjs scaffold <slug> --redesign full --dealt "<n>/3, seed …"` writes `tokens.css` and `base.css`. The page stylesheet starts with the stamp those lines print.
- **Audit.** `sloplint.mjs <default> --genre playful --render --before` writes `.hallmark/before.json`, `.hallmark/before.txt`, and screenshots. Audit stops there: it does not edit the page (`redesign.md`). The browser tier needs `puppeteer-core` and Chrome. Chrome is at `/usr/bin/google-chrome`. If the render tier cannot start, the UI says so and the static tier's findings are what the cards show.
- **Redesign.** Full depth. Content and wiring stay. The system and the composition change. `sloplint --render --kept` fails the redesign if a link, field, or handler from `before.json` disappeared without a stamp line that names the drop.
- **Photos.** `theme.mjs photos "<subject>" --theme <slug> --save <dir>` picks Wikimedia Commons files from `photos.json` and credits them. No Unsplash, Pexels, or Pixabay. If a download fails, the slot stays empty and the UI says the library photo did not load. Nothing is drawn in its place.
- **Facts.** Prices, names, ratings, review counts, and store rows come from the sample catalog in `apps/openui-genui` (`catalog.json`, `shopper.json`, `builds.ts`). They are sample data. The default page also contains tells an unguided generation adds (eyebrow, one coloured word, a newsletter, an invented "50,000" line, a stock testimonial). The redesign drops those. The handoff lists every drop. The demo chrome labels the catalog figures as sample.

The eight parts are the OpenUI gaming build (`GAMING_BUILD`):

| SKU | Name | Sample price |
| --- | --- | --- |
| VL-CPU-7600 | Ryzen 5 7600 | $189 |
| VL-GPU-4070S | GeForce RTX 4070 Super | $599 |
| VL-MB-B650 | Harbor B650 ATX | $149 |
| VL-RAM-32D5 | Kiln 32GB DDR5-6000 | $104 |
| VL-SSD-2T | Drift 2TB NVMe | $134 |
| VL-PSU-750 | Northspan 750W | $109 |
| VL-CASE-ATX | Keel Mid Tower | $99 |
| VL-COOL-AIR | Draft Tower 158 | $39 |

Sum **$1,422**. Harbor stock counts for the CPU, GPU, board, and cooler are the counts in `shopper.json`. The other four parts have catalog `in_stock` and no store count, so the page does not invent a store quantity for them.

## MVP scope (single user)

**In**

- One Vite page. The product pages are static HTML that Hallmark's scripts actually lint. The React shell is the demo chrome (slider, theme switch, audit cards), not a fourth theme.
- Default page: a plain product page with the tells listed above, no Hallmark stamp.
- Three redesigned pages, one per dealt theme, each starting from that theme's scaffold.
- A before/after slider (`react-compare-slider`) between the default page and the selected Hallmark page. Both sides scroll together.
- A control to flip Halftone, Arcade, and Hum.
- Audit cards from the real `sloplint` findings (gate, grade, file, line, evidence, the linter's fix line) and a short note of how that finding was settled on the redesigned pages. Not a table.
- A visible line when the render tier did not run, and a visible "sample" label on catalog figures.
- Subpath builds: `VITE_BASE_PATH` / `import.meta.env.BASE_URL`, same pattern as `apps/graphify-code-map`.
- shadcn button, card, and badge for the chrome only.

**Out (explicitly)**

- A live model call. Hallmark does not need `TOGETHER_API_KEY` for deal, scaffold, photos, or sloplint. Signal 9 (generated comps) stays off.
- Re-running Hallmark inside `bun run dev`. The committed pages and the audit JSON are the run.
- Editing the product pages in the browser.
- A fourth theme, a custom (no-theme) build, or a polish/restyle depth.
- Inventing a warranty length, a shipping price, a logo wall, or a quote that is not already in the sample catalog. The default page's invented lines exist only so the audit can flag them, and they are labeled as such on the cards.

## Vertical-slice tasks (each ends in something visible or working)

1. **Scaffold boots** — `apps/hallmark-voltline-makeover/` from `bunx create-vite@latest --template react-ts --no-immediate --no-interactive`. `bunfig.toml` sets `minimumReleaseAge = 259200` before the first `bun install`.
2. **shadcn ready** — neutral base, CSS variables. The CLI has no preset named "minimalist"; use `base-nova`. Components only as a slice needs them.
3. **Default page** — the slop product page is on screen, with the catalog parts and the tells.
4. **Audit** — `sloplint --before` has run. The cards show its findings.
5. **Three themes** — Halftone, Arcade, and Hum pages exist, stamped, and the slider swaps them.
6. **Kept** — `sloplint --kept` has run against the redesigns. Drops are in the stamp, not silent.
7. **Polish** — README, screenshot, and screen recording on the PR.

## Stack (one-line rationale each)

- **Bun** (runtime + package manager): monorepo standard; scripts and `bun test`.
- **Vite + React + TypeScript via `bunx create-vite@latest --template react-ts --no-immediate`**: official scaffold. The demo is a static client over HTML files, so it does not need a server.
- **`bunfig.toml` in `apps/hallmark-voltline-makeover/`**, written before the first `bun install`, with `[install] minimumReleaseAge = 259200`. The repo root already has the same file.
- **Tailwind v4**: what current shadcn installs on this Vite scaffold.
- **shadcn/ui preset `nova`** (`base-nova`, base color neutral, CSS variables): the CLI has no preset named "minimalist".
- **`clsx` and `tailwind-merge`**: the class helper. No `cn` package.
- **`react-compare-slider`**: the before/after drag control. Custom code only syncs scroll and points the two sides at the HTML files.
- **Hallmark's own `theme.mjs` and `sloplint.mjs`**: the deal, the scaffold, and the audit. Not a runtime dependency of `dev`.

## Component / service layout

```
apps/hallmark-voltline-makeover/
├── bunfig.toml
├── PLAN.md
├── README.md
├── public/pages/
│   ├── default/          # the unaudited page (index.html, style.css)
│   ├── halftone/         # scaffold tokens.css, base.css, style.css, index.html
│   ├── arcade/
│   └── hum/
├── src/
│   ├── data/
│   │   ├── audit.json    # sloplint findings the cards render, plus how each was settled
│   │   ├── provenance.json
│   │   └── product.ts    # the eight sample parts and the $1,422 sum
│   ├── lib/
│   │   ├── audit.ts
│   │   ├── audit.test.ts
│   │   ├── pages.ts      # BASE_URL join for the iframe src
│   │   └── pages.test.ts
│   └── components/
│       ├── ui/
│       ├── makeover-app.tsx
│       ├── compare-stage.tsx
│       └── audit-cards.tsx
└── .hallmark/            # salt, deal log, before.json from the real audit
```

## Env vars / API keys

- None for `bun install` or `bun run dev`.
- `VITE_BASE_PATH` only for the Pages build (`/tech-demos/hallmark-voltline-makeover/`).
- No `TOGETHER_API_KEY`. Do not commit one.

## How to run

```bash
cd apps/hallmark-voltline-makeover
bun install && bun run dev
```

Regenerate the audit (does not run on `dev`). Needs Node 18+, the Hallmark clone or the installed skill, and for `--render` a local `puppeteer-core` plus Chrome:

```bash
node ~/.agents/skills/hallmark/scripts/sloplint.mjs public/pages/default --genre playful --render --before
```

## Minimal tests and checks

- `bun test`:
  - The eight catalog prices sum to 1422.
  - `pageHref` prefixes `import.meta.env.BASE_URL` and does not produce a double slash.
  - `audit.json` findings each have gate, grade, line, and evidence, and the provenance names Hallmark 2.0.0 and the three theme slugs.
  - The redesigned HTML files contain a Hallmark stamp; the default page does not.
  - The redesigned pages do not contain the invented "50,000" line.
- `bun run typecheck` and `bun run lint`.
- Critical logic only. No pixel tests.

## Validation / definition of done

- `bun install && bun run dev` works with no API key.
- The slider, the theme switch, and the audit cards are visible, and the cards quote the sloplint run.
- Tests, typecheck, lint, and build pass.
- The PR includes at least one screenshot and one video of the running app.
- The PR says which output is real Hallmark (deal, scaffold CSS, sloplint findings, theme pages) and which lines are sample catalog data. If `--render` did not run, the PR and the page both say that.

## Run record

The deal, the three scaffolds, `sloplint --render --before` on the default page, and `sloplint --render --kept` on each redesign all ran. Chrome was `/usr/local/bin/google-chrome` with `puppeteer-core` resolved through `HALLMARK_PUPPETEER`. The default page recorded 57 FAIL, 31 REFLEX, and 11 WARN. Each redesign then recorded 0 FAIL, 0 REFLEX, and 0 WARN.

`--kept` compares files by the path stored in `.hallmark/before.json`. Running it on `public/pages/halftone` would skip the default page, because that file still exists and is outside the run. The kept check copied each theme onto `public/pages/default` in a temp directory, next to the same `before.json`, and linted that copy. The demo tree still keeps the default page beside the three redesigns.

A file-path render does not read hero posture from the stamp. The heroes were sized to the viewport anyway, and the render passed. Each redesign still carries NOTE 58: one screen holds about 88 to 103 words. The audit card for gate 58 says that note is unsettled.

Hum's torn-paper `--grain` and `--fibre` tokens were not in the scaffold, so that page uses flat paper and says so. A fresh-context finish review was not run. Signal 9 comps were not run. The catalog in this skill checkout has 50 themes.

## Deferred (later, not MVP)

- A finish-review subagent with a fresh context, if this harness cannot start one. The sweep still runs `sloplint` and records the result. A skipped fresh-context review is named in provenance, not invented.
- Signal 9 comps (`TOGETHER_API_KEY`).
- Re-dealing or a fourth theme.
- Wiring the reserve form to anything. It posts nowhere, which the skill's form pattern allows, and the button says so.

## References

- Repo: https://github.com/Nutlope/hallmark (MIT)
- Skill: `skills/hallmark/SKILL.md`, `references/redesign.md`, `references/anatomy.md` (buy), `references/themes/{halftone,arcade,hum}.md`
- Sample facts: `apps/openui-genui/src/data/catalog.json`, `shopper.json`, `src/lib/builds.ts`
