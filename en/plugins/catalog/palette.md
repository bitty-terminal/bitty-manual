# palette (Lua plugin)

Filtered-entry overlay: acquires a focusable overlay with `title` and `placeholder`, paints entries, and releases the session when closed. Revision `c17dc321c8c7d4c8a1b8c5e7853d33e943af7c3d` does not discover or dispatch arbitrary registered plugin commands.

- Plugin id: `bitty-terminal.palette` · manifest version `0.0.1`
- Source: [github.com/bitty-terminal/palette](https://github.com/bitty-terminal/palette) · official registry entry
- Requested capability: `ui.overlay.focus` (single coupled grant)
- Compatibility at this revision: Bitty `>=0.0.24,<0.1`, plugin API `^1.0`, registry SDK `^1.0`.

## Install

Lua plugins carry no CDN versions. Install from the official catalog, then enable:

```bash
bitty plugin install bitty-terminal.palette
bitty plugin enable bitty-terminal.palette
bitty plugin list   # confirm state and grants
```

## Lua API surface

Declared triggers:

- Commands: `bitty-terminal.palette:toggle`
- Events: `focus.changed`, `overlay.released`

Calls used in `lua/palette/`:

- `bitty.commands.register` — registers `toggle`
- `bitty.events.subscribe` — observes focus and overlay-release transitions
- `bitty.ui.overlay.acquire` / `bitty.ui.overlay.update` — single Core-owned switch mounts the surface and paints content
- `bitty.ui.overlay.release` — ends the owned overlay session

`toggle` returns the filtered entry count. If overlay acquisition or update fails, it can return a count without presenting a surface; the return value alone is not proof that the UI appeared.

## Settings

This revision declares no manifest settings. Its internal reads of `entries` and `query` catch undeclared-key errors and fall back to an empty list and empty query. Those names in a per-plugin settings file do not configure this revision. The overlay grant does not declare settings or grant command-routing authority. See [per-plugin config files](../plugin-settings.md).
