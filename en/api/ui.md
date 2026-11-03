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

| Slot Name    | Placement Status | Description                                                                                                                                                                                                         |
| :----------- | :--------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `"top"`      | **Painted**      | Top edge chrome band.                                                                                                                                                                                               |
| `"bottom"`   | **Painted**      | Bottom edge chrome band.                                                                                                                                                                                            |
| `"left"`     | **Unavailable**  | Accepted slot name, but this build has no vertical band host (`E_UI_UNAVAILABLE`).                                                                                                                                  |
| `"right"`    | **Unavailable**  | Accepted slot name, but this build has no vertical band host (`E_UI_UNAVAILABLE`).                                                                                                                                  |
| `"tabline"`  | **Unavailable**  | Reserved for panel tabs; requires the `[lazy].claims = ["workspaceline"]` claim, and no host surface is available (`E_UI_UNAVAILABLE`).                                                                             |
| `"overlay"`  | **Mounted**      | Core-hosted overlay block; present it with `bitty.ui.present.show` (or the older `bitty.ui.overlay.show` spelling). Mounting requires `ui.rich` and `ui.overlay`; presenting without capture requires `ui.present`. |
| `"terminal"` | **Unavailable**  | Accepted slot name, but no terminal-attached block host is available (`E_UI_UNAVAILABLE`).                                                                                                                          |

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

