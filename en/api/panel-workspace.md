# bitty.panel & bitty.workspace

The `bitty.panel` and `bitty.workspace` modules expose bounded, capability-checked requests for panels and workspaces. A name being present in the Lua table does not mean that the host has implemented the operation.

> [!NOTE]
> New-panel placement is a Core runtime policy. `bitty.panel.create` accepts a
> content `type` only; it has no layout-mode parameter, and no 0.0.27 TOML or
> Lua setting selects `Balanced`, `Spiral`, `Dwindle`, or `BisectLargest`.

## Panel Management (`bitty.panel`)

Panels host terminal shell views, rich documents, or custom plugin UI surfaces. Plugin panel creation is limited to live zero-PTY host backends; it does not create a terminal shell or grant process-spawn authority.

> [!IMPORTANT]
> `panel.create` requires the `panel.create` capability. The current live
> backends accept `"rich"`, `"browser"`, and `"helper"`; `"canvas"` is
> accepted when that backend is available. `type = "terminal"` is rejected
> with `E_DEF_INVALID`.

### Panel Methods

#### `bitty.panel.create(spec)`

Allocates a native zero-PTY panel record. Mounting and focusing remain host-driven.

```lua
local result = bitty.panel.create({ type = "rich" })
print("Created Panel ID: " .. result.id .. ", Generation: " .. result.generation)
```

- **Parameters**: `spec` table with `type` string (`"rich"`, `"browser"`, `"helper"`, or `"canvas"` when available). `"terminal"` is not supported for plugin creation.
- **Returns**: Table with `id` (`integer`) and `generation` (`integer`).

The returned handle identifies the allocated record. It does not mean that a
panel has been mounted or focused.

### Exposed but currently unavailable panel methods

The following names are exposed in the `bitty.panel` table and are validated
against the `panel.focus` capability, but their current host backend fails
closed with `E_NOT_IMPLEMENTED`:

- `bitty.panel.close(panel_id)`
- `bitty.panel.destroy(panel_id)`
- `bitty.panel.get_presentation(panel_id)`
- `bitty.panel.set_presentation(panel_id, mode)`
- `bitty.panel.toggle_floating(panel_id)`
- `bitty.panel.get_state(panel_id)`

The built-in Core `toggle_floating` action is separate. It operates on the
focused panel through the normal keymap/action path and is not an implementation
of the plugin method `bitty.panel.toggle_floating`.

#### `bitty.panel.get_presentation(panel_id)`

Exposed query name; currently fails closed with `E_NOT_IMPLEMENTED` after the
`panel.focus` capability check.

```lua
local ok, err = pcall(bitty.panel.get_presentation, panel_id)
-- ok == false; err.code == "E_NOT_IMPLEMENTED"
```

#### `bitty.panel.set_presentation(panel_id, mode)`

Exposed mutation name; currently fails closed with `E_NOT_IMPLEMENTED` after
the `panel.focus` capability check.

```lua
local ok, err = pcall(bitty.panel.set_presentation, panel_id, "floating")
-- ok == false; err.code == "E_NOT_IMPLEMENTED"
```

#### `bitty.panel.toggle_floating(panel_id)`

Exposed mutation name; currently fails closed with `E_NOT_IMPLEMENTED` after
the `panel.focus` capability check. This is distinct from the built-in Core
`toggle_floating` action described above.

```lua
local ok, err = pcall(bitty.panel.toggle_floating, panel_id)
-- ok == false; err.code == "E_NOT_IMPLEMENTED"
```

#### `bitty.panel.get_state(panel_id)`

Exposed query name; currently fails closed with `E_NOT_IMPLEMENTED` after the
`panel.focus` capability check.

```lua
local ok, err = pcall(bitty.panel.get_state, panel_id)
-- ok == false; err.code == "E_NOT_IMPLEMENTED"
```

#### `bitty.panel.close(panel_id)` / `bitty.panel.destroy(panel_id)`

Exposed lifecycle names; both currently fail closed with `E_NOT_IMPLEMENTED`
after the `panel.focus` capability check.

