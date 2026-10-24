# Per-Plugin Config Files

Per-plugin files override declared settings **per key**. Omitted or rejected values use the next lower value layer. Settings do not enable a plugin or grant capabilities.

## File location

```text
$XDG_CONFIG_HOME/bitty/plugins/<owner>.<name>.lua
```

Fallback `~/.config/bitty/plugins/`. Windows follows the same platform precedence as the main config (`%APPDATA%` / `%LOCALAPPDATA%`). File names derive from validated plugin ids. An absent file or directory is not an error.

The host selects one file during activation, in this order:

1. Canonical `<owner>.<name>.lua`, such as `bitty-terminal.bar.lua`.
2. Short-name `<name>.lua`, such as `bar.lua`, only if canonical Lua is absent and complete, validated plugin discovery identifies exactly one owner of that short name. Ambiguous aliases are ignored.
3. Legacy canonical `<owner>.<name>.toml`, only if neither canonical nor eligible alias Lua is present.

A selected Lua file that fails reading, evaluation, or result validation falls back to lower **value layers**. It does not select another alias or the TOML file. Prefer canonical names to avoid alias collisions.

## Inspect and scaffold

`bitty plugin config show <id>` prints the declared settings (key, type, default), every candidate file, the file selected by resolution, and the effective value and layer per key. It never loads the plugin VM or runs plugin code.

`bitty plugin config scaffold <id>` writes a commented template to the canonical Lua path, generated from the manifest defaults only. It refuses to overwrite an existing file unless you pass `--force`. Scaffolding neither enables the plugin nor grants capabilities.

Successful `bitty plugin install` and `bitty plugin enable` runs point at this canonical Lua path and at both `config` commands. The CLI hint never advertises the legacy TOML fallback.

## Generated defaults

A successful `bitty plugin install` and the first `bitty plugin enable` also
create the canonical Lua file for you when the plugin declares at least one
setting. The generated file contains the declared keys and their shipped
defaults as **comments** and returns an empty table, so the plugin keeps
running on its manifest defaults until you uncomment and edit a line:

```lua
-- bitty-plugin-defaults: bitty-terminal.bar <manifest hash>
-- ...
return {
    -- show = true,
    -- name_max_chars = 32,
    -- modules_left = { "workspaces" },
}
```

Rules:

- The file is created only when absent. Installing again, enabling again, or
  editing the file never overwrites it. Use
  `bitty plugin config scaffold <id> --force` when you explicitly want the
  active (uncommented) template instead.
- A plugin that declares no `[settings]` gets no file; an empty file is never
  created.
- A legacy `<owner>.<name>.toml` file is never replaced. While it exists the
  host does not create the Lua file, because a Lua file would shadow the TOML
  values.
- The file is written atomically with owner-only permissions; symlinked
  targets and a symlinked `plugins/` directory are refused.
- `bitty plugin info <id>` prints the canonical path and whether it is
  present.

The file remains data only. Every key is checked against the current manifest
when the plugin activates; undeclared keys change nothing and never grant a
capability.

## Managed plugin ledger

The host keeps one machine-managed ledger beside your configuration:
`$XDG_CONFIG_HOME/bitty/bitty-plugins.lua` (fallback
`~/.config/bitty/bitty-plugins.lua`). It records each managed plugin's source,
pinned manifest hash, enabled state, granted capabilities, and explicit
denials. It is **not** a settings file.

The ledger is data-only Lua. It is parsed without running Lua or any plugin
code; it has no host access, and malformed bytes, duplicate entries, unknown
fields, non-UTF-8 input, or over-limit content fail closed. The file is
written atomically with owner-only permissions.

An older `bitty-plugins.toml` ledger is migrated once, automatically: the
host writes the Lua ledger and keeps the previous TOML bytes at
`bitty-plugins.toml.bak`. The migration preserves `source`, `manifest_hash`,
`enabled`, `granted`, and `denied`, never overwrites an existing Lua ledger,
and is idempotent. A symlinked or non-regular legacy file is refused rather
than followed. `bitty plugin doctor` reports the ledger state and
`bitty plugin doctor --repair` retains an obsolete legacy file as a backup.

Do not hand-edit the ledger. Authority cannot be widened by editing it: a
grant is honoured only when the plugin's manifest declares that capability
for the recorded `manifest_hash`. Undeclared grants are dropped with a
diagnostic, and a hand-edited `enabled` flag still goes through the normal pin
and grant checks on enable.

## Restricted Lua settings

