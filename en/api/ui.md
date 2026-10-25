# bitty.ui Reference

The `bitty.ui` module provides the declarative UI contribution surface. Plugins construct and mount declarative scene trees into host-managed slots, altering presentation while preserving terminal grid integrity.

## Design Principles

- **Declarative Only**: Lua plugins produce immutable description trees. The Rust host handles layout computation and composites directly via `wgpu`.
- **No Immediate-Mode Loops**: Lua never participates in per-frame draw loops. Updates occur reactively when state changes.
- **Strict Budgets**: Scene depth, node counts, and text allocations are strictly capped to prevent frame drops.

## Core Methods

### `bitty.ui.mount(slot, component)`

Mounts a declarative component tree into a host-managed slot.

```lua
local handle = bitty.ui.mount(slot, component)
```

- **Parameters**:
  - `slot` (`string`): The target slot name.
  - `component` (`table`): A declarative node table.
- **Returns**: `integer` — An opaque, generation-owned `block_id` handle.
- **Required Capability**: `ui.rich` in `bitty-plugin.toml`.

#### Supported Slots

| Slot Name    | Placement Status | Description                                                                                                                             |
| :----------- | :--------------- | :-------------------------------------------------------------------------------------------------------------------------------------- |
| `"top"`      | **Painted**      | Top edge chrome band.                                                                                                                   |
| `"bottom"`   | **Painted**      | Bottom edge chrome band.                                                                                                                |
| `"left"`     | **Unavailable**  | Accepted slot name, but this build has no vertical band host (`E_UI_UNAVAILABLE`).                                                      |
| `"right"`    | **Unavailable**  | Accepted slot name, but this build has no vertical band host (`E_UI_UNAVAILABLE`).                                                      |
| `"tabline"`  | **Unavailable**  | Reserved for panel tabs; requires the `[lazy].claims = ["workspaceline"]` claim, and no host surface is available (`E_UI_UNAVAILABLE`). |
| `"overlay"`  | **Mounted**      | Core-hosted overlay block; call `bitty.ui.overlay.show` to present it without capture. Requires `ui.rich` and `ui.overlay`.             |
| `"terminal"` | **Unavailable**  | Accepted slot name, but no terminal-attached block host is available (`E_UI_UNAVAILABLE`).                                              |

The closed v1 set has exactly these seven names. The retired `"statusline"` name is not a slot: mounting it fails closed with `E_UI_COMPONENT_INVALID`, exactly like any other unknown slot. Status presentation belongs to the [bar](../plugins/catalog/bar.md) plugin's `bottom` (or `top`) band. Unsupported names in the closed set fail closed with `E_UI_UNAVAILABLE`; they are not silently stored for a future host.

### `bitty.ui.update(block_id, component)`

Replaces the scene subtree associated with an active `block_id`.

```lua
local ok = bitty.ui.update(handle, component)
```

- **Parameters**:
  - `block_id` (`integer`): Handle returned by a previous `bitty.ui.mount` call.
  - `component` (`table`): The replacement component tree.
- **Returns**: `boolean` — `true` if updated successfully; `false` if the handle is stale or owned by another generation.

## Declarative Node Vocabulary

Bitty Plugin API v1 accepts four lightweight declarative node kinds:

### 1. `Text`

A leaf node displaying styled text content.

```lua
{
  kind = "Text",
  text = "  bitty ",
  fg = "accent",          -- Current host token
  bg = "background",      -- Current host token
  bold = true,            -- Optional boolean
  on_click = {            -- Optional command trigger
    command = "my-plugin:toggle",
    args = { mode = "fast" },
  },
}
```

`fg` and `bg` accept bounded, lowercase theme-token names (a token must start
with a lowercase letter and use only `[a-z0-9._-]`). The current host resolves
only `foreground`, `background`, `cursor`, `selection`, and `accent`;
unknown tokens fall back to the span default and are counted in host
diagnostics. Raw hexadecimal colour strings are not accepted by the bridge and
should not be used in these fields. A wider token namespace is not part of the
current manual contract.

### 2. `Row`

A container laying out child nodes horizontally.

```lua
{
  kind = "Row",
  children = {
    { kind = "Text", text = "Branch: " },
    { kind = "Text", text = "main", fg = "accent", bold = true },
  },
}
```

