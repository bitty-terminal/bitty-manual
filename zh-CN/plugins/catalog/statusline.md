# statusline（已退役）

> **退役说明。** 独立的 `bitty-terminal.statusline` 插件已归档，并已从官方插件目录中移除。[bar](bar.md) 插件取代了它，负责可见的工作区状态栏与状态呈现。`statusline` 不属于 v1 UI 插槽集合——挂载它会以 `E_UI_COMPONENT_INVALID` 失败关闭——因此本页仅作历史参考。0.0.26 上不存在可安装的 statusline 版本，`bitty plugin list` 也不会显示它。

历史行为：通过状态组件组合呈现 cwd、模式、git 与任务；只要响应式终端事件触发，就重新组合声明式组件。

- 历史插件 id：`bitty-terminal.statusline`，最后声明的 manifest 版本 `0.1.0`
- 最后修订：`3eab0f44b9bf76fc8c01a029176a9bd885f91d07`，要求 Bitty **`>=0.1,<1.0`** 与插件 API `^1.0`；它从未兼容 `0.0.x` 宿主。
- 已归档仓库：[github.com/bitty-terminal/statusline](https://github.com/bitty-terminal/statusline)

## 替代方案

改用 bar 插件：

```bash
bitty plugin install bitty-terminal.bar
bitty plugin enable bitty-terminal.bar
```

模块分组、锚点、图标与指针操作见 [bar 模块用户指南](../bar-modules.md)。不要重新添加已归档仓库，也不要为了让安装通过而降低 manifest 的兼容范围。
