# ai（原生扩展）

AI 主机：提供 provider 与模型选择、上下文采集、工具派发，以及 helper 侧的
`ai.*` 控制面。已接受的方向是 [原生组件边界](upstream-components.md)（DIR-030）
中的组件 `ai`，可执行文件 `bitty-ai`。它的能力不止是 UI 或 Wheel 的后端：
该组件拥有 AI 运行时，以及 AI 感知 Lua 插件所请求的能力族。

- 源码 checkout：[github.com/bitty-terminal/bitty-ai](https://github.com/bitty-terminal/bitty-ai)
- Crates：`bitty-ai-runtime`、`bitty-ai-slice`、`bitty-ai-control`、
  `bitty-ai-endpoint`、`bitty-ai-host`、`bitty-ai-mcp`
- 成熟度：实验性 / pre-alpha。确定性运行时骨架与边界 slice 属于评审证据；
  当前没有生产运行时。

## 安装状态

> 未发布 — 2026-10-21 验证（CDN `extensions/` 探测返回 404；见
> [扩展目录概览](overview.md)）。目前没有可传给 `extension install` 的版本。

当前 `bitty-ai` 仓库构建的是实验性的 `bitty-ai-helper` 控制入口（fd 3/4），
而 Core 的 `ResidentHelper` 期望 DIR-030 的 `bitty-ai` stdio 可执行文件。
该二进制/模式契约与已发布产物是安装的前提；不要把源码 checkout 当作已安装扩展。

```bash
bitty extension list   # 查看当前已 staged 的扩展（通常为空表，退出码 0）
```

## Lua / 宿主界面

AI 感知的 Lua 插件并不调用单一的 `bitty.ai` 命名空间。它们在清单中请求下列
能力头（capability head），由宿主对相应服务进行门控。AI 扩展贡献以下七个能力头：

| 能力族  | 能力头                    | 参数     | 效果                                        |
| ------- | ------------------------- | -------- | ------------------------------------------- |
| `ai`    | `ai.provider`             | 无       | 使用已允许的 AI provider                    |
| `ai`    | `ai.stream`               | 无       | 为该 agent 流式返回 AI 响应                 |
| `ai`    | `ai.model`                | 无       | 为该 agent 选择 AI 模型（有界）             |
| `mcp`   | `mcp.invoke`              | 按工具   | 调用已允许的 MCP 工具（有界 256 KiB 帧）    |
| `agent` | `agent.context.terminal`  | 无       | 观察该 agent 的终端上下文（有界 32 KiB）    |
| `agent` | `agent.context.workspace` | 无       | 观察该 agent 的工作区上下文（有界 32 KiB）  |
| `agent` | `agent.memory`            | 按作用域 | 持久化对话记忆（opt-in，`0600`，最多 7 天） |

Core 的 helper 请求生产器还接受 helper 侧 `ai.*` 控制方法：
`ai.provider_list`、`ai.model_select`、`ai.model_fallback`、`ai.model_cost`、
`ai.context_read`、`ai.extension_manifest`、`ai.extension_contribute`、
`ai.extension_activate`、`ai.cache_hint`、`ai.mcp_pin`、`ai.mcp_snapshot`、
`ai.provider_complete`、`ai.tool_dispatch`。这些是 Core 与 AI helper 之间的
控制面方法，不是 Lua 沙箱 API。provider、凭据、模型与工具 I/O 归 helper；
Core 保持无凭据的请求边界。

草案中的 Lua 编排名称（`ai.session`、`ai.context.collect`、`ai.tools.register`、
`ai.chat`）属于架构提案，尚未实现。不要基于它们编写插件。

## 最小配置

原生扩展没有每扩展的用户配置文件。AI 主机目前也没有生产 provider / 模型配置
loader：不要写入 provider 凭据或模型设置并期望 harness 读取。Provider 配置、
凭据，以及 helper 二进制/模式契约都是已接受发布设计下的后续工作。

仅验证 staging 状态：

```bash
bitty extension list
```
