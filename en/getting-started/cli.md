# CLI Commands & Controls

Bitty provides a unified, pure-parsing command-line toolchain for launching the terminal, inspecting runtime state, managing profiles, configuring plugins, and driving external automations.

Run `bitty --help` for the compact overview, `bitty --help -v` for all flags, or `bitty <command> --help` for per-command detail.

> [!NOTE]
> `bitty help [cmd]` is a real subcommand that prints help **without spawning any program**: bare `bitty help` prints the same compact overview as `bitty --help` (add `-v` for full detail via `bitty --help -v`), and `bitty help <cmd>` prints the same per-command detail as `bitty <command> --help`. Unknown command names fail closed with exit code 2 and a list of valid commands. A program literally named `help` needs `bitty -- help ...` (or `bitty run -- help ...`), because bare `bitty help` never spawns. Evidence: `crates/bitty-terminal/src/cli.rs` maps `"help" => Some("help")` and ships `help_usage()`.

## Terminal Invocation (`bitty`)

The primary binary launches the GUI window and spawns shell sessions:

```bash
bitty [OPTIONS] [PROGRAM [ARGS...]]
bitty [OPTIONS] -- PROGRAM [ARGS...]
```

### Core Startup Options

| Flag                   | Description                                                                                    |
| :--------------------- | :--------------------------------------------------------------------------------------------- |
| `--config <PATH>`      | Explicit config file path (overrides `$XDG_CONFIG_HOME/bitty/init.lua` and `BITTY_CONFIG`).    |
| `--profile <NAME>`     | Load named profile from `$XDG_CONFIG_HOME/bitty/profiles/<name>.lua` under user config.        |
| `--theme <NAME>`       | CLI theme override for one launch (wins over config file and active profile).                  |
| `--font-family <NAME>` | CLI font-family override for one launch.                                                       |
| `--font-size <PTS>`    | CLI font-size override in points for one launch (e.g. `12.5`).                                 |
| `--opacity <FLOAT>`    | CLI window-opacity override for one launch (e.g. `0.85`).                                      |
| `--safe`               | **Safe Mode**: Disables all third-party plugins, watchers, and user config; enforces defaults. |
| `--fail-loud`          | Aborts with non-zero exit code if primary shell or startup step fails (debug posture).         |
| `--test-mode`          | Run deterministic headless E2E servo loop connected to `BITTY_SOCKET` IPC until exit.          |
| `-v, --verbose`        | Shorthand for `--log-level debug`; emits per-frame render tick statistics.                     |
| `--log-level <LEVEL>`  | Set stderr logging level (`error`, `warn`, `info`, `debug`, `trace`).                          |
| `--no-color`           | Disable ANSI coloring (also honors `NO_COLOR`).                                                |
| `--socket <PATH>`      | Control target socket (with `ctl` / `list instances`).                                         |
| `--instance <ID>`      | Control target instance (with `ctl` / `list instances`).                                       |
| `--`                   | End of flags; remaining tokens are `PROGRAM` argv.                                             |
| `-h, --help`           | Display command-line argument summary and exit.                                                |
| `-V, --version`        | Display version, target architecture, and build metadata.                                      |

### Layout & Window Options

Launch directly into specific pane configurations:

| Flag                     | Description                                                                                    |
| :----------------------- | :--------------------------------------------------------------------------------------------- |
| `--split [AXIS[:RATIO]]` | Split startup pane (`horizontal`/`h`, `vertical`/`v`, default `h`, ratio default `0.5`).       |
| `--split-ratio <FLOAT>`  | Set split ratio between 0.10 and 0.90 (e.g. `0.3`).                                            |
| `--stack`                | Request stack layout mode.                                                                     |
| `--overlay`              | Request overlay presentation mode.                                                             |
| `--layout <SPEC>`        | Raw layout specification (e.g. `"single"`, `"split:h:0.5"`, `"stack"`, `"overlay:5,5,20,10"`). |
| `--focus <TARGET>`       | Initial focus target (`"next"`, `"prev"`, `"up"`, `"down"`, `"left"`, `"right"`, or id).       |

