# 上游原生组件 (DIR-030)

Bitty Core 在设计上秉持**零网络代码**与**零冗余后台运行时代码**的原则。然而，扩展插件通常需要网络访问、HTTP API 调用或密集计算能力。Bitty 通过其**原生组件边界 (Native Component Boundary, DIR-030)** 架构优雅地化解了这一矛盾。

## 架构公理 (Architectural Axioms)

为了避免传统可扩展平台常见的生态混乱（即每个插件各自引入独立的 Python/Node 运行时、缺乏协调的工作进程以及重复的连接池），Bitty 确立了两大核心公理：

$$\boxed{\text{插件共享基础设施，而非重复构建基础设施}}$$
$$\boxed{\text{插件申请能力配额，而非占有系统特权}}$$

## 协进程模型 (Coprocess Model)

原生组件是独立的、单一用途的原生二进制程序，作为**上游能力提供者 (Upstream Capability Providers)** 运行：

```text
Plugin Lua Sandbox (Phodopus)
       │ (1) Capability Request: network.http("https://api.github.com/...")
       ▼
Bitty Core Host (Rust)
       │ (2) Policy Authority: Checks manifest grant, timeout, byte budget
       ▼
stdio Wire Protocol v1 (Framed JSON / Binary IPC)
       ▼
bitty-net Native Coprocess (Rust)
       │ (3) Shares HTTP/2 connection pool & TLS session cache across all plugins
       ▼
Internet (api.github.com)
```

### 关键设计原则

1. **按需按 Stdio 启动的协进程**：Bitty Core 仅在首次使用时按需拉起原生组件，通过标准输入与输出 (`stdin` / `stdout`) 进行 IPC 通信，并在空闲时平滑挂起或终止。
2. **零 `dlopen` 与零常驻守护进程**：原生组件绝不动态加载进 Core 的主进程空间（确保宿主稳定性和内存边界），也不作为常驻的系统后台守护进程运行。
3. **禁止扫描 PATH**：Bitty Core 绝不扫描系统的 `$PATH` 来发现组件。所有二进制程序均安装在显式配置的路径下，并强制通过 SHA-256 加密摘要校验完整性。
4. **机制与策略分离 (Mechanism vs. Policy Separation)**：
   - **Core 是策略权威机构 (Policy Authority)**：Core 负责校验权限授予、用户授权、请求超时时限以及数据包大小上限。
   - **组件是执行机制实体 (Execution Mechanism)**：组件负责繁重的实际工作（如 TLS 握手、HTTP/2 多路复用、DNS 解析），并在纵深防御层中二次校验传入的能力令牌。

## `bitty-net` 网络组件

首个标准官方原生组件是 `bitty-net`（构建自 `bitty-network` 仓库）。

### 插件如何消费网络能力

插件绝不直接创建原生 Socket 套接字。相反，它们在 `bitty-plugin.toml` 中声明能力需求：

```toml
[capabilities]
network = ["http"]

[network]
allow = ["api.github.com", "crates.io"]
```

在 Lua 中，插件通过宿主服务总线调用该能力：

```lua
-- 解析宿主代理的网络服务
local net = bitty.services:get("network")

-- 执行异步 HTTP 请求
net.request({
  method = "GET",
  url = "https://api.github.com/repos/bitty-terminal/bitty",
  headers = { ["User-Agent"] = "BittyPlugin/0.1" },
  timeout_ms = 5000,
}, function(response)
  if response.status == 200 then
    bitty.notify.show({
      title = "GitHub Update",
      body = "Fetched repo data successfully",
    })
  end
end)
```

### 共享基础设施优势

- **连接复用**：5 个不同的插件同时向 `api.github.com` 发送请求时，将自动复用同一个 HTTP/2 多路复用 TCP/TLS 连接。
- **统一代理与 DNS 解析**：系统代理 (`HTTPS_PROXY`)、自定义 CA 根证书与 DNS 缓存由 `bitty-net` 统一管理，无需插件单独配置。
- **超时快速封闭**：如果网络请求挂起，Core 强制执行超时约束（默认 30s，最大 300s），并确定性清理在途请求。

## 组件管理命令

通过 CLI 管理已注册的原生组件：

```bash
# 列出已注册的组件并验证二进制摘要完整性
bitty component list

# 注册一个经验证的二进制组件
bitty component add /usr/local/bin/bitty-net

# 移除组件
bitty component remove net
```
