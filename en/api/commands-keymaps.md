# bitty.commands & bitty.keymaps

The command and keymap subsystem coordinates user actions, Command Palette entries, and keyboard shortcut chords across Bitty.

## Commands (`bitty.commands`)

Commands represent named actions that can be triggered by keymaps, UI click handlers, or the interactive Command Palette.

### Registering Commands

```lua
bitty.commands.register({
  id = "my-plugin:format-buffer",
  title = "Format Active Buffer",
  description = "Runs the configured formatter on the current active view",
  run = function(args)
    local verbose = args and args.verbose or false
    -- Execute action logic
    bitty.notify.show({
      title = "Formatter",
      body = "Buffer formatted successfully",
    })
  end,
})
```

#### Lazy vs. Runtime Registration

- **Lazy Manifest Declaration**: In `bitty-plugin.toml`, declare `commands = ["my-plugin:format-buffer"]` under `[lazy]`. The command appears in the Command Palette immediately upon startup without initializing the plugin's Lua VM. The VM loads only when invoked.
- **Dynamic Registration**: Use `bitty.commands.register` during plugin runtime to add contextual commands.

### Executing Commands

Invoke a registered command programmatically:

```lua
bitty.commands.execute("my-plugin:format-buffer", { verbose = true })
```

## Keymaps (`bitty.keymaps`)

Plugins can bind keyboard shortcuts to commands.

### Binding Keys

```lua
bitty.keymaps.bind("<Ctrl-Shift-K>", "my-plugin:format-buffer", {
  description = "Trigger formatting",
  mode = "normal",
})
```

### Leader Chords

Bitty includes first-class support for leader-based multi-key shortcuts:

```lua
-- Binds <Leader> followed by 'f' then 'b'
bitty.keymaps.bind("<Leader>fb", "my-plugin:format-buffer", {
  description = "Format active buffer",
})
```

- **Configured Leader Key**: Users define `leader_key = "<Space>"` in their `init.lua`.
- **Chord Hints Overlay**: When `hints_enabled = true` in configuration, pressing the leader key renders an interactive overlay showing all available continuations.
- **Leader Timeout**: If the next key is not pressed within `leader_timeout_ms` (default: 1000ms), the chord cancels automatically.

## Events (`bitty.events`)

Subscribe to terminal lifecycle and environment events:

```lua
local unsubscribe = bitty.events.on("focus.changed", function(event)
  if event.focused then
    -- Panel gained focus
  else
    -- Panel lost focus
  end
end)

-- Call unsubscribe() when cleaning up
```

### Standard Events

| Event Name             | Payload Attributes                              | Description                       |
| :--------------------- | :---------------------------------------------- | :-------------------------------- |
| `"focus.changed"`      | `focused` (`boolean`), `panel_id` (`integer`)   | Pane or window focus gained/lost. |
| `"workspace.switched"` | `workspace_id` (`string`), `prev_id` (`string`) | Active workspace changed.         |
| `"theme.changed"`      | `theme` (`string`), `colors` (`table`)          | Global color theme reloaded.      |
| `"terminal.bell"`      | `terminal_id` (`integer`)                       | Terminal bell alert triggered.    |
