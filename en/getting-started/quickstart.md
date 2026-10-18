# Quick Start Guide

Welcome to **Bitty**, a high-performance, programmable GPU-accelerated terminal emulator designed for Linux, macOS, and Windows. Bitty combines a lightweight Rust core with an isolated, event-driven Lua extension engine.

## Installation

Bitty is distributed across all major operating systems via automated install scripts, native packages, prebuilt binaries, or built directly from source:

### Automated Install Scripts

The scripts resolve the release through a single pointer (`latest.txt` holds the current tag), download the matching per-OS artifact from R2, and verify its `.sha256` sidecar before installing. Verification is fail closed: a checksum mismatch aborts the install. No Rust toolchain is needed.

```bash
# Linux and macOS (Unix)
curl -fsSL https://cdn.bitty.run/bitty/install/install.sh | bash

# Pin a version, preview the plan, or change the install location
curl -fsSL https://cdn.bitty.run/bitty/install/install.sh | bash -s -- --version 0.0.23
curl -fsSL https://cdn.bitty.run/bitty/install/install.sh | bash -s -- --dry-run
curl -fsSL https://cdn.bitty.run/bitty/install/install.sh | bash -s -- --prefix ~/.local
```

```powershell
# Windows (PowerShell, user-local, no admin rights needed)
irm https://cdn.bitty.run/bitty/install/install.ps1 | iex
```

What each script fetches: Linux installs the versioned `.tar.zst` bundle (binary plus desktop entry, icons, and AppStream metainfo); macOS installs the bare per-arch binary (the DMG stays an interactive drag-to-install image, unsuitable for headless install); Windows x64 installs the portable ZIP payload and Windows arm64 the bare exe. Running `install.sh` under Git-Bash fails closed and points at `install.ps1`; FreeBSD is not a bootstrap target and gets manual-download guidance. Verification in 0.1.0 is hash-only: there are no signatures yet (Windows signing is deferred past 0.2.0).

> [!NOTE]
> **PENDING — live CDN verify.** The release workflow uploads both scripts to their stable R2 keys on every tag, but no live tag upload and CDN read-back has completed yet. If the URLs above do not resolve, the owner-side publish is still outstanding: install from a package manager or build from source below.

### Native Packages

Every Linux package is install-smoked in a clean container of its own distro (Ubuntu 24.04 deb, Fedora rpm, Arch package, Alpine musl apk) before a release can publish, so a package that installs or runs nowhere never ships.

```bash
# Windows (Scoop)
scoop bucket add bitty https://github.com/bitty-terminal/scoop-bucket
scoop install bitty

# macOS (Homebrew)
brew tap bitty-terminal/homebrew-tap
brew install bitty

# Arch Linux (AUR): prebuilt binary package
paru -S bitty-bin   # or: yay -S bitty-bin
# Source build package `bitty` also exists; prefer `bitty-bin` unless
# you specifically need a local source compile.
```

> [!NOTE]
> **PENDING — first tag publish.** Scoop, Homebrew, and AUR manifests are generated at tag time and gated on owner-side secrets. Until the first 0.0.23 tag publish completes, these channels may 404: use the install scripts or a native package instead. Flatpak (`flatpak install run.bitty.Bitty`) and further managers land progressively after 0.1.0 — **PENDING**.

### Cargo (build from the Git repository)

There is no crates.io install path for the binary. Build from source instead:

```bash
# Install the `bitty` binary from the Git repository
# (pin the toolchain explicitly: `cargo install --git` does not read rust-toolchain.toml)
cargo +1.98.1 install --git https://github.com/bitty-terminal/bitty.git bitty-terminal --locked
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

The shipped map is the **Alt-as-Mod** map (`Alt+h/j/k/l` to move, `Alt+1..9` to jump, `Shift+Alt` to split, and so on). It is what the binary defaults to and what `bitty init` writes; setting `mod_key = "super"` flips the `Mod` slot to `Super` on every `Mod`-aware chord. Bare `Tab`, arrows, letters, and digits are deliberately unbound so they reach the shell.

| Keys                                                                                          | Action                | Description                                         |
| :-------------------------------------------------------------------------------------------- | :-------------------- | :-------------------------------------------------- |
| `Alt+h` / `Alt+j` / `Alt+k` / `Alt+l` (`Alt+arrows`, `Ctrl+Alt+arrows`)                       | Focus                 | Move focus left / down / up / right                 |
| `Ctrl+Tab` / `Ctrl+Shift+Tab`                                                                 | Cycle focus           | Focus the next / previous panel                     |
| `Shift+Alt+h/j/k/l` (`Shift+Alt+arrows`)                                                      | Split                 | Create a split left / down / up / right             |
| `Shift+Ctrl+h/j/k/l` (`Shift+Ctrl+arrows`, `Ctrl+Shift+Alt+h/j/k/l`, `Ctrl+Shift+Alt+arrows`) | Resize                | Resize the focused split                            |
| `Ctrl+Shift+C` / `Ctrl+Shift+V`                                                               | Copy / Paste          | Copy selection / paste from the system clipboard    |
| `Alt+n`                                                                                       | New panel             | Open a new panel (adaptive dwindle axis)            |
| `Alt+t`                                                                                       | New workspace         | Open a fresh workspace                              |
| `Alt+d` / `Alt+q`                                                                             | Close pane            | Close the focused pane/view (with confirm)          |
| `Alt+w`                                                                                       | Close workspace       | Close the workspace (kill-confirm)                  |
| `Alt+-` / `Alt+=`                                                                             | Workspace prev / next | Switch to the previous / next workspace             |
| `Alt+Tab`                                                                                     | Last-used workspace   | Switch to the previously used workspace             |
| `Alt+[` / `Alt+]`                                                                             | Occupied workspace    | Next / previous occupied workspace (with wrap)      |
| `Alt+1` … `Alt+9`                                                                             | Jump to workspace     | Focus workspace N                                   |
| `Shift+Alt+1` … `Shift+Alt+9`                                                                 | Move window           | Move the focused window to workspace N              |
| `Ctrl+Shift+Alt+1` … `Ctrl+Shift+Alt+9`                                                       | Swap workspace        | Swap with, or move to, workspace N                  |
| `Alt+z` / `Alt+m` / `Alt+f`                                                                   | Zoom                  | Toggle zoom of the focused panel                    |
| `Alt+a`                                                                                       | Toggle floating       | Toggle the focused panel between tiled and floating |
| `Alt+u` / `Alt+i`                                                                             | Scroll                | Page down (toward live) / page up (into history)    |
| `Shift+Alt+PageUp` / `Shift+Alt+PageDown`                                                     | Prompt navigation     | Jump to the previous / next shell prompt            |
| `Alt+o`                                                                                       | Select output         | Select the last command's output                    |
| `Ctrl+=` / `Ctrl++` / `Ctrl+-`                                                                | Font zoom             | Increase / decrease the live font point size        |
| `Ctrl+0`                                                                                      | Reset font size       | Reset the font size to the configured default       |
| ``Alt+` `` (`Alt+?`)                                                                          | Help                  | Toggle the shortcut help overlay                    |

> [!NOTE]
> `Ctrl+Shift+F` and `Ctrl+Shift+Space` are **not** search chords: they are shell input again. Scrollback search has no Core default chord; a plugin may rebind one (see [Configuration Reference](../configuration/overview.md)).

## Uninstallation & Data Cleanup

To cleanly remove Bitty and all associated user data:

### 1. Remove the Binary

```bash
# Scoop (Windows)
scoop uninstall bitty

# Homebrew (macOS)
brew uninstall bitty

# Cargo (when installed from the Git repository)
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
