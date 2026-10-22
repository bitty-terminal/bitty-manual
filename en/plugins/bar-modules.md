# Bar Modules User Guide

The Unified Bar (`bitty-terminal.bar`) renders one inset row: workspace capsules plus optional system modules in three anchored groups — left, center, and right — declared in your [per-plugin config file](plugin-settings.md). It follows the Waybar layout you may already know: the center group is centered on the full band row and the right group is flush to the right inset edge, at any width.

## Choosing modules

```lua
-- $XDG_CONFIG_HOME/bitty/plugins/bitty-terminal.bar.lua
return {
  show = true,
  edge = "bottom",
  modules_left = { "workspaces", "cpu", "memory", "battery" },
  modules_center = {},
  modules_right = { "clock", "pulseaudio" },
}
```

| Key              | Type         | Default                                | Notes                                                                                        |
| :--------------- | :----------- | :------------------------------------- | :------------------------------------------------------------------------------------------- |
| `show`           | boolean      | `true`                                 | Mount and paint the bar.                                                                     |
| `edge`           | string       | `"bottom"`                             | `"top"` or `"bottom"`; any other value falls back to `"bottom"`. Applies on next activation. |
| `show_single`    | boolean      | `false`                                | Keep the bar visible with only one workspace. An occupied scratchpad also forces it visible. |
| `name_max_chars` | integer      | `32`                                   | Workspace-name width in `name` and `both` label modes, `1..32`.                              |
| `label`          | string       | `"index"`                              | Capsule label: `"index"`, `"name"`, or `"both"`; an unknown value paints `"index"`.          |
| `icons`          | string       | `"ascii"`                              | Icon map: `"ascii"`, `"pua"`, or `"nerd"`; an unknown value paints `"ascii"`.                |
| `modules_left`   | string array | `["workspaces"]`                       | Ordered names, anchored to the left inset edge.                                              |
| `modules_center` | string array | `["clock"]`                            | Ordered names, centered on the full band row.                                                |
| `modules_right`  | string array | `["network","cpu","memory","battery"]` | Ordered names, flush to the right inset edge.                                                |

An unknown module name, a non-list group, or a plan that resolves to nothing never hides the bar: the plan falls back to the shipped defaults above. A lone workspace hides the bar unless `show_single = true`; `show = false` hides everything. Set a group to `{}` to drop it.

### Anchors and overflow

Each non-empty group is one anchored row (`anchor = "left" | "center" | "right"`) resolved against the live band width, so the center group stays centered and the right group stays flush right when the terminal is resized. The plugin never simulates alignment with padding strings.

When the three groups cannot all fit, the band clips deterministically in the order left, then right, then center. Clipped runs never overlap each other and keep their hit targets. On a host before 0.0.26 (no band anchor support), the `anchor` key is ignored and groups flow left-to-right in declaration order; the bar still paints.

### Top or bottom edge

`edge = "top"` places the band on the top edge; the default is the bottom. The value is read at activation because the mount slot cannot move at runtime — change it, then restart Bitty. Hover tooltips follow the edge: they paint just below a top band and just above a bottom band, at the hovered item's column.

## Module catalog

### workspaces (event-driven)

One padded capsule per workspace, in stable workspace-id order, with single-space separators. `label = "index"` paints the seq (`" 1   2* "`), `"name"` the truncated name, and `"both"` the `id:name` pair. The active capsule carries `*` and the theme's active tokens; occupied workspaces carry `+`, and attention (`bell`, `activity`, or `exited`) carries `!`. Names truncate to `name_max_chars`; the line is bounded to 1024 UTF-8 bytes. An occupied window scratchpad appends a `[scratchpad]` marker after the capsule list and forces the bar visible.

### clock (local, no grant needed)

Renders `os.date` with a per-module `format` (default `"%H:%M"`). Refreshes on `tick_ms` (default `60000`, `200` ms floor).

### cpu (provider `system.cpu`)

Aggregate CPU utilization polled at the 2 s provider ceiling (`tick_ms` default `2000`, `1000` ms floor). Template keys: `{total}`, `{total_pct}` (rounded integer); default format `"{total}%"`.

| Option     | Default      | Notes                                                     |
| :--------- | :----------- | :-------------------------------------------------------- |
| `format`   | `"{total}%"` | Template override                                         |
| `warning`  | `80`         | At-or-above reads `warning`; needs `warning` < `critical` |
| `critical` | `90`         | At-or-above reads `critical`                              |
| `tick_ms`  | `2000`       | Poll cadence; `1000` ms floor                             |
| `tooltip`  | none         | Detail text, e.g. `CPU 42% (8 cores)`                     |

