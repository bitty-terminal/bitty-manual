# git-panel (Lua plugin)

Returns bounded Git branch, status, diff-stat, and log data from allowlisted subprocess queries. Revision `862df1f90ad137eb1e92379ac0710c6cd22c7f21` does not mount a tiled panel. The manifest declares `git >= 2.30` on `PATH`.

- Plugin id: `bitty-terminal.git-panel` · manifest version `0.1.0`
- Source: [github.com/bitty-terminal/git-panel](https://github.com/bitty-terminal/git-panel) · official registry entry
- Requested capabilities: `panel.provider`, `panel.create`, `terminal.semantic-read`, `process.spawn:git` (only the `git` binary; only `status`, `diff`, `log`, `branch`, `show`, `rev-parse`, `ls-files`), plus a read-only `~/projects/**` filesystem scope
- Compatibility at this revision: Bitty `>=0.0.24,<0.1`, plugin API `^1.0`, registry SDK `^1.0`.

## Install

Lua plugins carry no CDN versions. Install from the official catalog, then enable:

```bash
bitty plugin install bitty-terminal.git-panel
bitty plugin enable bitty-terminal.git-panel
bitty plugin list   # confirm state and grants
```

## Lua API surface

Declared triggers:

- Commands: `bitty-terminal.git-panel:open`, `:status`, `:diff`, `:log`, `:branch`
- Events: `terminal.cwd-changed`, `terminal.title-changed`, `focus.changed`

Calls used in `lua/git-panel/`:

- `bitty.commands.register` — registers the five commands
- `bitty.events.subscribe` — refreshes the snapshot-derived cache without spawning Git from event handlers
- `bitty.terminal.snapshot` — read-only cwd/title observation that selects the working tree
- `bitty.process.spawn(args, { cwd = cache.cwd })` — executes allowlisted Git queries through the host; denied or unavailable spawns fail rather than falling back to a shell

The plugin limits returned spawn output to 8 KiB before parsing and drops an incomplete trailing line after truncation. It invalidates its repository-root cache when cwd or terminal/runtime/generation identity changes. This source behavior does not establish live per-pane isolation or panel usability.

The declared panel capabilities do not themselves create a UI. `open` returns a summary; the other commands return bounded query data. This plugin does not provide generic command routing through the palette.

## Settings

No settings file is needed: this revision declares no settings and obtains its working-tree context from terminal observation and Git output. Installation and explicit enablement above do not prove a visible panel or successful live queries on your host.
