# Onboarding Examples

Copy-pasteable starter flows verified against `bitty 0.0.26` (`bitty --help`, `bitty plugin --help`, `bitty extension --help`, `bitty config check`, `bitty inspect key`). Follows [bitty#2143](https://github.com/bitty-terminal/bitty/issues/2143).

## 1. Minimal `init.lua` starter

Create `~/.config/bitty/init.lua` (Linux/BSD; see [Quick Start Guide](quickstart.md) for macOS/Windows paths):

```lua
return {
  appearance = {
    theme = "tokyo-night",
  },
  font = {
    family = "JetBrains Mono",
    size = 13.0,
  },
  decoration = {
    border = 1,
    gaps_in = 6,
    gaps_out = 6,
  },
  terminal = {
    scrollback = 10000,
    shell = "/bin/bash",
  },
}
```

Every key above exists in the canonical schema (`appearance.theme`, `font.family`, `font.size`, `decoration.border`, `decoration.gaps_in`, `decoration.gaps_out`, `terminal.scrollback`, `terminal.shell`). Theme, font, and decoration apply **Live** on save; `terminal.scrollback` and `terminal.shell` are **RestartRequired** (see [Configuration Reference](../configuration/overview.md)).

Validate without launching a GUI (tested: exit `0`, per-key `file:` attribution for the eight set keys, `default` for the rest):

```bash
bitty config check
bitty config check --config ~/.config/bitty/init.lua
```

## 2. Plugin flow end-to-end (bar example)

`bitty 0.0.26` installs from a bundled id, an official catalog id, a local directory, a git URL, or a local archive (see `bitty plugin --help`). The bar entry below uses its official catalog id, `bitty-terminal.bar`, which resolves the pinned, hash-verified registry revision:

```bash
# Install the bar plugin from the official catalog (prompts for capability consent)
bitty plugin install bitty-terminal.bar

# Same install, non-interactive consent
bitty plugin install bitty-terminal.bar --yes

# Inspect what was recorded
bitty plugin list
bitty plugin info bitty-terminal.bar

# A fresh install is staged disabled; enable it explicitly
bitty plugin enable bitty-terminal.bar
```

Consent is explicit: the installer prints `Grant these capabilities? [y/N]`; `--yes` approves non-interactively, a decline aborts with exit `1` and nothing changes. Grants bind to the exact manifest hash, so added capabilities always need fresh consent.

Configure the bar with the canonical Lua settings file at `$XDG_CONFIG_HOME/bitty/plugins/bitty-terminal.bar.lua` (see [Plugin Configuration](../configuration/plugin-config.md) and [Per-Plugin Config Files](../plugins/plugin-settings.md)). Only chassis scalars and the three module lists take effect today; per-module option groups stay inert (see [Bar Modules User Guide](../plugins/bar-modules.md)):

```lua
return {
  show = true,
  modules_left = { "workspaces", "cpu", "memory", "battery" },
  modules_center = {},
  modules_right = { "clock", "pulseaudio" },
}
```

Re-validate after editing either file:

```bash
bitty config check
```

## 3. Extension flow example

Extensions are out-of-process binaries managed separately from plugins (see [Native Component Boundary](../extensions/upstream-components.md)). `list` shows only what is already installed. `install` is pinned-only: `--version X.Y.Z` is required, and a bare `install` is a usage error (exit code `2`); Core does not resolve a latest catalog release.

```bash
# Installed extensions only (empty when nothing is installed)
bitty extension list

# Fetch published releases (TOFU-pinned, explicit consent)
bitty extension install graphics --version 0.0.25
bitty extension install net --version 0.0.2

# Repo-style names are aliases for the stored extension name
bitty extension install bitty-graphics --version 0.0.25

# Stage a local binary instead of downloading (no network)
bitty extension add /usr/local/bin/bitty-net

# Remove a user-tier extension; print pinned bytes for audit
bitty extension remove net
bitty extension show-source net
```

Publication changes over time; the extension catalog (`https://cdn.bitty.run/extensions/catalog.v1`, published schema 1 on 2026-10-22) is the manager-owned resolution input. Core's pinned seed never reads it: a bare `install` fails closed with exit code `2` and a concrete `--version` example. Confirm a pinned release by checking `https://cdn.bitty.run/extensions/<name>/<version>/SHA256SUMS`; `graphics/0.0.25` and `net/0.0.2` were live at that date.

## 4. Leader key (`alt+space` default)

The default Leader chord is `alt+space` on Linux/macOS/other (`LEADER_DEFAULT_CHORD_RAW` in `crates/bitty-config/src/keymap.rs`); on Windows the default is `ctrl+space` because `alt+space` is OS-reserved. The pending window is `1000` ms by default (`100..=60000` allowed). The default chord binds no chrome action, so it never shadows a shipped chord (confirm: `bitty inspect key alt+space` reports `bound: no`, `owner: pty`).

Bind two follow-ups in `~/.config/bitty/init.lua` (tested: `bitty config check` exits `0`). The `leader` keyword is symbolic — it resolves to the configured Leader, never a hardcoded chord:

```lua
return {
  input = {
    leader = "alt+space",
    timeout_len = 1000,
  },
  keymaps = {
    { chord = "leader w", action = "close_view", context = "global" },
    { chord = "leader v", action = "new_split:right", context = "global" },
  },
}
```

Press `alt+space`, then `w` (close view) or `v` (split right) inside the pending window; `Esc` or timeout disarms fail-open back to the shell. Both actions are in the [Actions Catalog](../configuration/actions-catalog.md). The canonical keys are `input.leader` / `input.timeout_len` (`leader_key` / `leader_timeout_ms` remain as legacy aliases).

## Next steps

- [CLI Commands & Controls](cli.md) — Full `config`, `plugin`, and `extension` verb reference.
- [Configuration Reference](../configuration/overview.md) — Every key, type, and reload class.
- [Bar Modules User Guide](../plugins/bar-modules.md) — What each bar module shows.
- [Plugin Configuration](../configuration/plugin-config.md) — File locations, worked examples, and when changes apply.
- [Per-Plugin Config Files](../plugins/plugin-settings.md) — File selection, the restricted Lua form, and fail-to-default rules.
