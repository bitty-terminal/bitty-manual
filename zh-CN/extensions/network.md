# network（原生扩展）

共享的、可选的网络运行时：连接池、DNS、TLS，以及供各 Lua 插件共享的线框 framing，而不必各自内置一套网络栈。Core 自身不链接任何网络代码；网络机制只存在于该 crate（`bitty-network` README）。

- 源码 checkout：`$BITTY_WORKSPACE/bitty-network`（[github.com/bitty-terminal/bitty-network](https://github.com/bitty-terminal/bitty-network)）
- Crates：`bitty-network-api`、`bitty-network-core`、`bitty-network-dns`、`bitty-network-tls`、`bitty-network-wire`、`bitty-network-lua`、`bitty-net`
- 成熟度：活跃的 L1 Rust 核心扩展库；`net 0.0.2` 扩展二进制已发布，尚待路由变更使其成为面向用户的 Lua 网络路径。

## 安装状态

> 已发布——`net 0.0.2` 的 CDN tarball 与 `SHA256SUMS` 已覆盖 Linux x86_64/aarch64、macOS arm64/x86_64 与 Windows x86_64 五个目标并全部上线（2026-10-28 验证），`extensions/catalog.v1` 已列出全部五个目标。裸 `bitty extension install net` 会将其解析为本机最新版。

跟踪上述源码 checkout。扩展名为 `net`，可执行文件为 `bitty-net`。安装已发布扩展：

```bash
bitty extension install net              # 本机最新目录版本（0.0.2）
bitty extension install net --version 0.0.2   # 精确锁定
bitty extension install bitty-net --version 0.0.2   # 仓库风格别名

bitty extension list   # 查看本地扩展清单
```

本地若有兼容的可执行文件，仍可用 `bitty extension add <path>` 暂存。安装扩展不会使其成为面向用户的 Lua 网络路径：该路由仍是独立变更。

## Lua / 宿主界面

`bitty-network-lua` 在插件 VM 中注册 `bitty.network` 表（`crates/bitty-network-lua/src/lib.rs:159`，`register_network_module`）：

- `bitty.network.echo` —— 该 crate 自测使用的往返探针（`src/callback.rs:16`）
- `bitty.network.info` —— 运行时元数据查询（`src/callback.rs:48`）

调用方需要相应的网络能力授权；未授权时宿主直接拒绝。

## 最小配置

原生扩展没有按扩展的用户配置文件，只需验证 staged 状态：

```bash
bitty extension list
```
