# wheel（Agent Harness）

Wheel 是 Bitty 终端的 Agent Harness（吉祥物：仓鼠 Bittie）。0.1.0 交付物是一个**独立的 Lua 库产物**，不是 Bitty 插件包。Wheel 以独立进程运行，按自身策略持有用户的 OS 权限；Bitty 面板或终端只提供呈现与输入。

> **状态：预发布。** 0.1.0 产物及其离线安装、升级与回滚路径已实现并测试，但尚未发布任何标签或产物。0.1.0 中 Wheel 不是插件运行时插件，也不声称已发布的 Bitty 宿主集成。

- 产物版本：`0.1.0`（根目录 `VERSION`；归档 `dist/wheel-0.1.0.tar.gz`）
- 源码：[github.com/bitty-terminal/wheel](https://github.com/bitty-terminal/wheel) · 独立仓库
- 注册表：官方 `bitty-terminal.wheel` 条目仅描述过渡插件脚手架
- 权限与残余风险：[Wheel SECURITY-MODEL.md](https://github.com/bitty-terminal/wheel/blob/main/SECURITY-MODEL.md)
- 上下文快照：[Wheel CONTEXT-SNAPSHOT.md](https://github.com/bitty-terminal/wheel/blob/main/CONTEXT-SNAPSHOT.md)

## 安装与启动

产物是 Lua 5.1 模块树。在干净检出中构建确定性归档，校验 SHA-256 校验文件，然后安装到前缀：

```sh
just package
(cd dist && sha256sum -c wheel-0.1.0.tar.gz.sha256)
just install-local "$HOME/.local"
```

`just package` 离线运行，写入归档、SHA-256 校验文件与清单记录。安装器校验摘要与归档成员，解压到 `<prefix>/wheel/<version>/`，并切换相对的 `current` 符号链接。归档是确定性的但未签名，0.1.0 也没有更新通道。

产物中没有独立启动器可执行文件。启动契约是 Lua 模块根：

```sh
LUA_PATH="$HOME/.local/wheel/current/lua/?.lua;$HOME/.local/wheel/current/lua/?/init.lua;;" \
  lua5.1 -e 'local wheel = require("wheel"); print(wheel.command_catalog[1].id)'
```

安装较新版本会把旧版本保留为 `previous`；`just rollback-local "$HOME/.local"` 会把 `current` 切回旧版本。完整的安装、升级与兼容性契约见 [Wheel README](https://github.com/bitty-terminal/wheel#install)。

## 命令

`lua/wheel/init.lua` 中的 harness 命令目录定义了 14 个命令：`hello`、`status`、`graph`、`plan`、`run`、`trust`、`team`、`context`、`tools`、`orchestrate`、`models`、`branch`、`checkpoint` 与 `reflog`。其中 13 个不接受参数；`trust` 接受一个可选对象，包含 `action`、`hash` 与 `path`。每个命令返回有界的 `{ title, body }` 通知投影。

`bitty-terminal.wheel:<command>` 限定名属于过渡插件界面。当前不声称已发布的宿主集成，因此不要把 Bitty 插件管理器当作安装或调用 Wheel 0.1.0 的受支持方式。

## 过渡插件清单

仓库仍带有 manifest 版本 `0.0.1` 的 `bitty-plugin.toml`。它是未改动的模板脚手架：声明同样的 14 个命令触发器，并且只申请 `platform.notify` 能力。官方插件注册表仍按该 manifest 列出 `bitty-terminal.wheel` 身份，但该条目描述的是脚手架，而不是 0.1.0 harness 产物。该 manifest **不是** 0.1.0 的分发路径——构建产物会排除它，它不是受支持的安装途径，Wheel 也不在插件 VM 内运行，不会获得插件能力授权。0.1.0 交付也不作任何 `plugin-api` 兼容性声明。

## 本地会话守护进程（实验性）

`scripts/wheel-session` 是仓库本地的开发者工具，用于分离式本地会话守护进程；它不属于 0.1.0 产物。守护进程持有一个 `WheelContext`，通过两个私有 POSIX FIFO 提供仅限本地的控制平面，每行一个带 `wheel-session/1` 标记的有界 JSON 文档。

```sh
scripts/wheel-session start demo
scripts/wheel-session status demo
scripts/wheel-session snapshot demo
scripts/wheel-session put demo scratch/note < note.txt
scripts/wheel-session get demo scratch/note
scripts/wheel-session list demo
scripts/wheel-session probe demo
scripts/wheel-session stop demo
```

运行时根默认是 `$XDG_RUNTIME_DIR/wheel/sessions/<name>`，并回退到 XDG state 目录；`--root` 用绝对路径覆盖。会话目录为 `0700`，元数据与两个 FIFO 为 `0600`。控制平面没有网络监听、没有多用户认证，也没有对端凭据校验：同一用户的任何进程都可以打开 FIFO。该同用户残余风险记录在 [Wheel 安全模型](https://github.com/bitty-terminal/wheel/blob/main/SECURITY-MODEL.md#local-session-control-plane-experimental)中；这一层不是多用户服务。`stop` 请求显式关闭，且绝不会向未从已校验元数据读取的 pid 发送信号。快照只包含槽位元数据，从不包含槽位内容。

## 离线基准测试

基准套件用 mock provider 测量激活、有界进程调用、runner 轮次、编排与上下文编译。它不使用网络、凭据、真实 provider 或人为 sleep。

```sh
just bench                 # 完整套件，人类可读（手动运行，约一分钟）
just bench-json            # 完整套件，向 stdout 输出机器可读 JSON
just bench-release-smoke   # 有界子集，带宽松的回归上限
```

`just check` 只为此套件运行基准单元测试与一次简短的 context 场景；完整套件需手动运行。结果记录修订、解释器、主机与样本统计，不提交任何主机特定基线。release-smoke 的上限是**回归信号，不是已接受的发布预算**或性能声明。方法与限制见 [benchmark README](https://github.com/bitty-terminal/wheel/blob/main/bench/README.md)。

## 上下文快照

`WheelContext` 以 `wheel-context-snapshot/1` 格式导出并恢复带版本的确定性快照：

```lua
local WheelContext = require("wheel.context")

local snapshot, err = context:export_snapshot()
local valid, validation_err = WheelContext.validate_snapshot(snapshot)
local restored, import_err = WheelContext.import_snapshot(snapshot, opts)
local bytes, encode_err = WheelContext.canonical_snapshot(snapshot)
```

这是内存内原语：快照层不进行文件 I/O、日志或传输，因此持久化、存储权限与任何线上编码由调用方负责。校验会以 `E_SNAPSHOT_INVALID` 拒绝格式错误或超界的快照，但**不会**对快照整体做认证；`head` 与 `refs` 是未认证的指针。快照 v1 不包含 stash 条目、bus 订阅者与回调、kernel 链接、调用方配置与预算，以及缓存的派生值。

字段结构、边界、完整性限制与存储规则见 [CONTEXT-SNAPSHOT.md](https://github.com/bitty-terminal/wheel/blob/main/CONTEXT-SNAPSHOT.md)。

## 当前限制

| 方面       | 0.1.0 状态                                                                       |
| :--------- | :------------------------------------------------------------------------------- |
| 发布       | 没有已发布的标签或产物；归档未签名，且没有更新通道                               |
| 启动       | 产物不包含启动器可执行文件或交互式 CLI；`scripts/wheel-session` 是仓库本地工具   |
| Bitty 集成 | 没有已发布的宿主集成；宿主只提供呈现与输入                                       |
| Provider   | 没有实时 provider 配置加载器；实时检查使用手动、可选加入的 `just test-live` 目标 |
| 插件打包   | `bitty-plugin.toml` `0.0.1` 是过渡性的；不声称插件兼容性或权限                   |

权限上限、残余风险与证据门禁见 [Wheel README](https://github.com/bitty-terminal/wheel#readme) 与 [SECURITY-MODEL.md](https://github.com/bitty-terminal/wheel/blob/main/SECURITY-MODEL.md)。
