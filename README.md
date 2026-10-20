# tech-demos

Small, self-contained demos of libraries and tools. Each one lives in `apps/<kebab-slug>/` and installs on its own with Bun.

| Demo | What it shows | Run |
| --- | --- | --- |
| [OpenUI](apps/openui-genui) | Generative UI: a chat reply streams in as real components, written in [OpenUI Lang](https://github.com/thesysdev/openui) | `cd apps/openui-genui && bun install && bun run dev` |

No API key is required for the OpenUI demo. With `OPENAI_API_KEY` unset it runs in demo mode and still renders tables, charts, and forms. See [apps/openui-genui/README.md](apps/openui-genui/README.md) for the live-model setup.

Agent conventions for adding another demo are in [AGENTS.md](AGENTS.md).
