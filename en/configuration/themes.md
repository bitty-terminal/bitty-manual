# Themes and readability

Bitty ships 30 built-in color presets (20 dark, 10 light) and a complete inline
palette. A preset is selected by name; there is no theme file to install.

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
the catalog with categories and aliases.

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
