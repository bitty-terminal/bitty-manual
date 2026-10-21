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

Bitty ships 16 subcommands (including `help`). Local verbs need no running instance; runtime verbs (`ctl`, `cmd`) target one live instance over IPC (Unix only).

### Explicit Child Launch (`bitty run`)

```bash
# Run a program as a foreground child (local, inherits stdio)
bitty run -- COMMAND [ARGS...]
```

### Runtime Control (`bitty ctl`)

Control a running instance (needs one live instance; Unix IPC only):

```bash
bitty ctl instance list
bitty ctl window list
bitty ctl "view list" | view split [--left|--right|--up|--down] | view focus v:N
bitty ctl terminal list | terminal spawn [--cwd PATH] | terminal close t:N
bitty ctl terminal send t:N TEXT | terminal text t:N
bitty ctl workspace list | workspace new | workspace close ws:N
bitty ctl workspace focus ws:N | workspace move ws:N
bitty ctl workspace rename ws:N NAME | workspace move-panel POSITION
bitty ctl config reload
```

Output shapes: `--format table|json|jsonl`. Targeting precedence: `--socket`, `--instance`, `BITTY_SOCKET`/`BITTY_INSTANCE_ID`, exactly-one-live fallback.

> [!NOTE]
> There is no panel resource in `ctl`: the current panel id is not queryable yet. `view list` reports views (`v:N` plus a `focused` marker). See [bitty#1900](https://github.com/bitty-terminal/bitty/issues/1900).

### Configuration Management (`bitty config`)

Alias: `bitty cfg`

```bash
# Print the resolved configuration file path
bitty config path

# Validate main configuration syntax and schema without launching a GUI
bitty config check

# Open current configuration (the selector, or a legacy file) in $VISUAL or $EDITOR
bitty config edit

# Manage named profiles
bitty config profile list
bitty config profile show work
bitty config profile use work
bitty config profile path work
```

`config profile list` reads directory metadata only and evaluates no Lua. `show` loads and validates the single-parent `extends` chain. `use` validates the target chain and rewrites only the `profile = "..."` value in the existing selector, preserving comments and user overrides; it does not reload a running instance. `path` prints the resolved path without creating it. None of these commands installs, enables, or grants plugin state.

`config check` does not comprehensively validate per-plugin settings files; those are selected and loaded during plugin activation.

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

### Installation Diagnostics (`bitty doctor`)

Diagnose GPU support, fonts, dependencies, and environment health:

```bash
# Display formatted diagnostic table
bitty doctor

# Output diagnostic report as JSON
bitty doctor --format json
```

### Resource Enumeration (`bitty list`)

Alias: `bitty ls`

```bash
# List available built-in and user themes
bitty list themes

# List installed plugins and activation states
bitty list plugins

# List running Bitty instances
bitty list instances
```

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
# List recorded + installed plugins, sources, and capability grants
bitty plugin list

# Install a bundled id, local directory, Git source, or local archive
bitty plugin install <id> [--yes]
bitty plugin install <path> [--yes]
bitty plugin install <git-url> [--yes]
bitty plugin install <archive> [--yes]

# Remove a record (bundled: drop entry; installed: delete tree)
bitty plugin remove <id> --force

# Re-enable / disable without dropping the record
bitty plugin enable <id>
bitty plugin disable <id>

# Revoke grants (all, or one capability) without dropping the record
bitty plugin revoke <id> [--cap <capability>]

# Show one plugin's manifest plus recorded grants
bitty plugin info <id>
```

> [!NOTE]
> Git sources accept `https://<host>/<path>.git`, `git+https://<host>/<path>.git`, or `git@<host>:<path>`. Other URL schemes, including `http://`, `file://`, and `ssh://`, are rejected. Archives must be local `.tar.gz`, `.tgz`, `.tar.zst`, or `.zip` files; remote archive URLs are not supported.

Git installs use the system `git`; archive installs use `tar` (`unzstd` for `.tar.zst`) or `unzip` for `.zip`. Required helpers must be on `PATH`; missing helpers or failed fetch/extraction abort installation. Git checkouts and extracted archives enter the same manifest, compatibility, hash, and capability-consent checks as local directory packages. No plugin code runs during installation.

Capability installs prompt `Grant these capabilities? [y/N]`; `--yes` approves non-interactively. Grants bind to the exact manifest hash, so added capabilities always need fresh consent.

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

- **Inline completion.** Tab completion is part of the same script, generated from the parser-owned CLI grammar (nested subcommands included). Sourcing never invokes `bitty`, so an absent or older binary still sources cleanly; a separate `bitty completion` file is not required.
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
