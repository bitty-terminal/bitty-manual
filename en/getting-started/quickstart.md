# Quick Start Guide

Welcome to **Bitty**, a high-performance, programmable GPU-accelerated terminal emulator designed for Linux, macOS, and Windows. Bitty combines a lightweight Rust core with an isolated, event-driven Lua extension engine.

## Installation

Bitty is distributed through automated install scripts, native packages, prebuilt binaries, or a source build:

### Automated Install Scripts

The scripts resolve the release through a single pointer (`latest.txt` holds the current tag), download the matching per-OS artifact from R2, and verify its `.sha256` sidecar before installing. Verification is fail closed: a checksum mismatch aborts the install. No Rust toolchain is needed.

```bash
# Linux and macOS (Unix)
curl -fsSL https://cdn.bitty.run/install/install.sh | bash

# Pin a version, preview the plan, or change the install location
curl -fsSL https://cdn.bitty.run/install/install.sh | bash -s -- --version 0.0.29
curl -fsSL https://cdn.bitty.run/install/install.sh | bash -s -- --dry-run
curl -fsSL https://cdn.bitty.run/install/install.sh | bash -s -- --prefix ~/.local
```

```powershell
# Windows (PowerShell, user-local, no admin rights needed)
irm https://cdn.bitty.run/install/install.ps1 | iex
```

What each script fetches: Linux installs the versioned `.tar.zst` bundle (binary plus desktop entry, icons, and AppStream metainfo); macOS installs the bare per-arch binary (the DMG stays an interactive drag-to-install image, unsuitable for headless install); Windows x64 installs the portable ZIP payload and Windows arm64 the bare exe. Running `install.sh` under Git-Bash fails closed and points at `install.ps1`; FreeBSD is not a bootstrap target and gets manual-download guidance. The v0.0.29 release uses hash verification through the per-asset `.sha256` sidecars.

### Native Packages

Every Linux package is install-smoked in a clean container of its own distro (Ubuntu 24.04 deb, Fedora rpm, Arch package, Alpine musl apk) before a release can publish, so a package that installs or runs nowhere never ships.

#### Debian & Ubuntu (APT Repository)

Starting in `0.0.26`, Bitty hosts a cryptographic GPG-signed APT repository backed by Cloudflare R2:

```bash
# Automated setup (fetches keyring and configures deb822 source)
curl -fsSL https://cdn.bitty.run/apt/setup.sh | sudo bash
sudo apt update && sudo apt install bitty
```

Alternatively, configure the deb822 repository manually:

```bash
sudo install -d -m 0755 /etc/apt/keyrings
curl -fsSL https://cdn.bitty.run/apt/bitty-archive-keyring.gpg | sudo tee /etc/apt/keyrings/bitty-archive-keyring.gpg > /dev/null
sudo curl -fsSL -o /etc/apt/sources.list.d/bitty.sources https://cdn.bitty.run/apt/bitty.sources
sudo apt update && sudo apt install bitty
```

#### Fedora, RHEL & CentOS Stream (Copr Repository)

Starting in `0.0.26`, continuous delivery packages are published to Fedora Copr:

```bash
sudo dnf copr enable xuepoo/bitty-terminal
sudo dnf install bitty
```

#### Arch Linux (AUR)

Prebuilt binary package and source package are published to AUR:

```bash
# Prebuilt binary package (recommended)
paru -S bitty-bin   # or: yay -S bitty-bin

# Source package (builds locally via cargo)
paru -S bitty       # or: yay -S bitty
```

#### macOS (Homebrew)

Official Homebrew tap with Intel (`x86_64`) and Apple Silicon (`arm64`) binary formulae:

```bash
brew tap bitty-terminal/homebrew-tap
brew install bitty
```

#### Windows (Scoop)

Published Scoop bucket for x64 and ARM64; the v0.0.29 manifest publishes the
artifact and its hash together with the `bitty` shim, so `scoop install bitty`
provides the `bitty` command. Register the bucket if needed:

```powershell
scoop bucket add bitty https://github.com/bitty-terminal/scoop-bucket
```

### Additional packaging status

The v0.0.29 release evidence supports these status-qualified paths:

- **Alpine Linux:** the x86_64 `.apk` artifact is published and passed the
  release install smoke test.
- **Nix / NixOS:** the release build and Cachix publication passed:
  `nix run github:bitty-terminal/bitty`.
- **FreeBSD:** the x86_64 tarball is available as a best-effort build artifact;
  no Ports or `pkg` channel is claimed.
- **Fedora Copr:** the 0.0.29 build published to every configured chroot except
  `openeuler-24.03-aarch64`, which failed on a mirror timeout; treat that
  chroot as unpublished for this release.
- **openSUSE, Gentoo, and Void:** best-effort recipes exist, but they are not
  published v0.0.29 release channels.
