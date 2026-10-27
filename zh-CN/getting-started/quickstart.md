# 快速入门指南 (Quick Start Guide)

欢迎使用 **Bitty**，这是一款专为现代 Linux、macOS 与 Windows 环境设计的高性能、可编程 GPU 加速终端模拟器。Bitty 将轻量级 Rust 核心与隔离的、事件驱动的 Lua 扩展引擎融为一体。

## 安装指南

Bitty 面向主流操作系统提供自动化脚本、原生软件包、预编译二进制程序或源码构建等平等的安装途径：

### 自动化一键安装脚本

安装脚本通过单一指针（`latest.txt` 记录当前 tag）解析版本，从 R2 下载匹配的系统架构产物，并在安装前校验其 `.sha256` 附带文件。校验失败即中止（fail closed）。无需 Rust 工具链。

```bash
# Linux 与 macOS (Unix)
curl -fsSL https://cdn.bitty.run/install/install.sh | bash

# 锁定版本、预览安装计划或更改安装位置
curl -fsSL https://cdn.bitty.run/install/install.sh | bash -s -- --version 0.0.26
curl -fsSL https://cdn.bitty.run/install/install.sh | bash -s -- --dry-run
curl -fsSL https://cdn.bitty.run/install/install.sh | bash -s -- --prefix ~/.local
```

```powershell
# Windows (PowerShell，用户级安装，无需管理员权限)
irm https://cdn.bitty.run/install/install.ps1 | iex
```

各脚本获取内容：Linux 安装版本化 `.tar.zst` 软件包（二进制文件外加桌面入口、图标与 AppStream 元信息）；macOS 安装裸架构二进制文件（DMG 仅为交互式拖拽安装镜像，不适合无人值守安装）；Windows x64 安装便携 ZIP 负载，Windows arm64 安装裸 exe。在 Git-Bash 下运行 `install.sh` 会失败并指引使用 `install.ps1`；FreeBSD 不是一键安装目标，请手动下载。0.1.0 的校验仅为哈希：暂无签名（Windows 签名推迟至 0.2.0 之后）。

> [!NOTE]
> **PENDING —— 在线 CDN 验证。**发布流程会在每次打 tag 时将两个脚本上传至稳定的 R2 键，但尚未完成任何一次真实 tag 上传与 CDN 回读验证。若上述 URL 无法访问，说明所有者侧发布仍未完成：请改用包管理器或从源码构建。

### 原生软件包

每个 Linux 软件包在发布前都会在其发行版的干净容器中做安装冒烟测试（Ubuntu 24.04 deb、Fedora rpm、Arch 软件包、Alpine musl apk），无法安装或运行的包不会发布。

#### Debian 与 Ubuntu (APT 静态源)

自 `0.0.26` 起，Bitty 依托 Cloudflare R2 提供经 GPG 签名的原生 APT 静态软件源：

```bash
# 自动化一键配置（安装公钥并配置 deb822 源文件）
curl -fsSL https://cdn.bitty.run/apt/setup.sh | sudo bash
sudo apt update && sudo apt install bitty
```

亦可手动配置 deb822 软件源格式与钥匙环：

```bash
sudo install -d -m 0755 /etc/apt/keyrings
curl -fsSL https://cdn.bitty.run/apt/bitty-archive-keyring.gpg | sudo tee /etc/apt/keyrings/bitty-archive-keyring.gpg > /dev/null
sudo curl -fsSL -o /etc/apt/sources.list.d/bitty.sources https://cdn.bitty.run/apt/bitty.sources
sudo apt update && sudo apt install bitty
```

#### Fedora、RHEL 与 CentOS Stream (Copr 源)

自 `0.0.26` 起，提供官方 Fedora Copr 持续交付构建：

```bash
sudo dnf copr enable xuepoo/bitty-terminal
sudo dnf install bitty
```

#### Arch Linux (AUR)

AUR 提供预编译二进制包与源码构建包：

```bash
# 预编译二进制包（推荐，开箱即用无需本地编译）
paru -S bitty-bin   # 或：yay -S bitty-bin

# 源码构建包（通过 cargo 在本地编译）
paru -S bitty       # 或：yay -S bitty
```

#### macOS (Homebrew)

官方 Homebrew Tap，同时支持 Intel (`x86_64`) 与 Apple Silicon (`arm64`)：

```bash
brew tap bitty-terminal/homebrew-tap
brew install bitty
```

#### Windows (Scoop)

官方 Scoop Bucket，支持 x64 与 ARM64：

```powershell
scoop bucket add bitty https://github.com/bitty-terminal/scoop-bucket
scoop install bitty
```

