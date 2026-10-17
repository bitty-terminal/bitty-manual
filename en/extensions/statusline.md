# statusline (Lua plugin)

Cwd, mode, git, and task presentation via status-component composition: recomposes declarative components whenever a reactive terminal event fires.

- Plugin id: `bitty-terminal.statusline` · manifest version `0.1.0`
- Source: [github.com/bitty-terminal/statusline](https://github.com/bitty-terminal/statusline) · independent repo, **not yet in the official registry**
- Requested capabilities: `terminal.semantic-read`, `ui.rich`
- Revision: `3eab0f44b9bf76fc8c01a029176a9bd885f91d07`; requires Bitty **`>=0.1,<1.0`** and plugin API `^1.0`. This revision is **not compatible with Bitty 0.0.24**.

## Install

Lua plugins carry no CDN versions, and this one has no registry entry yet. Only use this revision with a host admitted by its compatibility range; do not lower the range to bypass rejection. On a compatible host, install from the repository, then enable:

```bash
bitty plugin install https://github.com/bitty-terminal/statusline.git
bitty plugin enable bitty-terminal.statusline
bitty plugin list   # confirm state and grants
```

## Lua API surface

Declared triggers: no commands. The manifest-declared observation events activate and drive recomposition: `terminal.cwd-changed` and `terminal.title-changed`.

Calls used in `lua/statusline/`:

- `bitty.events.subscribe` — subscribes the two observation events
- `bitty.terminal.snapshot` — read-only committed-state observation
- `bitty.ui.mount` / `bitty.ui.update` — mounts and refreshes the statusline slot
- `bitty.settings.get` — attempts presentation reads through its internal `M.SETTINGS` map, catching errors and using built-in defaults

If the host does not expose the UI bridge, the plugin observes snapshots without presenting a statusline block. Installation is not proof of headed presentation.

## Settings

This revision declares no manifest settings. Its internal names (`separator`, `show_cwd`, `show_title`, `show_exit`, `max_components`, `component_max_chars`) are not effective user-file settings. Adding them to a file does not declare them or bypass the host's undeclared-key check. See [per-plugin config files](../plugins/plugin-settings.md).
