# 扩展目录

Bitty 有两种可安装的扩展。本目录为每一种扩展提供一页文档：功能说明、安装方法、Lua API 界面，以及最小配置示例。

## 两条安装轨道

- **原生上游扩展**（[原生组件边界](upstream-components.md)背后的 Rust 二进制）：通过 `bitty extension install <name>` 安装（从受限 CDN 目录取本机可用最新版），或 `bitty extension install <name> --version X.Y.Z`（精确锁定），也可用 `bitty extension add <path>` 从本地 staged。目录（`https://cdn.bitty.run/extensions/catalog.v1`）尚未发布（2026-10-21 仍为 404），因此裸安装当前会失败并关闭并给出 `--version` 提示；已发布的 `graphics 0.0.24` 与 `net 0.0.1` 可通过文档所述的离线回退按精确版本安装。仓库风格名称（`bitty-graphics`）是已存储组件名（`graphics`）的别名。
- **Lua 插件**（插件 API 之上的沙盒 Lua）：通过 `bitty plugin install <git-url>`（或本地目录）安装，再用 `bitty plugin enable <id>` 激活。Lua 插件没有 CDN 版本；各页面引用其 `bitty-plugin.toml` 中声明的版本。

## 安装状态图例

- **已发布** — CDN 上存在真实的 `SHA256SUMS`；页面给出精确安装命令。
- **未发布** — CDN 上不存在包；页面明确标注，并给出本地 `add`／安装所需的仓库路径。

以下发布状态于 2026-10-16 实时验证：所有 `extensions/<name>/<version>/SHA256SUMS` 探测均返回 404，而同一 CDN 的 `install/` 与 `manual/` 返回 200；以下所有仓库 URL 均经 `bitty-terminal` 组织列表确认。

## 原生上游扩展

| 扩展                             | 状态          | 页面                                      |
| -------------------------------- | ------------- | ----------------------------------------- |
| network（共享网络运行时）        | 已发布 0.0.1  | [network](network.md)                     |
| ipc（跨进程 IPC 桥）             | 未发布        | [ipc](ipc.md)                             |
| agent（Agent 协议词汇）          | 未发布        | [agent](agent.md)                         |
| observability（调试/追踪观测缝） | 未发布        | [observability](observability.md)         |
| execution（作业监管器）          | 未发布        | [execution](execution.md)                 |
| graphics（有界图像解码）         | 已发布 0.0.24 | [graphics](graphics.md)                   |
| a11y（无障碍适配器）             | 未发布        | [a11y](a11y.md)                           |
| storage（有界 KV 机制）          | 未发布        | [storage](storage.md)                     |
| url-detector（纯文本链接扫描）   | 未发布        | [url-detector](url-detector.md)           |
| platform-services（桌面通知桥）  | 未发布        | [platform-services](platform-services.md) |

当前证据：`graphics 0.0.24` 与 `net 0.0.1` 的 tarball 与 `SHA256SUMS` 已在 CDN 上线（2026-10-21 验证），精确锁定可通过文档所述的离线回退安装。扩展目录（`extensions/catalog.v1`）仍未发布（404），因此裸最新版安装会失败并关闭并给出 `--version` 提示，直至扩展 CD 任务发布目录。`network` 主线源码包含 `bitty-net` 可执行文件，但面向用户的网络路径仍使用内嵌绑定，因此安装 `net` 尚未使其成为生产 Lua 路径。`graphics` 发布有界解码组件，宿主 seam 与放置策略仍在 Core。其余八个扩展仍是仅有库的源码 checkout，没有已发布组件产物；`extension add <path>` 仅适用于本地可用的兼容可执行文件。

## Lua 插件

| 插件                                         | Manifest 版本 | 注册表   | 页面                                               |
| -------------------------------------------- | ------------- | -------- | -------------------------------------------------- |
| activity (`bitty-featured.activity`)         | 0.0.1         | official | [activity](../plugins/catalog/activity.md)         |
| bar (`bitty-terminal.bar`)                   | 0.0.1         | official | [bar](../plugins/catalog/bar.md)                   |
| composer (`bitty-terminal.composer`)         | 0.0.1         | official | [composer](../plugins/catalog/composer.md)         |
| copy-mode (`bitty-terminal.copy-mode`)       | 0.0.1         | official | [copy-mode](../plugins/catalog/copy-mode.md)       |
| file-manager (`bitty-terminal.file-manager`) | 0.1.0         | official | [file-manager](../plugins/catalog/file-manager.md) |
| git-panel (`bitty-terminal.git-panel`)       | 0.1.0         | official | [git-panel](../plugins/catalog/git-panel.md)       |
| history (`bitty-terminal.history`)           | 0.0.1         | official | [history](../plugins/catalog/history.md)           |
| palette (`bitty-terminal.palette`)           | 0.0.1         | official | [palette](../plugins/catalog/palette.md)           |
| search (`bitty-terminal.search`)             | 0.0.1         | official | [search](../plugins/catalog/search.md)             |
| statusline (`bitty-terminal.statusline`)     | 0.0.1         | 尚未注册 | [statusline](../plugins/catalog/statusline.md)     |
| wheel (`bitty-terminal.wheel`)               | 0.0.1         | official | [wheel](../plugins/catalog/wheel.md)               |
| devtools (`bitty-featured.devtools`)         | 0.1.0         | 尚未注册 | [devtools](../plugins/catalog/devtools.md)         |

`beacon`（跳转导航候选）不在目录中：它目前只是元数据脚手架，没有 manifest，也没有 Lua 实现。