### memory (provider `system.memory`)

Memory and swap utilization polled at the 2 s ceiling (`tick_ms` default `2000`, `1000` ms floor). Template keys: `{pct}`, `{used}`, `{total}` (GiB), plus the swap triple; default format `"{pct}%"`. `warning` (`80`) and `critical` (`90`) share the at-or-above direction of `cpu`. Default detail: `Memory 5/8 GiB (63%)`, plus swap when reported.

### battery (provider `system.battery`)

Capacity and charge state polled at the 5 s ceiling (`tick_ms` default `5000`, `1000` ms floor). Template keys: `{icon}`, `{capacity}`, `{state}`; default format `"{icon} {capacity}%"`.

| Option     | Default | Notes                                           |
| :--------- | :------ | :---------------------------------------------- |
| `warning`  | `30`    | At-or-below reads `warning` — discharging only  |
| `critical` | `15`    | At-or-below reads `critical` — discharging only |

Only a discharging battery alarms on low capacity; `full`, `charging`, `plugged`, and `unknown` render the icon with the default presentation. The ASCII icon map is five capacity buckets (`[    ]` through `[====]`) with a `+` mark while charging. Default detail: `Battery 63% discharging`, plus watts and time left when reported.

### network (provider `network`, 3 s floor)

Link plus measured bandwidth (`wifi 8.0K/4.0K`); unmeasured rates are omitted, never zero-filled. The ESSID renders only when the separately granted `network.essid` sub-interface resolves (`wifi 8.0K/4.0K (Home)`); otherwise that key is absent and the rest is unaffected. Options: `format` (`{link}`, `{down}`, `{up}`, `{essid}`), `tick_ms` (at or above 3 s), `tooltip`.

### bluetooth (provider `bluetooth`, 5 s floor)

Radio state plus bonded-device counts (`bt on (1/2)`). Read-only by default; the device list is the detail text. With `toggle = true` and the `bluetooth.control` grant, a left click flips radio power via `set_power` only. Options: `format` (`{status}`, `{connected}`, `{total}`, `{powered}`), `tick_ms` (at or above 5 s), `tooltip`, `toggle`.

### backlight (provider `backlight`, 5 s floor)

Brightness (`75%`). A left click steps by `step` percent points (default `10`) via `set_step` only. A denied attempt reports `E_NOT_PERMITTED` and degrades to a notification — it never retries, escalates, or setuids. Without the control grant the module is read-only. Options: `format` (`{pct}`), `tick_ms` (at or above 5 s), `tooltip`, `step` (`-100..100`).

### idle (provider `idle`, 5 s floor)

Inhibit state (`inhibit:on` / `inhibit:off`; glyphs stay config-side via `on_text` / `off_text`). A left click flips inhibition via `set` only while that grant holds; a denied toggle degrades to a notification. Options: `tick_ms` (at or above 5 s), `tooltip`, `on_text`, `off_text`.

### pulseaudio (provider `audio.state`, 2 s floor)

Volume, mute, and port with icon selection Lua-side. Left and middle toggle sink mute; right shows the sink detail; the mouse wheel steps the volume through `audio.control` (bounded steps, coalesced host-side). Read-only text when the control grant is missing; hidden when the state monitor is absent.

| Option           | Default | Notes                                                        |
| :--------------- | :------ | :----------------------------------------------------------- |
| `format`         | none    | Template override: `{icon}`, `{volume}`, `{port}`, `{muted}` |
| `show_port`      | `true`  | Append the truncated port to the text                        |
| `port_max_chars` | `16`    | Port display width, `1..64`                                  |
| `tick_ms`        | `2000`  | State poll cadence, `200` ms floor                           |

### microphone (provider `audio.state`)

Source level and mute read from the optional `source_volume_pct` / `source_muted` fields of the same audio snapshot, so no extra capability is requested. Left and right toggle source mute, middle shows the microphone detail, and the wheel steps input volume. The live audio reader serves no source fields in 0.0.26, so the module hides until a provider reports them.

### spectrum (provider `audio.spectrum`, 4 fps)

The cava-lite meter: block glyphs in a text row from at most 32 spectrum buckets (`buckets` default `8`, range `1..32`; `tick_ms` default `250`, `200` ms floor). Falloff smoothing and peak-hold run Lua-side; `paused = true` freezes the last row. Hidden until a live spectrum source lands host-side — the meter hides rather than fabricates, so on hosts whose audio monitor exposes no level taps you simply see no meter.

## Pointer actions

