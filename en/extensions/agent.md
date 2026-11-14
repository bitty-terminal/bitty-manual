# agent (native extension)

The host-neutral AI agent protocol vocabulary: bounded messages, tool-call stubs, read-only observations, and bounded coordination queues. No LLM I/O, no network, no window/GPU coupling (`bitty-agent` README).

- Source checkout: `$BITTY_WORKSPACE/bitty-agent` ([github.com/bitty-terminal/bitty-agent](https://github.com/bitty-terminal/bitty-agent))
- Crates: `bitty-agent-api`, `bitty-agent`
- Maturity: accepted contract, implementation not yet verified — do not treat its behavior as shipped.

## Install status

> Unpublished — verified 2026-10-16 (CDN `extensions/` probes return 404; see the [catalog overview](overview.md)). There is no version to pass to `extension install`.

Track the source checkout above. Once a prebuilt ships, installation follows the standard shape:

```bash
bitty extension list   # confirm what is staged today (empty table, exit 0)
# Later, when published:
# bitty extension install <name> --version X.Y.Z
```

## Lua / host surface

This crate exposes no direct `bitty.*` Lua namespace. It defines the host-neutral protocol vocabulary (the `bitty.agent-1` protocol marker) that AI and plugin consumers use to exchange bounded agent messages. Wheel 0.1.0 is not a Lua plugin: it ships as a standalone harness artifact that runs in its own process outside the plugin VM and receives no plugin capability grant. See [wheel](https://github.com/bitty-terminal/wheel). The AI host itself is a separate extension with its own capability surface: [ai](ai.md).

### Wheel Harness Configuration & Dashboard Management

Wheel stores user configuration under `$XDG_CONFIG_HOME/wheel/` (`init.lua` and optional `providers/<name>.lua`) and owner-only (`0700` dir, `0600` files) runtime state under `$XDG_DATA_HOME/wheel/{settings.json,credentials.json,approvals.json}`. You can manage Wheel either from the CLI or from the `Wheel` tab of the `bitty-terminal.dashboard` plugin (via the `bitty.wheel` / `bitty.config.wheel` bridge under `config.manage`; see [Capabilities & Sandboxing](../plugins/capabilities-and-sandbox.md#configuration-reads-and-writes-configmanage)):

```bash
wheel config show
wheel config set approval_mode dashboard
wheel auth status
printf '%s\n' "$API_KEY" | wheel auth set openai --stdin
wheel approvals list
wheel-session   # launch or attach a persistent bittyd-backed Wheel session
```

## Minimal config

Native extensions take no per-extension user config file. Verify staging only:

```bash
bitty extension list
```