### 规划中的软件包渠道（v0.0.27 拓展）

以下操作系统与发行版的包生态已列入 `v0.0.27` 里程碑（追踪 Issue：[bitty-terminal/bitty#2507](https://github.com/bitty-terminal/bitty/issues/2507)）：

#### openSUSE 与 SUSE Linux Enterprise (OBS / Zypper)

通过 openSUSE Build Service 托管原生 RPM：

```bash
sudo zypper addrepo https://download.opensuse.org/repositories/home:/xuepoo/openSUSE_Tumbleweed/home:xuepoo.repo
sudo zypper refresh && sudo zypper install bitty
```

#### Alpine Linux (apk)

官方 community / testing 仓库的 musl 轻量构建：

```bash
apk add bitty
```

#### NixOS 与 Nix Flakes

提供官方 Flake 与 Nixpkgs derivation：

```bash
nix profile install github:bitty-terminal/bitty
# 或直接运行无需全局安装：
nix run github:bitty-terminal/bitty
```

#### Gentoo Linux (Portage)

通过自定义 Overlay 提供 ebuild 构建支持：

```bash
emerge --ask app-misc/bitty
```

#### Void Linux (XBPS)

支持 glibc 与 musl 架构的原生 xbps 软件包：

```bash
xbps-install -S bitty
```

#### FreeBSD (Ports 与 pkg)

原生 BSD 端口与预编译二进制包：

```bash
pkg install bitty
# 或通过 Ports 树编译：
cd /usr/ports/x11/bitty && make install clean
```

#### Flatpak (Flathub)

跨 Linux 发行版的隔离沙盒桌面应用：

```bash
flatpak install flathub run.bitty.Bitty
flatpak run run.bitty.Bitty
```

### Cargo（从 Git 仓库构建）

二进制程序没有 crates.io 安装途径，请从源码构建：

```bash
# 从 Git 仓库安装 `bitty` 二进制程序
# （需显式固定工具链：`cargo install --git` 不读取 rust-toolchain.toml）
cargo +1.98.1 install --git https://github.com/bitty-terminal/bitty.git bitty-terminal --locked
```

### 从源码编译

确保已安装 Rust 1.85+ 及相应平台的图形环境开发库（Linux 上需 Vulkan / Wayland / X11；macOS 上需 Metal；Windows 上需 DirectX 12 / Vulkan）：

```bash
git clone https://github.com/bitty-terminal/bitty.git
cd bitty
cargo build --release
sudo cp target/release/bitty /usr/local/bin/
```

## 首次启动

直接在命令行运行可执行文件启动 Bitty：

```bash
bitty
```

首次启动时，Bitty 会依据平台规范与探测优先级搜索配置文件：

- **Linux / BSD**：`$XDG_CONFIG_HOME/bitty/init.lua`（回退为 `~/.config/bitty/init.lua`）
- **macOS**：`~/Library/Application Support/bitty/init.lua`（或 `$XDG_CONFIG_HOME/bitty/init.lua`，回退为 `~/.config/bitty/init.lua`）
- **Windows**：`%APPDATA%\bitty\init.lua`（回退为 `%LOCALAPPDATA%\bitty\init.lua`）

> [!NOTE]
> Bitty 优先查找 `init.lua`；若不存在，也支持同级目录下的 `config.lua` 别名（兼容 WezTerm 命名习惯）。若均未找到，Bitty 将使用编译内置的零延迟默认配置直接启动。

## 默认快捷键

出厂快捷键映射是 **Alt 作为 Mod** 的映射（`Alt+h/j/k/l` 移动、`Alt+1..9` 跳转、`Shift+Alt` 分屏 等）。这是二进制程序默认使用的映射，也是 `bitty init` 写入的映射；设置 `mod_key = "super"` 会把所有感知 Mod 的和弦中的 `Mod` 槽位切换为 `Super`。裸 `Tab`、方向键、字母与数字刻意不绑定，以便直达 Shell。

| 快捷键                                                                                         | 操作                  | 说明                                       |
| :--------------------------------------------------------------------------------------------- | :-------------------- | :----------------------------------------- |
| `Alt+h` / `Alt+j` / `Alt+k` / `Alt+l`（`Alt+方向键`、`Ctrl+Alt+方向键`）                       | 焦点                  | 向左 / 下 / 上 / 右移动焦点                |
| `Ctrl+Tab` / `Ctrl+Shift+Tab`                                                                  | 循环焦点              | 聚焦下一个 / 上一个面板                    |
| `Shift+Alt+h/j/k/l`（`Shift+Alt+方向键`）                                                      | 分屏                  | 向左 / 下 / 上 / 右创建分屏                |
| `Shift+Ctrl+h/j/k/l`（`Shift+Ctrl+方向键`、`Ctrl+Shift+Alt+h/j/k/l`、`Ctrl+Shift+Alt+方向键`） | 调整大小              | 调整聚焦分屏的比例                         |
| `Ctrl+Shift+C` / `Ctrl+Shift+V`                                                                | 复制 / 粘贴           | 复制选区 / 从系统剪贴板粘贴                |
| `Alt+n`                                                                                        | 新建面板              | 新建面板（自适应 dwindle 轴）              |
| `Alt+t`                                                                                        | 新建工作区            | 打开一个新工作区                           |
| `Alt+d` / `Alt+q`                                                                              | 关闭窗格              | 关闭聚焦的窗格/视图（需确认）              |
| `Alt+w`                                                                                        | 关闭工作区            | 关闭工作区（需 kill 确认）                 |
| `Alt+-` / `Alt+=`                                                                              | 上一个 / 下一个工作区 | 切换到上一个 / 下一个工作区                |
| `Alt+Tab`                                                                                      | 上次使用的工作区      | 切换到上次使用的工作区                     |
| `Alt+[` / `Alt+]`                                                                              | 占用工作区            | 下一个 / 上一个被占用的工作区（循环）      |
| `Alt+1` … `Alt+9`                                                                              | 跳转工作区            | 聚焦工作区 N                               |
| `Shift+Alt+1` … `Shift+Alt+9`                                                                  | 移动窗口              | 将聚焦窗口移动到工作区 N                   |
| `Ctrl+Shift+Alt+1` … `Ctrl+Shift+Alt+9`                                                        | 交换工作区            | 与工作区 N 交换或移动到 N                  |
| `Alt+z` / `Alt+m` / `Alt+f`                                                                    | 缩放                  | 切换聚焦面板的缩放                         |
| `Alt+a`                                                                                        | 切换浮动              | 切换聚焦面板的平铺 / 浮动状态              |
| `Alt+u` / `Alt+i`                                                                              | 滚动                  | 向下翻页（趋向实时）/ 向上翻页（进入历史） |
| `Shift+Alt+PageUp` / `Shift+Alt+PageDown`                                                      | Prompt 导航           | 跳转到上一个 / 下一个 Shell 提示符         |
| `Alt+o`                                                                                        | 选择输出              | 选择上一条命令的输出                       |
| `Ctrl+=` / `Ctrl++` / `Ctrl+-`                                                                 | 字体缩放              | 增大 / 减小实时字体点数                    |
| `Ctrl+0`                                                                                       | 重置字号              | 将字号重置为配置的默认值                   |
| ``Alt+` ``（`Alt+?`）                                                                          | 帮助                  | 切换快捷键帮助悬浮层                       |

> [!NOTE]
> `Ctrl+Shift+F` 与 `Ctrl+Shift+Space` **不是**搜索快捷键：它们已恢复为 Shell 输入。回滚搜索没有 Core 默认快捷键；插件可自行重新绑定（见[配置参考手册](../configuration/overview.md)）。

## 卸载与数据清理

若需完全卸载 Bitty 及相关的本地用户数据：

### 1. 移除二进制文件

```bash
# Scoop (Windows)
scoop uninstall bitty

# Homebrew (macOS)
brew uninstall bitty

# Cargo（从 Git 仓库安装时）
cargo uninstall bitty-terminal

# 手动二进制安装
sudo rm /usr/local/bin/bitty
```

### 2. 移除配置文件

- **Linux / BSD**：`rm -rf ~/.config/bitty`（或 `$XDG_CONFIG_HOME/bitty`）
- **macOS**：`rm -rf ~/Library/Application\ Support/bitty ~/.config/bitty`
- **Windows (PowerShell)**：`Remove-Item -Recurse -Force $env:APPDATA\bitty`

### 3. 清理日志、状态与缓存数据

- **Linux / BSD**：`rm -rf ~/.local/state/bitty ~/.cache/bitty`
- **macOS**：`rm -rf ~/Library/Logs/bitty ~/Library/Caches/bitty`
- **Windows (PowerShell)**：`Remove-Item -Recurse -Force $env:LOCALAPPDATA\bitty`

## 下一步

- [CLI 命令行控制](cli.md) — 探索命令行参数与运行时控制守护命令。
- [配置参考手册](../configuration/overview.md) — 自定义字体、透明度及快捷键映射（支持热重载）。
- [插件架构与开发](../plugins/getting-started.md) — 构建沙箱化、零启动开销的 Lua 插件。
