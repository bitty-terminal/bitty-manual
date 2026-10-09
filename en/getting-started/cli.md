# CLI Commands & Controls

Bitty provides a unified, pure-parsing command-line toolchain for launching the terminal, inspecting runtime state, managing profiles, configuring plugins, and driving external automations.

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
| `-v, --verbose`        | Shorthand for `--log-level debug`; emits per-frame render tick statistics.                     |
| `--log-level <LEVEL>`  | Set stderr logging level (`error`, `warn`, `info`, `debug`, `trace`).                          |
| `--mascot`             | Print the Bittie mascot ASCII art to stdout and exit.                                          |
| `--no-splash`          | Suppress the first-run mascot greeting.                                                        |
| `-h, --help`           | Display command-line argument summary and exit.                                                |
| `--version`            | Display version, target architecture, and build metadata.                                      |

### Layout & Window Options

Launch directly into specific pane configurations:

| Flag                    | Description                                                                                    |
| :---------------------- | :--------------------------------------------------------------------------------------------- |
| `--split <h\|v>`        | Split startup pane along horizontal or vertical axis.                                          |
| `--split-ratio <FLOAT>` | Set split ratio between 0.1 and 0.9 (e.g. `0.5`).                                              |
| `--stack`               | Request stack layout mode.                                                                     |
| `--overlay`             | Request overlay presentation mode.                                                             |
| `--layout <SPEC>`       | Raw layout specification (e.g. `"single"`, `"split:h:0.5"`, `"stack"`, `"overlay:5,5,20,10"`). |
| `--focus <TARGET>`      | Initial focus target (`"next"`, `"prev"`, `"up"`, `"down"`, `"left"`, `"right"`, or index).    |

### Headless & Test Options

| Flag          | Description                                                                           |
| :------------ | :------------------------------------------------------------------------------------ |
| `--headless`  | Run a single headless tick smoke test without creating a window and exit.             |
| `--test-mode` | Run deterministic headless E2E servo loop connected to `BITTY_SOCKET` IPC until exit. |

---

## Subcommands

Bitty includes first-class subcommands for configuration, diagnostics, and component management:

### Configuration Management (`bitty config`)

Alias: `bitty cfg`

```bash
# Print the resolved configuration file path
bitty config path

# Validate configuration syntax and schema without launching a GUI
bitty config check

# Open current configuration in $VISUAL or $EDITOR
bitty config edit
```

### Setup Wizard (`bitty init`)

An opt-in interactive configuration wizard:

```bash
# Run interactive setup wizard
bitty init

# Write sane default configuration without interactive prompts
bitty init --yes

# Overwrite existing configuration (creates .bak backup)
bitty init --force
```

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

### Plugin Management (`bitty plugin`)

```bash
# List installed plugins, manifest status, and capabilities
bitty plugin list

# Run diagnostic inspection on memory, instruction fuel, and queues
bitty plugin doctor

# Add a plugin from a local directory
bitty plugin add ./my-plugin

# Remove an installed plugin
bitty plugin remove custom.my-plugin
```

### Native Component Management (`bitty component`)

Manage out-of-process DIR-030 upstream coprocesses (e.g. `bitty-net`):

```bash
# List installed native coprocess components and binary digests
bitty component list

# Register a verified native component binary
bitty component add /usr/local/bin/bitty-net

# Remove a registered component
bitty component remove net
```

### Shell Completions (`bitty completion`)

Alias: `bitty comp`

```bash
# Generate shell completion script (bash, zsh, fish)
bitty completion bash > ~/.bash_completion.d/bitty
bitty completion zsh > ~/.zfunc/_bitty
bitty completion fish > ~/.config/fish/completions/bitty.fish
```
