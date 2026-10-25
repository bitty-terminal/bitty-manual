# bitty.panel & bitty.workspace

The `bitty.panel` and `bitty.workspace` modules provide programmatic control over window layout, pane presentation modes, and multi-workspace organization.

> [!NOTE]
> New-panel placement is a Core runtime policy. `bitty.panel.create` accepts a
> content `type` only; it has no layout-mode parameter, and no 0.0.27 TOML or
> Lua setting selects `Balanced`, `Spiral`, `Dwindle`, or `BisectLargest`.

## Panel Management (`bitty.panel`)

Panels host terminal shell views, rich documents, or custom plugin UI surfaces.

### Panel Methods

#### `bitty.panel.create(spec)`

Creates a new panel inside the active workspace.

```lua
local result = bitty.panel.create({ type = "terminal" })
print("Created Panel ID: " .. result.id .. ", Generation: " .. result.generation)
```

- **Parameters**: `spec` table with `type` string (`"terminal"`, `"rich"`, or custom provider).
- **Returns**: Table with `id` (`integer`) and `generation` (`integer`).

#### `bitty.panel.get_presentation(panel_id)`

Queries the current presentation mode of a panel.

```lua
local mode = bitty.panel.get_presentation(panel_id)
-- Returns: "tiled", "floating", or "overlay"
```

#### `bitty.panel.set_presentation(panel_id, mode)`

Sets the presentation mode of a panel dynamically.

```lua
bitty.panel.set_presentation(panel_id, "floating")
```

#### `bitty.panel.toggle_floating(panel_id)`

Toggles a panel between tiled binary-tree layout and floating window mode.

```lua
local is_floating = bitty.panel.toggle_floating(panel_id)
```

#### `bitty.panel.set_pinned(panel_id, pinned)`

Sets whether a panel is pinned as a window-global sticky float. This method
requires the `panel.focus` capability.

```lua
local applied = bitty.panel.set_pinned(panel_id, true)
-- `true` means the panel is now pinned; this is also returned when it was
-- already pinned.
```

Pinned panels live outside every workspace and remain visible when the active
workspace changes. Setting `pinned` to `false` restores the panel to the
currently active workspace, focuses it, and leaves it in floating mode.

The return value is `true` when the requested state holds, including an
idempotent call that makes no change. It is `false` for an unknown or
unpinnable target, and those failures leave state unchanged. Only tiled or
floating panels can be pinned; fullscreen and scratchpad panels cannot be
pinned, and pinning the last live panel in a layout is refused. An unpinned
panel can be passed with `pinned = false` and still returns `true` as an
idempotent no-op.

#### `bitty.panel.get_state(panel_id)`

Fetches geometric dimensions, focus status, and view properties of a panel.

```lua
local state = bitty.panel.get_state(panel_id)
if state then
  print(string.format("Width: %d, Height: %d, Focused: %s", state.width, state.height, tostring(state.focused)))
end
```

#### `bitty.panel.close(panel_id)` / `bitty.panel.destroy(panel_id)`

Closes or forcefully destroys a panel.

```lua
bitty.panel.close(panel_id)
```

---

## Workspace Management (`bitty.workspace`)

Workspaces act as independent virtual desktop tabs.

> [!IMPORTANT]
> Querying workspaces requires `workspace.read` capability. Mutating workspaces requires `workspace.control` capability in `bitty-plugin.toml`.

### Workspace Methods

#### `bitty.workspace.list()`

Returns an array of all open workspaces in workspace-ID order, with their layout descriptors.

```lua
local list = bitty.workspace.list()
for _, ws in ipairs(list) do
  print(string.format("Workspace [%s]: %s (Active: %s)", ws.id, ws.name, tostring(ws.active)))
end
```

#### `bitty.workspace.new()`

Creates a new workspace with the lowest free ID (`ws1`..`ws16`) and switches to it. Deleting `ws2` and creating again reuses `ws2`, keeping IDs and bar labels dense.

```lua
bitty.workspace.new()
```

#### `bitty.workspace.focus(id)`

Switches active view to the workspace matching `id`.

```lua
bitty.workspace.focus(workspace_id)
```

#### `bitty.workspace.next()`

Cycles focus to the next workspace tab.

```lua
bitty.workspace.next()
```

#### `bitty.workspace.rename(id, name)`

Renames an existing workspace.

```lua
bitty.workspace.rename(workspace_id, "Development")
```

#### `bitty.workspace.close(id)`

Closes the specified workspace (or currently focused workspace if `nil`).

```lua
bitty.workspace.close(workspace_id)
```

#### `bitty.workspace.move_panel(target_workspace_id)`

Moves the currently focused panel to another workspace tab.

```lua
bitty.workspace.move_panel(target_workspace_id)
```

---

## Practical Example: Scratchpad Panel

Build a toggleable floating scratchpad terminal:

```lua
local scratchpad_id = nil

bitty.commands.register({
  id = "scratchpad:toggle",
  title = "Toggle Floating Scratchpad",
  run = function()
    if not scratchpad_id then
      local created = bitty.panel.create({ type = "terminal" })
      scratchpad_id = created.id
      bitty.panel.set_presentation(scratchpad_id, "floating")
    else
      local state = bitty.panel.get_state(scratchpad_id)
      if state and state.focused then
        bitty.panel.close(scratchpad_id)
        scratchpad_id = nil
      else
        bitty.panel.set_presentation(scratchpad_id, "floating")
      end
    end
  end,
})

bitty.keymaps.suggest({
  chord = "leader t s",
  command = "scratchpad:toggle",
})
```