### 3. `Column`

A container laying out child nodes vertically.

```lua
{
  kind = "Column",
  children = {
    { kind = "Text", text = "Line 1" },
    { kind = "Text", text = "Line 2" },
  },
}
```

### 4. `List`

A sequential list container.

```lua
{
  kind = "List",
  children = { item1, item2, item3 },
}
```

> [!NOTE]
> Heavy nodes such as `Block`, `Image`, `CodeBlock`, `Table`, and `Rule` are excluded from v1. Passing them returns error `E_UI_COMPONENT_INVALID`.

Malformed node tables, wrong field types, invalid token names, and out-of-range
values fail closed with the typed `E_UI_COMPONENT_INVALID` validation error.
Unknown slot names fail with the same typed validation error; accepted slots
without a host fail with `E_UI_UNAVAILABLE` instead. The `"tabline"` slot is
the exception to this general rule: without the canonical
`[lazy].claims = ["workspaceline"]` claim it fails with `E_UI_CLAIM_REQUIRED`;
with that claim but no host surface it fails with `E_UI_UNAVAILABLE`.

## Interactive Band Commands (`on_click` and `on_scroll`)

Nodes mounted in a painted `top` or `bottom` band can bind interactive clicks
and scrolls. When clicked, Core dispatches the event through the Command Bus
rather than invoking an arbitrary Lua closure on the rendering thread.

```lua
on_click = {
  command = "custom.my-plugin:select",
  args = { index = 1, name = "tab" },
}
```

- `command`: Command identifier string (max 64 bytes).
- `args`: Key-value scalar map (max 16 arguments, max 256 bytes per string).

A scroll binding (`on_scroll`) reuses the same binding shape as `on_click`: a
wheel tick over a bound node invokes the declared command with the declared
args plus a host-computed
`delta` number (signed lines, positive for wheel-up), merged last so it
overwrites a declared `delta` entry.

For per-item routing, a binding may declare one optional region identity:

```lua
on_click = {
  command = "custom.my-plugin:open",
  region = { id = "battery", kind = "item" }, -- default kind is "module"
}
```

`id` is up to 64 bytes of `[a-z0-9._:-]`. The host derives the region
rectangle from the painted span geometry (a plugin never supplies
coordinates), clips it to the window, and merges `region` and `button` (or
`delta`) into the payload for that item; a binding without a region keeps the
primary-button-only payload. Declaring different regions on a binding pair
fails validation with `E_UI_COMPONENT_INVALID`.

Band interaction dispatches from painted band surfaces only. The `overlay`
slot accepts and validates the same binding fields, but overlay surfaces do
not route clicks or scrolls in the current build — there is no accepted
overlay hit-test contract yet — and overlay input uses the separate
`bitty.ui.overlay.*` capture path instead. Band clicks and scrolls also keep
terminal authority: they move no keyboard focus, change no layout, and start
no selection.

## Hardware Safety Budgets

The bridge enforces deterministic ceilings before passing nodes to Rust. They
apply to each plugin's own scene generation:

- **Maximum Tree Depth**: 16 levels (`UI_MAX_DEPTH`; deliberately stricter
  than the accepted scene-tree limit of 32).
- **Maximum Nodes per Block**: 2,048 nodes (`UI_MAX_NODES`).
- **Maximum Text Bytes per Block**: 256 KiB (`UI_MAX_TEXT_BYTES`).
- **Maximum Retained Blocks per Plugin**: 64 blocks (`UI_MAX_BLOCKS`).
- **Maximum Aggregated Retained Strings per Plugin**: 2 MiB
  (`UI_MAX_AGGREGATED_TEXT_BYTES`), charged for every string the host retains
  from a mounted subtree: node text, `fg`/`bg` token names, `on_click`/
  `on_scroll` command ids, and argument keys and values.

Exceeding any of these fails closed with `E_UI_COMPONENT_INVALID` (shape,
depth, node, or text bounds) or `E_UI_BLOCK_BUDGET` (block or aggregate
registry bounds). These are per-plugin ceilings: the accepted scene contracts
also define terminal-wide totals, but that aggregation across plugins is not
implemented in the current build and stays deferred.

## Overlay Presentation and Transient Input (`bitty.ui.overlay`)

