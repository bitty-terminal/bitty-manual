# Lua API Reference

Bitty exposes a sandboxed runtime environment via the global `bitty` namespace in Lua.

## Core Modules

### `bitty.commands`

Registers and executes user commands accessible via the Command Palette or keymaps.

```lua
bitty.commands.register({
  id = "greet",
  title = "Greet User",
  run = function(args)
    bitty.notify.show({
      title = "Hello",
      body = "Greetings from Bitty plugin!",
    })
  end,
})
```

### `bitty.events`

Subscribes to system lifecycle and terminal events.

```lua
bitty.events.on("focus.changed", function(event)
  -- React to focus change
end)
```

### `bitty.notify`

Displays desktop notifications when the `platform.notify` capability is granted in `bitty-plugin.toml`.

```lua
bitty.notify.show({
  title = "Build Finished",
  body = "Cargo build succeeded in 3.2s",
})
```
