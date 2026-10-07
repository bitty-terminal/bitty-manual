# Configuration Reference

Bitty reads configuration from `$XDG_CONFIG_HOME/bitty/init.lua` (defaults to `~/.config/bitty/init.lua`).

## Live Reconciliation & Reload Classes

Bitty classifies all configuration changes into three categories:

1. **`Live`**: Reconciled immediately on file save without restarting the process or interrupting active PTY sessions.
2. **`RestartRequired`**: Accepted and persisted, but only takes effect on the next process startup.
3. **`Rejected`**: Invalid values fail closed, triggering a rollback to the previous active configuration.

## Core Configuration Options

### Window & Appearance

| Field                     | Type               | Reload Class | Description                    |
| :------------------------ | :----------------- | :----------- | :----------------------------- |
| `window.opacity`          | `float (0.0..1.0)` | **Live**     | Window background transparency |
| `window.padding`          | `integer`          | **Live**     | Inner window padding in pixels |
| `window.radius_px`        | `integer`          | **Live**     | Window corner radius           |
| `decoration.border`       | `boolean`          | **Live**     | Window border visibility       |
| `decoration.border_width` | `integer`          | **Live**     | Window border thickness        |
| `decoration.border_color` | `string`           | **Live**     | Window border color            |

### Font Settings

| Field                 | Type     | Reload Class | Description                     |
| :-------------------- | :------- | :----------- | :------------------------------ |
| `font.family`         | `string` | **Live**     | Primary font family name        |
| `font.size`           | `float`  | **Live**     | Font size in points             |
| `font.line_height`    | `float`  | **Live**     | Line height scaling factor      |
| `font.letter_spacing` | `float`  | **Live**     | Additional letter spacing delta |

### Themes & Palette

| Field               | Type     | Reload Class | Description                          |
| :------------------ | :------- | :----------- | :----------------------------------- |
| `appearance.theme`  | `string` | **Live**     | Theme name (e.g. `catppuccin-mocha`) |
| `appearance.colors` | `table`  | **Live**     | Custom palette override table        |

### Input & Keymaps

| Field           | Type      | Reload Class | Description                          |
| :-------------- | :-------- | :----------- | :----------------------------------- |
| `keymaps`       | `array`   | **Live**     | Custom keybindings table             |
| `leader_key`    | `string`  | **Live**     | Prefix key for multi-chord shortcuts |
| `hints_enabled` | `boolean` | **Live**     | Visual leader chord hints overlay    |

### Scrollbar & Mouse

| Field                       | Type      | Reload Class        | Description                                 |
| :-------------------------- | :-------- | :------------------ | :------------------------------------------ |
| `scrollbar.mode`            | `string`  | **RestartRequired** | Scrollbar mode (`auto`, `always`, `hidden`) |
| `scrollbar.width`           | `integer` | **RestartRequired** | Scrollbar thickness in pixels               |
| `mouse.focus_follows_mouse` | `boolean` | **RestartRequired** | Automatic focus follows cursor              |

## Example `init.lua`

```lua
return {
  window = {
    opacity = 0.92,
    padding = 12,
  },
  font = {
    family = "JetBrains Mono",
    size = 13.5,
    line_height = 1.15,
  },
  appearance = {
    theme = "tokyo-night",
  },
  leader_key = "<Space>",
  hints_enabled = true,
}
```