The band host flattens a `Column` and its descendants horizontally into the
row like a `Row`; only an overlay `Column` root stacks its direct children
vertically as overlay rows.

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
- `args`: Key-value scalar map with 256 bytes per string. The host keeps the
  dispatched table at most 16 entries: an ordinary `on_click` binding may
  declare up to 16 args; an `on_scroll` binding reserves `delta`, so it allows
  at most 15 declared args; a region-aware click reserves `region` and
  `button`, and a region-aware scroll reserves `region` and `delta`, leaving
  at most 14 declared args.

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
`bitty.ui.present.show(handle)` — or its older `bitty.ui.overlay.show(handle)`
spelling — presents the mounted block without capture. The presentation surface
is separate from transient keyboard capture, and each is gated by its own
capability: `ui.present` to draw, `ui.overlay.focus` to capture.

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
without keyboard capture. `show` requires the `ui.present` grant, not
`ui.overlay.focus`, and fails closed in Safe Mode or when the host surface is
unavailable. `hide` is an ungated, idempotent cleanup operation, so it remains
available after capability revocation and in Safe Mode. `bitty.ui.present.show`
and `bitty.ui.present.hide` are the named spelling of the same Core session;
see [Presentation-Only Overlay](#presentation-only-overlay-bittyuipresent).

## Presentation-Only Overlay (`bitty.ui.present`)

A presentation panel is a mounted `overlay` block drawn above the focused view
with no keyboard or pointer authority: which-key hints, a read-only help card, a
transient status panel. Core owns the geometry, stacking, `Esc` routing, and
teardown; the plugin owns only the scene.

```lua
-- Mount first (requires ui.rich and ui.overlay)
local handle = bitty.ui.mount("overlay", panel_tree)

-- Draw it above the focused view without capture (requires ui.present)
bitty.ui.present.show(handle)

-- Remove it (idempotent, ungated)
bitty.ui.present.hide(handle)
```

### Capability separation

Drawing is not input. Each UI head authorizes exactly one thing, and no head
implies another:

| Capability         | Authorizes                                                                                          | Does not authorize                             |
| :----------------- | :-------------------------------------------------------------------------------------------------- | :--------------------------------------------- |
| `ui.rich`          | `bitty.ui.mount` / `bitty.ui.update` of declarative blocks in any hosted slot                       | presenting, focusing, or capturing input       |
| `ui.overlay`       | mounting a block into the `overlay` slot (the precondition for both overlay paths)                  | presenting it, or capturing input              |
| `ui.overlay.focus` | transient keyboard capture through `bitty.ui.overlay.acquire`                                       | drawing a presentation panel                   |
| `ui.present`       | drawing one presentation panel with `bitty.ui.present.show` (and its `bitty.ui.overlay.show` alias) | mounting a block, focusing, or capturing input |

A plugin that only wants to draw therefore declares the two mount heads plus
`ui.present`; it cannot reach `bitty.ui.overlay.acquire` by asking to draw, and
granting `ui.present` never widens an existing capture grant.

### Behavior

- **Non-modal and non-focusable**: the panel never takes focus, never receives
  key or pointer events, and never changes the focus ring. Clicks over it pass
  through to the surface beneath.
- **One surface per window**: a second plugin's `show` fails closed with
  `E_UI_UNAVAILABLE` and leaves the live surface untouched. The owner may `show`
  again with the same handle or with another handle it mounted into `overlay`;
  the newest handle wins and no second slot is consumed.
- **Placement**: centered over the focused view, clipped to that view's content
  rect, painted above the focused view and above the chrome bands but below the
  focusable capture panel. A view narrower than 10 columns paints nothing; the
  session stays live and paints after a resize.
- **Focus-follow**: the panel tracks the focused view. A focus switch re-centers
  it rather than dismissing it; when the view it was drawn over closes, the
  panel is dropped instead of re-centering on a surviving view.
- **Frame budget**: at most 64 rows and 16 KiB of row text per frame, applied
  like a chrome band. Whole trailing rows are dropped deterministically and the
  drop is recorded in host diagnostics rather than painted past the budget; the
  first row is always kept and clips horizontally.
- **`Esc` dismisses without consuming the press**: the same `Esc` still reaches
  whatever would have received it, so a confirmation gate keeps its own consume
  and, with no gate, the key reaches the focused terminal. The plugin never sees
  the keypress.
- **Lifecycle**: `hide` is idempotent; suspend, unload, disable, crash,
  rollback, and generation change drop the surface with no residue. Safe Mode
  refuses `show` with `E_UI_UNAVAILABLE`.

### Errors

Denials are catchable Lua error tables (`class` / `code` / `message`); match on
`code`.

| `code`                   | `class`      | When                                                                                                                                            |
| :----------------------- | :----------- | :---------------------------------------------------------------------------------------------------------------------------------------------- |
| `E_CAPABILITY_DENIED`    | `runtime`    | The `ui.present` grant is absent.                                                                                                               |
| `E_UI_NOT_OWNER`         | `runtime`    | The handle is not a block this generation mounted into the `overlay` slot: a band block, another plugin's handle, or a stale-generation handle. |
| `E_UI_COMPONENT_INVALID` | `validation` | The argument is not an integer block handle.                                                                                                    |
| `E_UI_UNAVAILABLE`       | `runtime`    | Another plugin already holds the window's presentation surface, the host has no presentation surface, or Safe Mode is active.                   |
| `E_TIMEOUT`              | `budget`     | The call missed its deadline; nothing was committed.                                                                                            |

`bitty.ui.present.hide` raises none of these: a foreign, stale, or repeated
handle returns `false` with no effect and never removes another plugin's panel.

### Dismissal observation (`overlay.dismissed`)

Core reports each dismissal once, on the application tick, to the presenting
plugin. Declare the kind in `[lazy].events` and subscribe like any other event:

```lua
-- bitty-plugin.toml
-- [lazy]
-- events = ["overlay.dismissed"]

bitty.events.subscribe("overlay.dismissed", function(ev)
  -- ev.owner  string   the presenting plugin id
  -- ev.handle integer  the block handle that was presented
  -- ev.reason string   "escape" (Core routed Esc) or
  --                    "view-closed" (the view it was drawn over closed)
end)
```

The payload carries no input bytes, terminal content, or coordinates. Delivery
happens on the cold tick, never as a callback on the input path, so a dismissal
never runs plugin code while the key is being routed. Lifecycle teardown
(unload, suspend, disable, crash, rollback) removes the surface silently and
reports nothing — the plugin is going away. At most 64 observations are held
between ticks; overflow drops the oldest, so a show/dismiss loop inside one
command callback can lose its earliest observations.

### Example: a which-key panel

```lua
-- bitty-plugin.toml
-- [capabilities]
-- ui = ["ui.rich", "ui.overlay", "ui.present"]
-- [lazy]
-- events = ["overlay.dismissed"]

local handle = bitty.ui.mount("overlay", { kind = "Column", children = {} })
local presenting = false

local function render(groups)
  local rows = { { kind = "Text", text = "which-key", fg = "accent", bold = true } }
  for _, group in ipairs(groups) do
    rows[#rows + 1] = { kind = "Text", text = group.key .. "  " .. group.label }
  end
  return { kind = "Column", children = rows }
end

local function open(groups)
  bitty.ui.update(handle, render(groups))
  -- Present above the focused view; no capture, no focus change.
  local ok = pcall(bitty.ui.present.show, handle)
  if not ok then
    -- E_UI_UNAVAILABLE: another plugin is already presenting, or Safe Mode.
    presenting = false
    return
  end
  presenting = true
end

local function close()
  bitty.ui.present.hide(handle) -- idempotent
  presenting = false
end

-- Esc dismisses the panel without consuming it, so no key handler is needed:
-- the press reached the terminal (or a confirmation gate) on its own.
bitty.events.subscribe("overlay.dismissed", function(ev)
  presenting = false
end)
```

The mounted block and its handle stay valid after a dismissal, so the next
`open` only needs `bitty.ui.update` plus `bitty.ui.present.show`; nothing has to
be re-mounted.

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
release-scope task CTX-1305 remain open). The presentation-only overlay
(`bitty.ui.present`) was added on top of that reconciliation by
[PR #2856](https://github.com/bitty-terminal/bitty/pull/2856) for issue
[#2849](https://github.com/bitty-terminal/bitty/issues/2849). Still
deferred (candidate work, not shipped): the unresolved statusline vocabulary
outside the `bottom`-band composition, overlay pointer routing, one surface
per plugin per band edge, terminal-wide budget aggregation, a wider theme
token namespace, and headed capsule evidence for plugin-composed surfaces.
Wording changes to the accepted
[Plugin API v1 Lua Surface RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/sdk/plugin-api-v1-lua-surface-rfc.md)
go through the owner contract amendment process
(issue [#2676](https://github.com/bitty-terminal/bitty/issues/2676)); this
manual records current behavior without rewriting that accepted contract.