Return a table of declared settings. For example, `bitty-terminal.bar.lua`:

```lua
return {
  show = true,
  name_max_chars = 32,
  modules_left = { "workspaces", "cpu" },
}
```

Lua settings run in a fresh, restricted VM without host services, plugin APIs, module loading, or side-effecting libraries. Instruction, wall-clock, and memory budgets bound evaluation. The loader accepts booleans, integers, strings, and string arrays only when their types match the plugin's manifest declarations; it does not coerce strings into numbers or booleans. Unknown and wrong-typed entries are ignored.

Lua limits are **16 KiB source**, nesting depth **16**, **64 entries per table**, **256 returned values**, **2048 bytes per string**, and **16 KiB aggregate output**, including structural overhead. Invalid encoding, a result other than a string-keyed settings table, cycles, duplicate literal keys, or exceeded evaluation/extraction limits reject the file.

The evaluator can extract nested tables, but plugin settings do not accept nonempty map values. This does not enable per-module option groups in the bar; those remain inert. See the [bar modules guide](bar-modules.md).

## Legacy TOML subset (flat keys only)

Legacy `<owner>.<name>.toml` files are parsed as data, never executed: no `include`, no `exec`, no shell, no sections, no dotted keys, no nesting.

```toml
# flat keys only
show = true                  # boolean
name_max_chars = 32          # bare integer
edge = "bottom"              # double-quoted string
modules_left = ["workspaces", "cpu"]  # single-line array of strings
```

Value rules:

- Values are booleans, bare integers, double-quoted strings, or single-line string arrays. Floats, inline tables, nested arrays, and multi-line values are unsupported. A quoted number remains a string and cannot override an integer setting. Invalid values fall back to lower layers for that key while other valid entries still apply.
- Unknown keys (keys the plugin manifest never declared) change nothing: they are recorded as skipped.
- Duplicate keys, a `[section]`, a line without `=`, or a malformed key rejects the **whole file**, leaving lower value layers in effect. An unterminated string or array only skips that key.
- Tables and dotted keys are unsupported; per-module option groups remain inert.
- Non-UTF-8 files fail closed; a plugin never observes mojibake it could mistake for configuration.

TOML file limits are **16 KiB**, **512 lines**, **1024 bytes per line**, and **64 keys**; exceeding them rejects the file. Value limits are **512 bytes per string**, **32 items per string array**, and **128 bytes per array item**; exceeding them skips that key. These TOML limits are distinct from Lua's limits above.

## Precedence and wrong-type fallback

Lowest precedence first:

```text
manifest shipped default < shared host source < selected user file
```

A wrong-typed value at any layer leaves the next lower correctly typed value in effect **for that key only**. Only keys declared by the plugin are resolved. The shared host source is not arbitrary access to the host's configuration through `bitty.settings.get`.

## Worked examples

Bar chassis (scalars and module lists take effect today; per-module option groups stay inert — see above):

```toml
show = true
show_single = false
name_max_chars = 32
modules_left = ["workspaces", "cpu", "memory", "battery"]
modules_right = ["clock", "pulseaudio"]
```

Save the TOML example as `bitty-terminal.bar.toml` only when no Lua file is selected (legacy compatibility path). Prefer `bitty plugin config scaffold bitty-terminal.bar` to create the canonical Lua file. To check the **main configuration** without launching a GUI:

```bash
bitty config check
```

This command is not a comprehensive validator for per-plugin settings. Those files are loaded during plugin activation; consult the host's [settings warnings](../faq/troubleshooting.md#plugin-diagnostics-bitty-plugin-list-bitty-plugin-doctor-bitty-doctor) for ignored entries or rejected files.

## Values versus authority

Your config file carries **values only** — what the plugin should do. **Authority** (which capabilities the plugin may exercise) is granted separately at install time through `bitty plugin install`, after explicit consent, and can be narrowed later with `bitty plugin revoke`. A config value can never grant a capability the host did not approve: setting a backlight `step` without the control grant leaves the module read-only, and unchecking a grant hides the modules that needed it. If a setting seems ignored, check grants first (`bitty plugin list` shows granted versus requested capabilities) — then the [troubleshooting guide](../faq/troubleshooting.md).

## Next steps

- [Plugin Configuration](../configuration/plugin-config.md) — Task-oriented guide to file selection, safe editing, and when changes take effect.
- [Bar Modules User Guide](bar-modules.md) — What each module shows and its options.
- [Composer Modal Usage](composer.md) — Open chord, submit chords, and custom settings.
