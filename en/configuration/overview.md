# Configuration Reference

Bitty reads configuration from `$XDG_CONFIG_HOME/bitty/init.lua` (defaults to `~/.config/bitty/init.lua`).

## Live Reconciliation & Reload Classes

Bitty classifies all configuration changes into three categories:

1. **`Live`**: Reconciled immediately on file save without restarting the process or interrupting active PTY sessions.
2. **`RestartRequired`**: Accepted and persisted, but only takes effect on the next process startup.
3. **`Rejected`**: Invalid values fail closed, triggering a rollback to the previous active configuration.

## Complete Configuration Schema

### Window & Layout

| Field              | Type                  | Reload Class | Description                           |
| :----------------- | :-------------------- | :----------- | :------------------------------------ |
| `window.opacity`   | `float (0.0..1.0)`    | **Live**     | Background window transparency level. |
| `window.padding`   | `integer` or `[x, y]` | **Live**     | Inner window padding in pixels.       |
| `window.radius_px` | `integer`             | **Live**     | Window corner radius in pixels.       |

### Decoration & Borders

| Field                     | Type      | Reload Class | Description                                     |
| :------------------------ | :-------- | :----------- | :---------------------------------------------- |
| `decoration.border`       | `boolean` | **Live**     | Whether window decoration borders are enabled.  |
| `decoration.border_width` | `integer` | **Live**     | Width of the window border in pixels.           |
| `decoration.border_color` | `string`  | **Live**     | Border color in hex (`#RRGGBB` or `#RRGGBBAA`). |

### Font Settings

| Field                 | Type     | Reload Class | Description                                                |
| :-------------------- | :------- | :----------- | :--------------------------------------------------------- |
| `font.family`         | `string` | **Live**     | Primary font family name used for terminal text rendering. |
| `font.size`           | `float`  | **Live**     | Font point size.                                           |
| `font.line_height`    | `float`  | **Live**     | Line height multiplier relative to font size (<= 2.0).     |
| `font.letter_spacing` | `float`  | **Live**     | Additional letter spacing delta in pixels (<= 8.0).        |

### Themes & Palette

| Field               | Type     | Reload Class | Description                                                                   |
| :------------------ | :------- | :----------- | :---------------------------------------------------------------------------- |
| `appearance.theme`  | `string` | **Live**     | Built-in theme name (e.g. `catppuccin-mocha`, `tokyo-night`, `gruvbox-dark`). |
| `appearance.colors` | `table`  | **Live**     | Custom palette definition overriding theme tokens.                            |

### Input, Keymaps & Leader

| Field               | Type      | Reload Class | Description                                                        |
| :------------------ | :-------- | :----------- | :----------------------------------------------------------------- |
| `keymaps`           | `array`   | **Live**     | User keybinding overrides and chord registrations.                 |
| `leader_key`        | `string`  | **Live**     | Prefix key for multi-key chords (e.g. `"<Space>"`).                |
| `leader_timeout_ms` | `integer` | **Live**     | Timeout in milliseconds before an incomplete leader chord cancels. |
| `hints_enabled`     | `boolean` | **Live**     | Whether interactive leader chord hint overlays are enabled.        |

### Workspace & Status Bar

| Field                | Type      | Reload Class | Description                                                         |
| :------------------- | :-------- | :----------- | :------------------------------------------------------------------ |
| `workspace.show_bar` | `boolean` | **Live**     | Whether the workspace status bar is displayed.                      |
| `workspace.bar.edge` | `string`  | **Live**     | Edge placement of the workspace status bar (`"top"` or `"bottom"`). |

### Scrollbar & Mouse

| Field                                | Type      | Reload Class        | Description                                                          |
| :----------------------------------- | :-------- | :------------------ | :------------------------------------------------------------------- |
| `scrollbar.mode`                     | `string`  | **RestartRequired** | Scrollbar display mode (`"auto"`, `"always"`, `"hidden"`).           |
| `scrollbar.width`                    | `integer` | **RestartRequired** | Scrollbar thickness in pixels.                                       |
| `mouse.focus_follows_mouse`          | `boolean` | **RestartRequired** | Whether pane focus automatically follows cursor movement.            |
| `mouse.focus_follows_mouse_delay_ms` | `integer` | **RestartRequired** | Dwell time in milliseconds before focus follows mouse switches pane. |

## Example `init.lua`

```lua
return {
  window = {
    opacity = 0.94,
    padding = 12,
    radius_px = 8,
  },
  decoration = {
    border = true,
    border_width = 1,
    border_color = "#313244",
  },
  font = {
    family = "JetBrains Mono",
    size = 13.5,
    line_height = 1.15,
    letter_spacing = 0.0,
  },
  appearance = {
    theme = "tokyo-night",
    colors = {
      background = "#1a1b26",
      foreground = "#c0caf5",
    },
  },
  leader_key = "<Space>",
  leader_timeout_ms = 1000,
  hints_enabled = true,
  workspace = {
    show_bar = true,
    bar = {
      edge = "top",
    },
  },
  scrollbar = {
    mode = "auto",
    width = 6,
  },
  mouse = {
    focus_follows_mouse = false,
    focus_follows_mouse_delay_ms = 150,
  },
  keymaps = {
    {
      key = "<Leader>ff",
      action = "bitty.palette.toggle",
      description = "Open command palette",
    },
  },
}
```
