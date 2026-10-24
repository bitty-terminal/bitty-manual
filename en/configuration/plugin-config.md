# Plugin Configuration

Every plugin has one optional user configuration file. It overrides the
settings the plugin declares, one key at a time. Settings carry **values only**:
they can change what a plugin displays or how it behaves, but they never grant
a capability.

An absent file is normal. The plugin runs on its shipped defaults.

## File location

The host resolves one configuration root, highest priority first:

| Priority | Source             | Resulting directory               |
| :------- | :----------------- | :-------------------------------- |
| 1        | `$XDG_CONFIG_HOME` | `$XDG_CONFIG_HOME/bitty/plugins/` |
| 2        | `%APPDATA%`        | `%APPDATA%\bitty\plugins\`        |
| 3        | `$HOME/.config`    | `~/.config/bitty/plugins/`        |
| 4        | `%LOCALAPPDATA%`   | `%LOCALAPPDATA%\bitty\plugins\`   |

The first non-empty value wins. The order is the same one used for the main
configuration, so a Windows host that sets both `%APPDATA%` and `$HOME` still
prefers `%APPDATA%`.

Inside that directory the host selects exactly one file during activation:

1. Canonical Lua: `<owner>.<name>.lua`, for example `bitty-terminal.bar.lua`.
2. Short-name alias: `<name>.lua`, for example the short name `bar` with the
   `.lua` extension, only when the canonical Lua file is absent and plugin
   discovery finds exactly one owner for that short name. Ambiguous aliases
   are ignored.
3. Legacy TOML: `<owner>.<name>.toml`, for example
   `bitty-terminal.bar.toml`, only when no Lua file was selected.

A file that is present but rejected does not fall through to another alias or
to the TOML file. Missing keys in the selected file do not merge with another
file.

### File names are plugin ids

The file stem is the validated plugin id: exactly `owner.name`, one dot, each
segment starting with a lowercase letter and containing only lowercase letters,
digits, `-`, and `_` (up to 64 bytes per segment). Because the id cannot contain
a path separator, `plugins/` cannot be escaped. An invalid id never produces a
file path.

### Generated defaults

When a plugin declares settings, a successful `bitty plugin install` or the
first `bitty plugin enable` creates the canonical Lua file if it is absent.
The generated file lists each declared key and its shipped default in
comments and returns an empty table, so the plugin runs on its manifest
defaults until you uncomment and edit a line. The host never overwrites an
existing canonical file, a short-name alias, or a legacy
`<owner>.<name>.toml`; `bitty plugin config scaffold --force` is the explicit
overwrite path. A plugin without declared settings gets no file. See
[Per-Plugin Config Files](../plugins/plugin-settings.md#generated-defaults)
for the exact shape and failure behavior.

## Formats

### Restricted Lua (canonical)

The canonical file returns a table of declared settings:

```lua
-- $XDG_CONFIG_HOME/bitty/plugins/bitty-terminal.bar.lua
return {
  show = true,
  show_single = true,
  name_max_chars = 24,
  modules_left = { "workspaces" },
  modules_right = { "clock" },
}
```

The table is evaluated in a fresh, restricted Lua VM with no host services,
plugin APIs, module loading, or side-effecting libraries. Types must match the
plugin's declarations: booleans, integers, strings, and string arrays are
accepted; no coercion is performed. Unknown and wrong-typed entries are
ignored. The source and result are bounded (16 KiB source, nesting depth 16,
64 entries per table, 256 values, 2048 bytes per string, 16 KiB aggregate
output), and an over-limit or malformed result rejects the file.

### TOML data subset (legacy)

The TOML file is parsed as data. It is never evaluated as Lua and never
executes anything: there is no `include`, no `exec`, no shell, no sections, no
dotted keys, and no nesting.

```toml
# flat keys only
show = true                           # boolean
name_max_chars = 32                   # bare integer
edge = "bottom"                       # double-quoted string
modules_left = ["workspaces", "cpu"]  # single-line array of strings
```

Supported values are booleans, bare integers, double-quoted strings, and
single-line string arrays. Floats, quoted numbers, inline tables, nested
arrays, and multi-line values are outside the subset. A quoted number stays a
string and cannot override an integer setting.

| Limit                       | Value  | When exceeded       |
| :-------------------------- | :----- | :------------------ |
| File size                   | 16 KiB | Whole file rejected |
| File lines                  | 512    | Whole file rejected |
| Bytes per line              | 1024   | Whole file rejected |
| Keys per file               | 64     | Whole file rejected |
| Bytes per string value      | 512    | That key is skipped |
| Items per string array      | 32     | That key is skipped |
| Bytes per string-array item | 128    | That key is skipped |

Non-UTF-8 input rejects the whole file. A NUL byte rejects the key that
contains it.

## Precedence and failures

Values resolve per declared key, lowest priority first:

```text
manifest shipped default < shared host source < selected user file
```

A wrong-typed value at any layer leaves the next lower correctly typed value in
effect for that key only. Unknown keys are dropped: they are recorded as
skipped and change nothing. Only settings the plugin declares are readable.

Whole-file failures and per-key failures are different:

| Problem                                                         | Result                                         |
| :-------------------------------------------------------------- | :--------------------------------------------- |
| Duplicate key, `[section]`, line without `=`, malformed key     | Whole file rejected; lower layers used         |
| More than 64 keys, over 16 KiB, over 512 lines, invalid UTF-8   | Whole file rejected; lower layers used         |
| Unterminated string or array, unsupported value, overlong value | That key skipped; the rest of the file applies |
| Key the manifest never declared                                 | Dropped; recorded as skipped                   |

> [!NOTE]
> Safe editing: a bad value never aborts the plugin and never grants a
> capability. At worst it hides a module or leaves that key on its shipped
> default. A structural error makes the whole file inert for that activation,
> so the plugin keeps running on lower layers.

## Your files versus the managed ledger

Two different files live under the configuration root:

| File                         | Owner | Purpose                                                |
| :--------------------------- | :---- | :----------------------------------------------------- |
| `bitty-plugins.lua`          | Host  | Managed ledger: source, manifest hash, enabled, grants |
| `plugins/<owner>.<name>.lua` | You   | Per-plugin settings values                             |

The managed ledger is not a settings file and never grants authority by
itself: grants stay bound to the plugin manifest hash recorded beside them.
An existing `bitty-plugins.toml` ledger is migrated once to
`bitty-plugins.lua`, with the old bytes kept at `bitty-plugins.toml.bak`.
Do not copy settings into the ledger or the ledger into a plugin file.

## When changes take effect

The host reads the selected file when the plugin activates and pins the
resolved values to that plugin generation. It does not watch the file.

Saving the file does **not** hot-reload a running plugin. The config reload
event reaches subscribed plugins, but it does not re-resolve per-plugin
settings. A running generation keeps the values it resolved at activation.

Restart Bitty to apply the edit. A lazily activated plugin reads the file on
its first activation after the edit; a plugin that is already running needs a
new generation.

`bitty config check` validates the main configuration only. It is not a
comprehensive validator for plugin files. Per-plugin selection and parse
warnings are host log summaries reported during activation; at most four
summaries are retained per activation, and they omit setting names and values.

## Examples

### Bar: workspace and clock groups

```toml
# $XDG_CONFIG_HOME/bitty/plugins/bitty-terminal.bar.toml
show = true
show_single = true
edge = "bottom"
name_max_chars = 24
modules_left = ["workspaces"]
modules_center = []
modules_right = ["clock"]
```

The three module lists are ordered groups. `modules_left` defaults to
`["workspaces"]`; `modules_center` and `modules_right` default to empty. An
unknown module name or a plan that resolves to nothing falls back to a single
workspace group, so the bar does not disappear by accident.

Workspace labels are fixed text: each pill shows `{stable-id}:{name}`, the
active pill carries `*`, and the workspace count follows the pills. Names are
truncated to `name_max_chars` (1 through 32, default 32). There is no separate
label-mode key. `show_single = true` keeps the bar visible when only one
workspace exists; `show = false` hides the whole bar.

Per-module option groups (for example a clock format or poll interval) are
declared by the plugin but are not accepted as map values by the current
settings contract. They read as module defaults. The chassis scalars above and
the three module lists are the settings that take effect today.

### Composer: chords

```toml
# $XDG_CONFIG_HOME/bitty/plugins/bitty-terminal.composer.toml
newline = "enter"
submit = "ctrl+enter"
close = "escape"
external_editor = "alt+e"
open_chord = "alt+e"
```

The four in-modal roles (`newline`, `submit`, `close`, `external_editor`) must
stay pairwise distinct. Submit is matched first, then close, external editor,
newline, and text. The open chord is exactly `<mod>+...+<single-char>` and
lives on the host keymap; it targets the open command while the modal is
closed. The open chord and the in-modal external-editor role are separate, so
the two `alt+e` defaults do not compete.

### Search: page budgets

```toml
# $XDG_CONFIG_HOME/bitty/plugins/bitty-terminal.search.toml
row_count = 10
max_bytes = 4096
```

`row_count` default is 10 and `max_bytes` default is 4096. The host caps one
query at 16 rows and 4096 bytes; an out-of-range configured value falls back to
the default instead of widening a query.

### The same keys in Lua

The key names do not change. To use the canonical format, return them as a
table with Lua array syntax:

```lua
-- $XDG_CONFIG_HOME/bitty/plugins/bitty-terminal.bar.lua
return {
  show = true,
  show_single = true,
  edge = "bottom",
  name_max_chars = 24,
  modules_left = { "workspaces" },
  modules_center = {},
  modules_right = { "clock" },
}
```

## Checking your file

```bash
bitty plugin list              # states and capability grants
bitty plugin info <id>         # manifest, grants, and canonical settings path
bitty plugin config show <id>  # declared schema and effective values
bitty plugin doctor            # package store and managed-ledger health
```

`bitty plugin doctor --repair` quarantines broken package trees and malformed
ledgers without deleting evidence. It does not create, edit, or validate
per-plugin settings values; those are read during plugin activation. A
successful `bitty config check` does not validate per-plugin files either. If
a value seems ignored, check the selected file name, the key spelling, its
type, and the plugin's grants, in that order.

## Next steps

- [Per-Plugin Config Files](../plugins/plugin-settings.md) — Selection order,
  format limits, and value-layer precedence in reference form.
- [Bar Modules User Guide](../plugins/bar-modules.md) — What each module shows.
- [Composer Modal Usage](../plugins/composer.md) — Open, submit, and close
  behavior.
- [Troubleshooting & Safe Mode](../faq/troubleshooting.md) — Activation errors
  and settings warnings.