Every item exposes a region derived from its painted span; the host injects `button` (`left`/`right`/`middle`) and `region`, and a wheel merges the computed `delta`. Clicks and wheel steps dispatch registered commands only — there is no shell-string path. A palette or keymap invocation carries no button and reads as `left`.

| Module                                     | Left                | Middle                | Right                      | Wheel                        |
| :----------------------------------------- | :------------------ | :-------------------- | :------------------------- | :--------------------------- |
| `workspaces`                               | Focus the capsule   | Workspace detail      | Workspace detail           | Previous (up) / next (down)  |
| `clock`                                    | No-op               | Full date-time detail | Cycle short/date/calendar  | —                            |
| `network`                                  | Link detail         | Link detail           | Radio toggle when granted¹ | —                            |
| `pulseaudio`                               | Toggle sink mute    | Toggle sink mute      | Sink detail                | Step volume (±10, coalesced) |
| `microphone`                               | Toggle source mute² | Microphone detail     | Toggle source mute²        | Step input (±10)             |
| `cpu`, `memory`, `battery`                 | Detail              | Detail                | Detail                     | —                            |
| read-only `bluetooth`, `backlight`, `idle` | Detail³             | Detail³               | Detail³                    | —                            |

¹ `network.control` is not a live guarantee in 0.0.26: no provider ships it, so on a real host the right click degrades to the link detail.

² The audio provider exposes sink control only; source methods are probed optionally and an absent method fails closed.

³ With its control head granted, left keeps the toggle/step behavior (`bluetooth-toggle`, `backlight-step`, `idle-toggle`). The module's detail text is also its hover tooltip.

## Hover tooltips

Every rendered item carries a hover region with a stable id (`bar:module:<name>`). On pointer enter the bar writes that module's detail text — CPU/memory/battery readings, the clock date-time, the workspace strip, the audio port, the bonded-device list, or a module's `tooltip` option — into its non-modal `overlay` block; on leave it clears. Core anchors the tooltip to the live item and paints it just below a top band or above a bottom band. Hover never captures input, never sets modal state, and never raises an OS notification. It disappears on leave, focus loss, bar hide, or when the item no longer exists after a re-render; an item with no detail text round-trips enter/leave and simply shows nothing.

## Icons

`icons` selects a shipped glyph map:

- `"ascii"` (default) is the historical output: no icon for clock, network, bluetooth, cpu, or memory; `LO`/`MED`/`HI`/`MUTE` for audio; the five battery buckets plus the `+` charging mark.
- `"pua"` uses the legacy Font Awesome private-use block (`nf-fa-*`), present in most patched fonts.
- `"nerd"` uses Nerd Fonts v3 Material Design glyphs (`nf-md-*`).

Glyphs stay opt-in because a terminal without the font paints replacement boxes. Private-use and Nerd Font glyphs keep the text path's one-cell width, so icon-first items keep exact hit regions.

## Fail-closed behavior

Every provider-backed module hides itself — leaving the rest of the bar untouched — when its provider is absent, ungranted, stale past the horizon, revoked, or malformed. A hidden module never hides the bar, and providers send raw numbers only: thresholds and icons evaluate Lua-side, so a lost source degrades to absence, never to fabricated zeros.

Read and control never share an interface. Ungranted control degrades to read-only rendering (or a notification on click), never to an error, a retry, or an escalation.

## Per-module options: honest limits

Per-module option collections (one named group per module: `clock`, `cpu`, `memory`, `battery`, `network`, `bluetooth`, `backlight`, `idle`, `pulseaudio`, `microphone`, `spectrum`, `workspaces`) are declared in the manifest, but the v1 settings contract has no table or dot-path form: option groups currently read as module defaults, so user-supplied per-module options stay **inert** until a table/dot-path settings follow-up lands host- and SDK-side. No plugin change is needed when it does. Chassis scalars (`show`, `edge`, `show_single`, `name_max_chars`, `label`, `icons`) and the three module lists work today.

## Known limits

- `edge` is fixed for the activation generation because the mount slot cannot move; restart after changing it.
- Activation is lazy: the plugin activates on its first declared event or command, so `show_single = true` takes effect after the first workspace event.
- While Core still draws its own workspaceline, set `workspace.show_bar = false` to avoid two bars.

## Next steps

- [Plugin Configuration](../configuration/plugin-config.md) — File locations, when edits take effect, and worked examples.
- [Per-Plugin Config Files](plugin-settings.md) — File paths, the TOML subset, and the fail-to-default rules.
- [Troubleshooting & Safe Mode](../faq/troubleshooting.md) — What hidden modules and activation errors mean.