- **Flatpak / Flathub:** future packaging only; Bitty does not currently have a
  supported Flatpak channel.

For any channel not listed as published above, use the release assets or build
from source instead of assuming that a package-manager submission is live.

### AppImage (Linux)

The v0.0.29 x86_64 and aarch64 AppImage assets and their checksum sidecars are
available from the CDN. The release manifest records these verified SHA-256
digests:

| Architecture | AppImage                                                                                                                      | SHA-256                                                            |
| :----------- | :---------------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------- |
| x86_64       | [`bitty-x86_64-unknown-linux-gnu.AppImage`](https://cdn.bitty.run/releases/v0.0.29/bitty-x86_64-unknown-linux-gnu.AppImage)   | `89d17cc59c9d5ab21a67738790d1e9b0ca448b6e10e6e662cbe5ac0ce25cd620` |
| aarch64      | [`bitty-aarch64-unknown-linux-gnu.AppImage`](https://cdn.bitty.run/releases/v0.0.29/bitty-aarch64-unknown-linux-gnu.AppImage) | `7994b8ffcd724a7f6af59d69ef93cee43b4525b8e305f7270aa4f98efe0c20a2` |

Download the matching asset and its `.sha256` sidecar, then make it executable:

```bash
# Set this to bitty-aarch64-unknown-linux-gnu.AppImage on ARM64 Linux.
APPIMAGE=bitty-x86_64-unknown-linux-gnu.AppImage
curl -fsSLO "https://cdn.bitty.run/releases/v0.0.29/$APPIMAGE"
curl -fsSLO "https://cdn.bitty.run/releases/v0.0.29/$APPIMAGE.sha256"
sed 's#  dist/#  #' "$APPIMAGE.sha256" | sha256sum -c -
chmod +x "$APPIMAGE"
./"$APPIMAGE"
```

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
- **macOS**: `$XDG_CONFIG_HOME/bitty/init.lua` (fallback `~/.config/bitty/init.lua`; there is no `~/Library` config branch)
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
| `Alt+n`                                                                                       | New panel             | Open a panel (Spiral clockwise, Balanced fallback)  |
| `Alt+t`                                                                                       | New workspace         | Open a fresh workspace (lowest free ID)             |
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

## Selecting and Copying Text

- The pointer becomes an I-beam over terminal text. It stays an arrow over
  window padding, pane borders and gaps, the scrollbar, plugin bars, modal
  overlays, and panes that are capturing the mouse. Hold `Shift` while dragging
  in a mouse-reporting pane to select instead of sending the drag to the app.
- A drag selects exactly the cells you point at: one column of pointer travel
  selects one column, and a single character is a valid selection. Bitty
  anchors at the nearest cell edge (kitty-style half-cell), not the cell
  centre, so pressing in either half of a cell behaves predictably.
- `Alt`+drag selects a rectangular block. A vertical `Alt`+drag keeps the
  column where you pressed, so you get a one-column block rather than a
  zigzag.
- Selection ranges can span scrollback. Scroll during a drag (wheel or pager)
  and the press endpoint stays pinned while the selection grows; a committed
  selection keeps the same text when you scroll later. Detached floating panes
  and pinned panes select in their own viewport.
- A selection survives a font-size/DPI change or a window resize. Its buffer
  anchors are clamped to the new geometry; if the anchored content is gone
  (for example pruned scrollback or a respawned pane), the selection is
  dropped rather than retargeted to different text.
- `Ctrl+Shift+C` copies the selection and `Ctrl+Shift+V` pastes. Automatic
  copy-on-select stays off unless `selection.auto_copy = true`.
- Holding a selection drag in the top or bottom painted row auto-scrolls the
  pane that owns the selection, one line at a time on a fixed cadence: the top
  row pages into history, the bottom row pages back toward live, and the
  scroll pauses when the transcript has no room left in that direction.
  Auto-scroll also stops when you release the drag, move the pointer out of
  the edge row, or the window loses focus. A drag that strays past the pane
  clamps to the pane it started in and cannot select text in a sibling panel.

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

- **Linux / BSD / macOS**: `rm -rf ~/.config/bitty` (or `$XDG_CONFIG_HOME/bitty`)
- **Windows (PowerShell)**: `Remove-Item -Recurse -Force $env:APPDATA\bitty`

### 3. Remove State & Data

- **Linux / BSD / macOS**: `rm -rf ~/.local/state/bitty ~/.local/share/bitty`
- **Windows (PowerShell)**: `Remove-Item -Recurse -Force $env:LOCALAPPDATA\bitty`

## Next Steps

- [CLI Commands & Controls](cli.md) — Discover command-line flags and control daemon commands.
- [Configuration Reference](../configuration/overview.md) — Customize fonts, opacity, and keybindings with live hot reload.
- [Plugin Architecture & Development](../plugins/getting-started.md) — Build sandboxed, zero-startup-overhead Lua plugins.
