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
bitty = ">=0.0.26"
plugin-api = "^1.0"

[capabilities]
platform.notify = true
ui = ["ui.rich"]

[lazy]
commands = ["my-plugin:open"]
events = ["terminal.opened"]

[limits]
fuel_instructions = 4000000
wall_ms = 25
memory_bytes = 8388608
warning_ms = 4
```

### Manifest Tables Explained

- **`[plugin]`**: Unique reverse-DNS identifier (`id`), human-readable name, semver version, and description.
- **`[compat]`**: The minimum Bitty host version and the Plugin API contract the plugin needs.
- **`[capabilities]`**: Explicit permissions requested by the plugin. Untrusted plugins receive zero ambient authority; undeclared operations fail closed.
- **`[lazy]`**: Triggers that instruct Bitty when to create the plugin's Lua VM:
  - `commands`: Commands registered directly into the Command Palette without loading Lua code.
  - `events`: System lifecycle events that awaken the plugin.
  - `claims`: Exclusive claims to reserved slots (for example, the `tabline` slot uses `claims = ["workspaceline"]`).
- **`[limits]`** (optional): Tighten-only execution budgets. Every key is
  optional; an absent key keeps the host ceiling. A present value must be
  `1..=ceiling` — zero, a negative or non-integer value, or anything above the
  host ceiling fails manifest validation. The keys are:

  | Key                 | Host ceiling | Meaning                                         |
  | :------------------ | :----------- | :---------------------------------------------- |
  | `fuel_instructions` | 10,000,000   | VM instructions per VM                          |
  | `wall_ms`           | 50           | Charged wall time per callback, in milliseconds |
  | `memory_bytes`      | 33,554,432   | Accounted VM heap per VM, in bytes              |
  | `warning_ms`        | 8            | Advisory warning threshold; never suspends      |

  Declarations can only tighten: they never raise the host ceiling, and the
  user's local budget file can tighten them further (never widen them).
  `warning_ms` must be below `wall_ms` when both are present; a tighter wall
  automatically caps the advisory threshold at `wall_ms - 1`. Under `--safe`
  the manifest declaration is ignored and host defaults apply. See
  [Plugin Configuration](../configuration/plugin-config.md#execution-budget-tightening).

### Declare a compatibility floor, not a ceiling

Write `compat.bitty` as a minimum-only requirement, for example `bitty = ">=0.0.26"`. The host evaluates exactly what the manifest declares, so an upper bound is a self-imposed expiry date: a plugin that declares `>=0.0.24,<0.1` is refused on a 0.1 host even when it still runs, and the official catalog refuses that install before fetching anything. `compat.plugin-api` is the real breaking boundary: it changes only when the Lua surface breaks, so `^1.0` admits every 1.x plugin API and a future 2.0 is the cutoff. Move the host floor when you start using a newer host API; do not enumerate host versions you have not tested.

## The Lazy Loading Lifecycle

Bitty enforces a three-state lifecycle to prevent resource bloat:

$$\text{Installed} \longrightarrow \text{Loaded} \longrightarrow \text{Active}$$

1. **Installed**: The plugin manifest is parsed and validated into the host registry. Zero Lua VMs exist, consuming 0 bytes of memory.
2. **Loaded**: A lazy trigger fires (e.g. user invokes a command or an event triggers). The host instantiates a dedicated Phodopus VM and runs `lua/init.lua`.
3. **Active**: The plugin is responding to events or rendering mounted UI blocks. When idle, plugins transition to suspended states to preserve CPU and battery.

## Install a plugin

`bitty plugin install` accepts four source shapes: an **id** (a bundled id or an official catalog id), a **local path/directory**, a **git URL** (`https://<host>/<path>.git`, `git+https://…`, or `git@<host>:<path>`), or a local **archive** (`.tar.gz`/`.tgz`/`.tar.zst`/`.zip`). Add `--yes` to approve capability consent non-interactively.

```bash
# Official catalog id
bitty plugin install bitty-terminal.bar

# Local directory during development
bitty plugin install ./my-plugin

# Git source
bitty plugin install https://github.com/example/my-plugin.git

# Local archive
bitty plugin install ./my-plugin.tar.gz
```

A fresh local, Git, archive, or registry install is staged **disabled**: review grants with `bitty plugin info <id>`, then `bitty plugin enable <id>`. Updates preserve the existing enabled/disabled state.

### Official catalog ids

