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

Allocates a zero-PTY native panel record, binds the calling `(PluginId, generation)` as its controller owner, and queues materialization of a zero-PTY Dwindle `ViewContent::Panel` leaf in the focused workspace on the next application tick (splitting the target leaf when feasible, creating the single leaf when the layout is empty, or adopting directly into a pending GUI scratchpad slot when invoked from `scratchpads.<name>.command`). Focus moves to the materialized leaf.

```lua
local result = bitty.panel.create({ type = "rich" })
print("Created Panel ID: " .. result.id .. ", Generation: " .. result.generation)
```

- **Parameters**: `spec` table with `type` string (`"rich"`, `"browser"`, `"helper"`, or `"canvas"` when available). `"terminal"` is rejected with `E_DEF_INVALID`.
- **Returns**: Table with `id` (`integer`) and `generation` (`integer`).

Attaching declarative UI content to the panel uses `bitty.panel.mount`.

#### `bitty.panel.mount(panel_id, node)`

Mounts a declarative `UiRichNode` scene tree onto a panel owned by the calling plugin generation. Requires the `ui.rich` capability and strict `(PluginId, generation)` ownership (`E_CAPABILITY_DENIED` if another plugin or stale generation owns `panel_id`).

```lua
local mounted = bitty.panel.mount(panel_id, {
  kind = "Block",
  border = { width = 1 },
  child = { kind = "Text", text = "hello panel" },
})
```

- **Parameters**:
  - `panel_id` (`integer >= 0`): Panel id returned by `bitty.panel.create`.
  - `node` (`table`): Declarative `UiRichNode` tree (`Text`, `Row`, `Column`, `Block`, `Image`, `CodeBlock`, `Table`, `List`, or `Rule`, plus optional `style`). Band-only fields (`fg`, `bg`, `anchor`, `align`, `on_click`, `on_scroll`, `on_hover`, `region`) are rejected with `E_UI_COMPONENT_INVALID`.
- **Returns**: `boolean` (`true` when attached).

#### `bitty.panel.update(panel_id, node)`

Replaces the mounted declarative `UiRichNode` scene on an owned panel. Requires `ui.rich` and strict `(PluginId, generation)` ownership.

```lua
local updated = bitty.panel.update(panel_id, {
  kind = "Text",
  text = "updated panel",
})
```

- **Parameters**: `panel_id` (`integer >= 0`), `node` (`table` — replacement `UiRichNode` tree).
- **Returns**: `boolean` (`true` when updated).

#### `bitty.panel.unmount(panel_id)`

Detaches the declarative scene from an owned panel while leaving the panel leaf open. Requires `ui.rich` and strict `(PluginId, generation)` ownership.

```lua
local unmounted = bitty.panel.unmount(panel_id)
```

- **Parameters**: `panel_id` (`integer >= 0`).
- **Returns**: `boolean` — `true` if a scene was attached and detached; `false` if no scene was attached.

#### `bitty.panel.close(panel_id)`

Disposes an owned panel record and queues removal of its Dwindle `View` leaf (or floating/pinned view) on the next application tick. Requires the `panel.focus` capability and strict `(PluginId, generation)` ownership (`E_CAPABILITY_DENIED` otherwise).

```lua
local closed = bitty.panel.close(panel_id)
```

- **Parameters**: `panel_id` (`integer`).
- **Returns**: `boolean` (`true` when closed).

### Panel Input Events (`"panel.input"`)

When the focused leaf is a plugin-owned `ViewContent::Panel`, non-global input events (evaluated after global Bitty keybindings) are delivered exclusively to the owning plugin via `"panel.input"` — other plugins cannot snoop on another plugin's panel input. Lazy plugins must list `"panel.input"` in `[lazy].events` in `bitty-plugin.toml`.

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
    -- observed only (never consumed): p.panel_id, p.button, p.state ("press" | "release")
  end
