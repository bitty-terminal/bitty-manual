# Workspaces & Panels

Bitty organizes your window environment through a composable container hierarchy separating workspace layout from individual panel presentation.

## Hierarchy & Concepts

```text
Window
└── Workspaces (Virtual Desktops / Tabs)
    ├── Chrome Insets / Slot (visual bar rendered by an extension, never by Core)
    └── Panels (Containers)
        ├── Presentation Mode: Tiled, Floating, or Overlay
        └── View: Shell process / PTY session or native UI widget
```

### Workspaces

A **Workspace** is an independent virtual desktop. Each workspace manages its own layout tree:

- Switching workspaces changes the visible pane arrangement without suspending or interrupting background shell jobs.
- `workspace.layout` selects the layout-provider name for new workspaces (for example `"dwindle"` or `"bsp"`). It does not choose the adaptive new-panel policy described below.
- **Dense workspace IDs**: a new workspace takes the lowest free numeric ID in `1..=16`, and workspaces stay ordered by ID. Closing `ws2` from `[1, 2, 3]` and creating again reuses `ws2`, not `ws4`, so bar labels stay dense and do not reorder.
- **New-panel placement** (`Mod+n`): the 0.0.27 default is the Core `Balanced` policy. It splits the physically largest pane along the cell-aspect-aware axis (wide panes split side-by-side, tall panes stack) and places the new pane after the target (right or below). Repeated presses therefore keep a usable grid instead of nesting ever-smaller columns. This is a runtime layout mode, not a TOML or Lua setting; `workspace.layout` does not select it.
- **Workspace Bar Separation**: In accordance with Bitty's microkernel architecture, Bitty Core draws no visual workspace bar itself. Visual presentation is provided by an extension. Configuration keys `workspace.show_bar` and `workspace.bar.edge` (default `"bottom"`, or `"top"`) are reserved Core inputs consumed by extensions.

### Panels & Layout Spacing

A **Panel** is a workspace-managed container. Panels decouple window management from raw terminal sessions:

- **Panel ID != View ID != Terminal ID**: A panel holds a view, but its presentation mode can change dynamically.
- **Tiled Mode**: Panels participate in binary tree directional tiling (horizontal and vertical splits).
- **Adaptive insertion**: `Mod+n` (`new_panel`) splits the physically largest pane, not the focused pane. Explicit `new_split:<dir>` splits the focused pane on the requested axis in every mode.
- **Minimum pane size**: 10 columns by 4 rows, checked after the configured cell gap (`layout.gaps_in`). Adaptive insertion and drag edge/corner insertion prefer the cell-aspect axis, fall back to the perpendicular one, and refuse a target only when neither axis can host two usable children; Bitty warns and leaves the layout unchanged instead of creating a border-only sliver. A 20-column pane at a 1-cell gap cannot split horizontally (9-column children) and stacks vertically when its height allows; a 21-column pane can split horizontally. Center swaps do not change geometry and remain allowed.
- **Drag to move**: Mod+drag a tiled pane. Dropping in the target's middle half swaps the two panes. An edge drop inserts beside the target; a drop inside the corner 25% of both target axes splits inside the target's column or row. Self, background, and overlay drops are no-ops; `Esc`, pointer leave, or focus loss cancels without committing.
- **Cell Gaps**: Tiled pane spacing in character cells is controlled by `layout.gaps_in` (inner gap between sibling panes) and `layout.gaps_out` (outer container margin).
- **Resize Granularity**: Interactive split resizing applies `layout.resize_step` (split-ratio delta, default `0.05`).
- **Floating Mode**: A panel detaches from the tiling tree to float above active terminals, retaining its dimensions, position, and focus state.
- **Overlay Mode**: Transient focusable surfaces (such as the Command Palette or picker dialogs) appear centered and capture keyboard input until dismissed.

## Managing Workspaces and Panels

Panels and workspaces can be controlled through default shortcut keys or programmatically via the Lua API:

- Use shortcuts to create, split, and navigate panels.
- **Zoom reflow**: `toggle_zoom` (default `alt+z` / `alt+m` / `alt+f`) expands the focused panel to the full content frame. Its terminal grid and PTY winsize follow that frame and the shell receives `SIGWINCH`, so full-screen TUIs such as `btop` and `opencode` fill the window instead of painting at the old tiled size. Unzooming restores the tiled size; siblings hidden by the zoom keep their terminal grid and scrollback for the round trip.
- `close_view` (`alt+d` or `alt+q` by default) closes the focused panel. When tiled siblings remain, focus moves to the sibling subtree that expands into the vacated slot: the sibling's first pane when you closed the left/top pane, its last pane when you closed the right/bottom pane. Repeated closes follow the creation tree instead of a positional neighbour. If the closed pane was not a direct split child, focus falls back to the next pane in solver order, then the previous.
- Closing a workspace's last tiled panel removes the empty workspace only when another workspace exists and there are no local floating panels. A sole workspace or one with local floating panels is not pruned by this rule. Closing the last panel in the whole window uses the window-close confirmation policy.
- **Directional focus**: `goto_split:left|right|up|down` (`alt+h/j/k/l`, `alt+arrows`, `ctrl+alt+arrows`) selects the **spatially adjacent** pane, not the pane whose center happens to be closest. A candidate must lie fully beyond the focused pane's facing edge. Ranked candidates prefer the nearest facing edge, then dwindle tree adjacency (the sibling subtree on the movement side), then the widest shared edge, then the nearest perpendicular center. This keeps L-shaped, T-shaped, and mixed split layouts predictable: `Mod+j` from the top pane of a `1+1+2` layout lands on the bottom-left pane even when the bottom-right pane is wider.
- **Last-panel exit (bitty#2454)**: when the shell in the last panel closes its terminal before the child process is reaped, Bitty arms a bounded reap wake instead of waiting for an unrelated input event. Exiting the shell in the last panel therefore exits Bitty promptly; the same race in a split pane closes only that pane.
- **Close-to-empty exit save (bitty#2421)**: closing the window down to an empty tiled base (no tiled pane and no pinned panel left) skips the exit save. Writing that transient state would produce a session file the v3 codec cannot encode, so Bitty keeps the last good session file — with your previous workspace, scrollback, and cwd — and reports the skip at info level. A populated workspace still saves normally, and a mixed layout still reports its warning instead of silently dropping state.
- Close confirmation still protects busy sessions: repeat the close chord to confirm, or press `Esc` to cancel. Closing a zoomed panel counts its hidden siblings; pending or cancelled confirmation preserves the zoomed layout.
- For complete Lua automation functions (such as creating panels, toggling floating modes, or switching workspaces), see the [bitty.panel & bitty.workspace API Reference](../api/panel-workspace.md).

> [!NOTE]
> The adaptive placement modes (`Balanced`, `Spiral`, `Dwindle`, `BisectLargest`)
> are Core runtime layout modes. 0.0.27 exposes no TOML or Lua key to select
> one; `workspace.layout` names a layout provider and does not change the
> new-panel policy. `bitty.panel.create` likewise takes a content type only.
