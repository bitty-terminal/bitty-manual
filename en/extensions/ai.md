# ai (native extension)

The AI host: provider and model selection, context collection, tool dispatch,
and the helper-side `ai.*` control surface. The accepted direction is component
`ai` with executable `bitty-ai` behind the [Native Component Boundary](upstream-components.md)
(DIR-030). This is broader than a UI or Wheel backend: the component owns the
AI runtime and the capability families that AI-aware Lua plugins request.

- Source checkout: [github.com/bitty-terminal/bitty-ai](https://github.com/bitty-terminal/bitty-ai)
- Crates: `bitty-ai-runtime`, `bitty-ai-slice`, `bitty-ai-control`,
  `bitty-ai-endpoint`, `bitty-ai-host`, `bitty-ai-mcp`
- Maturity: experimental/pre-alpha. The deterministic runtime skeleton and
  boundary slice are review evidence; there is no production runtime yet.

## Install status

> Unpublished — verified 2026-10-21 (CDN `extensions/` probes return 404; see
> the [catalog overview](overview.md)). There is no version to pass to
> `extension install`.

The current `bitty-ai` repository builds the experimental `bitty-ai-helper`
control entrypoint (fd 3/4), while Core's `ResidentHelper` expects the DIR-030
`bitty-ai` stdio executable. That binary/mode contract and a published
artifact are prerequisites for installation; do not treat the source checkout
as an installed extension.

```bash
bitty extension list   # confirm what is staged today (empty table, exit 0)
```

## Lua / host surface

AI-aware Lua plugins do not call a single `bitty.ai` namespace. They request
the capability heads below in their manifest, and the host gates the
corresponding services. The AI extension contributes these seven heads:

| Family  | Head                      | Parameter | Effect                                                         |
| ------- | ------------------------- | --------- | -------------------------------------------------------------- |
| `ai`    | `ai.provider`             | no        | Use an allowlisted AI provider                                 |
| `ai`    | `ai.stream`               | no        | Stream AI responses for this agent                             |
| `ai`    | `ai.model`                | no        | Select an AI model for this agent (bounded)                    |
| `mcp`   | `mcp.invoke`              | per tool  | Invoke an allowlisted MCP tool (bounded 256 KiB frame)         |
| `agent` | `agent.context.terminal`  | no        | Observe terminal context for this agent (bounded 32 KiB)       |
| `agent` | `agent.context.workspace` | no        | Observe workspace context for this agent (bounded 32 KiB)      |
| `agent` | `agent.memory`            | per scope | Persist conversational memory (opt-in, `0600`, at most 7 days) |

The Core helper request producer also accepts the helper-side `ai.*` control
methods: `ai.provider_list`, `ai.model_select`, `ai.model_fallback`,
`ai.model_cost`, `ai.context_read`, `ai.extension_manifest`,
`ai.extension_contribute`, `ai.extension_activate`, `ai.cache_hint`,
`ai.mcp_pin`, `ai.mcp_snapshot`, `ai.provider_complete`, and
`ai.tool_dispatch`. These are control-plane methods between Core and the AI
helper, not a Lua sandbox API. The helper owns provider, credential, model, and
tool I/O; Core keeps the credential-free request boundary.

The draft Lua orchestration names (`ai.session`, `ai.context.collect`,
`ai.tools.register`, `ai.chat`) are architectural proposals, not implemented
APIs. Do not build a plugin against them yet.

## Minimal config

Native extensions take no per-extension user config file. The AI host has no
production provider or model configuration loader yet: do not write provider
credentials or model settings expecting the harness to read them. Provider
configuration, credentials, and the helper binary/mode contract are tracked
follow-ups to the accepted publication design.

Verify staging only:

```bash
bitty extension list
```
