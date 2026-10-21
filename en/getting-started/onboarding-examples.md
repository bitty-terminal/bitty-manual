# Onboarding Examples

Copy-pasteable starter flows verified against `bitty 0.0.23` (`bitty --help`, `bitty plugin --help`, `bitty extension --help`, `bitty config check`, `bitty inspect key`). Follows [bitty#2143](https://github.com/bitty-terminal/bitty/issues/2143).

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

`bitty 0.0.23` installs from a bundled id, a local directory, a git URL, or a local archive (see `bitty plugin --help`). The bar source below matches the `https://<host>/<path>.git` form, and its published manifest id is `bitty-terminal.bar` (`bitty-plugin.toml` in [`bitty-terminal/bar`](https://github.com/bitty-terminal/bar)):

```bash
# Install the bar plugin from git (prompts for capability consent)
bitty plugin install https://github.com/bitty-terminal/bar.git

# Same install, non-interactive consent
bitty plugin install https://github.com/bitty-terminal/bar.git --yes

# Inspect what was recorded
bitty plugin list
bitty plugin info bitty-terminal.bar

# Re-enable without dropping the record (idempotent after install)
bitty plugin enable bitty-terminal.bar
```

Consent is explicit: the installer prints `Grant these capabilities? [y/N]`; `--yes` approves non-interactively, a decline aborts with exit `1` and nothing changes. Grants bind to the exact manifest hash, so added capabilities always need fresh consent.

Configure the bar with a per-plugin file at `~/.config/bitty/plugins/bitty-terminal.bar.toml` (flat TOML keys only — see [Plugin Configuration](../configuration/plugin-config.md) and [Per-Plugin Config Files](../plugins/plugin-settings.md)). Only chassis scalars and the three module lists take effect today; per-module option groups stay inert (see [Bar Modules User Guide](../plugins/bar-modules.md)):

```toml
show = true
modules_left = ["workspaces", "cpu", "memory", "battery"]
modules_center = []
modules_right = ["clock", "pulseaudio"]
```

Re-validate after editing either file:

```bash
bitty config check
```

## 3. Extension flow example

Extensions are out-of-process binaries managed separately from plugins (see [Native Component Boundary](../extensions/upstream-components.md)). `list` shows only what is already installed. A bare `install` resolves the latest catalog release for this host; `--version` pins an exact `X.Y.Z`.

```bash
# Installed extensions only (empty when nothing is installed)
bitty extension list

# Fetch the latest published release (TOFU-pinned, explicit consent)
bitty extension install graphics

# Pin a confirmed release (recommended for scripts)
bitty extension install graphics --version 0.0.24
bitty extension install net --version 0.0.1

# Repo-style names are aliases for the stored component name
bitty extension install bitty-graphics --version 0.0.24

# Stage a local binary instead of downloading (no network)
bitty extension add /usr/local/bin/bitty-net

# Remove a user-tier extension; print pinned bytes for audit
bitty extension remove net
bitty extension show-source net
```

Publication changes over time; the authoritative selector is the extension catalog (`https://cdn.bitty.run/extensions/catalog.v1`). A bare `install` never guesses: when the catalog is unavailable (it was still `404` on 2026-10-21) or has no entry, the command fails closed and prints a concrete `--version` example. Confirm a pinned release by checking `https://cdn.bitty.run/extensions/<name>/<version>/SHA256SUMS`; `graphics/0.0.24` and `net/0.0.1` were live at that date.

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
- [Per-Plugin Config Files](../plugins/plugin-settings.md) — TOML subset and fail-to-default rules.
