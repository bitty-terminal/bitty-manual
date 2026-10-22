# Getting Started with Plugins

Bitty provides a secure, event-driven Lua extension runtime built upon a stackless, fuel-metered Lua interpreter (Phodopus). All plugins operate in isolated sandboxes with zero-VM lazy loading, strict memory ceilings, and fine-grained capability gates.

## Plugin Structure

A Bitty plugin lives in an isolated directory and contains a manifest file alongside pure Lua source files:

```text
my-plugin/
├── bitty-plugin.toml   # Canonical manifest: metadata, capabilities, lazy triggers
└── lua/
    ├── init.lua        # Entry point executed upon activation
    └── helper.lua      # Private modules loaded via rooted require("helper")
```

## The Plugin Manifest (`bitty-plugin.toml`)

Every plugin must define a `bitty-plugin.toml` manifest at its root:

```toml
[plugin]
id = "custom.my-plugin"
name = "My Custom Plugin"
version = "0.1.0"
description = "A productivity tool for Bitty terminal"

[compat]
bitty = ">=0.1.0,<1.0.0"
plugin-api = "^1.0"

[capabilities]
platform.notify = true
ui = ["ui.rich"]

[lazy]
commands = ["my-plugin:open"]
events = ["terminal.opened"]
```

### Manifest Tables Explained

- **`[plugin]`**: Unique reverse-DNS identifier (`id`), human-readable name, semver version, and description.
- **`[compat]`**: Compatibility boundaries for the Bitty host binary and the Plugin API contract.
- **`[capabilities]`**: Explicit permissions requested by the plugin. Untrusted plugins receive zero ambient authority; undeclared operations fail closed.
- **`[lazy]`**: Triggers that instruct Bitty when to create the plugin's Lua VM:
  - `commands`: Commands registered directly into the Command Palette without loading Lua code.
  - `events`: System lifecycle events that awaken the plugin.
  - `claims`: Exclusive claims to reserved slots (e.g. `claims = ["tabline"]`).

## The Lazy Loading Lifecycle

Bitty enforces a three-state lifecycle to prevent resource bloat:

$$\text{Installed} \longrightarrow \text{Loaded} \longrightarrow \text{Active}$$

1. **Installed**: The plugin manifest is parsed and validated into the host registry. Zero Lua VMs exist, consuming 0 bytes of memory.
2. **Loaded**: A lazy trigger fires (e.g. user invokes a command or an event triggers). The host instantiates a dedicated Phodopus VM and runs `lua/init.lua`.
3. **Active**: The plugin is responding to events or rendering mounted UI blocks. When idle, plugins transition to suspended states to preserve CPU and battery.

## Developing & Testing Locally

Install your local plugin during development using the CLI:

```bash
# Install a local directory as a plugin package
bitty plugin install ./my-plugin

# List recorded plugins and their capability grants
bitty plugin list
```

`install` accepts four source shapes: a bundled plugin **id** (e.g. `bitty plugin install bitty-terminal.shell-integration`), a **local path/directory**, a **git URL** (`https://<host>/<path>.git`, `git+https://…`, or `git@<host>:<path>`), or a local **archive** (`.tar.gz`/`.tgz`/`.tar.zst`/`.zip`). Add `--yes` for non-interactive capability consent.

## The Plugin Store: Updates and Recovery

External packages are staged under the data directory:

```text
$XDG_DATA_HOME/bitty/plugins/
├── packages/<owner>.<name>/<version>/bitty-plugin.toml
├── packages/<owner>.<name>/<version>/lua/
└── current.json                 # active package index (commit point)
```

Installing is a transaction. Bitty verifies the manifest, entry point, module-tree bounds, compatibility ranges, and capability consent first, copies the package into a quarantine directory, then commits the version tree and writes `current.json` last. If the index write fails, the version tree is rolled back (or restored) so a failed command changes neither side. Identical bytes already on disk are adopted without a prompt, which also recovers the narrow crash window between the tree rename and the index write.

### Reinstalling the same version

A source checkout rebuilt without a version bump (the usual local-development case) is not silently refused. `install` detects that the target version exists with different content and asks `Replace it? [y/N]`; approving replaces the whole version directory and rewrites the index with the new manifest hash and content digest. In scripts, `--force` performs the replacement without the repair prompt, and `--yes` approves both the replacement and capability consent. A declined prompt exits `1` with nothing changed.

### Diagnosing and repairing the store

```bash
# Read-only: report every problem and the command that fixes it
bitty plugin doctor

# Quarantine broken/extra trees and rebuild the index from complete packages
bitty plugin doctor --repair
```

`doctor` exits `0` when the store and ledger are healthy and `1` when it reports findings. It checks:

| Finding              | Meaning                                                                                              | Repair                                                                                                                                         |
| -------------------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `orphan-package`     | A version directory has no `current.json` record (interrupted install, or a tree copied in by hand). | `--repair` re-indexes a complete tree or quarantines a partial one.                                                                            |
| `incomplete-package` | The directory has no readable manifest, no Lua entry point, or an invalid module tree.               | `--repair` moves it to `<store>/quarantine/`.                                                                                                  |
| `dangling-record`    | `current.json` points at a missing, partial, or hash-mismatched package.                             | `--repair` drops or rebuilds the record.                                                                                                       |
| `stale-version`      | A newer complete version exists than the indexed version.                                            | `--repair` selects the newest complete tree.                                                                                                   |
| `corrupt-index`      | `current.json` is truncated or malformed.                                                            | `--repair` moves it to `quarantine/` and rebuilds it; `list`/`install` fail closed with this command instead of pretending the store is empty. |
| `stale-staging`      | A `.tmp-*` directory from an interrupted install or uninstall.                                       | `--repair` removes it after an age check.                                                                                                      |
| malformed ledger     | `bitty-plugins.toml` is not a valid managed manifest.                                                | `--repair` quarantines the file (`.corrupt-<nonce>`) and writes an empty valid ledger.                                                         |

`--repair` moves broken or duplicate trees into `<store>/quarantine/` rather than deleting them, so nothing is lost before you inspect it. A rebuilt record never invents authority: when the manifest hash still matches, the recorded grants and enabled state are kept; otherwise the record starts disabled with an empty grant set and must be re-approved with `bitty plugin install <source> --force`. The index is written last and atomically; if repair cannot create the quarantine directory (for example a read-only store), it reports the failing path and ownership/permission action instead of half-deleting a package.

To discard one tree manually, `bitty plugin remove <owner>.<name> --force` also removes an unindexed orphan directory. `bitty plugin list` shows such entries with state `orphaned` or `broken` and prints the matching repair command instead of hiding them.

## Next Steps

- [Capabilities & Sandboxing](capabilities-and-sandbox.md) — Learn about security boundaries, resource quotas, and capability families.
- [Native Component Boundary](../extensions/upstream-components.md) — Understand how upstream prebuilt extensions share native infrastructure across plugins.
- [Lua API Reference](../api/overview.md) — Explore the sandboxed `bitty.*` API surface.
