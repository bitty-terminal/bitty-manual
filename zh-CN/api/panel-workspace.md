# bitty.panel 与 bitty.workspace 参考手册

`bitty.panel` 和 `bitty.workspace` 模块提供对面板与工作区的有界、受能力校验的控制请求。某个名称存在于 Lua 表中并不代表宿主已实现该操作。

> [!NOTE]
> 新建面板放置策略由 Core 运行时决定。`bitty.panel.create` 仅接受内容 `type` 参数；它不提供布局模式参数，也没有任何配置键用于选择 `Balanced`、`Spiral`、`Dwindle` 或 `BisectLargest`。

## 面板管理 (`bitty.panel`)

面板承载终端 Shell 视图、富文本展示或自定义插件 UI 界面。插件创建面板仅限于无 PTY 宿主后端，不会创建终端 Shell 或授予进程派发权限。

> [!IMPORTANT]
> `bitty.panel.create` 需要 `panel.create` 能力（接受 `"rich"`、`"browser"`、`"helper"` 或 `"canvas"`，`"terminal"` 会以 `E_DEF_INVALID` 拒绝）。`bitty.panel.mount`、`update` 与 `unmount` 需要 `ui.rich` 能力及所有权校验；`bitty.panel.close` 需要 `panel.focus` 能力及所有权校验。

### 面板方法

#### `bitty.panel.create(spec)`

分配无 PTY 原生面板记录，将调用方的 `(PluginId, generation)` 绑定为控制器所有者，并在下一应用 tick 在当前聚焦工作区中实例化一个无 PTY 的 Dwindle `ViewContent::Panel` 叶子（空间允许时切分目标叶子，布局为空时创建单叶子；若由 `scratchpads.<name>.command` 触发，则直接接管到对应 GUI 便签槽位），随后将焦点移至该面板。挂载声明式 UI 树请调用 `bitty.panel.mount`。

```lua
local result = bitty.panel.create({ type = "rich" })
print("Created Panel ID: " .. result.id .. ", Generation: " .. result.generation)
```

- **参数**：包含 `type` 字符串（`"rich"`、`"browser"`、`"helper"` 或 `"canvas"`）的 `spec` 表；`"terminal"` 会被拒绝（`E_DEF_INVALID`）。
- **返回值**：包含 `id` (`integer`) 与 `generation` (`integer`) 的表。

#### `bitty.panel.mount(panel_id, node)`

将声明式 `UiRichNode` 场景树挂载到当前插件代次所拥有的面板上。需要 `ui.rich` 能力及严格的 `(PluginId, generation)` 所有权校验（非所有者或旧代次调用会以 `E_CAPABILITY_DENIED` 失败关闭）。

```lua
local mounted = bitty.panel.mount(panel_id, {
  kind = "Block",
  border = { width = 1 },
  child = { kind = "Text", text = "hello panel" },
})
```

- **参数**：
  - `panel_id` (`integer >= 0`)：`bitty.panel.create` 返回的面板 id。
  - `node` (`table`)：声明式 `UiRichNode` 树（`Text`、`Row`、`Column`、`Block`、`Image`、`CodeBlock`、`Table`、`List` 或 `Rule`，以及可选 `style`）。仅限 band 的字段（`fg`、`bg`、`anchor`、`align`、`on_click`、`on_scroll`、`on_hover`、`region`）会以 `E_UI_COMPONENT_INVALID` 拒绝。
- **返回值**：`boolean`（挂载成功返回 `true`）。

#### `bitty.panel.update(panel_id, node)`

替换已拥有面板上挂载的声明式 `UiRichNode` 场景。需要 `ui.rich` 能力及严格的 `(PluginId, generation)` 所有权校验。

```lua
local updated = bitty.panel.update(panel_id, {
  kind = "Text",
  text = "updated panel",
})
```

- **参数**：`panel_id` (`integer >= 0`)、`node` (`table` — 替换的场景树)。
- **返回值**：`boolean`（更新成功返回 `true`）。

#### `bitty.panel.unmount(panel_id)`

从已拥有的面板卸载声明式场景，同时保留面板叶子本身存活。需要 `ui.rich` 能力及严格的 `(PluginId, generation)` 所有权校验。

```lua
local unmounted = bitty.panel.unmount(panel_id)
```

- **参数**：`panel_id` (`integer >= 0`)。
- **返回值**：`boolean` — 若原先挂载有场景并成功卸载返回 `true`；若无场景则返回 `false`。

