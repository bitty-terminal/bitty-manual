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

Save the TOML example as `bitty-terminal.bar.toml` only when no Lua file is selected. To check the **main configuration** without launching a GUI:

```bash
bitty config check
```

This command is not a comprehensive validator for per-plugin settings. Those files are loaded during plugin activation; consult the host's [settings warnings](../faq/troubleshooting.md#plugin-diagnostics-bitty-plugin-list--bitty-doctor) for ignored entries or rejected files.

## Values versus authority

Your config file carries **values only** — what the plugin should do. **Authority** (which capabilities the plugin may exercise) is granted separately at install time through `bitty plugin install`, after explicit consent, and can be narrowed later with `bitty plugin revoke`. A config value can never grant a capability the host did not approve: setting a backlight `step` without the control grant leaves the module read-only, and unchecking a grant hides the modules that needed it. If a setting seems ignored, check grants first (`bitty plugin list` shows granted versus requested capabilities) — then the [troubleshooting guide](../faq/troubleshooting.md).

## Next steps

- [Plugin Configuration](../configuration/plugin-config.md) — Task-oriented guide to file selection, safe editing, and when changes take effect.
- [Bar Modules User Guide](bar-modules.md) — What each module shows and its options.
- [Composer Modal Usage](composer.md) — Open chord, submit chords, and custom settings.
