# file-manager (Lua plugin)

Builds bounded candidate-path metadata using read-only terminal cwd/title observation. At revision `bf3a17ea6aa1ea0fcc3a45a13ceaa069e83b71d4`, it does not enumerate, read, write, or rename files, and it does not mount a file-manager panel.

- Plugin id: `bitty-terminal.file-manager` · manifest version `0.1.0`
- Source: [github.com/bitty-terminal/file-manager](https://github.com/bitty-terminal/file-manager) · official registry entry
- Requested capability: `terminal.semantic-read`
- Compatibility at this revision: Bitty `>=0.0.24,<0.1`, plugin API `^1.0`, registry SDK `^1.0`.

## Install

Lua plugins carry no CDN versions. Install from the official catalog, then enable:

```bash
bitty plugin install bitty-terminal.file-manager
bitty plugin enable bitty-terminal.file-manager
bitty plugin list   # confirm state and grants
```

## Lua API surface

Declared triggers:

- Commands: `bitty-terminal.file-manager:open`, `:preview`, `:rename`
- Events: `terminal.cwd-changed`, `terminal.title-changed`, `focus.changed`

Calls used in `lua/file-manager/`:

- `bitty.commands.register` — registers the three commands
- `bitty.events.subscribe` — refreshes the snapshot-derived cache
- `bitty.terminal.snapshot` — read-only cwd/title observation

`open` shapes supplied candidate paths into bounded metadata; `preview` validates and returns metadata for one candidate, without reading its contents. `rename` validates source and destination paths and returns a pair; it performs no filesystem rename. None of these commands registers or mounts a panel.

## Settings

This revision declares no manifest settings. Its internal attempts to read `entries` and `root` catch undeclared-key errors; adding those names to a settings file does not make them effective. No per-plugin settings file is needed. See [per-plugin config files](../plugin-settings.md) for declaration and authority rules.
