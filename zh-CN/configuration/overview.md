# 配置参考手册

Bitty 从 `$XDG_CONFIG_HOME/bitty/init.lua`（默认为 `~/.config/bitty/init.lua`，回退为 `config.lua`）读取用户配置。

配置采用纯 Lua 编写（WezTerm 风格的数据返回契约）。该文件在沙箱化、计费计量的环境中执行，且必须返回一个包含配置选项的表（table）。

每插件设置使用 `plugins/` 目录下的独立文件。文件位置、格式与生效时机见[插件配置](plugin-config.md)。

## 实时调和与热重载级别

Bitty 将所有配置变更划分为三个级别：

1. **`Live`**：在保存文件时即时完成调和生效，无需重启进程，且绝不中断正在进行的 PTY 会话。
2. **`RestartRequired`**：被解析并持久化至有效配置中，但在下次进程启动时才会生效（用于初始化底层运行时结构）。
3. **`Rejected`**：遇到错误类型、超出范围或未声明的字段时直接失败关闭（fail-closed），并回滚到之前的配置，同时抛出诊断信息。

## 命名配置（Named Profiles）

命名配置是一种可复用的配置层，存放于 `$XDG_CONFIG_HOME/bitty/profiles/<name>.lua`（即 `~/.config/bitty/profiles/<name>.lua`）。请求的名称来自 `--profile <name>` 命令行参数（优先生效）或 `BITTY_PROFILE` 环境变量；名称以失败关闭（fail-closed）方式校验，仅允许 `[A-Za-z0-9_-]` 字符（1–64 个字符，不含路径与扩展名）。

`init.lua` 是用户文件层。命名配置作为其**下层**参与组合，合并顺序为：

```text
CLI 覆盖 > init.lua（用户文件层）> 命名配置 > 编译内置默认值
```

`extends` 仅允许出现在命名配置层内部，构成带跳数上限的单父链：被请求的配置逐字段覆盖其祖先层。

> [!NOTE]
> **当前不存在 `default_profile` 键**：Bitty 没有可自动选择配置的配置项。默认配置必须通过 `--profile` 或 `BITTY_PROFILE` 显式指定（或使用别名 / `bitty shell-init` 包装器提供）。

## 完整配置模式

### 窗口与内边距 (Window & Padding)

| 配置字段                     | 类型      | 重载级别 | 描述                                                                                                                                                      |
| :--------------------------- | :-------- | :------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `window.opacity`             | `float`   | **Live** | 背景窗口透明度（`0.0..=1.0`）。                                                                                                                           |
| `window.padding`             | `integer` | **Live** | 窗口内部边距（逻辑像素，`0..=64`）。                                                                                                                      |
| `window.radius_px`           | `integer` | **Live** | 窗口圆角半径（物理像素，`0..=24`）；加载器接受该键，但当前为解析后的 no-op（CTX-0241 S0，合成器支持延后）。                                               |
| `window.blur_radius`         | `integer` | **Live** | 背景模糊半径（逻辑像素）。OQ-038 尚无已接受的模糊设计，因此**仅接受 `0`**；任何非零值都会以类型化的 `window.blur_radius` 错误失败关闭，而不是静默 no-op。 |
| `window.background_image`    | `string`  | **Live** | 窗口背景图路径（绝对路径或 `~` 开头，`<= 4096` 字节，需位于批准根目录下）。                                                                               |
| `window.background_fit`      | `string`  | **Live** | 适配模式：`"fill"`（覆盖，默认）、`"fit"`（容纳）、`"center"`、`"tile"`、`"stretch"`。具体语义见下方“窗口背景适配语义”。                                  |
| `window.background_opacity`  | `float`   | **Live** | 背景图压暗系数（`0.0..=1.0`，默认 `1.0`）；只乘在图像 alpha 上，随后才由 `window.opacity` 缩放整个窗口。                                                  |
| `window.background_position` | `string`  | **Live** | `"center"`（默认）、`"top-left"`、`"top"`、`"top-right"`、`"left"`、`"right"`、`"bottom-left"`、`"bottom"`、`"bottom-right"`；仅 `fit`/`center` 生效。    |

#### 窗口背景适配语义

目标框是实时窗口表面；每次窗口缩放、分屏/布局变化、DPI 变化和移动都会
重新计算。`window.padding` 不会缩小窗口背景图：它仍然铺满整个窗口并位于
网格之后。

