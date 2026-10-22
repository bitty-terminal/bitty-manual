# 插件快速入门 (Getting Started with Plugins)

Bitty 基于无栈、燃料计量（Fuel-metered）的 Lua 解释器（Phodopus）构建了安全、事件驱动的扩展运行时。所有插件均在隔离沙箱中运行，具备零 VM 延迟加载、严格内存上限以及细粒度能力鉴权机制。

## 插件结构 (Plugin Structure)

Bitty 插件位于独立目录中，包含一个元数据清单文件与纯 Lua 源码文件：

```text
my-plugin/
├── bitty-plugin.toml   # 权威清单：元数据、权限声明与延迟激活触发器
└── lua/
    ├── init.lua        # 激活时执行的入口文件
    └── helper.lua      # 通过根路径 require("helper") 加载的私有模块
```

## 插件清单文件 (`bitty-plugin.toml`)

每个插件根目录下都必须定义 `bitty-plugin.toml` 清单：

```toml
[plugin]
id = "custom.my-plugin"
name = "My Custom Plugin"
version = "0.1.0"
description = "A productivity tool for Bitty terminal"

[compat]
bitty = ">=0.1.0,<1.0.0"
plugin-api = "^1.0"

[capabilities]
platform.notify = true
ui = ["ui.rich"]

[lazy]
commands = ["my-plugin:open"]
events = ["terminal.opened"]
```

### 清单各表解析

- **`[plugin]`**：唯一的反向域名标识符（`id`）、可读名称、SemVer 语义化版本和描述。
- **`[compat]`**：针对 Bitty 宿主二进制程序和 Plugin API 契约的兼容性边界约束。
- **`[capabilities]`**：插件请求的显式权限。不受信任的插件不具有任何默认环境权限（Ambient Authority）；未声明的操作将直接执行失败（Fail Closed）。
- **`[lazy]`**：指示 Bitty 何时创建该插件 Lua VM 的触发器：
  - `commands`：无需预先加载 Lua 代码即可直接注册进命令面板（Command Palette）的命令。
  - `events`：唤醒插件的系统生命周期事件。
  - `claims`：对专属插槽的独占认领（例如 `claims = ["tabline"]`）。

## 延迟加载生命周期 (Lazy Loading Lifecycle)

Bitty 强制执行三态生命周期，以杜绝资源膨胀：

$$\text{Installed} \longrightarrow \text{Loaded} \longrightarrow \text{Active}$$

1. **已安装 (Installed)**：宿主解析并验证插件清单到注册表中。此时不存在任何 Lua VM，消耗 0 字节内存。
2. **已加载 (Loaded)**：延迟触发器触发（例如用户调用命令或系统事件发生）。宿主实例化独立的 Phodopus VM 并执行 `lua/init.lua`。
3. **活动中 (Active)**：插件响应事件或渲染挂载的 UI 块。空闲时，插件会转入挂起状态以节省 CPU 与电池消耗。

## 本地开发与测试

在开发过程中使用 CLI 本地安装插件：

```bash
# 将本地目录安装为插件包
bitty plugin install ./my-plugin

# 列出已记录插件及其能力授予
bitty plugin list
```

`install` 接受四种来源形式：内置或官方目录 **id**（例如 `bitty plugin install bitty-terminal.shell-integration` 或 `bitty plugin install bitty-terminal.bar`）、**本地路径/目录**、**git URL**（`https://<host>/<path>.git`、`git+https://…` 或 `git@<host>:<path>`），或本地**压缩包**（`.tar.gz`/`.tgz`/`.tar.zst`/`.zip`）。追加 `--yes` 可以非交互方式完成能力授权。

官方 id 解析自构建时从 `bitty-plugins` 注册表嵌入的目录：每个条目携带仓库、固定提交、注册表中原始 `bitty-plugin.toml` 的 SHA-256 及其声明的兼容范围。安装会拉取精确的固定提交，并在暂存前校验清单哈希，因此运行时不会请求任何注册表元数据。`bitty plugin list` 会列出所有官方条目；`compat.bitty` 不包含当前宿主的条目（例如 0.0.26 上的 `bitty-terminal.statusline`，它要求 `>=0.1,<1.0`）会显示为 `incompatible`，并以该精确范围拒绝安装。git URL、本地路径与压缩包安装方式保持不变。

## 下一步

- [能力鉴权与沙箱机制](capabilities-and-sandbox.md) — 了解安全边界、资源配额与能力家族。
- [原生组件边界](../extensions/upstream-components.md) — 理解上游预构建扩展如何在插件间共享原生基础设施。
- [Lua API 参考手册](../api/overview.md) — 探索沙箱化 `bitty.*` API 全貌。
