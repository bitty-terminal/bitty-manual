# bitty.commands & bitty.keymaps

The command and keymap subsystem coordinates user actions, Command Palette entries, and keyboard shortcuts across Bitty while preserving user sovereignty over keybindings.

## Commands (`bitty.commands`)

Commands represent named actions that can be triggered by keymaps, UI click handlers, or the interactive Command Palette.

### Registering Commands

```lua
bitty.commands.register({
  id = "my-plugin:format-buffer",
  title = "Format Active Buffer",
  description = "Runs the configured formatter on the current active view",
  run = function(args)
    -- Execute action logic
    bitty.notify.show({
      title = "Formatter",
      body = "Buffer formatted successfully",
    })
  end,
})
```

- **Parameters**: Table with `id` (`string`, max 64 bytes), `title` (`string`, max 128 bytes), optional `description` (`string`, max 256 bytes), and `run` (`function`).
- **Lazy Manifest Declaration**: In `bitty-plugin.toml`, declare `commands = ["my-plugin:format-buffer"]` under `[lazy]`. The command appears in the Command Palette immediately upon startup without initializing the plugin's Lua VM. The VM loads on demand when the command is first invoked.

## Keymap Suggestions (`bitty.keymaps`)

In Bitty, user configuration retains ultimate authority over keyboard bindings. Plugins **never** hijack or directly bind key shortcuts without user control.

### Suggesting Default Keymaps

Plugins offer keybinding suggestions via `bitty.keymaps.suggest`:

```lua
-- Suggest a global key chord
local handle = bitty.keymaps.suggest({
  chord = "ctrl+shift+k",
  command = "my-plugin:format-buffer",
  when = "global",
})
```

- **`chord`**: Chord string specifying modifier and key combinations (e.g. `"ctrl+shift+k"`, `"alt+p"`).
- **`command`**: The target command ID to trigger.
- **`when`**: Execution scope (default `"global"`).

### Leader Prefix Suggestions

Plugins can suggest chords using the user-configured Leader prefix:

```lua
-- Suggest Leader followed by 'f' then 'b'
bitty.keymaps.suggest({
  chord = "leader f b",
  command = "my-plugin:format-buffer",
  when = "global",
})
```

Using `"leader <key>"` automatically resolves against the user's configured `input.leader` (or `leader_key`) without hardcoding specific modifiers.

### User Keybinding Configuration (`init.lua`)

Users bind or override key chords directly in `$XDG_CONFIG_HOME/bitty/init.lua`:

```lua
return {
  keymaps = {
    {
      chord = "ctrl+shift+k",
      action = "my-plugin:format-buffer",
      context = "global",
    },
    {
      chord = "ctrl+p",
      action = "palette:toggle",
      context = "global",
    },
  },
}
```

## Events (`bitty.events`)

Subscribe to terminal lifecycle and environment events using `bitty.events.subscribe`:

```lua
bitty.events.subscribe("focus.changed", function(event)
  if event.focused then
    -- Panel gained focus
  else
    -- Panel lost focus
  end
end)
```

- **Parameters**: `kind` (`string`, max 64 bytes) and `handler` (`function`).
- **Quota**: Up to 32 event subscriptions per plugin generation (`REGISTRATION_MAX_EVENTS`).

### Standard Events

| Event Name             | Payload Attributes                              | Description                       |
| :--------------------- | :---------------------------------------------- | :-------------------------------- |
| `"focus.changed"`      | `focused` (`boolean`), `panel_id` (`integer`)   | Pane or window focus gained/lost. |
| `"workspace.switched"` | `workspace_id` (`string`), `prev_id` (`string`) | Active workspace changed.         |
| `"theme.changed"`      | `theme` (`string`), `colors` (`table`)          | Global color theme reloaded.      |
| `"terminal.bell"`      | `terminal_id` (`integer`)                       | Terminal bell alert triggered.    |