- `fill`（默认）：等比覆盖。保持图像宽高比，在横纵两个方向都铺满窗口，
  从中心均匀裁剪溢出部分，**不留边缘空隙**。推荐的壁纸模式。
- `fit`：等比容纳。完整图像可见并在窗口中居中，剩余区域显示主题背景；
  可用 `window.background_position` 移动图像。
- `center`：原始像素尺寸（乘以 DPI 缩放），居中绘制一次。图像大于窗口时
  裁剪，小于窗口时留边。`window.background_position` 生效。
- `tile`：原始像素尺寸（乘以 DPI 缩放），从左上角开始重复，不做缩放。
- `stretch`：将完整图像非等比拉伸到整个窗口。此模式下的变形是预期行为。

`window.background_opacity` 与 `window.opacity` 按固定顺序组合：
`background_opacity` 在图像混合到主题背景时乘以图像 alpha，随后
`window.opacity` 对完成预乘的整个窗口缩放一次并交给合成器。两者相互独立：
任一侧设为 1.0 只会去掉该侧效果，同一个值不会把图像压暗两次。

> [!NOTE]
> `window.blur_radius = 0` 会被接受，表示不模糊。在有限成本的模糊契约被接受之前，
> 非零值会在配置校验阶段被拒绝
> （`window.blur_radius: background blur is not supported (OQ-038): only 0 is accepted`）。
> 相关的 `window.radius_px` 虽被加载器接受，但当前同样是解析后的 no-op。

### 装饰与边框 (Decoration & Borders)

Core 原生拥有的视图装饰以逻辑像素为单位进行度量：

| 配置字段                            | 类型      | 重载级别 | 描述                                                                       |
| :---------------------------------- | :-------- | :------- | :------------------------------------------------------------------------- |
| `decoration.border`                 | `integer` | **Live** | 视图框边框宽度（逻辑像素，`0..=32`，默认 `1`）。                           |
| `decoration.radius`                 | `integer` | **Live** | 视图框圆角半径（逻辑像素，`0..=64`，默认 `6`）。                           |
| `decoration.gaps_in`                | `integer` | **Live** | 兄弟面板之间的内部间隙（逻辑像素，`0..=128`，默认 `6`）。                  |
| `decoration.gaps_out`               | `integer` | **Live** | 容器边缘外部间隙（逻辑像素，`0..=128`，默认 `6`）。                        |
| `decoration.content_inset`          | `integer` | **Live** | 边框与渲染内容之间的内衬内边距（逻辑像素，`0..=128`）。                    |
| `decoration.border_color`           | `string`  | **Live** | 基础外框边框颜色（`#RRGGBB` 或 `#RRGGBBAA`）。                             |
| `decoration.border_color_focused`   | `string`  | **Live** | 聚焦状态下的显式外框颜色。                                                 |
| `decoration.border_color_idle`      | `string`  | **Live** | 非聚焦/闲置状态下的显式外框颜色。                                          |
| `decoration.border_width`           | `integer` | **Live** | 基础外框宽度（逻辑像素，`0..=32`，默认 `1`）。                             |
| `decoration.border_width_focused`   | `integer` | **Live** | 聚焦状态下的显式外框宽度（逻辑像素）。                                     |
| `decoration.border_width_idle`      | `integer` | **Live** | 闲置状态下的显式外框宽度（逻辑像素）。                                     |
| `decoration.background_image`       | `string`  | **Live** | 核准根目录下的全局背景图片路径。                                           |
| `decoration.background_fit`         | `string`  | **Live** | 背景填充适应模式：`"fill"`、`"fit"`、`"center"`、`"tile"` 或 `"stretch"`。 |
| `decoration.background_image_roots` | `array`   | **Live** | 背景图片解析所允许的核准目录根列表。                                       |

### 字体与整形 (Font & Shaping)

