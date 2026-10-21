# graphics（原生扩展）

有界 PNG 解码加光栅机制子集，用于行内图像。放置策略、矩形辅助与渲染器上传校验仍在 Core（`bitty-graphics` README；`src/kitty_decode.rs`、`src/kitty_raster.rs`、`src/geometry.rs`）。

- 源码 checkout：`$BITTY_WORKSPACE/bitty-graphics`（[github.com/bitty-terminal/bitty-graphics](https://github.com/bitty-terminal/bitty-graphics)）
- Crate：`bitty-graphics`（库，`src/lib.rs`）
- 成熟度：主机 seam 已合并并测试；已发布的 `0.0.24` 组件包含有界解码/光栅子集，放置策略、矩形辅助与渲染器上传校验仍在 Core。

## 安装状态

> 已发布——`graphics 0.0.24` 的 CDN tarball 与 `SHA256SUMS` 均已上线（2026-10-21 验证）。扩展目录（`extensions/catalog.v1`）仍未发布（404），因此裸 `bitty extension install graphics`（最新版）当前会失败并关闭并给出 `--version` 提示；请精确锁定已发布版本。

跟踪上述源码 checkout。按精确版本安装已发布组件：

```bash
# 推荐：锁定已验证版本（最新版依赖目录上线）
bitty extension install graphics --version 0.0.24
# 仓库风格别名（同一已存储组件名）
bitty extension install bitty-graphics --version 0.0.24

bitty extension list   # 确认当前已 staged 的内容
```

放置策略、资源策略与渲染器上传校验仍由 Core 保留；安装组件不会转移这些职责。

## Lua / 宿主界面

该 crate 不暴露直接的 `bitty.*` Lua 命名空间。它是被 Core 消费的机制：解码与光栅数学运行在 Core 图形输入路径背后，由 Core 执行协议、放置与资源 bound。Lua 插件从不直接调用它。

## 最小配置

原生扩展没有按扩展的用户配置文件，只需验证 staged 状态：

```bash
bitty extension list
```
