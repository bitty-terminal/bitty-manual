# 快速上手指南

欢迎使用 **Bitty** —— 一款面向现代 Linux 与 macOS 环境的高性能、可编程 GPU 加速终端模拟器。Bitty 结合了极简轻量的 Rust 核心与基于 Phodopus 纯 Rust 虚拟机的隔离事件驱动 Lua 扩展引擎。

## 安装

Bitty 可以作为独立原生二进制文件运行、通过系统包管理器安装，或直接从源码编译：

### 预编译二进制与系统软件包

```bash
# Arch Linux (AUR)
paru -S bitty-bin

# Cargo 安装 (crates.io)
cargo install bitty --locked

# 从 CDN 直接安装
curl -fsSL https://cdn.bitty.run/install.sh | bash
```

### 源码编译

请确保本地已安装 Rust 1.85+ 及标准的图形依赖库（Linux 上为 Vulkan / Wayland / X11；macOS 上为 Metal）：

```bash
git clone https://github.com/bitty-terminal/bitty.git
cd bitty
cargo build --release
sudo cp target/release/bitty /usr/local/bin/
```

## 首次启动

直接在终端或启动器中调用可执行程序：

```bash
bitty
```

首次启动时，Bitty 会依据 XDG Base Directory 规范搜寻配置文件：

- **Linux / BSD**：`~/.config/bitty/init.lua`（或 `$XDG_CONFIG_HOME/bitty/init.lua`）
- **macOS**：`~/Library/Application Support/bitty/init.lua`

如果配置文件尚不存在，Bitty 将立即使用内置的零延迟默认参数启动。

## 默认快捷键

| 快捷键              | 动作              | 描述                                   |
| :------------------ | :---------------- | :------------------------------------- |
| `Ctrl+Shift+T`      | 新建标签页 / 窗口 | 打开一个新的终端工作区                 |
| `Ctrl+Shift+W`      | 关闭视图          | 关闭当前获得焦点的面板或窗格           |
| `Ctrl+Shift+P`      | 命令面板          | 打开带模糊搜索的交互式 Command Palette |
| `Ctrl+Shift+F`      | 搜索              | 打开回滚缓冲区模式搜索                 |
| `Ctrl+=` / `Ctrl+-` | 缩放              | 动态增加或减小实时字体字号             |
| `Ctrl+0`            | 重置缩放          | 将字体大小恢复为配置的默认值           |
| `Ctrl+Shift+C`      | 复制              | 复制选中文字到系统剪贴板               |
| `Ctrl+Shift+V`      | 粘贴              | 从系统剪贴板粘贴文本                   |

## 工作区架构一览

Bitty 采用清晰的三层容器层次结构来组织终端：

1. **Workspace（工作区）**：顶级虚拟桌面标签页，管理独立的平铺布局树。
2. **Panel（面板）**：窗口容器，承载终端视图、原生组件或插件应用界面。
3. **View / PTY（视图与伪终端）**：连接到底层伪终端的实际运行中的 Shell 会话。

面板既可以并排平铺，也可以切换为覆盖在工作区之上的浮动模式。

## 后续章节

- [CLI 命令与控制](cli.md) — 探索命令行参数与外部守护控制指令。
- [配置参考手册](../configuration/overview.md) — 定制字体、透明度以及热重载快捷键。
- [插件架构与开发](../plugins/getting-started.md) — 编写沙箱隔离、零启动开销的 Lua 插件。
