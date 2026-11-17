# 工作区与面板 (Workspaces & Panels)

Bitty 通过可组合的容器层级结构组织窗口环境，将工作区布局与各个面板的呈现方式清晰解耦。

## 层级与核心概念

```text
Window
├── Workspaces (虚拟桌面 / 标签页)
│   ├── Chrome Insets / 插槽 (视觉状态栏由扩展绘制，Core 从不绘制)
│   └── Panels (容器)
│       ├── Presentation Mode: Tiled, Floating 或 Overlay
│       └── View: Shell 进程 / PTY 会话或原生 UI 部件
└── Pinned Panels (窗口全局置顶浮动层，独立于所有工作区)
    └── Panel / View
```

> [!NOTE]
> **设计灵感 —— 动态平铺窗口管理器 vs. 传统分屏终端：**
> 尽管 Bitty 在外观上与 Tilix 等平铺式终端模拟器有相似之处，但其底层布局架构主要借鉴了 **Hyprland** 等 Wayland 动态平铺窗口管理器（以及 **Waybar** 式的扩展状态栏解耦），而非传统 GUI 工具包的分屏控件树（如 `GtkPaned`）：
>
> - **窗口内合成器 (`Workspace` + `LayoutTree`)**：Bitty 不使用嵌套的 GUI 分割容器或逐窗格原生标题栏，而是由每个工作区维护纯几何布局树（`H`/`V` 比例分割节点与同 `Terminal` 会话解耦的 `View` 叶子节点），配合字符网格级 `gaps_in`/`gaps_out` 间距在单次 GPU 场景通道中合成渲染。
> - **算法化布局与合成器式交互**：新建面板遵循动态平铺策略（`Spiral`、Hyprland `Dwindle`、`Balanced`、`BisectLargest`），面板操控直接对应窗口管理器动作（`goto_split:<dir>`、`move_split:<dir>` / `swapwindow`、`toggle_split` / `togglesplit`、`Mod`+拖拽实时重排，以及无需重挂载控件的原地 `toggle_zoom` 缩放重排）。
> - **多层表面与扩展状态栏解耦**：平铺窗格与工作区局部浮动面板、窗口全局置顶面板、跨工作区命名便签（scratchpad）以及由扩展渲染的状态栏（`bitty-terminal.bar`）协同共存。

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
- **浮动模式 (Floating Mode)**：Panel 脱离平铺树，浮动在活动终端之上，保留其尺寸、位置和焦点状态。默认浮动几何（`width = 0.8`、`height = 0.8`、`centered = true` 及可选 `x`/`y`）与背景样式（`background_opacity`、`background`）可通过 `init.lua` 中的 `floating = { ... }` 实时（`Live`）配置。
- **浮动面板交互与背景增强 (`0.0.44`)**：
  - **TUI 鼠标追踪下的拖拽移动/缩放**：即使聚焦窗格中的 TUI 应用启用了鼠标追踪（`DECSET 1000`/`1002`/`1003`），`Alt+左键拖拽` 仍可移动浮动面板（`Mod+左键拖拽` 可移动平铺窗格）；按住 `Shift` 保留为选区或应用鼠标上报的逃逸键。
  - **鼠标边缘/四角拖拽缩放**：直接在浮动面板边框/内边距环（或帧外窄抓握边带）上左键拖拽（或 `Alt+左键拖拽`）即可按边缘或四角实时缩放尺寸并显示对应方向光标，同时严格排除面板内部内容区域，确保内部点击与文本选区不受影响。
  - **浮动面板缩放 (`toggle_zoom`)**：`toggle_zoom`（默认 `alt+m` / `alt+f` / `alt+z`，`mod_key = "super"` 时重绑为 `super+m`/`f`/`z`）同样适用于 `Floating` 呈现模式及已分离的浮动面板，首次触发将浮动面板展开铺满工作区容器，再次触发恢复原有浮动状态与几何尺寸。
  - **保留单元格高亮的自定义背景**：配置 `floating.background`、`floating.background_opacity` 或便签的 `background_opacity` 时，独立浮动绘制层会在网格单元下方绘制圆角背景并仅过滤默认背景色填充，完整保留语法高亮、选区、TUI 状态条等非默认单元格背景高亮。