end)
```

- **Envelope**: `{ kind = "panel.input", sequence = <integer>, payload = <table> }`.
- **Payload variants**:
  - `"key"` (consumed; never reaches a PTY): `panel_id` (`integer`), `kind` (`"key"`), `key` (`string`, e.g. `"key:x"`, `"key:Return"`), `text` (`string`), `ctrl` (`boolean`), `alt` (`boolean`), `shift` (`boolean`), `super` (`boolean`). Fires on non-synthetic, non-modifier key presses.
  - `"ime"` (consumed): `panel_id` (`integer`), `kind` (`"ime"`), `text` (`string`).
  - `"wheel"` (consumed): `panel_id` (`integer`), `kind` (`"wheel"`), `delta` (`string`).
  - `"button"` (observed only, **not** consumed — Core retains click-to-focus and selection; carries no hit-test coordinates): `panel_id` (`integer`), `kind` (`"button"`), `button` (`string`), `state` (`"press"` or `"release"`).

### Exposed but currently unavailable panel methods

The following names are exposed in the `bitty.panel` table and are validated
against the `panel.focus` capability, but their current host backend fails
closed with `E_NOT_IMPLEMENTED`:

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

#### `bitty.panel.set_pinned(panel_id, pinned)`

Pins or unpins a panel in the window-global pinned store. This method requires
the `panel.focus` capability.

```lua
local accepted = bitty.panel.set_pinned(panel_id, true)
-- accepted == true: the request was accepted for application (also returned
-- when the panel already holds the requested state)
-- accepted == false: the target is not a panel the runtime can see, or the
-- request queue is full; nothing changed
```

The call is validated against the last published layout snapshot: `true` is
returned when the target is an already-pinned panel or a live panel of the
active layout (either tiled or a detached workspace-local float) — including idempotent requests, such as pinning an
already-pinned panel or unpinning an unpinned panel, which leave state
untouched. `false` is returned — with no state change — when the target is
not known to the runtime: an unknown panel id, or a panel living on an
inactive workspace (it is not pinnable until its workspace is active).
Accepted requests apply through the same pinned-float path the
`toggle_pinned` keymap action uses, preserving the panel's live `PaneSession`
when pinning a detached float (`bitty#3078` / `bitty#3074`), so plugin and
keyboard pinning cannot drift.

Pinned panels are detached from their workspace tree into the window-global
pinned store and composited as floating windows above every workspace, so
they remain visible across workspace switches.

Setting `pinned` to `false` restores the panel to the currently active
workspace, keeps it floating, focuses it, and clears its drag re-anchor
offset. Re-tiling it instead is a separate `toggle_floating(panel_id)` call.

Accepted requests can still be refused at application time, which logs a
warning and keeps the layout untouched: pinning a fullscreen or scratchpad
panel, pinning the last live panel of a layout, or a target that vanished
between the call and the drain.

#### `bitty.panel.get_state(panel_id)`

Exposed query name; currently fails closed with `E_NOT_IMPLEMENTED` after the
`panel.focus` capability check.

```lua
local ok, err = pcall(bitty.panel.get_state, panel_id)
-- ok == false; err.code == "E_NOT_IMPLEMENTED"
```

#### `bitty.panel.destroy(panel_id)`

Exposed lifecycle name; currently fails closed with `E_NOT_IMPLEMENTED`
after the `panel.focus` capability check. Use `bitty.panel.close(panel_id)` to
close an owned plugin panel.

```lua
local ok, err = pcall(bitty.panel.destroy, panel_id)
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

Returns an array of all open workspaces in current display order, with their layout descriptors. The array position is a 1-based display position; each row's `id` is the stable numeric workspace ID and is not a position.

```lua
local list = bitty.workspace.list()
for position, ws in ipairs(list) do
  print(string.format("Workspace %d [%s]: %s (Active: %s)", position, ws.id, ws.name, tostring(ws.active)))
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

The current terminal routing uses the same stable-ID-first, display-position-fallback path for numeric focus targets. Treat `{ index = n }` as positionally unambiguous only in dense layouts: with sparse IDs, an open stable ID that equals `n` can win instead of the requested position. Use the stable `id` form when identity matters.

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
are outside the tiled layout and are not moved into the target. If the source
workspace survives, its detached floats remain there; if a singleton source
workspace is removed, its detached floats are discarded with that workspace.
These are the current move behavior, not a new plugin layout API.

```lua
bitty.workspace.move_panel(target_workspace_id)
```

Keyboard workspace operations are not uniformly positional: `workspace_focus:<n>` resolves a stable ID first and falls back to the current display position; `workspace_move:<n>` uses a display position when `n` is within the current count but can resolve a larger `n` as a stable ID; and `workspace_swap:<n>` resolves a stable ID and swaps sequence values. Do not assume that a workspace ID remains attached to the same workspace after `workspace_swap`. In dense layouts these numeric forms commonly coincide with positions, but sparse-ID positional targeting needs an explicit Core routing contract.

---

## Practical Example: Zero-PTY Panel

Create a host-owned rich panel, mount a declarative scene, handle `"panel.input"`, and close it on `Escape`:

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