### Headless & Test Options

| Flag          | Description                                                                           |
| :------------ | :------------------------------------------------------------------------------------ |
| `--headless`  | Run a single headless tick smoke test without creating a window and exit.             |
| `--test-mode` | Run deterministic headless E2E servo loop connected to `BITTY_SOCKET` IPC until exit. |

These modes do not exercise the headed event loop or validate native clipboard behavior. Passing them does not establish GUI stability, native input behavior, or plugin UI usability.

---

## Subcommands

Bitty ships 16 subcommands (including `help`). Local verbs need no running instance. `bitty ctl` targets one live instance over a local IPC transport: the instance socket on Unix, or the instance-derived named pipe `\\.\pipe\bitty-<instance>` on Windows. Windows serves the same bounded protocol under a current-user ACL plus a client SID check. `bitty cmd` is a local invocation escape hatch and carries no target selection.

### Explicit Child Launch (`bitty run`)

```bash
# Run a program as a foreground child (local, inherits stdio)
bitty run -- COMMAND [ARGS...]
```

### Runtime Control (`bitty ctl`)

Control a running instance (needs one live instance; local IPC over a Unix socket or a Windows named pipe):

```bash
bitty ctl instance list
bitty ctl window list
bitty ctl view list | view split [--left|--right|--up|--down] | view focus v:N
bitty ctl panel list
bitty ctl terminal list | terminal spawn [--cwd PATH] | terminal close t:N
bitty ctl terminal send t:N TEXT | terminal text t:N
bitty ctl workspace list | workspace new | workspace close ws:N
bitty ctl workspace focus ws:N | workspace move ws:N
bitty ctl workspace rename ws:N NAME | workspace move-panel POSITION
bitty ctl config reload
bitty ctl consent grant --scope SCOPE [--terminal T --family F]
bitty ctl consent revoke --scope SCOPE
bitty ctl consent revoke-session
```

Output shapes: `--format table|json|jsonl`. Targeting precedence: `--socket`, `--instance`, `BITTY_SOCKET`/`BITTY_INSTANCE_ID`, exactly-one-live fallback.

> [!NOTE]
> `bitty ctl panel list` (registry `core.panel.list`, wire method `bitty.debug/listPanels`, scope `view.inspect`) reports each tiled panel's `p:N` id, `v:N` view id, bounds, role, and `focused` marker. Pinned and scratchpad leaves outside the live layout are not listed. `view list` still reports views (`v:N` plus a `focused` marker) and remains the view-level inventory.

`bitty ctl consent` manages session consent for the debug and terminal-automation lane (`debug.inspect`, `debug.trace`, `debug.control`, `terminal.inspect`, `terminal.input`). `consent grant --scope S` prompts on the local terminal and requires the exact `ALLOW <what>` phrase; any other answer, EOF, or a non-terminal stdin aborts without granting. The phrase is never accepted from a flag, environment variable, configuration file, or inherited descriptor. `--terminal T --family F` additionally binds an automation bearer to one terminal (`synthesize` uses `debug.control`, `capture` uses `debug.trace`, each with its terminal half); the bearer is returned once in the receipt. `consent revoke --scope S` and `consent revoke-session` return a receipt and deny queued and future requests of the session at the next dispatch boundary. These three verbs do not use `BITTY_CTL_ELEVATE`; only `terminal spawn`, `terminal close`, `workspace close`, and `config reload` need elevation.

### Configuration Management (`bitty config`)

Alias: `bitty cfg`

```bash
# Print the resolved configuration file path
bitty config path

# Validate main configuration syntax and schema without launching a GUI
bitty config check

# Print effective values with per-key layer attribution
bitty config show

# Validate only: no rows on success, exit 2 when invalid
bitty config validate

# Open current configuration (the selector, or a legacy file) in $VISUAL or $EDITOR
bitty config edit

# Manage named profiles
bitty config profile list
bitty config profile show work
bitty config profile use work
bitty config profile path work
```