Core embeds a catalog generated at build time from the [`bitty-plugins` registry](https://github.com/bitty-terminal/bitty-plugins). Each entry carries its repository, an exact 40-hex commit pin, the registry's raw `bitty-plugin.toml` SHA-256, declared compatibility, description, and license. Installing an id:

1. resolves the exact official id before treating the operand as a local path,
2. evaluates compatibility against the running host **before any fetch** and refuses an incompatible entry with its exact declared range,
3. fetches exactly the pinned commit into an exclusive staging directory,
4. re-reads `HEAD` and the raw manifest hash, failing closed on either mismatch,
5. runs the normal manifest, entry-point, module-tree, consent, and store pipeline with `registry` provenance.

No registry metadata is fetched at runtime; Core only invokes the system `git` transport. `bitty plugin list` shows catalog entries that are not installed as `available`, or as `incompatible` when `compat.bitty` excludes this host. `bitty plugin info <id>` prints one catalog row without installing it. An unknown id fails with the bundled and official installable id lists and exit code `4`.

The 0.0.26 catalog has 11 entries:

| Official id                   | Manifest version | Declared `compat.bitty` |
| :---------------------------- | :--------------- | :---------------------- |
| `bitty-featured.activity`     | 0.0.1            | `>=0.0.24,<0.1`         |
| `bitty-featured.devtools`     | 0.1.0            | `>=0.0.21,<1.0`         |
| `bitty-terminal.bar`          | 0.0.1            | `>=0.0.24,<0.1`         |
| `bitty-terminal.composer`     | 0.0.1            | `>=0.0.21,<0.1`         |
| `bitty-terminal.copy-mode`    | 0.0.1            | `>=0.0.24,<0.1`         |
| `bitty-terminal.dashboard`    | 0.0.1            | `>=0.0.26,<0.1`         |
| `bitty-terminal.file-manager` | 0.1.0            | `>=0.0.24,<0.1`         |
| `bitty-terminal.git-panel`    | 0.1.0            | `>=0.0.24,<0.1`         |
| `bitty-terminal.history`      | 0.0.1            | `>=0.0.24,<0.1`         |
| `bitty-terminal.palette`      | 0.0.1            | `>=0.0.24,<0.1`         |
| `bitty-terminal.search`       | 0.0.1            | `>=0.0.24,<0.1`         |

The standalone `bitty-terminal.statusline` identity is archived and was removed from the official set; its page is kept as [historical reference](catalog/statusline.md). Bar owns the visible status presentation.

### The dashboard panel

`bitty-terminal.dashboard` is the read-only configuration and status panel in the official set. Every row comes from `bitty.runtime.inspect()` (see [Core System APIs](../api/system.md#runtime-inspection-bittyruntime)); the plugin reads no configuration file, ledger, store, or extension root directly.

```bash
bitty plugin install bitty-terminal.dashboard
bitty plugin enable bitty-terminal.dashboard
```

Open it from the command palette (`bitty-terminal.dashboard:toggle_dashboard`) or bind the qualified command as described below. `bitty cmd` is not a plugin-command dispatcher.

- **Sections**: Overview (app version, active profile and source, theme and source, font, decoration, counts), Plugins, Extensions, Settings, Profiles, and Diagnostics. A section either renders bounded rows or an explicit `unavailable: <reason>` marker — a failed source is never shown as "none installed".
- **Keys while open**: `j`/`k` or arrows move rows, `h`/`l` or `Tab`/`Shift+Tab` change section, `1`…`6` jump to a section, `g`/`G` and `PageUp`/`PageDown` move within a section, the wheel scrolls, `r` re-reads the snapshot, and `q`/`Esc` closes.
- **Read-only by design**: settings writes, plugin toggles, and profile switches are deferred until the typed `config.manage` API lands (bitty#2393). Only `runtime.inspect` and `ui.overlay.focus` are requested.
- **Limits**: only one plugin may own the transient overlay capture at a time; Core bounds its event queue and revokes an expired capture. The dashboard uses keyboard capture for its controls; mounted presentation and transient capture remain separate operations.
- **No keybinding is installed.** Bind `command:bitty-terminal.dashboard:toggle_dashboard` yourself, for example `alt+g` in `init.lua`.

The plugin requires Bitty `>=0.0.26`, so an older host rejects the manifest instead of opening an empty panel.

## The plugin store: updates and recovery

External packages live under the data directory, with `current.json` as the commit point:

```text
$XDG_DATA_HOME/bitty/plugins/
├── packages/<owner>.<name>/<version>/
│   ├── bitty-plugin.toml
│   └── lua/
├── current.json          # active package index
└── quarantine/           # moved aside by `bitty plugin doctor --repair`
```

An install is a transaction. Bitty verifies the manifest, entry point, module-tree bounds, compatibility, and capabilities, stages the package under `packages/<id>/.tmp-*`, then moves any differing target aside, renames the staged tree into place, and writes `current.json` last. A failure before that commit point rolls back exactly: a fresh target is removed, a replaced target is restored, and the previous index bytes stay. Identical bytes already on disk are adopted without a prompt, which also recovers a crash between the tree rename and the index write. Cleanup or index-permission failures after the commit are reported as warnings, not as a failed install.

### Updating to the same version

A source checkout rebuilt without a version bump is not silently refused. `install` detects that the target version exists with different content and asks `Replace it? [y/N]`; approving replaces the whole version directory and rewrites the index with the new manifest hash and content digest. `--force` skips the replacement prompt for scripts. Capability consent stays separate, so `--yes` approves both. A declined prompt exits `1` with nothing changed.

An orphaned or partial target takes the same repair path, and `bitty plugin install <source> --force` is the copy-paste recovery command for it.

### Diagnosing and repairing the store

```bash
# Read-only: report findings and the command that fixes each one
bitty plugin doctor

# Quarantine broken trees and rebuild the index from complete packages
bitty plugin doctor --repair
```

`doctor` exits `0` when the store and ledger are healthy and `1` when it reports findings. It checks:

| Finding              | Meaning                                                                                     | Repair                                                                                                                                                     |
| :------------------- | :------------------------------------------------------------------------------------------ | :--------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `orphan-package`     | A version directory has no `current.json` record, for example after an interrupted install. | `--repair` re-indexes a complete tree or quarantines a partial one.                                                                                        |
| `incomplete-package` | The directory has no readable manifest, no Lua entry point, or an invalid module tree.      | `--repair` moves it to `<store>/quarantine/`.                                                                                                              |
| `dangling-record`    | `current.json` points at a missing, partial, or hash-mismatched package.                    | `--repair` drops or rebuilds the record.                                                                                                                   |
| `stale-version`      | A newer complete version exists than the indexed version.                                   | `--repair` selects the newest complete tree.                                                                                                               |
| `corrupt-index`      | `current.json` is truncated or malformed.                                                   | `--repair` moves it to `quarantine/` and rebuilds it; `list` and `install` fail closed with this command first.                                            |
| `stale-staging`      | A `.tmp-*` directory left by an interrupted install or uninstall.                           | `--repair` removes it after an age check.                                                                                                                  |
| Malformed ledger     | `bitty-plugins.lua` is not valid data-only Lua, or holds unknown/stale records.             | `--repair` quarantines the file and writes an empty valid ledger.                                                                                          |
| Legacy ledger        | A pre-Lua `bitty-plugins.toml` is still present (migration is pending or was interrupted).  | The next state-loading plugin command migrates it once; `doctor --repair` also does and keeps `bitty-plugins.toml.bak`. Read-only `doctor` writes nothing. |

`--repair` moves broken or duplicate trees into `<store>/quarantine/` instead of deleting them, so you can inspect them first. A rebuilt record never invents authority: when the manifest hash still matches, the recorded grants and enabled state survive; otherwise the record starts disabled with an empty grant set and needs a fresh `bitty plugin install <source> --force` consent. The index is written last and atomically. If repair cannot create the quarantine directory (for example a read-only store), it reports the failing path and the ownership/permission action instead of half-deleting a package.

`bitty plugin list` shows interrupted installs as `orphaned` or `broken` rows with a `repair:` footer instead of hiding them, and exposes the same hint as a `repair` field in JSON. To discard one tree instead, `bitty plugin remove <id> --force` also removes an unindexed orphan directory.

## Developing & Testing Locally

Iterate on a checkout with a local install, then reinstall with `--force` after rebuilding at the same manifest version:

```bash
# Install or replace a local directory package
bitty plugin install ./my-plugin --yes --force

# List recorded plugins and their capability grants
bitty plugin list

# Inspect declared settings, selected file, and effective values
bitty plugin config show custom.my-plugin

# Follow activation failures without a UI
RUST_LOG=bitty=debug bitty
```

## Next Steps

- [Capabilities & Sandboxing](capabilities-and-sandbox.md) — Learn about security boundaries, resource quotas, and capability families.
- [How Permissions Are Decided](permissions-decision.md) — The four gates behind a capability grant or denial.
- [Native Component Boundary](../extensions/upstream-components.md) — Understand how upstream prebuilt extensions share native infrastructure across plugins.
- [Lua API Reference](../api/overview.md) — Explore the sandboxed `bitty.*` API surface.
