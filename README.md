# tech-demos

Small, self-contained demos of libraries and tools. Each one lives in `apps/<kebab-slug>/` and installs on its own with Bun.

| Demo | What it shows | Run |
| --- | --- | --- |
| [OpenUI](apps/openui-genui) | Voltline PC, a fictional shop: builds, orders, and in-store pickup stream in as [OpenUI Lang](https://github.com/thesysdev/openui) | `cd apps/openui-genui && bun install && bun run dev` |

No API key is required. With `OPENAI_API_KEY` unset the Voltline demo runs in demo mode and still renders a parts list, a chart, and a pickup confirmation from sample data. See [apps/openui-genui/README.md](apps/openui-genui/README.md) for the live-model setup.

Agent conventions for adding another demo are in [AGENTS.md](AGENTS.md).