- **覆层模式 (Overlay Mode)**：瞬态可聚焦层（如命令面板 Command Palette 或选择器弹窗）居中显示，并在关闭前捕获键盘输入。
- **置顶面板 (Pinned Panels)**：置顶（`toggle_pinned` 或 `bitty.panel.set_pinned`）支持将平铺面板或已分离的工作区局部浮动面板（detached float）直接移入窗口全局置顶区，并完整保留底层存活的 `PaneSession`（`bitty#3078` / `bitty#3074`），使其在切换工作区时持续可见；取消置顶会将其以浮动模式恢复至当前活动工作区。
- **跨工作区命名便签 (`0.0.44`)**：通过 `scratchpads = { <name> = { ... } }` 声明最多 `32` 个跨工作区便签槽位（省略 `:<name>` 时作用于 `"default"` 槽位）；便签以跨工作区浮动层呈现，切换工作区时保持存活，也可在空平铺基座上显示：
  - **默认键位**：`shift+alt+s`（`alt+shift+s`）绑定 `toggle_scratchpad`，`ctrl+alt+s` 绑定 `move_to_scratchpad`（`mod_key = "super"` 时重绑为 `shift+super+s` / `ctrl+super+s`），`alt+s` 保持为 `toggle_split`。
  - **命名动作**：`toggle_scratchpad[:<name>]`、`move_to_scratchpad[:<name>]` 与 `scratchpad_to_tiled[:<name>]`（仅手动绑定）。
  - **首次触发自动启动**：触发未填充的已配置槽位时，`cmd`（及可选 `args` / `cwd`）会直接启动 PTY 进程（不经 Shell），而 `command = "<owner>:<command>"` 会调用插件命令并将新创建的 GUI 插件面板（`ViewContent::Panel`）直接接管为浮动便签。
  - **移入与放回平铺**：`move_to_scratchpad[:<name>]` 可将聚焦的平铺面板移入空槽位（要求至少保留 2 个平铺叶子以免清空布局）、显示隐藏槽位，或将当前显示的便签放回平铺；`scratchpad_to_tiled[:<name>]` 始终将槽位面板放回活动工作区的平铺布局。恢复布局快照时会自动干净关闭已停靠的便签会话（`bitty#3078` / `bitty#3074`）。
- **聚焦窗格 `cwd` 继承（`bitty#3028`）**：新建分屏（`new_split:<dir>`）、自适应新建面板（`new_panel`）以及新建工作区（`workspace_new`）优先继承当前聚焦窗格的工作目录（通过 OSC 7 或平台进程 `cwd` 探测）。
- **分离浮动与置顶视图解析（`bitty#3085`）**：浮层坐标/规则求值以及未绑定的 `search_refresh` / `cw_latest_command_id` 查询均会与平铺窗格一并解析当前聚焦的分离浮动面板（detached float）与置顶视图（pinned view）。

## 管理工作区与面板

面板和工作区可以通过默认快捷键控制，也可以通过 Lua API 进行编程式管理：

- 使用快捷键创建、分屏和导航面板。
- **缩放重排 (`toggle_zoom`)**：`toggle_zoom`（默认 `alt+z` / `alt+m` / `alt+f`）可将当前聚焦面板（包括 `Floating` 呈现模式及已分离的浮动面板）展开至完整内容区，并同步调整终端网格、PTY 窗口大小及触发 `SIGWINCH`；再次按键即恢复原先的平铺或浮动状态与尺寸。
- **方向聚焦 (`goto_split:<dir>`)**：`alt+h/j/k/l` 与 `alt+方向键`（`mod_key = "super"` 时重绑为 `super+h/j/k/l` 与 `super+方向键`）按空间邻接优先级切换焦点。
- **方向移动面板与分屏轴翻转 (`0.0.42`)**：`move_split:left|right|up|down`（默认 `ctrl+alt+h/j/k/l` 与 `ctrl+alt+方向键`，`mod_key = "super"` 时重绑为 `ctrl+super+h/j/k/l` 与 `ctrl+super+方向键`，别名 `move_panel`、`swap_split`、`movewindow`、`swapwindow`）将当前聚焦的平铺窗格与指定方向上空间相邻的平铺窗格互换位置，并保持焦点跟随被移动窗格；若当前聚焦的是浮动面板（floating）或置顶面板（pinned），则沿该方向按 4 个字符单元格步长微调其浮动位置（受视口边界钳制）。`toggle_split`（默认 `alt+s`，`mod_key = "super"` 时重绑为 `super+s`，别名 `togglesplit`、`split_toggle`）将当前聚焦平铺窗格最内层父级 `Split` 的分屏轴在水平（`Horizontal`）与垂直（`Vertical`）之间翻转（对齐 Hyprland dwindle `togglesplit`）。
- 完整的 Lua 自动化函数（如创建面板、切换浮动模式或切换工作区），请参阅 [bitty.panel 与 bitty.workspace API 参考文档](../api/panel-workspace.md)。
