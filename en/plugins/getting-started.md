# Plugin Development Guide

Bitty features a secure, event-driven, stackless Lua plugin engine. All plugins run with strictly enforced memory bounds (32 MiB ceiling), fuel instruction caps, and zero-VM lazy loading.

## Plugin Structure

A Bitty plugin lives in a directory and contains a manifest and Lua source files:

```text
my-plugin/
├── bitty-plugin.toml   # Plugin metadata, permissions, and lazy triggers
└── lua/
    └── init.lua        # Entry point executed upon activation
```

## Manifest (`bitty-plugin.toml`)

```toml
[plugin]
id = "custom.my-plugin"
name = "My Custom Plugin"
version = "0.1.0"
description = "A custom utility plugin for Bitty"

[compat]
bitty = ">=0.1.0,<1.0.0"
plugin-api = "^1.0"

[capabilities]
platform.notify = true

[lazy]
commands = ["custom.my-plugin:greet"]
events = ["focus.changed"]
```

## Lazy Activation

Plugins consume **zero memory and zero CPU overhead** until triggered:

1. **Commands**: Declared under `[lazy].commands`. The command appears in the Command Palette immediately; Bitty creates the Lua VM and executes `init.lua` only when the user invokes the command.
2. **Events**: Declared under `[lazy].events`. The plugin activates when the specified runtime event fires.
