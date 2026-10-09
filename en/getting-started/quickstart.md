# Quick Start Guide

Welcome to **Bitty**, a high-performance, programmable GPU-accelerated terminal emulator designed for Linux, macOS, and Windows. Bitty combines a lightweight Rust core with an isolated, event-driven Lua extension engine.

## Installation

Bitty is distributed across all major operating systems via automated install scripts, native package managers, prebuilt binaries, or built directly from source:

### Automated Install Scripts

```bash
# Linux and macOS (Unix)
curl -fsSL https://cdn.bitty.run/install.sh | sh

# Windows (PowerShell)
irm https://cdn.bitty.run/install.ps1 | iex
```

### Native Package Managers

```bash
# Windows (Scoop)
scoop bucket add bitty https://github.com/bitty-terminal/scoop-bucket
scoop install bitty

# macOS (Homebrew)
brew tap bitty-terminal/tap
brew install bitty

# Arch Linux (AUR / paru)
paru -S bitty-terminal

# Universal Linux (Flatpak)
flatpak install run.bitty.Bitty
```

### Cargo (crates.io)

```bash
# Install via Cargo
# Note: The crate name is `bitty-terminal` because `bitty` was pre-registered on crates.io
cargo install bitty-terminal --locked
```

### Building from Source

Ensure you have Rust 1.85+ and native graphics platform libraries installed (Vulkan / Wayland / X11 on Linux, Metal on macOS, DirectX 12 / Vulkan on Windows):

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

On first startup, Bitty probes for your configuration file according to platform standards:

- **Linux / BSD**: `$XDG_CONFIG_HOME/bitty/init.lua` (fallback `~/.config/bitty/init.lua`)
- **macOS**: `~/Library/Application Support/bitty/init.lua` (or `$XDG_CONFIG_HOME/bitty/init.lua`, fallback `~/.config/bitty/init.lua`)
- **Windows**: `%APPDATA%\bitty\init.lua` (fallback `%LOCALAPPDATA%\bitty\init.lua`)

> [!NOTE]
> Bitty searches for `init.lua` first; if absent, it also accepts a sibling `config.lua` fallback alias (WezTerm-compatible naming). If no configuration file exists, Bitty starts immediately using compiled-in zero-delay defaults.

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

## Uninstallation & Data Cleanup

To cleanly remove Bitty and all associated user data:

### 1. Remove the Binary

```bash
# Scoop (Windows)
scoop uninstall bitty

# Homebrew (macOS)
brew uninstall bitty

# Cargo (crates.io)
cargo uninstall bitty-terminal

# Manual binary installation
sudo rm /usr/local/bin/bitty
```

### 2. Remove Configuration Files

- **Linux / BSD**: `rm -rf ~/.config/bitty` (or `$XDG_CONFIG_HOME/bitty`)
- **macOS**: `rm -rf ~/Library/Application\ Support/bitty ~/.config/bitty`
- **Windows (PowerShell)**: `Remove-Item -Recurse -Force $env:APPDATA\bitty`

### 3. Clean Logs, State & Cache

- **Linux / BSD**: `rm -rf ~/.local/state/bitty ~/.cache/bitty`
- **macOS**: `rm -rf ~/Library/Logs/bitty ~/Library/Caches/bitty`
- **Windows (PowerShell)**: `Remove-Item -Recurse -Force $env:LOCALAPPDATA\bitty`

## Next Steps

- [CLI Commands & Controls](cli.md) — Discover command-line flags and control daemon commands.
- [Configuration Reference](../configuration/overview.md) — Customize fonts, opacity, and keybindings with live hot reload.
- [Plugin Architecture & Development](../plugins/getting-started.md) — Build sandboxed, zero-startup-overhead Lua plugins.
