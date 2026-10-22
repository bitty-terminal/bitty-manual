# 上手示例 (Onboarding Examples)

以下均为可直接复制粘贴的起始流程，已对照 `bitty 0.0.23` 逐条验证（`bitty --help`、`bitty plugin --help`、`bitty extension --help`、`bitty config check`、`bitty inspect key`）。对应 [bitty#2143](https://github.com/bitty-terminal/bitty/issues/2143)。

## 1. 最小 `init.lua` 起始配置

创建 `~/.config/bitty/init.lua`（Linux/BSD；macOS/Windows 路径见[快速入门指南](quickstart.md)）：

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

上述每个键都存在于规范 schema（`appearance.theme`、`font.family`、`font.size`、`decoration.border`、`decoration.gaps_in`、`decoration.gaps_out`、`terminal.scrollback`、`terminal.shell`）。主题、字体与装饰类改动保存即 **Live** 生效；`terminal.scrollback` 与 `terminal.shell` 为 **RestartRequired**（需重启，见[配置参考手册](../configuration/overview.md)）。

无需启动 GUI 即可校验（已测试：退出码 `0`，8 个已设置键标注 `file:` 来源，其余为 `default`）：

```bash
bitty config check
bitty config check --config ~/.config/bitty/init.lua
```

## 2. 插件端到端流程（bar 示例）

`bitty 0.0.23` 支持从内置 id、本地目录、git URL 或本地归档安装（以 `bitty plugin --help` 为准）。下方 bar 地址符合 `https://<host>/<path>.git` 形式，其已发布 manifest id 为 `bitty-terminal.bar`（见 [`bitty-terminal/bar`](https://github.com/bitty-terminal/bar) 中的 `bitty-plugin.toml`）：

```bash
# 从 git 安装 bar 插件（会提示授权能力）
bitty plugin install https://github.com/bitty-terminal/bar.git

# 非交互式授权的同等安装
bitty plugin install https://github.com/bitty-terminal/bar.git --yes

# 查看已记录的内容
bitty plugin list
bitty plugin info bitty-terminal.bar

# 不删除记录的前提下重新启用（安装后执行为幂等操作）
bitty plugin enable bitty-terminal.bar
```

授权是显式的：安装器输出 `Grant these capabilities? [y/N]`；`--yes` 为非交互式批准，拒绝则以退出码 `1` 中止且不改变任何状态。授权绑定 manifest 精确哈希，新增能力必定需要重新确认。

bar 的按插件配置文件位于 `~/.config/bitty/plugins/bitty-terminal.bar.toml`（仅扁平 TOML 键，见[插件配置](../configuration/plugin-config.md)与[按插件配置文件](../plugins/plugin-settings.md)）。当前仅底盘标量与三个模块列表生效；按模块选项组仍为 inert（见 [Bar 模块用户指南](../plugins/bar-modules.md)）：

```toml
show = true
modules_left = ["workspaces", "cpu", "memory", "battery"]
modules_center = []
modules_right = ["clock", "pulseaudio"]
```

修改任一文件后重新校验：

```bash
bitty config check
```

## 3. 扩展流程示例

扩展是独立于插件管理的站外进程二进制（见[原生组件边界](../extensions/upstream-components.md)）。`list` 仅显示已安装项。裸 `install` 会解析本机可用的最新目录版本；`--version` 精确锁定 `X.Y.Z`。

```bash
# 仅列出已安装的扩展（未安装时为空）
bitty extension list

# 拉取最新已发布版本（TOFU 锁定，需显式确认）
bitty extension install graphics

# 锁定已确认的版本（脚本推荐）
bitty extension install graphics --version 0.0.24
bitty extension install net --version 0.0.1

# 仓库风格名称是已存储扩展名的别名
bitty extension install bitty-graphics --version 0.0.24

# 不下载，直接登记本地二进制（无网络）
bitty extension add /usr/local/bin/bitty-net

# 移除用户层扩展；按字节打印已锁定可执行文件以供审计
bitty extension remove net
bitty extension show-source net
```

发布状态会变化；权威选择器是扩展目录（`https://cdn.bitty.run/extensions/catalog.v1`）。裸 `install` 绝不猜测：目录不可用（2026-10-21 时仍为 `404`）或没有对应条目时，命令会失败并关闭，并打印具体的 `--version` 示例。可用 `https://cdn.bitty.run/extensions/<name>/<version>/SHA256SUMS` 确认锁定的版本；该日 `graphics/0.0.24` 与 `net/0.0.1` 均已上线。

## 4. Leader 键（默认 `alt+space`）

默认 Leader 和弦在 Linux/macOS/其他平台为 `alt+space`（`crates/bitty-config/src/keymap.rs` 中的 `LEADER_DEFAULT_CHORD_RAW`）；Windows 默认则为 `ctrl+space`，因为 `alt+space` 被操作系统保留。等待窗口默认 `1000` 毫秒（允许 `100..=60000`）。默认和弦不绑定任何 chrome 动作，因此不会遮挡内置快捷键（可验证：`bitty inspect key alt+space` 报告 `bound: no`、`owner: pty`）。

在 `~/.config/bitty/init.lua` 中绑定两个跟随键（已测试：`bitty config check` 退出码 `0`）。`leader` 关键字是符号化的——它解析为已配置的 Leader，而非硬编码和弦：

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

按下 `alt+space`，再在等待窗口内按 `w`（关闭视图）或 `v`（向右分屏）；`Esc` 或超时将 fail-open 回到 shell。两个动作均收录于[动作目录](../configuration/actions-catalog.md)。规范键为 `input.leader` / `input.timeout_len`（`leader_key` / `leader_timeout_ms` 为遗留别名）。

## 下一步

- [CLI 命令行控制](cli.md) — `config`、`plugin`、`extension` 动词全量参考。
- [配置参考手册](../configuration/overview.md) — 每个键、类型与重载类别。
- [Bar 模块用户指南](../plugins/bar-modules.md) — 每个 bar 模块的展示内容。
- [插件配置](../configuration/plugin-config.md) — 文件位置、完整示例与生效时机。
- [按插件配置文件](../plugins/plugin-settings.md) — TOML 子集与 fail-to-default 规则。
