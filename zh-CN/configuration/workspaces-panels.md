# 工作区与面板 (Workspaces & Panels)

Bitty 通过可组合的容器层级结构组织窗口环境，将工作区布局与各个面板的呈现方式清晰解耦。

## 层级与核心概念

```text
Window
└── Workspaces (虚拟桌面 / 标签页)
    ├── Chrome Insets / 插槽 (视觉状态栏由扩展绘制，Core 从不绘制)
    └── Panels (容器)
        ├── Presentation Mode: Tiled, Floating 或 Overlay
        └── View: Shell 进程 / PTY 会话或原生 UI 部件
```

### 工作区 (Workspaces)

**Workspace** 是一个独立的虚拟桌面。每个工作区维护自己的布局树：

- 切换工作区会切换当前可见的窗格排列，而不会挂起或中断后台正在运行的 Shell 任务。
- `workspace.layout` 会被解析、校验与合并，但当前尚未应用到新建工作区，属于预留输入而非活动选项。它接受 `"dwindle"`（Hyprland 风格的右/下交替二分平铺）、`"spiral"`（dwm-fibonacci 四向顺时针螺旋：右 -> 下 -> 左 -> 上）、`"master"`、`"grid"` 或限定名 `owner.name:algorithm`；它不会选择下述自适应新建面板策略。
- **紧凑工作区 ID (Dense Workspace IDs)**：新建工作区会分配 `1..=16` 中最小的空闲数字 ID，并按 ID 顺序排列。从 `[1, 2, 3]` 中关闭 `ws2` 后再次创建会复用 `ws2` 而非 `ws4`。
- **自适应新建面板策略**（`Mod+n` / `new_panel`）：自 0.0.28 起默认采用 Core `Spiral` 策略（dwm-fibonacci 四向顺时针螺旋：右 -> 下 -> 左 -> 上），在聚焦窗格可容纳两个满足 `10x4` 最小尺寸（扣除 `layout.gaps_in` 后）的子窗格时沿顺时针方向切分；若聚焦窗格空间不足，则自动回退至最大的可行 `Balanced` 叶子窗格。其余 Core 运行时面板切分模式包括：`Dwindle`（参考 Hyprland `dwindle`，按容器归一化宽高比始终向右侧或下方切分聚焦窗格）、`Balanced`（按字符宽高比修正轴切分最大可行窗格）以及 `BisectLargest`（按原始单元格宽高切分最大面积窗格）。显式方向切分 `new_split:<dir>` 在所有模式下始终按指定轴切分当前聚焦窗格。
- **工作区栏机制分离**：依照 Bitty 的微内核哲学，Bitty Core 本身不绘制原生工作区状态栏，亦不维护栏的 UI 状态。视觉呈现由扩展负责，配置项 `workspace.show_bar` 与 `workspace.bar.edge`（默认 `"bottom"`，亦可设为 `"top"`）是 Core 预留输入，由扩展读取。

### 面板与布局间距 (Panels & Layout Spacing)

**Panel** 是受工作区管理的容器。Panel 将窗口管理逻辑与底层终端会话彻底解耦：

- **Panel ID != View ID != Terminal ID**：Panel 承载一个 View，但其展示模式可以动态改变。
- **平铺模式 (Tiled Mode)**：Panel 参与二叉树定向平铺布局（水平与垂直分屏）。
- **单元格间距 (Cell Gaps)**：平铺窗格之间的字符单元格间距由 `layout.gaps_in`（同级窗格之间的内部间距）和 `layout.gaps_out`（外部容器边距）控制。
- **调整大小步长 (Resize Granularity)**：交互式分屏大小调整使用 `layout.resize_step`（分屏比例增量，默认 `0.05`）。
- **浮动模式 (Floating Mode)**：Panel 脱离平铺树，浮动在活动终端之上，保留其尺寸、位置和焦点状态。
- **覆层模式 (Overlay Mode)**：瞬态可聚焦层（如命令面板 Command Palette 或选择器弹窗）居中显示，并在关闭前捕获键盘输入。
- **置顶面板 (Pinned Panels)**：置顶（`toggle_pinned` 或 `bitty.panel.set_pinned`）支持将平铺面板或已分离的工作区局部浮动面板（detached float）直接移入窗口全局置顶区，并完整保留底层存活的 `PaneSession`（`bitty#3078` / `bitty#3074`），使其在切换工作区时持续可见；取消置顶会将其以浮动模式恢复至当前活动工作区。
- **便签终端 (Scratchpad Terminal)**：`toggle_scratchpad`（别名 `scratchpad_toggle`，映射至 `command:bitty.workspace:scratchpad-toggle`）可在各工作区之间停靠或恢复浮动便签终端（包括底层平铺布局已清空的情形），并在恢复布局快照时干净关闭已停靠的便签会话（`bitty#3078` / `bitty#3074`）。
- **聚焦窗格 `cwd` 继承（`bitty#3028`）**：新建分屏（`new_split:<dir>`）、自适应新建面板（`new_panel`）以及新建工作区（`workspace_new`）优先继承当前聚焦窗格的工作目录（通过 OSC 7 或平台进程 `cwd` 探测）。
- **分离浮动与置顶视图解析（`bitty#3085`）**：浮层坐标/规则求值以及未绑定的 `search_refresh` / `cw_latest_command_id` 查询均会与平铺窗格一并解析当前聚焦的分离浮动面板（detached float）与置顶视图（pinned view）。

## 管理工作区与面板

面板和工作区可以通过默认快捷键控制，也可以通过 Lua API 进行编程式管理：

- 使用快捷键创建、分屏和导航面板。
- 完整的 Lua 自动化函数（如创建面板、切换浮动模式或切换工作区），请参阅 [bitty.panel 与 bitty.workspace API 参考文档](../api/panel-workspace.md)。
