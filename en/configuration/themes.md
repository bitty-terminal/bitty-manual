# Themes and readability

Bitty ships 30 built-in color presets (20 dark, 10 light), a complete inline
palette, and an optional local theme file (0.0.27). Built-in presets are
selected by name and are compiled into the binary; no theme fetch or download
happens.

## Select a theme

```lua
return {
    appearance = {
        theme = "catppuccin-latte",
    },
}
```

`theme = "<name>"` is an accepted alias. To follow the OS appearance, use the
dual form (either order; both halves required):

```lua
return {
    appearance = {
        theme = "light:catppuccin-latte,dark:catppuccin-mocha",
    },
}
```

A theme switch repaints existing text, ANSI colors, the cursor, the selection,
scrollback, and derived chrome without restarting the process. An unknown name
fails closed with a diagnostic listing the valid set; `bitty list themes` prints
the catalog with categories, aliases, and a `PROVENANCE` column that reads
`builtin` or `local`. Listing performs no network request.

### Dark presets

`bitty-dark`, `tokyo-night`, `tokyo-night-storm`, `catppuccin-mocha`,
`catppuccin-macchiato`, `catppuccin-frappe`, `dracula`, `nord`,
`gruvbox-dark`, `solarized-dark`, `one-dark`, `ayu-dark`, `ayu-mirage`,
`kanagawa-wave`, `rose-pine`, `rose-pine-moon`, `everforest-dark`, `monokai`,
`night-owl`, `github-dark`.

### Light presets

`tokyo-night-day`, `catppuccin-latte`, `gruvbox-light`, `solarized-light`,
`one-light`, `ayu-light`, `kanagawa-lotus`, `rose-pine-dawn`,
`everforest-light`, `github-light`.

## Local theme files (not yet available)

Bitty 0.0.26 does not load theme files. The `$XDG_CONFIG_HOME/bitty/themes/`
directory is reserved but inert (OQ-047): a TOML file placed there changes
nothing, and `bitty list themes` lists built-in presets only. Local theme files,
hot reload of the active local theme, and a load-time contrast gate (normal text
**4.5:1**, focused outline **3:1**) are **not shipped**; the work is proposed
and tracked as [bitty#2465](https://github.com/bitty-terminal/bitty/issues/2465),
so no file format, key names, or limits are documented here until it lands.

Until then, use the inline `appearance.colors` palette below. It is live, and
`bitty config check` already reports its measurements.

## Readability guarantees

Every shipped preset is measured with WCAG 2.1 contrast, and a regression fails
the build:

- Default text and the ANSI colors used for syntax highlighting, `ls --color`,
  diffs, and Vim must reach **4.5:1** against the background.
- The cursor block must reach **4.5:1** against the background and **3:1**
  against the selection (the IME preedit ground).
- Selected text keeps its own foreground and must reach **4.5:1** on the
  selection fill; the selection fill itself stays visible at **1.3:1**.
- The help-panel ring, focused View outline, and other non-text chrome reach
  **3:1**.
- Different ANSI color families stay distinguishable by hue or perceptual
  lightness; a contrast repair never collapses two families into one color.

Palette repairs change lightness, not identity: a repaired slot keeps its hue.
The only exception is `one-light` cyan, which upstream aliases to green and is
rotated to teal so the two remain distinguishable.

`bitty config check` prints the active preset's measurements and the policy
result:

```text
theme.contrast = fg 15.80:1, min ANSI 4.52:1, cursor 5.19:1, selection 10.65:1/1.48:1, ring 3.05:1 (policy)
theme.contrast.result = pass (policy)
```

Use it after editing `appearance.colors` or reporting a readability problem.

### Known exceptions

Solarized is designed as a low-contrast scheme. `solarized-light` keeps its
upstream 4.13:1 foreground, and both Solarized presets keep their upstream
selection and neutral bright ANSI ramp. These exceptions are explicit in
`bitty config check` output (`theme.contrast.exempt.*`), not silent passes.

### Vim and other TUI programs

ANSI colors come from the preset, so a TUI does not need its own theme file.
Pair a light preset with `:set background=light` and a dark preset with
`:set background=dark` so Vim's own highlight groups line up with the terminal
colors. Test with `:syntax on` in a source file to see keywords, strings,
comments, types, and diagnostics.

## Custom palette

`appearance.colors` accepts a complete inline palette (`background`,
`foreground`, `cursor`, `selection`, and exactly 16 `ansi` entries). It replaces
the terminal roles of the selected preset; the focused/idle outline pair stays
with the preset. A malformed leaf rejects the whole layer with a diagnostic
naming the exact field.

## Local theme files (0.0.27)

You can keep one theme per flat TOML file in
`$XDG_CONFIG_HOME/bitty/themes/` (fallback `~/.config/bitty/themes/`) and
select it explicitly:

```lua
return {
    appearance = {
        theme = "local:sunset",
    },
}
```

```toml
# $XDG_CONFIG_HOME/bitty/themes/sunset.toml
name = "sunset"
category = "dark"
source = "https://example.invalid/sunset"  # metadata only; never fetched
license = "MIT"
background = "#1e1e2e"
foreground = "#cdd6f4"
cursor = "#f5e0dc"
selection = "#313244"
ansi = ["#45475a", "#f38ba8", "#a6e3a1", "#f9e2af", "#89b4fa", "#f5c2e7", "#94e2d5", "#bac2de", "#585b70", "#f38ba8", "#a6e3a1", "#f9e2af", "#89b4fa", "#f5c2e7", "#94e2d5", "#cdd6f4"]
border_focused = "#33CCFF"   # optional
border_idle = "#595959AA"    # optional
```

Rules that matter:

- The `local:` prefix is required. A local file never changes a built-in
  preset name, and selecting a built-in preset still performs zero file I/O.
- At most 64 `.toml` files, each at most 64 KiB; symlinks are not accepted.
  Keys are flat and one per line, so the `ansi` and `aliases` arrays stay on
  one line. Unknown fields, malformed `#RRGGBB` colors, and arrays without
  exactly 16 ANSI entries reject that file with a diagnostic.
- Every accepted file must clear the normal-text **4.5:1** and focused-outline
  **3:1** contrast floors; a failing theme is rejected, not shown as
  selectable.
- A valid edit is picked up automatically while Bitty runs. An invalid edit
  keeps the last good palette and reports `load-error`; it never paints a
  partial palette.
- Local `source` is provenance metadata only. No theme path downloads, fetches,
  or validates a URL.

See `bitty list themes` for accepted local rows (`local:<name>`) and per-file
diagnostics for rejected files. The full schema is still a candidate contract
under OQ-047; `$XDG_DATA_HOME/bitty/themes/` installed theme packages are not
implemented.