```lua
local ok, err = pcall(bitty.panel.close, panel_id)
-- ok == false; err.code == "E_NOT_IMPLEMENTED"
```

---

## Workspace Management (`bitty.workspace`)

Workspaces act as independent virtual desktop tabs.

> [!IMPORTANT]
> Querying workspaces requires `workspace.read` capability. Mutating workspaces requires `workspace.control` capability in `bitty-plugin.toml`.

Workspace mutations are bounded queued requests. With `workspace.control`, a
call returns `true` only when the request is accepted by the bounded queue;
`false` means the queue refused it. The return value does not mean that the
workspace state has already changed. Core drains accepted requests on a later
application tick and applies them through the same handlers used by the
interactive actions. Requests that become invalid before that tick fail
closed without applying their state change.

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

Queues a request to create a new workspace with the lowest free ID
(`ws1`..`ws16`) and switch to it. Deleting `ws2` and creating again reuses
`ws2`, keeping IDs and bar labels dense. The call's boolean result is queue
acceptance, not immediate creation.

```lua
bitty.workspace.new()
```

#### `bitty.workspace.focus(id_or_target)`

Queues a focus request. An integer is a positive stable workspace ID. To use a
1-based position in the current workspace list, pass `{ index = n }`, where
`n` must be a positive integer:

```lua
bitty.workspace.focus(workspace_id)       -- stable ID
bitty.workspace.focus({ index = 2 })     -- 1-based position
```

Other values, zero, and non-positive `index` values fail closed with
`E_DEF_INVALID` before anything is queued. A stable ID that no longer exists
is dropped at apply time without changing state. A valid positional index uses
Core's workspace-focus behavior, which clamps a position beyond the current
list to the last workspace.

#### `bitty.workspace.next()`

Queues a request to cycle focus to the next workspace tab.

```lua
bitty.workspace.next()
```

#### `bitty.workspace.rename(id, name)`

Queues a request to rename an existing workspace. The boolean result reports
queue acceptance; the rename is applied later.

```lua
bitty.workspace.rename(workspace_id, "Development")
```

#### `bitty.workspace.close(id)`

Queues a request to close the specified workspace (or currently focused
workspace if `nil`). Plugin close timing is intentionally different from an
elevated control-plane close: an idle workspace closes when the request is
applied, while a workspace with live shells arms the interactive confirmation
gate. The user must repeat the workspace-close action to confirm the kill;
`Esc` cancels it. A plugin request never silently kills live shells.

`bitty ctl workspace close ws:N` is a separate control-plane operation. It
requires the elevated `terminal.manage` scope and, once authorized, directly
closes the workspace and its live sessions; it does not use the plugin queue or
the interactive repeat-to-confirm path.

```lua
bitty.workspace.close(workspace_id)
```

#### `bitty.workspace.move_panel(target_workspace_id)`

Queues a request to move the currently focused **tiled leaf** from the active
workspace to the workspace with this stable ID. Focus follows the moved panel
to the target workspace, and its pane session is not killed. A same-workspace
target is a no-op. An unknown target, missing focus, or a focused panel that is
not a live tiled leaf fails closed without changing state.

When the target already has tiled leaves, Core inserts the moved leaf beside
the largest target leaf using a bounded 50/50 split and the target's physical
aspect. An empty target receives the moved leaf. If the source has only that
leaf, the empty source workspace is removed. Detached workspace-local floats
are outside the tiled layout and are not moved; they remain with their source
workspace. These are the current move behavior, not a new plugin layout API.

```lua
bitty.workspace.move_panel(target_workspace_id)
```

---

## Practical Example: Zero-PTY Panel

Create a host-owned rich panel and retain its returned handle:

```lua
bitty.commands.register({
  id = "panel:create-rich",
  title = "Create Rich Panel",
  run = function()
    local created = bitty.panel.create({ type = "rich" })
    return string.format("Created panel %d (generation %d)", created.id, created.generation)
  end,
})

bitty.keymaps.suggest({
  chord = "leader t s",
  command = "panel:create-rich",
})
```
