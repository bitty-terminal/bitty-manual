# Quick Start Guide

Welcome to **Bitty**, a high-performance, programmable GPU-accelerated terminal emulator designed for modern Linux and macOS environments.

## Installation

Bitty is distributed as a standalone native binary, system packages, or built directly from source:

```bash
# Cargo install
cargo install bitty

# Arch Linux (AUR)
paru -S bitty-bin
```

## First Launch

Launch Bitty by simply invoking the executable:

```bash
bitty
```

On first startup, Bitty resolves your environment configuration from `~/.config/bitty/init.lua` (XDG compliance). If no configuration file exists, Bitty starts with zero-delay built-in defaults.

## Default Keybindings

| Shortcut            | Action           | Description                                |
| :------------------ | :--------------- | :----------------------------------------- |
| `Ctrl+Shift+T`      | New Tab / Window | Open a new terminal workspace              |
| `Ctrl+Shift+W`      | Close View       | Close currently focused pane               |
| `Ctrl+Shift+P`      | Command Palette  | Open interactive palette with fuzzy search |
| `Ctrl+Shift+F`      | Search           | Open scrollback pattern search             |
| `Ctrl+=` / `Ctrl+-` | Zoom             | Adjust live font point size                |

## Next Steps

- [Configuration Reference](../configuration/overview.md) — Learn how to customize fonts, opacity, and keybindings with live hot reload.
- [Plugin Development](../plugins/getting-started.md) — Build sandboxed, zero-startup-overhead Lua plugins.
