# Configuration Dashboard

The configuration dashboard is a full-panel overview of the active setup and the configuration files behind it. It is meant for the moments when you do not want to open the configuration file or run CLI commands to answer "what is active right now?".

The panel is part of the terminal itself: it uses no plugin, no shell, and no network.

## Open the dashboard

The dashboard has no default chord. Bind it once in `$XDG_CONFIG_HOME/bitty/init.lua` (defaults to `~/.config/bitty/init.lua`):

```lua
return {
    keymaps = {
        { chord = "alt+c", action = "toggle_dashboard", context = "global" },
    },
}
```

`toggle_dashboard` is also accepted as `config_dashboard` or `dashboard`. The same action is available wherever chrome actions run, so an existing keymap entry can be repointed without learning a new name.

While the panel is open it owns unmodified keys, so typing cannot leak into the shell behind it. Chorded keys (Ctrl/Alt/Super) keep working; that is how the toggle chord closes the panel again.

Opening is refused while a plugin overlay (for example the command palette) holds input capture. Close that surface first.

## Keyboard navigation

| Key                                              | Effect                                                     |
| ------------------------------------------------ | ---------------------------------------------------------- |
| `j` / `k`, `Down` / `Up`                         | Move the selection                                         |
| `h` / `l`, `Left` / `Right`, `Tab` / `Shift+Tab` | Previous / next section                                    |
| `1` … `5`                                        | Jump to a section                                          |
| `g` / `G`, `Home` / `End`                        | First / last row                                           |
| `PageUp` / `PageDown`                            | Move one page                                              |
| `Enter`                                          | Apply the selected row (a write asks for a second `Enter`) |
| `r`                                              | Re-read the data                                           |
| `q` / `Esc`                                      | Close                                                      |

Long sections keep at most 128 rows and end with a `+more` row, so a large plugin set never turns into an unbounded list. Values are shortened with `…` when they exceed the panel width. If the window is too small for a legible panel, it shows `terminal too small` instead of consuming keys invisibly.

## Sections

### Overview

The active profile (or `default (no profile)`), the resolved theme with the layer that won (`cli`, `file`, `profile`, `default`), the live font family and point size, the decoration geometry, and the resolved config file path. Below those rows, every built-in theme preset is listed.

Selecting a preset and pressing `Enter` twice applies it **live, without saving**. The panel labels the result `live preview, not saved` and the original layer returns on the next configuration reload or restart. To make a theme permanent, add it to your configuration file:

```lua
return { appearance = { theme = "bitty-light" } }
```

### Plugins

One row per bundled catalog entry and installed record: enabled/disabled/available, provenance (`bundled`, `registry`, `git`, `local-path`), and version.

A bundled plugin that has a managed record can be enabled or disabled from here. Pressing `Enter` on its row arms the change; a second `Enter` writes it. Any move cancels the pending change. The write is the same managed-manifest update `bitty plugin enable` / `bitty plugin disable` performs, including the pin and grant checks, so a record whose manifest changed since consent is refused with a message instead of being written. Unknown records are refused and no file is created. Plugins without a managed record are listed but not toggled — install them first with `bitty plugin install <id>`.

### Settings

Read-only. For every installed plugin that declares settings, one row per setting shows the current value, the shipped default, and the source (`user` when your file sets it, `default` otherwise). Ignored keys and settings-file parse errors are listed with their plugin prefix.

The panel does not edit settings: a persisted write needs the typed configuration API that is still in design. Use the CLI that owns the schema:

```bash
bitty plugin config show <id>       # current, default, source
bitty plugin config scaffold <id>   # write a commented settings template
```

The section names this command too. Reload with `r` after saving a file, as described in [Plugin Configuration](plugin-config.md).

### Profiles

Read-only. Lists `default` plus every valid `profiles/<name>.lua` and marks the active one. A profile is selected at launch, so switching needs a restart:

```bash
bitty --profile work
```

Your main configuration file still wins over the selected profile, as described in [Configuration Overview](overview.md#named-profiles).

### Extensions

Read-only. For every installed native extension the panel shows the active version, the tier that owns it (`user` or `system`), ABI compatibility, the descriptor digest, the executable target path, the last recorded activation (`installed`, `active`, `stopped`, `crashed`, `denied:<reason>`), trust derived from that record, and the installed version count.

Activation is the last recorded transition, not a liveness probe: the panel never spawns or pings a component. Trust means the last activation verified the executable digest; a component that was never activated shows `unverified`, and a component whose last activation was refused shows `untrusted`.

The rows also show the exact command for each action — `bitty extension install <name>` for install/update and `bitty extension remove <name> <version>` for an older version. The panel never runs them: extensions download code and confirmation belongs to the CLI.

### Diagnostics

Read-only platform facts: the application version, the active profile and which layer chose it (`cli`, `env`, or `none`), the resolved config file and directory, the managed plugin ledger, the plugin store, the user and system extension roots, and the extension activation-state root. Each path is marked `present` or `missing`, which distinguishes "not created yet" from "wrong path".

Use this section when a panel section disagrees with `bitty config path`, `bitty plugin list`, or `bitty extension list`: the panel reads the same resolved paths, including the `BITTY_COMPONENTS_DIR` / `BITTY_SYSTEM_COMPONENTS_DIR` overrides.

## Where the files live

| Data                  | Path                                                                         |
| --------------------- | ---------------------------------------------------------------------------- |
| Main configuration    | `$XDG_CONFIG_HOME/bitty/init.lua` (fallback `config.lua`)                    |
| Named profiles        | `$XDG_CONFIG_HOME/bitty/profiles/<name>.lua`                                 |
| Plugin settings       | `$XDG_CONFIG_HOME/bitty/plugins/<owner>.<name>.toml` (or `.lua`)             |
| Managed plugin ledger | `$XDG_CONFIG_HOME/bitty/bitty-plugins.toml` — do not hand-edit               |
| Plugin packages       | `$XDG_DATA_HOME/bitty/plugins/packages/<id>/<version>/`                      |
| Extensions            | `$XDG_DATA_HOME/bitty/components/` (system tier under the packaged location) |

`bitty config path` prints the exact resolved files, and `bitty config check` prints the source of each value — the same data the panel shows.

## When a section says "unavailable"

`unavailable: <reason>` means the data could not be read (for example an unreadable plugin ledger or no resolvable config root), not that nothing is configured. An empty result is shown as empty ("none installed"). Fix the reason and press `r` to re-read; the panel performs no writes while a section is unavailable.

## What the dashboard never does

- It does not edit the configuration file or any other file for a theme preview.
- It does not install or remove plugins or extensions.
- It does not run a shell command, open a URL, or use the network.
- It does not read environment variables, tokens, or credentials.
- It does not create a plugin runtime or its services; plugin settings are read through the bounded plain-config loader.