| 配置字段                 | 类型     | 重载级别            | 描述                                                            |
| :----------------------- | :------- | :------------------ | :-------------------------------------------------------------- |
| `font.family`            | `string` | **Live**            | 用于终端文本渲染的主字体族名称。                                |
| `font.size`              | `float`  | **Live**            | 字体字号点数（`0.0 < size <= 128.0`）。                         |
| `font.line_height`       | `float`  | **Live**            | 相对于字号的行高乘数（`1.0..=2.0`）。                           |
| `font.letter_spacing`    | `float`  | **Live**            | 额外字间距增量（像素，`0.0..=8.0`）。                           |
| `font.fallback`          | `array`  | **RestartRequired** | 用户按序指定的回退字体族名称列表。                              |
| `font.features`          | `array`  | **RestartRequired** | 在字形整形时应用的 OpenType 特性列表（如 `{"calt", "ss01"}`）。 |
| `font.disable_ligatures` | `string` | **RestartRequired** | 编程连字策略：`"never"`、`"cursor"` 或 `"always"`。             |

### 终端行为与选区 (Terminal Behavior & Selection)

| 配置字段                           | 类型      | 重载级别            | 描述                                                                                                                                                |
| :--------------------------------- | :-------- | :------------------ | :-------------------------------------------------------------------------------------------------------------------------------------------------- |
| `terminal.scrollback`              | `integer` | **RestartRequired** | 最大回滚缓冲区行数（`0..=100000`，默认 `10000`）。                                                                                                  |
| `terminal.shell`                   | `string`  | **RestartRequired** | 首选默认 Shell 可执行程序路径（`argv[0]`）。                                                                                                        |
| `terminal.scroll_lines_per_notch`  | `integer` | **RestartRequired** | 滚轮每刻度滚动的行数（`1..=32`，默认 `3`）。                                                                                                        |
| `terminal.scroll_pixels_per_notch` | `integer` | **RestartRequired** | 滚轮每刻度平滑滚动的像素数（`1..=256`，默认 `16`）。                                                                                                |
| `terminal.cursor_style`            | `string`  | **RestartRequired** | 初始光标形状（`"default"`、`"blinking_block"`、`"steady_block"`、`"blinking_underline"`、`"steady_underline"`、`"blinking_bar"`、`"steady_bar"`）。 |
| `terminal.bell`                    | `string`  | **RestartRequired** | 终端响铃行为（`"off"`、`"visual"`、`"audible"`、`"both"`）。                                                                                        |
| `selection.auto_copy`              | `boolean` | **RestartRequired** | 选中文本是否自动复制至系统剪贴板（默认 `false`）。                                                                                                  |
| `close_confirm`                    | `string`  | **RestartRequired** | 视图关闭确认安全模式：`"always"`、`"when_busy"`（默认）或 `"never"`。                                                                               |

### 布局与工作区 (Layout & Workspaces)

| 配置字段             | 类型      | 重载级别            | 描述                                                                             |
| :------------------- | :-------- | :------------------ | :------------------------------------------------------------------------------- |
| `layout.gaps_in`     | `integer` | **RestartRequired** | 兄弟窗格之间的网格单元间隙（字符单元格为单位，`0` 为无缝平铺）。                 |
| `layout.gaps_out`    | `integer` | **RestartRequired** | 容器边缘与窗格之间的外部间隙（字符单元格为单位）。                               |
| `layout.resize_step` | `float`   | **Live**            | 分屏缩放快捷键触发的分屏比例增量（`0.01..=0.5`，默认 `0.05`）。                  |
| `workspace.layout`   | `string`  | **RestartRequired** | 新建工作区的默认平铺布局提供者（如 `"dwindle"`、`"bsp"`）。                      |
| `workspace.show_bar` | `boolean` | **Live**            | 是否显示工作区状态栏（Core 预留输入，由扩展消费；Bitty Core 不绘制原生状态栏）。 |
| `workspace.bar.edge` | `string`  | **Live**            | 工作区状态栏边缘位置（`"top"` 或 `"bottom"`，默认 `"bottom"`，由扩展消费）。     |

### 外观、主题与动效 (Appearance, Themes & Animations)

| 配置字段                               | 类型      | 重载级别 | 描述                                                                   |
| :------------------------------------- | :-------- | :------- | :--------------------------------------------------------------------- |
| `appearance.theme`                     | `string`  | **Live** | 内置主题名称（如 `catppuccin-mocha`、`tokyo-night`、`gruvbox-dark`）。 |
| `appearance.colors`                    | `table`   | **Live** | 自定义内联调色板定义（包含 Chrome 标识色与 16 种 ANSI 颜色）。         |
| `appearance.animations.enabled`        | `boolean` | **Live** | 面板过渡与动效总开关。                                                 |
| `appearance.animations.reduced_motion` | `string`  | **Live** | 减弱动效无障碍模式（`"never"`、`"always"`、`"system"`）。              |

