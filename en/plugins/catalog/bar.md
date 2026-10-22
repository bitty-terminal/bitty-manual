# bar (Lua plugin)

Consolidated workspace bar and system-module row over generic chrome insets: one inset band with anchored left, center, and right groups, workspace capsules, and provider-backed modules for clock, CPU, memory, battery, network, Bluetooth, backlight, idle, audio, and spectrum.

- Plugin id: `bitty-terminal.bar` · manifest version `0.0.1`
- Source: [github.com/bitty-terminal/bar](https://github.com/bitty-terminal/bar) · official registry entry
- Capabilities: `ui.rich`, `ui.overlay`, `workspace.read`, `workspace.control`, `platform.notify`, the read-only sensor heads (`platform.cpu-read`, `platform.memory-read`, `platform.battery-read`), the device read/control split (`platform.network.read`, `platform.essid.read`, `platform.bluetooth.read`, `platform.bluetooth.control`, `platform.backlight.read`, `platform.backlight.control`, `platform.idle.read`, `platform.idle.control`), and the audio heads (`audio.state.read`, `audio.state.control`, `audio.spectrum`)

## Install

Lua plugins carry no CDN versions. Install from the official catalog, then enable:

```bash
bitty plugin install bitty-terminal.bar
bitty plugin enable bitty-terminal.bar
bitty plugin list   # confirm state and grants
```

Set `workspace.show_bar = false` in the main configuration while the plugin paints its band, otherwise Core's workspaceline and the plugin bar are both visible.

## Lua API surface

Declared commands (all pointer targets dispatch one of these; no shell string is accepted):

| Command                                | Purpose                                                               |
| :------------------------------------- | :-------------------------------------------------------------------- |
| `bitty-terminal.bar:focus`             | Focus a workspace by stable id (palette/keymap entry point).          |
| `bitty-terminal.bar:detail`            | Show a module's detail text as a notification.                        |
| `bitty-terminal.bar:hover`             | Update the overlay tooltip on pointer enter/leave.                    |
| `bitty-terminal.bar:workspace-action`  | Capsule target: left focus, wheel previous/next, middle/right detail. |
| `bitty-terminal.bar:clock-action`      | Clock target: right cycles short/date/calendar, middle full detail.   |
| `bitty-terminal.bar:network-action`    | Network target: left/middle detail, right radio toggle when granted.  |
| `bitty-terminal.bar:audio-toggle`      | Sink mute on left/middle, sink detail on right.                       |
| `bitty-terminal.bar:audio-step`        | Step sink volume by the host-computed wheel delta.                    |
| `bitty-terminal.bar:microphone-action` | Source mute on left/right, microphone detail on middle.               |
| `bitty-terminal.bar:microphone-step`   | Step source volume by the host-computed wheel delta.                  |
| `bitty-terminal.bar:bluetooth-toggle`  | Flip radio power through `bluetooth.control`.                         |
| `bitty-terminal.bar:backlight-step`    | Step brightness by a delta through `backlight.control`.               |
| `bitty-terminal.bar:idle-toggle`       | Flip idle inhibition through `idle.control`.                          |

Calls used by the plugin: `bitty.commands.register`, `bitty.events.subscribe`, `bitty.workspace.list`, `bitty.workspace.focus`, `bitty.ui.mount` / `bitty.ui.update`, `bitty.settings.get`, plus the broker interfaces for provider modules. Events: `workspace.created`, `workspace.closed`, `workspace.renamed`, `workspace.focused`, `workspace.changed`, and `config.reloaded`.

## Minimal config

```lua
-- $XDG_CONFIG_HOME/bitty/plugins/bitty-terminal.bar.lua
return {
  show = true,
  edge = "bottom",
  show_single = false,
  label = "index",
  icons = "ascii",
  modules_left = { "workspaces" },
  modules_center = { "clock" },
  modules_right = { "network", "cpu", "memory", "battery" },
}
```

```bash
bitty plugin config show bitty-terminal.bar   # declared keys, selected file, effective values
bitty plugin config scaffold bitty-terminal.bar
```

See the [bar modules user guide](../bar-modules.md) for every module, the pointer-action matrix, icon maps, and hover tooltips. See [Plugin Configuration](../../configuration/plugin-config.md) for file selection and when edits take effect.
