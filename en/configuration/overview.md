# Configuration Reference

Bitty reads configuration from `$XDG_CONFIG_HOME/bitty/init.lua` (defaults to `~/.config/bitty/init.lua`, with fallback to `config.lua`).

Configuration is written in pure Lua (wezterm-style data return). The file is evaluated in a sandboxed, fuel-metered environment and must return a table containing configuration options.

Per-plugin settings use separate files under the `plugins/` directory. See [Plugin Configuration](plugin-config.md) for their locations, formats, and reload behavior.

## Live Reconciliation & Reload Classes

Bitty classifies all configuration changes into three categories:

1. **`Live`**: Reconciled immediately on file save without restarting the process or interrupting active PTY sessions.
2. **`RestartRequired`**: Accepted and persisted into effective configuration, but takes effect on the next process startup because it sets initial runtime structures.
3. **`Rejected`**: Invalid types, out-of-range bounds, or undeclared fields fail closed. A live reload reports the error and keeps the previous active configuration; startup ignores only the invalid part and continues (see below).

## Invalid Configuration at Startup

Startup is fail-soft for external configuration files. If a top-level table or
scalar in `init.lua` or a selected profile is invalid, Bitty drops only that
element, keeps every other valid setting from the same file and from other
layers, and prints one bounded diagnostic to stderr:

```text
bitty: warning: ignoring 'window' in '/home/user/.config/bitty/profiles/default.lua':
validation error at 'window.opacity': must be finite within [0.0, 1.0] (found 2);
ignored; using defaults and remaining layers
```

The message names the file path, the field path, the validation error, and the
fallback. Bitty never edits, comments out, or rewrites the configuration file
for you.

Failures that cannot be narrowed to one top-level element drop the whole
external file or profile layer, and startup continues with the remaining
layers. This covers Lua syntax or runtime errors, Lua budget exhaustion,
undeclared keys, unreadable files, and profile `extends` cycles or missing
parents. Valid settings from lower-precedence layers and the compiled-in
defaults then apply.

Some failures remain fatal instead of being ignored: a missing explicit
`--config` or `BITTY_CONFIG` path, a missing `--profile` / `BITTY_PROFILE`
name, command-line usage errors, and internal startup defects. Fix the path or
profile name and launch again. A persisted `profile = "..."` selector that no
longer resolves is external configuration, so startup ignores it with a
diagnostic instead of exiting; the selector is not rewritten and the next
launch retries. That miss loads no profile layer, so no other setting is
denied.

An ignored element never escalates a capability or trust setting. When a
security-sensitive setting is ignored — or when a whole file/profile layer is
dropped, because it might have restricted one — Bitty applies a deny overlay
after the merge and before the window opens:

- **Plugins**: deny-all. No configured plugin is enabled; the config layer has
  no runtime activation consumer, so this denies plugin configuration for the
  launch.
- **History capture**: transcript and command capture stay off.
- **Mouse buttons**: middle and right button actions become `none`.
- **Background images**: the decoration root allowlist is empty and every
  configured image is cleared (decoration, window, and per-view). No image
  file is approved or loaded, even if a lower layer declared one.

Lower layers cannot re-enable a denied setting for that launch. Every other
valid setting from the same file and from the remaining layers still applies.
`keymaps` grants no capability and falls back to the shipped defaults when
dropped; because the keymap model has no unbind action, a `command:` binding
declared by a lower-precedence layer can still appear. The startup diagnostic
summarizes which surfaces were denied.

