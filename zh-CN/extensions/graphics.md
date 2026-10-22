# graphics（原生扩展）

有界 PNG 解码加光栅机制子集，用于行内图像。放置策略、矩形辅助与渲染器上传校验仍在 Core（`bitty-graphics` README；`src/kitty_decode.rs`、`src/kitty_raster.rs`、`src/geometry.rs`）。

- 源码 checkout：`$BITTY_WORKSPACE/bitty-graphics`（[github.com/bitty-terminal/bitty-graphics](https://github.com/bitty-terminal/bitty-graphics)）
- Crate：`bitty-graphics`（库，`src/lib.rs`）
- 成熟度：主机 seam 已合并并测试；已发布的 `0.0.24` 扩展包含有界解码/光栅子集，放置策略、矩形辅助与渲染器上传校验仍在 Core。

## 安装状态

> 已发布——`graphics 0.0.24` 的 CDN tarball 与 `SHA256SUMS` 均已上线（2026-10-22 验证），且 `extensions/catalog.v1` 已为 `x86_64-unknown-linux-gnu` 列出该版本。裸安装会为本机目标解析 `0.0.24` 为最新版；`--version 0.0.24` 锁定同一产物。

跟踪上述源码 checkout。安装已发布扩展：

```bash
# 本机最新目录版本（当前为 0.0.24）
bitty extension install graphics
# 精确锁定（可复现自动化；目录离线时同样可用）
bitty extension install graphics --version 0.0.24

bitty extension list   # 查看本地扩展清单
```

仓库风格别名（`bitty-graphics`）解析到同一已存储扩展名。放置策略、资源策略与渲染器上传校验仍由 Core 保留；安装扩展不会转移这些职责。

## Lua / 宿主界面

该 crate 不暴露直接的 `bitty.*` Lua 命名空间。它是被 Core 消费的机制：解码与光栅数学运行在 Core 图形输入路径背后，由 Core 执行协议、放置与资源 bound。Lua 插件从不直接调用它。

## 最小配置

原生扩展没有按扩展的用户配置文件，只需验证 staged 状态：

```bash
bitty extension list
```
