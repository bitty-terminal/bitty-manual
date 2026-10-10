# 能力鉴权与沙箱机制 (Capabilities & Sandboxing)

Bitty 的插件运行时从底层即构建于**基于能力的安全模型 (Capability-based Security)** 与严格的资源隔离之上。不同于传统编辑器与终端插件系统直接继承用户的完整宿主操作系统权限，Bitty 采取坚决的**默认拒绝 (Deny-by-Default)** 策略。

## 沙箱化 VM 架构

每个活动的插件实例均在隔离的、无栈 **Phodopus**（纯 Rust 实现的 Lua）虚拟机中运行。

### 受限标准库 (Restricted Standard Library)

为消除攻击向量并防止权限提升，Lua 环境严格剔除了有安全隐患的标准库函数：

| 受限领域                  | 宿主行为         | 根由说明                                                                        |
| :------------------------ | :--------------- | :------------------------------------------------------------------------------ |
| `debug`                   | **完全移除**     | 防止篡改元表 (Metatable)、闭包自省以及沙箱逃逸。                                |
| `os.execute` / `io.popen` | **直接拒绝**     | 插件无法派生任意子 Shell 或执行宿主二进制程序。                                 |
| 裸 Socket / FFI           | **直接拒绝**     | 插件无法打开原始网络套接字，亦不可加载 C 动态链接库 (`dlopen`)。                |
| 锁根 `require`            | **强制路径约束** | 模块解析严格锁定在插件自身的目录内部，跨目录遍历 (`../`) 立即失败（封闭失败）。 |

## 能力系统 (Capability System)

插件在 `bitty-plugin.toml` 中声明其所需能力。Bitty 会计算加密清单哈希（Manifest Hash），将授予的权限永久绑定到该特定清单版本。

```toml
[capabilities]
platform.notify = true
ui = ["ui.rich", "ui.overlay"]
workspace = ["workspace.read", "workspace.control"]
network = ["http"]

[network]
allow = ["api.github.com"]

[tools.git]
required = true
version = ">=2.30"
```

### 核心能力家族

1. **`ui` 家族**：
   - `ui.rich`：允许将声明式 UI 场景挂载并更新到宿主插槽中（`top`, `bottom`, `statusline`）。
   - `ui.overlay`：允许挂载到 `overlay` 覆层插槽中。
   - `ui.overlay.focus`：允许通过 `bitty.ui.overlay.acquire` 捕获瞬态键盘输入焦点。
2. **`platform` 家族**：
   - `platform.notify`：允许通过 `bitty.notify.show` 发送桌面通知。
3. **`workspace` 家族**：
   - `workspace.read`：允许通过 `bitty.workspace.list` 检查工作区状态。
   - `workspace.control`：允许切换、创建、关闭和移动工作区与面板。
4. **`network` 家族**：
   - 必须且仅能经原生组件边界之后的上游原生协进程代理转发（见[原生组件边界](upstream-components.md)），插件永远无法直接接触裸套接字。
   - 主机与域名必须在 `[network].allow` 白名单中明确声明。
5. **`process.spawn` 与工具家族**：
   - 严禁随意创建进程。
   - 插件只能调用在 `[tools.<name>]` 中显式声明的白名单系统工具（如 `process.spawn:git`），并受宿主参数消毒、超时和输出大小截断（默认 8 KiB）的严格限制。

## 资源配额与预算 (Resource Quotas & Budgets)

为确保编写不善或恶意的插件不会导致终端卡死或耗尽系统内存，宿主强制执行确定性的硬件资源预算：

### 内存与执行上限

- **VM 内存上限**：每个插件 VM 默认上限 32 MiB。超出内存分配将安全终止该代插件实例。
- **指令燃料计量 (Fuel Metering)**：无栈 VM 对每个执行切片的字节码指令进行计数。死循环将耗尽燃料并安全报错，绝不会阻塞 UI 或终端渲染热路径。
- **场景树深度与尺寸限制**：
  - 最大 UI 树深度：16 层。
  - 每个 UI 块最大节点数：2,048 个节点。
  - 每个 UI 块最大文本内容：256 KiB。
  - 每个插件最大保留 UI 块数：64 个块。

### 事件队列预算

在宿主总线中分派的事件由三级有界环形缓冲区接管：

- **每个订阅队列**：64 个事件。
- **每个插件队列**：1,024 个事件 (256 KiB)。
- **全局宿主队列**：8,192 个事件 (2 MiB)。
- 当插件未能及时消费事件时，宿主采用 `DropOldest`（丢弃最旧事件）策略以防止内存无限增长。

## 诊断自省 (`bitty plugin list`)

随时查看已记录的来源、状态与能力授予：

```bash
bitty plugin list
bitty plugin info <id>
```
