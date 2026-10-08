# Quick Start Guide

Welcome to **Bitty**, a high-performance, programmable GPU-accelerated terminal emulator designed for modern Linux and macOS environments. Bitty combines a lightweight Rust core with an isolated, event-driven Lua extension engine.

## Installation

Bitty is distributed as a standalone native binary, prebuilt package, or built directly from source:

### Prebuilt Binary & System Packages

```bash
# Arch Linux (AUR)
paru -S bitty-bin

# Cargo install (crates.io)
cargo install bitty --locked

# Direct download from CDN
curl -fsSL https://cdn.bitty.run/install.sh | bash
```

### Building from Source

Ensure you have Rust 1.85+ and standard graphics libraries installed (Vulkan / Wayland / X11 on Linux; Metal on macOS):

```bash
git clone https://github.com/bitty-terminal/bitty.git
cd bitty
cargo build --release
sudo cp target/release/bitty /usr/local/bin/
```

## First Launch

Launch Bitty by invoking the executable:

```bash
bitty
```

On first startup, Bitty searches for your configuration file according to the XDG Base Directory specification:

- **Linux / BSD**: `~/.config/bitty/init.lua` (or `$XDG_CONFIG_HOME/bitty/init.lua`)
- **macOS**: `~/Library/Application Support/bitty/init.lua`

If no configuration file exists, Bitty starts immediately using compiled-in zero-delay defaults.

## Default Keybindings

| Shortcut            | Action           | Description                                 |
| :------------------ | :--------------- | :------------------------------------------ |
| `Ctrl+Shift+T`      | New Tab / Window | Open a new terminal workspace               |
| `Ctrl+Shift+W`      | Close View       | Close currently focused pane or panel       |
| `Ctrl+Shift+P`      | Command Palette  | Open interactive palette with fuzzy search  |
| `Ctrl+Shift+F`      | Search           | Open scrollback pattern search              |
| `Ctrl+=` / `Ctrl+-` | Zoom             | Increase or decrease live font point size   |
| `Ctrl+0`            | Reset Zoom       | Reset font size to default configured value |
| `Ctrl+Shift+C`      | Copy             | Copy selection to system clipboard          |
| `Ctrl+Shift+V`      | Paste            | Paste text from system clipboard            |

## Workspace Architecture at a Glance

Bitty organizes your terminal into a clean three-tier container hierarchy:

1. **Workspace**: A top-level desktop tab containing an isolated tiling layout.
2. **Panel**: A window container holding terminal views, native widgets, or plugin applications.
3. **View / PTY**: The actual running shell session connected to a pseudo-terminal.

Panels can be tiled side-by-side or toggled into a floating mode overlaying the workspace.

## Next Steps

- [CLI Commands & Controls](cli.md) — Discover command-line flags and control daemon commands.
- [Configuration Reference](../configuration/overview.md) — Customize fonts, opacity, and keybindings with live hot reload.
- [Plugin Architecture & Development](../plugins/getting-started.md) — Build sandboxed, zero-startup-overhead Lua plugins.