### 输入、键位与 Leader 键 (Input, Keymaps & Leader)

| 配置字段            | 类型      | 重载级别 | 描述                                                        |
| :------------------ | :-------- | :------- | :---------------------------------------------------------- |
| `input.leader`      | `string`  | **Live** | 规范的 Leader 键前缀和弦（如 `"ctrl+b"`、`"ctrl+space"`）。 |
| `input.timeout_len` | `integer` | **Live** | 规范的 Leader 挂起窗口超时毫秒数（`100..=60000`）。         |
| `leader_key`        | `string`  | **Live** | `input.leader` 的旧版顶层别名。                             |
| `leader_timeout_ms` | `integer` | **Live** | `input.timeout_len` 的旧版顶层别名。                        |
| `hints_enabled`     | `boolean` | **Live** | 是否启用交互式 Leader 和弦提示悬浮层。                      |
| `mod_key`           | `string`  | **Live** | 内置 Chrome 快捷键所绑定的修饰键（`"alt"` 或 `"super"`）。  |
| `keymaps`           | `array`   | **Live** | 用户快捷键覆盖与绑定定义（`chord`、`action`、`context`）。  |

### 滚动条、鼠标与会话 (Scrollbar, Mouse & Session)

| 配置字段                             | 类型      | 重载级别            | 描述                                                            |
| :----------------------------------- | :-------- | :------------------ | :-------------------------------------------------------------- |
| `scrollbar.mode`                     | `string`  | **RestartRequired** | 滚动条显示模式（`"auto"`、`"always"`、`"hidden"`）。            |
| `scrollbar.width`                    | `integer` | **RestartRequired** | 滚动条滑块厚度（逻辑像素）。                                    |
| `mouse.focus_follows_mouse`          | `boolean` | **RestartRequired** | 窗格焦点是否自动跟随光标移动。                                  |
| `mouse.focus_follows_mouse_delay_ms` | `integer` | **RestartRequired** | 悬停切换焦点前的停顿防抖时间（毫秒）。                          |
| `session.restore_on_startup`         | `boolean` | **RestartRequired** | 启动时是否自动恢复上次退出的工作区与会话。                      |
| `plugins`                            | `array`   | **RestartRequired** | 显式声明的插件列表（`{ id = "owner/name", enabled = true }`）。 |

## 完整示例 `init.lua`

以下是一份可以直接复制并用于生产环境的 `init.lua` 配置示例：

```lua
return {
  window = {
    opacity = 0.95,
    padding = 8,
    radius_px = 6,
  },
  decoration = {
    border = 1,
    radius = 6,
    gaps_in = 6,
    gaps_out = 6,
    content_inset = 6,
    border_color = "#313244",
    border_color_focused = "#89b4fa",
  },
  font = {
    family = "JetBrains Mono",
    size = 13.0,
    line_height = 1.15,
    letter_spacing = 0.0,
    disable_ligatures = "never",
  },
  terminal = {
    scrollback = 10000,
    scroll_lines_per_notch = 3,
    scroll_pixels_per_notch = 16,
    cursor_style = "steady_bar",
    bell = "visual",
  },
  selection = {
    auto_copy = false,
  },
  close_confirm = "when_busy",
  layout = {
    gaps_in = 0,
    gaps_out = 0,
    resize_step = 0.05,
  },
  workspace = {
    layout = "dwindle",
    -- 以下字段为 Core 预留输入，由扩展消费（Bitty Core 本身不绘制原生状态栏）：
    show_bar = true,
    bar = {
      edge = "bottom",
    },
  },
  appearance = {
    theme = "tokyo-night",
  },
  input = {
    leader = "ctrl+space",
    timeout_len = 1000,
  },
  hints_enabled = true,
  mod_key = "alt",
  scrollbar = {
    mode = "auto",
    width = 8,
  },
  mouse = {
    focus_follows_mouse = false,
    focus_follows_mouse_delay_ms = 150,
  },
  keymaps = {
    {
      chord = "ctrl+p",
      action = "palette:toggle",
      context = "global",
    },
  },
}
```