Mounting a component into the `"overlay"` slot creates a Core-hosted overlay
block. Mounting alone does **not** present it or capture keyboard input;
`bitty.ui.overlay.show(handle)` presents the mounted block without capture. The
presentation surface is separate from transient keyboard capture.

Overlay surfaces paint the same declarative node kinds and style vocabulary as
bands: `fg`/`bg`/`bold` on a mounted overlay row resolve through the same host
token table as a band row (`foreground`, `background`, `cursor`, `selection`,
`accent`; any other well-formed token name falls back to the default colour),
so a palette or composer looks the same either way. A row that declares no
style keeps the single-pill default paint, and an empty styled row still keeps
its one-cell default pill rather than painting nothing. Declared
`on_click`/`on_scroll` bindings on overlay content are validated but
not dispatched in the current build; band surfaces are the only routed targets
(see [Interactive Band Commands](#interactive-band-commands-on_click-and-on_scroll)).

For a command palette, modal dialog, or picker that also needs transient
keyboard input, use the separate focus/capture operations. They require the
`ui.overlay.focus` capability:

```lua
-- Mount the presentation first (requires ui.rich and ui.overlay)
local handle = bitty.ui.mount("overlay", content_tree)

-- Present the mounted overlay without capturing input
bitty.ui.overlay.show(handle)

-- Separately acquire keyboard capture for that mounted overlay
-- (requires ui.overlay.focus capability)
local session = bitty.ui.overlay.acquire(handle)

-- Replace the mounted overlay content while the session is active
bitty.ui.overlay.update(session, content_tree)

-- Poll captured keyboard/input events asynchronously
local events = bitty.ui.overlay.poll(session, 16)

-- Release capture when done; this does not mean that mount is a click target
bitty.ui.overlay.release(session, "submitted") -- or "cancelled"
```

The convenience form accepts presentation hints and creates the mounted
focusable surface and capture session together:

```lua
local session = bitty.ui.overlay.acquire({
  title = "Quick File Switcher",
  placeholder = "Type to search...",
})
```

`bitty.ui.overlay.show(handle)` and `bitty.ui.overlay.hide(handle)` are the
presentation-only operations when a mounted overlay should be shown or hidden
without keyboard capture. `show` requires `ui.rich` and `ui.overlay`, not
`ui.overlay.focus`, and fails closed in Safe Mode or when the host surface is
unavailable. `hide` is an ungated, idempotent cleanup operation, so it remains
available after capability revocation and in Safe Mode.

## Example: Building a Live Statusline Component

```lua
-- bitty-plugin.toml requires:
-- [capabilities]
-- ui = ["ui.rich"]

local status_tree = {
  kind = "Row",
  children = {
    {
      kind = "Text",
      text = "  BITTY ",
      fg = "accent",
      bold = true,
      on_click = { command = "palette:open", args = {} },
    },
    {
      kind = "Text",
      text = " | Ready",
      fg = "foreground",
    },
  },
}

-- Mount into the bottom chrome band
local handle = bitty.ui.mount("bottom", status_tree)

-- Update the band dynamically upon event
bitty.events.subscribe("terminal.state_changed", function(ev)
  status_tree.children[2].text = " | " .. ev.state
  bitty.ui.update(handle, status_tree)
end)
```

## Lua UI Parity Status

The behavior on this page is reconciled against the merged `bitty`
implementation ([PR #2385](https://github.com/bitty-terminal/bitty/pull/2385)
and [PR #2392](https://github.com/bitty-terminal/bitty/pull/2392), tracked in
issue [#2191](https://github.com/bitty-terminal/bitty/issues/2191);
implementation task CTX-1419, while the API-design task CTX-1299 and the
release-scope task CTX-1305 remain open). Still
deferred (candidate work, not shipped): the unresolved statusline vocabulary
outside the `bottom`-band composition, overlay pointer routing, one surface
per plugin per band edge, terminal-wide budget aggregation, a wider theme
token namespace, and headed capsule evidence for plugin-composed surfaces.
Wording changes to the accepted
[Plugin API v1 Lua Surface RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/sdk/plugin-api-v1-lua-surface-rfc.md)
go through the owner contract amendment process
(issue [#2676](https://github.com/bitty-terminal/bitty/issues/2676)); this
manual records current behavior without rewriting that accepted contract.