[`bitty config check`](../getting-started/cli.md#configuration-management-bitty-config) and
`bitty doctor` stay strict: they report the same input as a non-zero failure
with the exact field path and never apply salvage. Live reload is strict too:
an invalid edit is rejected and keeps the last-good configuration instead of
falling back to defaults.

## Named Profiles

A named profile is a reusable configuration layer stored at `$XDG_CONFIG_HOME/bitty/profiles/<name>.lua` (i.e. `~/.config/bitty/profiles/<name>.lua`). Names are validated fail-closed to the characters `[A-Za-z0-9_-]` (1–64 characters, no paths or extensions). `XDG_CONFIG_DIRS` is never consulted for profiles.

Selection and value precedence are separate:

```text
selection: --profile NAME > BITTY_PROFILE > persisted init.lua selector
values:    CLI overrides > init.lua (user file) > selected profile chain > compiled-in defaults
```

`--profile` and `BITTY_PROFILE` select a profile for one launch and never rewrite the persisted selector. The child profile overrides its ancestors per field; `init.lua` still overrides the whole selected chain.

`extends` is accepted only inside a profile layer, as a single-parent chain with a 16-profile cap: the requested profile overrides its ancestors. `extends` in `init.lua` remains undeclared; the persisted selector is a separate, versioned envelope.

### Profile-backed setup

`bitty init` writes a profile-backed layout:

```text
$XDG_CONFIG_HOME/bitty/init.lua
$XDG_CONFIG_HOME/bitty/profiles/default.lua
```

`profiles/default.lua` holds the generated defaults. `init.lua` is a thin selector plus the place for your overrides:

```lua
-- $XDG_CONFIG_HOME/bitty/init.lua
return {
    format = "bitty-profile-v1",
    profile = "default",
    -- overrides go here, for example:
    window = { opacity = 0.95, padding = 8 },
}
```

The `format` discriminator marks the file as a selector. An existing complete `init.lua` without it is a legacy configuration and is never silently reinterpreted or replaced, even with `--force`.

Common operations:

```bash
# Fresh profile-backed setup (interactive, or non-interactive defaults)
bitty init
bitty init --yes

# Create or refresh only profiles/work.lua; does not activate it
bitty init --yes --profile work

# Activate explicitly (rewrites only the selector's profile value)
bitty config profile use work

# Inspect profiles
bitty config profile list
bitty config profile show work
bitty config profile path work

# Migrate an existing legacy init.lua explicitly
bitty init --migrate
```

Creating `profiles/default.lua` or any other profile never activates it. A bare launch with no selector remains unprofiled. `--force` is an explicit reset of the named generated file with collision-free `.bak` backups; it never converts a legacy file into a selector. A default run refuses an existing target rather than merging into hand-edited Lua: the wizard does not serialize a typed plan back over source, so edit the profile directly or use an explicit reset. With an explicit `--config`/`BITTY_CONFIG` selector, profiles resolve beside that file; one-launch `--profile` and `BITTY_PROFILE` still resolve under the user config root.

> [!NOTE]
> There is no automatic per-directory profile switching and no multi-parent inheritance. Plugin declarations in a profile are configuration data only: selecting or creating a profile never installs, enables, or grants a plugin.

## Complete Configuration Schema

### Window & Padding

| Field                        | Type      | Reload Class | Description                                                                                                                                                                                                             |
| :--------------------------- | :-------- | :----------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `window.opacity`             | `float`   | **Live**     | Background window transparency level (`0.0..=1.0`).                                                                                                                                                                     |
| `window.padding`             | `integer` | **Live**     | Inner window padding in logical pixels (`0..=64`).                                                                                                                                                                      |
| `window.radius_px`           | `integer` | **Live**     | Window corner radius in physical pixels (`0..=24`); accepted by the loader but currently a parsed no-op (CTX-0241 S0, compositor opt-in deferred).                                                                      |
| `window.blur_radius`         | `integer` | **Live**     | Background blur radius in logical pixels. OQ-038 has no accepted blur design, so **only `0` is accepted**; any non-zero value fails closed with a typed `window.blur_radius` error instead of acting as a silent no-op. |
| `window.background_image`    | `string`  | **Live**     | Window background image path (absolute or `~`-anchored, `<= 4096` bytes, approved roots).                                                                                                                               |
| `window.background_fit`      | `string`  | **Live**     | Fit mode: `"fill"` (cover, default), `"fit"` (contain), `"center"`, `"tile"`, `"stretch"`. See the fit semantics below.                                                                                                 |
| `window.background_opacity`  | `float`   | **Live**     | Image dim factor (`0.0..=1.0`, default `1.0`); multiplies only the image alpha, before `window.opacity` scales the finished window.                                                                                     |
| `window.background_position` | `string`  | **Live**     | One of `"center"` (default), `"top-left"`, `"top"`, `"top-right"`, `"left"`, `"right"`, `"bottom-left"`, `"bottom"`, `"bottom-right"`; only `fit`/`center` observe it.                                                  |

`window.opacity` and `window.padding` are optional individually. A `window`
table that declares only one of them defaults the other (`opacity` to `1.0`,
`padding` to `8`), like the other optional `window` keys. Present values keep
their type and range checks.

#### Window background fit semantics

The window tier (`window.background_image`) uses the live window surface as
its destination frame: it is stable across splits and pane moves, and is
re-derived on every window resize and DPI change. `window.padding` does not
shrink the window image: it still spans the full window behind the grid. The
per-view tier (`decoration.background_image` and the `views.<selector>`
override) uses that leaf's content frame instead, so it re-fits on a split,
divider move, pane move, and window resize.

- `fill` (default): uniform cover scale. The image preserves its aspect ratio,
  fills the window in both axes, crops the overflow evenly from the center,
  and leaves **no edge gaps**. This is the recommended wallpaper mode.
- `fit`: uniform contain scale. The full image is visible, centered in the
  window, and the remaining bands show the theme background; they can be
  moved with `window.background_position`.
- `center`: native pixel size (multiplied by the DPI scale), centered once.
  A larger image is cropped to the window; a smaller one leaves bands.
  `window.background_position` is honored.
- `tile`: native pixel size (multiplied by the DPI scale), repeated from the
  top-left; no scaling.
- `stretch`: the full image is scaled non-uniformly onto the whole window.
  Distortion is intentional in this mode.

`window.background_opacity` and `window.opacity` compose in a fixed order:
`background_opacity` multiplies the image's alpha when it is blended over the
theme background, then `window.opacity` scales the finished premultiplied
window once for the compositor. They are independent knobs: 1.0 on either
side removes only that side's effect, and the image is never dimmed twice by
the same value.

> [!NOTE]
> `window.blur_radius = 0` is accepted and means no blur. Non-zero values are
> rejected at config validation (`window.blur_radius: background blur is not
supported (OQ-038): only 0 is accepted`) until a bounded blur contract is
> accepted. The related `window.radius_px` is accepted by the loader but is
> likewise currently inert (parsed no-op).

### Decoration & Borders

Core-owned view decorations operate in logical pixels:

| Field                                 | Type      | Reload Class | Description                                                                                                                        |
| :------------------------------------ | :-------- | :----------- | :--------------------------------------------------------------------------------------------------------------------------------- |
| `decoration.border`                   | `integer` | **Live**     | View frame border width in logical pixels (`0..=8`, default `1`).                                                                  |
| `decoration.radius`                   | `integer` | **Live**     | View frame corner radius in logical pixels (`0..=16`, default `6`).                                                                |
| `decoration.gaps_in`                  | `integer` | **Live**     | Inner gap between sibling panels in logical pixels (`0..=32`, default `6`).                                                        |
| `decoration.gaps_out`                 | `integer` | **Live**     | Outer gap around workspace container in logical pixels (`0..=32`, default `6`).                                                    |
| `decoration.content_inset`            | `integer` | **Live**     | Inner padding between border and painted content in logical pixels (`0..=32`).                                                     |
| `decoration.border_color`             | `string`  | **Live**     | Base outline border color (`#RRGGBB` or `#RRGGBBAA`).                                                                              |
| `decoration.border_color_focused`     | `string`  | **Live**     | Explicit outline border color for the focused view.                                                                                |
| `decoration.border_color_idle`        | `string`  | **Live**     | Explicit outline border color for unfocused/idle views.                                                                            |
| `decoration.border_width`             | `integer` | **Live**     | Base outline border width in logical pixels (`0..=16`, default `1`).                                                               |
| `decoration.border_width_focused`     | `integer` | **Live**     | Explicit outline width for focused view in logical pixels (`0..=16`).                                                              |
| `decoration.border_width_idle`        | `integer` | **Live**     | Explicit outline width for idle views in logical pixels (`0..=16`).                                                                |
| `decoration.background_image`         | `string`  | **Live**     | Path to global background image under approved roots.                                                                              |
| `decoration.background_fit`           | `string`  | **Live**     | Background fit mode: `"fill"`, `"fit"`, `"center"`, `"tile"`, or `"stretch"`.                                                      |
| `decoration.background_image_roots`   | `array`   | **Live**     | Approved directory roots for background image resolution.                                                                          |
| `decoration.background_tint`          | `string`  | **Live**     | Background tint color over the View background image (`#RRGGBB` or `#RRGGBBAA`).                                                   |
| `decoration.background_tint_strength` | `float`   | **Live**     | Tint strength (`0.0..=1.0`, default `0.0` = no tint); applies only when `background_tint` and a View background image are present. |

### Font & Shaping

| Field                    | Type     | Reload Class        | Description                                                                       |
| :----------------------- | :------- | :------------------ | :-------------------------------------------------------------------------------- |
| `font.family`            | `string` | **Live**            | Primary font family name used for terminal text rendering.                        |
| `font.size`              | `float`  | **Live**            | Font point size (`0.0 < size <= 128.0`).                                          |
| `font.line_height`       | `float`  | **Live**            | Line height multiplier relative to font size (`1.0..=2.0`).                       |
| `font.letter_spacing`    | `float`  | **Live**            | Additional letter spacing delta in pixels (`0.0..=8.0`).                          |
| `font.fallback`          | `array`  | **RestartRequired** | User-ordered fallback font family names tried before platform defaults.           |
| `font.features`          | `array`  | **RestartRequired** | Raw OpenType feature overrides applied at shaping time (e.g. `{"calt", "ss01"}`). |
| `font.disable_ligatures` | `string` | **RestartRequired** | Programming-ligature policy: `"never"`, `"cursor"`, or `"always"`.                |

### Terminal Behavior & Selection

| Field                              | Type      | Reload Class        | Description                                                                                                                                               |
| :--------------------------------- | :-------- | :------------------ | :-------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `terminal.scrollback`              | `integer` | **RestartRequired** | Maximum scrollback buffer lines (`0..=100000`, default `10000`).                                                                                          |
| `terminal.shell`                   | `string`  | **RestartRequired** | Preferred default shell executable path (`argv[0]`).                                                                                                      |
| `terminal.scroll_lines_per_notch`  | `integer` | **RestartRequired** | Lines scrolled per wheel notch (`1..=32`, default `3`).                                                                                                   |
| `terminal.scroll_pixels_per_notch` | `integer` | **RestartRequired** | Smooth-scroll pixels per wheel notch (`1..=256`, default `16`).                                                                                           |
| `terminal.page_scroll_percent`     | `integer` | **RestartRequired** | Page-scroll distance (`alt+u` / `alt+i`) as a percentage of viewport rows (`10..=100`, default `75`).                                                     |
| `terminal.cursor_style`            | `string`  | **RestartRequired** | Initial cursor shape (`"default"`, `"blinking_block"`, `"steady_block"`, `"blinking_underline"`, `"steady_underline"`, `"blinking_bar"`, `"steady_bar"`). |
| `terminal.bell`                    | `string`  | **RestartRequired** | Bell alert behavior (`"off"`, `"visual"`, `"audible"`, `"both"`).                                                                                         |
| `selection.auto_copy`              | `boolean` | **RestartRequired** | Whether selecting text automatically copies to the system clipboard (default `false`).                                                                    |
| `close_confirm`                    | `string`  | **RestartRequired** | View close safety confirmation: `"always"`, `"when_busy"` (default), or `"never"`.                                                                        |
| `history.capture.transcript`       | `boolean` | **RestartRequired** | Opt in to capturing completed scrollback lines into the bounded, redacted transcript ring (default `false`).                                              |
| `history.capture.commands`         | `boolean` | **RestartRequired** | Accepted opt-in for command-history capture; no command source is implemented yet, so it is inert (default `false`).                                      |

`selection.auto_copy` only controls whether a finished selection is written to
the system clipboard. Pointer selection itself is always available: the
I-beam appears only over selectable grid text, `Alt`+drag selects a rectangular
block, and ranges may span scrollback. A selection is presentation state, not
terminal content: resizing or changing DPI re-clamps its buffer anchors, and
losing the anchored content drops it instead of selecting different text.

### Layout & Workspaces

| Field                | Type      | Reload Class        | Description                                                                                                                                                                                          |
| :------------------- | :-------- | :------------------ | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `layout.gaps_in`     | `integer` | **RestartRequired** | Inner gap between sibling panes in character cells (`0` = edge-to-edge).                                                                                                                             |
| `layout.gaps_out`    | `integer` | **RestartRequired** | Outer gap between container edges and panes in character cells.                                                                                                                                      |
| `layout.resize_step` | `float`   | **Live**            | Tiled split-ratio delta per resize keypress (`0.01..=0.20`, default `0.05`).                                                                                                                         |
| `workspace.layout`   | `string`  | **RestartRequired** | Parsed, validated, and merged but not applied to new workspaces yet (reserved); accepts provider names such as `"spiral"`, `"dwindle"`, `"master"`, `"grid"`, or a qualified `owner.name:algorithm`. |
| `workspace.show_bar` | `boolean` | **Live**            | Whether the workspace status bar is displayed (reserved Core input consumed by extensions).                                                                                                          |
| `workspace.bar.edge` | `string`  | **Live**            | Edge placement of the workspace status bar (`"top"` or `"bottom"`, default `"bottom"`, consumed by extensions).                                                                                      |

### Appearance, Themes & Animations

| Field                                         | Type      | Reload Class | Description                                                                                       |
| :-------------------------------------------- | :-------- | :----------- | :------------------------------------------------------------------------------------------------ |
| `appearance.theme`                            | `string`  | **Live**     | Built-in theme name or explicit `local:<name>` file selection.                                    |
| `appearance.colors`                           | `table`   | **Live**     | Custom inline palette definition (chrome tokens + 16 ANSI colors).                                |
| `appearance.style.glow_color`                 | `string`  | **Live**     | Optional glow halo color (`#RRGGBB` or `#RRGGBBAA`); unset paints no glow.                        |
| `appearance.style.glow_width`                 | `integer` | **Live**     | Glow halo width in logical pixels (`0..=16`, default `0`).                                        |
| `appearance.style.shadow_color`               | `string`  | **Live**     | Optional drop-shadow color (`#RRGGBB` or `#RRGGBBAA`); unset paints no shadow.                    |
| `appearance.style.shadow_offset_x`            | `integer` | **Live**     | Drop-shadow horizontal offset in logical pixels (`-8..=8`, default `0`).                          |
| `appearance.style.shadow_offset_y`            | `integer` | **Live**     | Drop-shadow vertical offset in logical pixels (`-8..=8`, default `0`).                            |
| `appearance.style.fade_unfocused`             | `float`   | **Live**     | Dim factor for inactive Views (`0.0..=1.0`, default `1.0` = no fade).                             |
| `appearance.animations.enabled`               | `boolean` | **Live**     | Master switch for presentation transitions and animations.                                        |
| `appearance.animations.reduced_motion`        | `string`  | **Live**     | Reduced-motion accessibility mode (`"auto"` default, `"always"`, `"never"`).                      |
| `appearance.animations.duration_ms.open`      | `integer` | **Live**     | Panel-open duration in milliseconds (`0..=500`, default `150`).                                   |
| `appearance.animations.duration_ms.close`     | `integer` | **Live**     | Panel-close duration in milliseconds (`0..=500`, default `120`).                                  |
| `appearance.animations.duration_ms.focus`     | `integer` | **Live**     | Focus-change duration in milliseconds (`0..=500`, default `100`).                                 |
| `appearance.animations.duration_ms.workspace` | `integer` | **Live**     | Workspace-switch duration in milliseconds (`0..=500`, default `200`).                             |
| `appearance.animations.duration_ms.move`      | `integer` | **Live**     | Panel-move duration in milliseconds (`0..=500`, default `150`).                                   |
| `appearance.animations.duration_ms.resize`    | `integer` | **Live**     | Panel-resize duration in milliseconds (`0..=500`, default `120`).                                 |
| `appearance.animations.duration_ms.drag`      | `integer` | **Live**     | Panel-drag duration in milliseconds (`0..=500`, default `150`).                                   |
| `appearance.animations.easing.open`           | `string`  | **Live**     | Panel-open easing (`linear`, `ease_in`, `ease_out`, `ease_in_out`, `spring`; default `ease_out`). |
| `appearance.animations.easing.close`          | `string`  | **Live**     | Panel-close easing (same set; default `ease_in`).                                                 |
| `appearance.animations.easing.focus`          | `string`  | **Live**     | Focus-change easing (same set; default `ease_in_out`).                                            |
| `appearance.animations.easing.workspace`      | `string`  | **Live**     | Workspace-switch easing (same set; default `ease_in_out`).                                        |
| `appearance.animations.easing.move`           | `string`  | **Live**     | Panel-move easing (same set; default `ease_in_out`).                                              |
| `appearance.animations.easing.resize`         | `string`  | **Live**     | Panel-resize easing (same set; default `ease_in_out`).                                            |
| `appearance.animations.easing.drag`           | `string`  | **Live**     | Panel-drag easing (same set; default `ease_out`).                                                 |

Chrome styling paints only the View frame and its background: it never moves
the content grid or interpolates terminal truth. `shadow_color`,
`shadow_offset_x`, `shadow_offset_y`, and `fade_unfocused` are global-only; the
per-view tier accepts `glow_color`, `glow_width`, `background_tint`, and
`background_tint_strength` alongside the outline and image leaves listed below.
`spring` is accepted but currently resolves to `ease_in_out`, and
`appearance.animations.enabled = false` or `reduced_motion = "always"` is
equivalent to a `0` ms duration.

### Themes and custom colors

`appearance.theme` selects one of the 30 built-in presets or a local theme
file (`local:<name>`; see [Themes and readability](themes.md)). `bitty list
themes` prints the catalog with a `PROVENANCE` column that reads `builtin` or
`local`; it performs no network request. A preset is shorthand over the
terminal color roles: background, foreground, cursor, selection background,
and ANSI 0–15. See [Themes and readability](themes.md) for the catalog, the
local file schema, the WCAG contrast guarantees, and the `bitty config check`
diagnostics.

To skip presets and define your own colors, set the complete inline
`appearance.colors` table. It replaces the terminal roles from the selected
preset; the preset still supplies the focused/idle pane outline tokens.

```lua
return {
  appearance = {
    theme = "bitty-dark", -- optional base preset for outline tokens
    colors = {
      background = "#0b1020",
      foreground = "#e6e6fa",
      cursor = "#ff2e88",
      selection = "#24304a",
      ansi = {
        "#101020", "#ff5555", "#50fa7b", "#f1fa8c",
        "#7aa2f7", "#ff79c6", "#8be9fd", "#c0caf5",
        "#414868", "#ff6e6e", "#69ff94", "#ffffa5",
        "#d6acff", "#ff92df", "#a4ffff", "#ffffff",
      },
    },
  },
}
```

The table is fail-closed and must be complete:

| Field        | Type                  | Requirement                                              |
| :----------- | :-------------------- | :------------------------------------------------------- |
| `background` | `string`              | Required, canonical `#RRGGBB` (no alpha or shorthand).   |
| `foreground` | `string`              | Required, canonical `#RRGGBB`.                           |
| `cursor`     | `string`              | Required, canonical `#RRGGBB`.                           |
| `selection`  | `string`              | Required, canonical `#RRGGBB`.                           |
| `ansi`       | `array` of 16 strings | Required, exactly 16 canonical `#RRGGBB` entries (0–15). |

A missing role, a wrong-length `ansi` array, or a non-hex value rejects the
whole configuration or reload with a diagnostic naming the exact field (for
example the offending `ansi` index). Roles are never merged with the previous
theme: the change either applies completely or not at all. Both
`appearance.theme` and `appearance.colors` are **Live**; the next presented
frame repaints existing grid cells, scrollback, the selection overlay, the
cursor, and cached glyphs.

What the theme controls, and what is derived:

- Controlled: window/cell background, default text foreground, ANSI 0–15
  (normal and bright), cursor, selection background, and the derived chrome
  accents (scrollbar thumb, URL-hover underline, leader hint pills, pending
  banner, help panel, IME preedit).
- Derived: selected text keeps its own foreground (default or ANSI) over the
  selection background; the scrollbar and hover underline reuse the foreground
  at reduced alpha; hint pills use the selection ground with foreground text;
  the pending banner uses ANSI 3 with contrast-chosen text; the help panel uses
  the selection ground, ANSI 12 ring, and foreground text; the IME preedit uses
  the selection ground, cursor underline, and foreground glyphs.
- Not themed: focused/idle pane outlines (preset or explicit decoration keys),
  glow/shadow/tint/fade (explicit `appearance.style` / `decoration` keys),
  layout, input, and terminal content itself.

### Per-view overrides (`views`)

`views` applies chrome overrides to individual Views. The key is a selector,
and tiers resolve per field in this order regardless of declaration order:
`*` (every View), a content type (`empty`, `terminal`, `rich`, `browser`),
`ws:<1..=16>` (one workspace), then `view:<ViewId>` (one stable View id).

```lua
return {
  views = {
    ["*"] = { border_color = "#313244" },
    terminal = { glow_color = "#89b4fa", glow_width = 2 },
    ["ws:2"] = { background_tint = "#11223344", background_tint_strength = 0.25 },
    ["view:7"] = { border_color_focused = "#f38ba8" },
  },
}
```

| Field                                       | Type      | Description                                                               |
| :------------------------------------------ | :-------- | :------------------------------------------------------------------------ |
| `views.<selector>.border_color`             | `string`  | Base outline color (`#RRGGBB` or `#RRGGBBAA`).                            |
| `views.<selector>.border_color_focused`     | `string`  | Focused outline color.                                                    |
| `views.<selector>.border_color_idle`        | `string`  | Idle outline color.                                                       |
| `views.<selector>.border_width`             | `integer` | Base outline width in logical pixels (`0..=16`).                          |
| `views.<selector>.border_width_focused`     | `integer` | Focused outline width in logical pixels (`0..=16`).                       |
| `views.<selector>.border_width_idle`        | `integer` | Idle outline width in logical pixels (`0..=16`).                          |
| `views.<selector>.background_image`         | `string`  | Per-View background image path under the approved roots.                  |
| `views.<selector>.background_fit`           | `string`  | Per-View fit mode (`"fill"`, `"fit"`, `"center"`, `"tile"`, `"stretch"`). |
| `views.<selector>.glow_color`               | `string`  | Per-View glow halo color.                                                 |
| `views.<selector>.glow_width`               | `integer` | Per-View glow halo width in logical pixels (`0..=16`).                    |
| `views.<selector>.background_tint`          | `string`  | Per-View background tint color (`#RRGGBB` or `#RRGGBBAA`).                |
| `views.<selector>.background_tint_strength` | `float`   | Per-View tint strength (`0.0..=1.0`).                                     |

An unset leaf inherits the next-less-specific tier and never shadows it.
`opacity`, `blur`, and `animations` are reserved and rejected inside `views`;
`shadow_color`, `shadow_offset_x`, `shadow_offset_y`, `fade_unfocused`, and
`background_image_roots` stay global-only. Changes are **Live**: a selector edit
re-resolves the affected Views without recreating a View or Terminal. A tint is
visible only where a View paints a background image; without one it is inert.

### Input, Keymaps & Leader

| Field               | Type      | Reload Class | Description                                                                       |
| :------------------ | :-------- | :----------- | :-------------------------------------------------------------------------------- |
| `input.leader`      | `string`  | **Live**     | Canonical Leader chord prefix (e.g. `"ctrl+b"`, `"ctrl+space"`).                  |
| `input.timeout_len` | `integer` | **Live**     | Canonical Leader pending-window timeout in milliseconds (`100..=60000`).          |
| `leader_key`        | `string`  | **Live**     | Legacy top-level alias for `input.leader`.                                        |
| `leader_timeout_ms` | `integer` | **Live**     | Legacy top-level alias for `input.timeout_len`.                                   |
| `hints_enabled`     | `boolean` | **Live**     | Whether interactive leader chord hint overlays are enabled.                       |
| `mod_key`           | `string`  | **Live**     | Modifier key for shipped chrome keybindings (`"alt"` or `"super"`).               |
| `keymaps`           | `array`   | **Live**     | User keybinding overrides and chord registrations (`chord`, `action`, `context`). |

### Scrollbar, Mouse & Session

| Field                                | Type      | Reload Class        | Description                                                                            |
| :----------------------------------- | :-------- | :------------------ | :------------------------------------------------------------------------------------- |
| `scrollbar.mode`                     | `string`  | **RestartRequired** | Scrollbar display mode (`"auto"`, `"always"`, `"hidden"`).                             |
| `scrollbar.width`                    | `integer` | **RestartRequired** | Scrollbar thumb width in logical pixels.                                               |
| `mouse.focus_follows_mouse`          | `boolean` | **RestartRequired** | Whether pane focus automatically follows cursor movement.                              |
| `mouse.focus_follows_mouse_delay_ms` | `integer` | **RestartRequired** | Dwell time in milliseconds before hover focus activates.                               |
| `mouse.right`                        | `string`  | **RestartRequired** | Right-button binding: `"none"` (default, inert) or any chrome action.                  |
| `mouse.middle`                       | `string`  | **RestartRequired** | Middle-button binding: `"none"` or any chrome action (default `"paste_from_primary"`). |
| `session.restore_on_startup`         | `boolean` | **RestartRequired** | Whether to restore previous workspaces and session on startup.                         |
| `plugins`                            | `array`   | **RestartRequired** | Explicit plugin declarations (`{ id = "owner/name", enabled = true }`).                |

Middle-click pastes the primary selection by default, matching the Linux
selection convention; right-click is inert by default. Both buttons accept
`"none"` or any chrome action from the same vocabulary as `keymaps[].action`.
A pane that enables mouse reporting still receives the protocol bytes for that
click, and Bitty does not run the host binding.

## Example `init.lua`

Here is a comprehensive, production-ready `init.lua`:

```lua
return {
  window = {
    opacity = 0.95,
    padding = 8,
    radius_px = 6,
  },
  decoration = {
    border = 1,
    radius = 6,
    gaps_in = 6,
    gaps_out = 6,
    content_inset = 6,
    border_color = "#313244",
    border_color_focused = "#89b4fa",
  },
  font = {
    family = "JetBrains Mono",
    size = 13.0,
    line_height = 1.15,
    letter_spacing = 0.0,
    disable_ligatures = "never",
  },
  terminal = {
    scrollback = 10000,
    scroll_lines_per_notch = 3,
    scroll_pixels_per_notch = 16,
    page_scroll_percent = 75,
    cursor_style = "steady_bar",
    bell = "visual",
  },
  selection = {
    auto_copy = false,
  },
  close_confirm = "when_busy",
  layout = {
    gaps_in = 0,
    gaps_out = 0,
    resize_step = 0.05,
  },
  workspace = {
    -- `layout` is parsed and validated but not applied yet (reserved).
    -- The following keys are reserved Core inputs consumed by extensions
    -- (Bitty Core draws no native bar):
    show_bar = true,
    bar = {
      edge = "bottom",
    },
  },
  appearance = {
    theme = "tokyo-night",
  },
  input = {
    leader = "ctrl+space",
    timeout_len = 1000,
  },
  hints_enabled = true,
  mod_key = "alt",
  scrollbar = {
    mode = "auto",
    width = 8,
  },
  mouse = {
    focus_follows_mouse = false,
    focus_follows_mouse_delay_ms = 150,
  },
  keymaps = {
    {
      chord = "ctrl+p",
      action = "toggle_palette",
      context = "global",
    },
  },
}
```