#### `bitty.panel.close(panel_id)`

销毁已拥有面板的宿主记录，并在下一应用 tick 队列中移除其 Dwindle `View` 叶子（或浮动/置顶视图）。需要 `panel.focus` 能力及严格的 `(PluginId, generation)` 所有权校验（否则返回 `E_CAPABILITY_DENIED`）。

```lua
local closed = bitty.panel.close(panel_id)
```

- **参数**：`panel_id` (`integer`)。
- **返回值**：`boolean`（关闭成功返回 `true`）。

### 面板输入事件 (`"panel.input"`)

当聚焦叶子为插件所有的 `ViewContent::Panel` 时，非全局输入事件（在 Bitty 全局键位之后求值）会通过 `"panel.input"` **仅**投递给该面板的所有者插件——其他插件无法监听别的插件的面板输入。按需懒加载插件需在 `bitty-plugin.toml` 的 `[lazy].events` 中声明 `"panel.input"`。

```lua
bitty.events.subscribe("panel.input", function(ev)
  local p = ev.payload
  if p.kind == "key" then
    -- p.panel_id, p.key ("key:<name>"), p.text, p.ctrl, p.alt, p.shift, p.super
  elseif p.kind == "ime" then
    -- p.panel_id, p.text
  elseif p.kind == "wheel" then
    -- p.panel_id, p.delta
  elseif p.kind == "button" then
    -- 仅观测（绝不消费）：p.panel_id, p.button, p.state ("press" | "release")
  end
end)
```

- **事件信封**：`{ kind = "panel.input", sequence = <integer>, payload = <table> }`。
- **负载变体**：
  - `"key"`（已消费，不会透传给 PTY）：`panel_id` (`integer`)、`kind` (`"key"`)、`key` (`string`，如 `"key:x"`、`"key:Return"`)、`text` (`string`)、`ctrl` (`boolean`)、`alt` (`boolean`)、`shift` (`boolean`)、`super` (`boolean`)。仅针对非合成、非纯修饰键的按下事件触发。
  - `"ime"`（已消费）：`panel_id` (`integer`)、`kind` (`"ime"`)、`text` (`string`)。
  - `"wheel"`（已消费）：`panel_id` (`integer`)、`kind` (`"wheel"`)、`delta` (`string`)。
  - `"button"`（仅观测，**不消费**——Core 保留点击聚焦与选区；不携带命中测试坐标）：`panel_id` (`integer`)、`kind` (`"button"`)、`button` (`string`)、`state` (`"press"` 或 `"release"`)。

### 已暴露但当前不可用的面板方法

以下名称在 `bitty.panel` 表中暴露并执行 `panel.focus` 能力校验，但其宿主后端当前均以 `E_NOT_IMPLEMENTED` 失败关闭：

- `bitty.panel.destroy(panel_id)`
- `bitty.panel.get_presentation(panel_id)`
- `bitty.panel.set_presentation(panel_id, mode)`
- `bitty.panel.toggle_floating(panel_id)`
- `bitty.panel.get_state(panel_id)`

Core 内置 `toggle_floating` 键位动作通过普通键盘映射路径作用于当前聚焦面板，并非插件方法 `bitty.panel.toggle_floating` 的实现。

#### `bitty.panel.get_presentation(panel_id)`

已暴露的查询名称；在 `panel.focus` 能力校验后当前以 `E_NOT_IMPLEMENTED` 失败关闭。

```lua
local ok, err = pcall(bitty.panel.get_presentation, panel_id)
-- ok == false; err.code == "E_NOT_IMPLEMENTED"
```

#### `bitty.panel.set_presentation(panel_id, mode)`

已暴露的变更名称；在 `panel.focus` 能力校验后当前以 `E_NOT_IMPLEMENTED` 失败关闭。

```lua
local ok, err = pcall(bitty.panel.set_presentation, panel_id, "floating")
-- ok == false; err.code == "E_NOT_IMPLEMENTED"
```

#### `bitty.panel.toggle_floating(panel_id)`

已暴露的变更名称；在 `panel.focus` 能力校验后当前以 `E_NOT_IMPLEMENTED` 失败关闭。这与上文所述的 Core 内置 `toggle_floating` 动作相互独立。

```lua
local ok, err = pcall(bitty.panel.toggle_floating, panel_id)
-- ok == false; err.code == "E_NOT_IMPLEMENTED"
```

