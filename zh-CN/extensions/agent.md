# agent（原生扩展）

宿主无关的 AI Agent 协议词汇：有界消息、工具调用桩、只读观测、有界协调队列。不含 LLM I/O，不含网络，不含窗口/GPU 耦合（`bitty-agent` README）。

- 源码 checkout：`$BITTY_WORKSPACE/bitty-agent`（[github.com/bitty-terminal/bitty-agent](https://github.com/bitty-terminal/bitty-agent)）
- Crates：`bitty-agent-api`、`bitty-agent`
- 成熟度：合约已接受，实现尚未验证——不要将其行为视为已发布。

## 安装状态

> 未发布——已于 2026-10-16 验证（CDN `extensions/` 探测返回 404，见[目录总览](overview.md)）。没有可传给 `extension install` 的版本。

跟踪上述源码 checkout。首个预构建包发布后，按标准形式安装：

```bash
bitty extension list   # 确认当前已 staged 的内容（空表，退出码 0）
# 将来发布后：
# bitty extension install <name> --version X.Y.Z
```

## Lua / 宿主界面

该 crate 不暴露直接的 `bitty.*` Lua 命名空间。它定义宿主无关的协议词汇（`bitty.agent-1` 协议标记），供 AI 与插件消费方交换有界 Agent 消息。Wheel 0.1.0 不是 Lua 插件：它以独立 harness 产物交付，在自身进程中运行，位于插件 VM 之外，也不会获得插件能力授权。见 [wheel](https://github.com/bitty-terminal/wheel)。AI 主机本身是独立扩展，拥有自己的[能力面](ai.md)。

### Wheel Harness 配置与 Dashboard 管理

Wheel 将用户配置存放在 `$XDG_CONFIG_HOME/wheel/`（`init.lua` 及可选的 `providers/<name>.lua`），并将仅限属主访问（目录 `0700`、文件 `0600`）的持久化状态存放在 `$XDG_DATA_HOME/wheel/{settings.json,credentials.json,approvals.json}`。既可以通过 CLI 管理，也可以在 `bitty-terminal.dashboard` 插件的 `Wheel` 标签页中通过 `config.manage` 授权下的 `bitty.wheel`（别名 `bitty.config.wheel`）桥接交互管理（详见[能力鉴权与沙箱机制](../plugins/capabilities-and-sandbox.md)）：

```bash
wheel config show
wheel config set approval_mode dashboard
wheel auth status
printf '%s\n' "$API_KEY" | wheel auth set openai --stdin
wheel approvals list
wheel-session   # 启动或挂载基于 bittyd 的持久化 Wheel 会话
```

## 最小配置

原生扩展没有按扩展的用户配置文件，只需验证 staged 状态：

```bash
bitty extension list
```