`config profile list` reads directory metadata only and evaluates no Lua. `config profile show` loads and validates the single-parent `extends` chain. `use` validates the target chain and rewrites only the `profile = "..."` value in the existing selector, preserving comments and user overrides; it does not reload a running instance. `path` prints the resolved path without creating it. None of these commands installs, enables, or grants plugin state.

`config check` is the strict diagnostic path: it evaluates the user file, the selected profile chain, and the merged result, prints effective rows with their source, and exits `2` with the exact first field error when anything is invalid. `config show` evaluates the same layers and prints the same effective rows, with `--format json|jsonl` emitting the versioned envelope with per-key `layer` and `source` attribution. `config validate` is validation-only: table mode prints nothing on success, and an invalid configuration exits `2` with the validation error (`--format json|jsonl` emits the validation envelope). None of these verbs applies the startup salvage described next, and `bitty doctor` uses the same strict load.

Launching `bitty` is fail-soft for present external configuration. An invalid top-level table or scalar is ignored with one stderr diagnostic naming the file path, field path, error, and `ignored; using defaults and remaining layers`; every other valid table and layer stays in effect, and the file is never modified. Failures that cannot be narrowed to one element (Lua syntax or runtime errors, budget exhaustion, undeclared keys, unreadable files, profile `extends` problems) drop the whole external layer and startup continues on the remaining layers. Security-sensitive settings touched by salvage (plugins, history capture, mouse buttons, background-image roots and configured images) are denied for that launch so a lower layer cannot re-enable them. A missing explicit `--config` or `BITTY_CONFIG` path, a missing `--profile` or `BITTY_PROFILE` name, and CLI usage errors still exit `2`; a persisted selector that no longer resolves is ignored at startup with a diagnostic. See [Invalid Configuration at Startup](../configuration/overview.md#invalid-configuration-at-startup) for the full contract.

`config check`, `config show`, and `config validate` do not comprehensively validate per-plugin settings files; those are selected and loaded during plugin activation.

### Setup Wizard (`bitty init`)

An opt-in setup wizard that writes a profile-backed configuration:

```bash
# Interactive setup: profiles/default.lua + a thin init.lua selector
bitty init

# Non-interactive defaults
bitty init --yes

# First-class preset seeds (deterministic, no prompts, no activation)
bitty init --profile minimal   # smallest seed: theme only, shipped defaults elsewhere
bitty init --profile dark      # generated defaults with the dark theme family
bitty init --profile light     # generated defaults with the github-light theme

# Create/refresh only profiles/NAME.lua; do not activate it
bitty init --yes --profile NAME

# Explicitly migrate a legacy init.lua to profiles/default.lua + selector
bitty init --migrate

# Overwrite generated files (collision-free .bak backups)
bitty init --force
```

`profiles/default.lua` holds the generated defaults; `init.lua` is a thin selector (`format = "bitty-profile-v1"`, `profile = "default"`) where user overrides belong. `--profile NAME` never changes the selector and never runs plugin, component, or shell-init follow-ups. `BITTY_PROFILE` is a one-launch input and is not an output target. An existing target profile or selector is a conflict: the run exits with status 2 and writes nothing without `--force`; with `--force`, the previous bytes go to a collision-free `<file>.bak[.N]` sibling before the atomic replacement. A legacy `init.lua` without the versioned selector envelope is never replaced implicitly, including with `--force`; `--migrate` copies its complete bytes to `profiles/default.lua`, verifies the effective values are unchanged, and keeps a recoverable backup of the legacy file.

The interactive theme step previews the highlighted preset before anything is committed. When both stdin and stdout are terminals and color is enabled (`NO_COLOR` and `TERM=dumb` disable it), moving the cursor with `j`/`k` or the arrow keys installs the candidate in the wizard's in-memory preview session through the same palette pipeline a running Bitty uses, and repaints a themed chrome strip — theme background and foreground, the 16 ANSI colors, and the cursor, selection, and border swatches — so the palettes can be compared before committing. The preview never persists anything: it writes no configuration, profile, session, or plugin-state file, and it does not record an answered step. `Enter` commits the highlighted theme to the generated profile (the file write still happens once, at the end of the wizard); `Esc` or end-of-input cancels the wizard and restores the theme that was in effect before the preview. `--yes`, preset `--profile` seeds, a non-TTY stdin, and a piped stdout never preview and keep their existing non-interactive output.

The plugin step is read-only and offline by default. It reports three groups:

- **Bundled** — plugins compiled into the binary. These are the only selectable rows, and selecting one records it without fetching a payload.
- **Installed** — plugin ids already staged in the local store (`$XDG_DATA_HOME/bitty/plugins`, or `~/.local/share/bitty/plugins`). They are informational and already available locally.
- **Needs network** — the remaining official catalog entries. They are counted but not shown as rows and never fetched; install one explicitly with `bitty plugin install <id>` after reviewing its capabilities. `bitty plugin list` shows the full official catalog without installing anything.

A bundled plugin that is also installed appears once under **Bundled**. An empty group prints `none`. Discovery reads only the local store index: a malformed index prints one bounded warning and the step continues with **Bundled** only, while a missing data directory simply reports no installed plugins. The configuration write is never blocked by discovery. `--yes`, `--plugins`, `--no-plugins`, and `--profile NAME` bypass the plugin step entirely, keep their existing behavior, and never read the store. Selecting a bundled id still goes through the usual install and capability confirmation before anything is granted or enabled.

### Installation Diagnostics (`bitty doctor`)

Diagnose GPU support, fonts, dependencies, and environment health:

```bash
# Display formatted diagnostic table
bitty doctor

# Output diagnostic report as JSON
bitty doctor --format json
```

### Resolved Font Probe (`bitty +show-font`)

Print the font identity Bitty resolves from the merged configuration, without
creating a window, PTY, runtime, or plugin VM:

```bash
bitty +show-font
# font_family: JetBrainsMono Nerd Font
# font_size: 12
# font_fallback: Noto Sans Mono   (when configured)
```

`--config PATH`, `--profile NAME`, and `--safe` follow the normal configuration
resolution rules. Tools such as fastfetch can parse the stable `font_family:`
and `font_size:` prefixes. The probe reads the file/profile configuration; a
running window answers the live font query instead, so a live zoom or reload
can differ until the configuration is saved or Bitty is restarted.

### Resource Enumeration (`bitty list`)

Alias: `bitty ls`

```bash
# Built-in presets plus local theme files
bitty list themes

# Effective 16 ANSI and UI tokens with measured contrast
bitty list colors

# Discovered system font faces (family, style, source)
bitty list fonts

# Static bundled plugin catalog (manifest metadata only, no VM)
bitty list plugins

# Live instance discovery (runtime; no terminal content)
bitty list instances

# Chrome actions plus core commands, with effective bindings
bitty list actions

# Resolved chord-to-action table (config overrides plus defaults)
bitty list keymaps

# Registered extension interfaces (from validated manifests, no VM)
bitty list services
```

`list` accepts eight kinds: `themes`, `colors`, `fonts`, `plugins`, `instances`, `actions`, `keymaps`, and `services`. Singular spellings and `colours` are accepted; an unknown kind exits `2` naming the valid set. `--format table|json|jsonl` selects the output shape, and `--socket`/`--instance` apply only to `instances`.

`actions` and `keymaps` print the local catalogs: both read the user configuration best-effort and resolve it against the shipped defaults through the same resolver, so they report the effective local bindings without a running instance or a plugin VM. `plugins` is the compiled-in bundled catalog, not the installed-plugin view (`bitty plugin list`); `services` derives one row per registered extension interface from validated manifests and install records, also without loading a VM.

### State Inspection (`bitty inspect`)

Explain effective state and ownership without loading any plugin VM:

```bash
bitty inspect command core.terminal.text
bitty inspect key ctrl+shift+m
bitty inspect plugin bitty-terminal.shell-integration
bitty inspect config font.size
bitty inspect protocol kitty-graphics
```

### Developer Tools (`bitty dev`)

Headless tracing, captures, synthesis, dumps, and renderer overlays (local; some verbs need the `dev-tools` cargo feature):

```bash
bitty dev trace <startup|latency> [--iterations N]
bitty dev capture [--layout single|split|stack|overlay]
bitty dev synthesize
bitty dev dump <grid|scene|atlas> [--rows N] [--cols N]
bitty dev overlay <list|show <damage|cells|glyphs|images|layout|banner>>
```

### Plugin Management (`bitty plugin`)

Local plugin record management (no plugin VM is ever loaded):

```bash
# List recorded + installed plugins plus official catalog rows, sources, and grants
bitty plugin list

# Install a bundled id, official catalog id, local directory, Git source, or archive
bitty plugin install <id> [--yes]
bitty plugin install <path> [--yes] [--force]
bitty plugin install <git-url> [--yes] [--force]
bitty plugin install <archive> [--yes] [--force]

# Diagnose the package store and the bitty-plugins.lua ledger
bitty plugin doctor

# Quarantine broken trees and rebuild current.json from complete packages
bitty plugin doctor --repair

# Remove a record (bundled: drop entry; installed: delete tree; also an orphan dir)
bitty plugin remove <id> --force

# Re-enable / disable without dropping the record
bitty plugin enable <id>
bitty plugin disable <id>

# Revoke grants (all, or one capability) without dropping the record
bitty plugin revoke <id> [--cap <capability>]

# Show one plugin's manifest plus recorded grants
bitty plugin info <id>

# Inspect declared settings, candidate files, selected file, and effective values
bitty plugin config show <id>

# Write a commented canonical Lua settings template (refuses overwrite unless --force)
bitty plugin config scaffold <id>
```

> [!NOTE]
> Git sources accept `https://<host>/<path>.git`, `git+https://<host>/<path>.git`, or `git@<host>:<path>`. Other URL schemes, including `http://`, `file://`, and `ssh://`, are rejected. Archives must be local `.tar.gz`, `.tgz`, `.tar.zst`, or `.zip` files; remote archive URLs are not supported.

Git installs use the system `git`; archive installs use `tar` (`unzstd` for `.tar.zst`) or `unzip` for `.zip`. Required helpers must be on `PATH`; missing helpers or failed fetch/extraction abort installation. Git checkouts and extracted archives enter the same manifest, compatibility, hash, and capability-consent checks as local directory packages. No plugin code runs during installation.

`install <id>` resolves two local catalogs. The bundled set is compiled into `bitty` (currently `bitty-terminal.shell-integration`). The official set is generated from the `bitty-plugins` registry at build time and embedded in the binary: each entry carries an exact repository, commit pin, and raw `bitty-plugin.toml` SHA-256. An id install checks the declared compatibility before any fetch, fetches exactly the pinned commit, re-verifies `HEAD` and the manifest hash, and records `registry` provenance. No registry metadata is requested at runtime. `bitty plugin list` shows not-installed official entries as `available` or `incompatible`; an incompatible entry is refused with its exact declared range before any fetch. `bitty plugin info <id>` prints a catalog row without installing it.

`--force` skips the repair prompt when the same manifest version already exists with different content (a rebuilt local checkout), and installs over an orphaned or incomplete tree. Capability consent stays separate; `--yes` approves both. An identical tree is adopted without a prompt.

`bitty plugin doctor` reports store and ledger findings without changing anything; `--repair` quarantines broken or extra package trees under `<store>/quarantine/`, removes stale staging, and rebuilds `current.json` with the index write last. Rebuilt records keep grants only when the manifest hash still matches; otherwise they start disabled with no grants and need `bitty plugin install <source> --force`. Exit codes: `0` success (or a healthy store for `doctor`), `1` aborted/io or doctor findings, `2` usage, `4` plugin error.

The managed ledger is data-only Lua at `<config-root>/bitty-plugins.lua`. A pre-Lua `bitty-plugins.toml` is migrated once by the next plugin command that loads ledger state, with the old bytes kept at `bitty-plugins.toml.bak`. `bitty plugin doctor` without `--repair` only inspects and writes nothing; `bitty plugin doctor --repair` performs the migration. A hand-edited ledger cannot grant a capability the installed manifest does not declare for the recorded hash. See [Per-Plugin Config Files](../plugins/plugin-settings.md#managed-plugin-ledger).

Capability installs prompt `Grant these capabilities? [y/N]`; `--yes` approves non-interactively. Grants bind to the exact manifest hash, so added capabilities always need fresh consent.

Successful `install` and `enable` runs print next steps: the plugin's store location, the canonical Lua settings path (`<config-root>/plugins/<owner>.<name>.lua`), and the `config show`/`config scaffold` commands. When the plugin declares settings, the same run creates that canonical file once with its defaults commented out; existing files, user edits, and a legacy `<owner>.<name>.toml` are never overwritten. The hint never advertises the legacy TOML fallback.

### Native Extension Management (`bitty extension`)

Manage out-of-process upstream extension binaries (user `$XDG_DATA_HOME/bitty/extensions/` wins over system paths; SHA-256 digest verified). `component` is a hidden deprecated alias for `extension` (same handlers, kept at least through 0.1.0) and never appears in help.

```bash
# List installed extensions and binary digests
bitty extension list

# Stage an extension from a local path only (no download)
bitty extension add /usr/local/bin/bitty-net

# Fetch one hash-verified R2 prebuilt release (explicit consent, TOFU-pinned)
# Omit --version to take the latest catalog release for this host
bitty extension install graphics
# Pin exactly (recommended for scripts)
bitty extension install graphics --version 0.0.24
bitty extension install net --version 0.0.1

# Repo-style names are accepted as aliases (bitty-graphics -> graphics)
bitty extension install bitty-graphics --version 0.0.24

# Remove a user-tier extension (never touches the system tier)
bitty extension remove net

# Print the exact pinned executable bytes (provenance on stderr)
bitty extension show-source net
```

### Direct Invocation (`bitty cmd`)

```bash
# Invoke any registry executable by qualified id (automation escape hatch)
bitty cmd core.terminal.text --format json -- '{"terminal_id": "t:4"}'
```

### Plugin Namespace (`bitty x`)

```bash
# Address an installed plugin command without alias regeneration
bitty x <publisher>.<name> <command> [args]
bitty x <id> --help
```

### Shell Completions (`bitty completion`)

Alias: `bitty comp`. Supported shells: `bash`, `zsh`, `fish`, `powershell`, `nushell` (`nu`).

```bash
# Generate shell completion script
bitty completion bash > ~/.bash_completion.d/bitty
bitty completion zsh > ~/.zfunc/_bitty
bitty completion fish > ~/.config/fish/completions/bitty.fish
```

The script completes the parser-owned CLI grammar: first-level commands, nested verbs, aliases, and flags. In Bash, Zsh, Fish, and PowerShell it also completes local values:

| Context                           | Candidates                                  |
| :-------------------------------- | :------------------------------------------ |
| `bitty --profile <TAB>`           | Profile names in `profiles/`                |
| `bitty --profile=<TAB>`           | Same names, keeping the `--profile=` prefix |
| `bitty plugin enable <TAB>`       | Installed plugin ids                        |
| `bitty plugin disable <TAB>`      | Installed plugin ids                        |
| `bitty config profile show <TAB>` | Profile names                               |
| `bitty config profile use <TAB>`  | Profile names                               |
| `bitty config profile path <TAB>` | Profile names                               |

Candidates are read at Tab time from local state only: profile file names under `$XDG_CONFIG_HOME/bitty/profiles/`, and installed plugin ids from the managed plugin ledger plus the installed plugin store. Completion never starts a terminal runtime or plugin VM, never runs plugin code, and performs no network I/O. Missing or malformed local state produces no candidates and does not break the shell. Candidate lists are sorted and bounded to 256 entries.

Nushell is a documented exception: its extern signatures are static, so the Nushell script completes the grammar but not dynamic profile or plugin values. Run the hidden `bitty +list-profiles` or `bitty +list-plugins --installed` helpers manually to see the same local data; these helpers are internal completion plumbing, not supported user commands.

### Shell Integration (`bitty shell-init`)

`bitty shell-init <shell>` prints a static shell-integration script to stdout (local: no instance, no config load, no plugin VM). The script installs prompt hooks and inlines Tab completion for the full CLI grammar — first-level commands, nested verbs, and flags. Supported shells are the same as `completion`: `bash`, `zsh`, `fish`, `powershell`, and `nushell` (`pwsh` and `nu` are accepted aliases; names are case-insensitive).

Enable it from the shell startup file:

| Shell      | Startup file  | Line                                                                                                                                                                                                          |
| :--------- | :------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| bash       | `~/.bashrc`   | `eval "$(bitty shell-init bash)"`                                                                                                                                                                             |
| zsh        | `~/.zshrc`    | `eval "$(bitty shell-init zsh)"`                                                                                                                                                                              |
| fish       | `config.fish` | `bitty shell-init fish \| source`                                                                                                                                                                             |
| PowerShell | `$PROFILE`    | `bitty shell-init powershell \| Out-String \| Invoke-Expression`                                                                                                                                              |
| Nushell    | `config.nu`   | `bitty shell-init nushell \| save -f ~/.config/nushell/bitty-shell-init.nu`, then add `source ~/.config/nushell/bitty-shell-init.nu` to `config.nu` (the `save -f` runs once; `source` loads it per session). |

For zsh, source the line after `compinit` so `compdef` can register Tab completion. The Nushell script must be saved before it is sourced: Nushell resolves `source` paths at parse time, so a just-written file cannot be sourced on first setup.

What the script does:

- **Inline completion.** Tab completion is part of the same script, generated from the parser-owned CLI grammar (nested subcommands included). Sourcing never invokes `bitty`, so an absent or older binary still sources cleanly; a separate `bitty completion` file is not required. In Bash, Zsh, Fish, and PowerShell, pressing Tab for `--profile`, `plugin enable|disable`, or `config profile show|use|path` asks the bounded local candidate helpers described under [Shell Completions](#shell-completions-bitty-completion); Nushell keeps static values.
- **Registers once.** Hooks and completion register once per session; re-sourcing the startup file is a no-op.
- **Prompt marks on every prompt path.** Prompt hooks emit OSC 133 `A` (prompt start), `B` (command start), and `D;status` (command done plus exit status), plus OSC 7 with a percent-encoded cwd. Bitty uses these for semantic prompt zones and cwd tracking; terminals without support ignore them. PowerShell marks command start through PSReadLine, and Nushell through `pre_execution` when the session supports it.
- **Strict-mode safe.** The generated code is safe under `set -euo pipefail` (bash), `setopt no_unset` (zsh), and `Set-StrictMode -Version Latest` (PowerShell), and stays silent in non-interactive fish.
- **No plugin required.** The integration is independent of the bundled `shell-integration` plugin; it needs no plugin install, enable, or grant.

```bash
# Print the script for inspection or save it manually
bitty shell-init bash
bitty shell-init nushell | less
```

`--help` lists the five install lines. `--format` and `--no-color` are accepted and ignored because the output is a static script. Missing or unknown shells, extra arguments, and `--socket`/`--instance` exit with code 2 without printing a script.

### Help (`bitty help`)

Print help without spawning a program (local, no instance). Same 16 canonical names as `--help`; `cfg`/`ls`/`comp` aliases resolve to their canonical command, and `component` is a hidden deprecated alias for `extension`.

```bash
# Compact overview (identical to `bitty --help`)
bitty help

# Per-command detail (identical to `bitty <command> --help`)
bitty help plugin
bitty help ctl
```

### Version (`bitty version`)

```bash
bitty version
bitty version --format json
```
