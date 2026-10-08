# CLI Commands & Controls

Bitty provides a unified command-line toolchain for launching the terminal, inspecting state, managing plugins, and driving external automations.

## Terminal Invocation (`bitty`)

The primary binary launches the GUI window and spawns shell sessions:

```bash
bitty [OPTIONS] [COMMAND [ARGS...]]
```

### Options

| Flag                     | Description                                                                                       |
| :----------------------- | :------------------------------------------------------------------------------------------------ |
| `--config <PATH>`        | Load configuration from a custom file path instead of default `$XDG_CONFIG_HOME`.                 |
| `--safe`                 | **Safe Mode**: Disables all third-party plugins and file watchers; starts with built-in defaults. |
| `-e, --execute <CMD...>` | Execute the specified command instead of the default user shell.                                  |
| `--hold`                 | Keep the terminal window open after the child process exits.                                      |
| `--title <TITLE>`        | Override the initial window title string.                                                         |
| `-v, --version`          | Display version, commit SHA, and target architecture.                                             |
| `-h, --help`             | Display command-line argument summary.                                                            |

## Control Client (`bitty ctl`)

The `bitty ctl` subcommand communicates with a running Bitty instance or performs offline validation:

```bash
# Validate configuration without starting the GUI
bitty ctl config check

# Validate a specific configuration file
bitty ctl config check --path ~/.config/bitty/test.lua

# Trigger atomic single-frame theme reload
bitty ctl theme reload
```

## Documentation Viewer (`bitty doc`)

Bitty embeds a terminal-native viewer for this manual, enabling offline reading directly within your workflow:

```bash
# Open interactive TUI documentation browser
bitty doc

# Directly read a specific topic
bitty doc configuration
bitty doc api/ui
```

## Plugin Management (`bitty plugin`)

Bitty manages plugins without requiring external package managers:

```bash
# List installed plugins, activation status, and granted capabilities
bitty plugin list

# Run diagnostic inspection on memory, fuel, queues, and tool dependencies
bitty plugin doctor

# Install a plugin from a local directory or package archive
bitty plugin add ./my-plugin

# Remove an installed plugin
bitty plugin remove custom.my-plugin
```

## Native Component Management (`bitty component`)

In accordance with DIR-030 (Native Component Boundary), heavy native coprocesses (such as `bitty-net`) are managed via `bitty component`:

```bash
# List installed native coprocess components and their binary digests
bitty component list

# Register a verified native component binary
bitty component add /usr/local/bin/bitty-net

# Remove a registered component
bitty component remove net
```