#### `bitty.panel.set_pinned(panel_id, pinned)`

将活动工作区中的平铺面板或已分离的局部浮动面板（detached float）置顶/取消置顶至窗口全局置顶存储，并完整保留其存活的 `PaneSession`（`bitty#3078` / `bitty#3074`）。需要 `panel.focus` 能力。

```lua
local accepted = bitty.panel.set_pinned(panel_id, true)
```

取消置顶（`pinned = false`）会将面板恢复至当前活动工作区并保持浮动状态。内置 `bitty.workspace:scratchpad-toggle`（以及命名便签动作 `toggle_scratchpad[:<name>]` / `move_to_scratchpad[:<name>]`）可在空平铺基座上正常切换便签面板，并在恢复快照时自动清理已停靠的便签会话。

#### `bitty.panel.get_state(panel_id)`

已暴露的查询名称；在 `panel.focus` 能力校验后当前以 `E_NOT_IMPLEMENTED` 失败关闭。

```lua
local ok, err = pcall(bitty.panel.get_state, panel_id)
-- ok == false; err.code == "E_NOT_IMPLEMENTED"
```

#### `bitty.panel.destroy(panel_id)`

已暴露的生命周期名称；在 `panel.focus` 能力校验后当前以 `E_NOT_IMPLEMENTED` 失败关闭。请使用 `bitty.panel.close(panel_id)` 关闭由当前插件拥有的面板。

```lua
local ok, err = pcall(bitty.panel.destroy, panel_id)
-- ok == false; err.code == "E_NOT_IMPLEMENTED"
```

---

## 工作区管理 (`bitty.workspace`)

工作区充当独立的虚拟桌面标签页。

> [!IMPORTANT]
> 查询工作区需要 `workspace.read` 能力；修改工作区需要在 `bitty-plugin.toml` 中声明 `workspace.control` 能力。

### 工作区方法

#### `bitty.workspace.list()`

返回所有打开的工作区及其布局描述符的数组。

```lua
local list = bitty.workspace.list()
for _, ws in ipairs(list) do
  print(string.format("Workspace [%s]: %s (Active: %s)", ws.id, ws.name, tostring(ws.active)))
end
```

#### `bitty.workspace.new()`

创建一个新的工作区标签页。

```lua
bitty.workspace.new()
```

#### `bitty.workspace.focus(id)`

将活动视图切换至与 `id` 匹配的工作区。

```lua
bitty.workspace.focus(workspace_id)
```

#### `bitty.workspace.next()`

循环聚焦到下一个工作区标签页。

```lua
bitty.workspace.next()
```

#### `bitty.workspace.rename(id, name)`

重命名已有工作区。

```lua
bitty.workspace.rename(workspace_id, "Development")
```

#### `bitty.workspace.close(id)`

关闭指定工作区（若为 `nil` 则关闭当前聚焦的工作区）。

```lua
bitty.workspace.close(workspace_id)
```

#### `bitty.workspace.move_panel(target_workspace_id)`

将当前聚焦的面板移动到另一个工作区标签页。

```lua
bitty.workspace.move_panel(target_workspace_id)
```

---

## 实战示例：无 PTY 面板 (Zero-PTY Panel)

创建一个由宿主管理的富文本面板、挂载声明式场景、响应 `"panel.input"`，并在按下 `Escape` 时关闭：

```lua
local active_panel_id = nil

bitty.commands.register({
  id = "panel:open-rich",
  title = "Open Rich Panel",
  run = function()
    local created = bitty.panel.create({ type = "rich" })
    active_panel_id = created.id
    bitty.panel.mount(active_panel_id, {
      kind = "Block",
      border = { width = 1 },
      child = { kind = "Text", text = "Press Escape to close" },
    })
    return active_panel_id
  end,
})

bitty.events.subscribe("panel.input", function(ev)
  local p = ev.payload
  if active_panel_id and p.panel_id == active_panel_id and p.kind == "key" then
    if p.key == "key:Escape" then
      bitty.panel.close(active_panel_id)
      active_panel_id = nil
    else
      bitty.panel.update(active_panel_id, {
        kind = "Text",
        text = "Last key: " .. tostring(p.key),
      })
    end
  end
end)

bitty.keymaps.suggest({
  chord = "leader t s",
  command = "panel:open-rich",
})
```
