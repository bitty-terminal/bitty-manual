# 快速入门指南 (Quick Start Guide)

欢迎使用 **Bitty**，这是一款专为现代 Linux、macOS 与 Windows 环境设计的高性能、可编程 GPU 加速终端模拟器。Bitty 将轻量级 Rust 核心与隔离的、事件驱动的 Lua 扩展引擎融为一体。

## 安装指南

Bitty 面向主流操作系统提供自动化脚本、原生包管理器、预编译二进制程序或源码构建等平等的安装途径：

### 自动化一键安装脚本

```bash
# Linux 与 macOS (Unix)
curl -fsSL https://cdn.bitty.run/install.sh | sh

# Windows (PowerShell)
irm https://cdn.bitty.run/install.ps1 | iex
```

### 原生包管理器

```bash
# Windows (Scoop)
scoop bucket add bitty https://github.com/bitty-terminal/scoop-bucket
scoop install bitty

# macOS (Homebrew)
brew tap bitty-terminal/tap
brew install bitty

# Arch Linux (AUR / paru)
paru -S bitty-terminal

# 通用 Linux (Flatpak)
flatpak install run.bitty.Bitty
```

### Cargo (crates.io)

```bash
# 通过 Cargo 安装
# 注意：Crate 名称为 bitty-terminal（因为 crates.io 上的 bitty 名称在此之前已被其他项目注册）
cargo install bitty-terminal --locked
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

| 快捷键              | 操作            | 说明                           |
| :------------------ | :-------------- | :----------------------------- |
| `Ctrl+Shift+T`      | 新建标签页/窗口 | 打开一个新的终端工作区         |
| `Ctrl+Shift+W`      | 关闭视图        | 关闭当前聚焦的窗格或面板       |
| `Ctrl+Shift+P`      | 命令面板        | 打开带模糊搜索的交互式命令面板 |
| `Ctrl+Shift+F`      | 搜索            | 打开回滚缓冲区模式搜索         |
| `Ctrl+=` / `Ctrl+-` | 缩放            | 动态增大或减小当前字体字号     |
| `Ctrl+0`            | 重置缩放        | 重置字号为默认配置值           |
| `Ctrl+Shift+C`      | 复制            | 复制选中文本至系统剪贴板       |
| `Ctrl+Shift+V`      | 粘贴            | 从系统剪贴板粘贴文本           |

## 卸载与数据清理

若需完全卸载 Bitty 及相关的本地用户数据：

### 1. 移除二进制文件

```bash
# Scoop (Windows)
scoop uninstall bitty

# Homebrew (macOS)
brew uninstall bitty

# Cargo (crates.io)
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
