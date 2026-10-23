# graphics (native extension)

Bounded PNG decode plus the raster mechanics subset for inline images. Placement policy, rect helpers, and renderer upload validation stay in Core (`bitty-graphics` README; `src/kitty_decode.rs`, `src/kitty_raster.rs`, `src/geometry.rs`).

- Source checkout: `$BITTY_WORKSPACE/bitty-graphics` ([github.com/bitty-terminal/bitty-graphics](https://github.com/bitty-terminal/bitty-graphics))
- Crate: `bitty-graphics` (library, `src/lib.rs`)
- Maturity: the graphics host seam is merged and tested; the published `0.0.24` extension carries the bounded decode/raster subset, while placement policy, rect helpers, and renderer upload validation stay in Core.

## Install status

> Published — `graphics 0.0.24` has a live CDN tarball and `SHA256SUMS` (verified 2026-10-22), and `extensions/catalog.v1` lists it for `x86_64-unknown-linux-gnu`. A bare install resolves `0.0.24` as the latest release for the host target; `--version 0.0.24` pins the same artifact.

Track the source checkout above. Install the published extension:

```bash
# Latest catalog release for this host (currently 0.0.24)
bitty extension install graphics
# Exact pin (reproducible automation; also works when the catalog is offline)
bitty extension install graphics --version 0.0.24

bitty extension list   # inspect the local extension inventory
```

Repo-style aliases (`bitty-graphics`) resolve to the same stored extension name. Core retains protocol intake, placement, resource policy, and renderer upload validation; installing the extension does not move those responsibilities.

## Lua / host surface

This crate exposes no direct `bitty.*` Lua namespace. It is Core-consumed mechanism: decode and raster math run behind Core's graphics intake, which enforces protocol, placement, and resource bounds. Lua plugins never call it directly.

## Minimal config

Native extensions take no per-extension user config file. Verify staging only:

```bash
bitty extension list
```

## Inline image previews

Bitty renders inline images with the [Kitty graphics protocol](https://sw.kovidgoyal.net/kitty/graphics-protocol/), so terminal file managers, image viewers, and preview tools paint real pixels inside a pane. There is no configuration key to enable it and no per-tool setup beyond asking the tool for Kitty output.

> [!NOTE]
> Complete preview support — Unicode placeholder images, alternate-screen images, and pixel-size reporting — ships with Bitty 0.0.26 (bitty#2458). On an older build, direct image placements still paint, but tools that rely on placeholders (yazi) show no preview and `icat` reports that the terminal cannot report pixel sizes.

### What is supported

- **Direct placements.** A program sends an image with a destination rectangle and Bitty paints it into that pane.
- **Unicode placeholder images.** One image is placed once and referenced by placeholder cells (`U+10EEEE` with row/column diacritics), which is how yazi paints previews. A prototype without an explicit cell span derives its span from the decoded pixel size.
- **Alternate-screen images.** Full-screen programs that switch to the alternate screen get their own image plane. Entering the alternate screen stashes the pane's main-screen images and placeholders, so the TUI's own images and screen clears stay on the alternate plane; leaving drops that plane and restores the stashed image at its original position, pixel content included. A TUI that clears the alternate screen on quit (as btop does before `?1049l`) therefore does not erase the image, and repeated enter/quit cycles restore it each time. Pane teardown drops both planes.
- **Aspect-preserving fit.** When a program requests a cell rectangle, the image is scaled to fit inside it with its aspect ratio preserved and centered in the leftover space (letterbox or pillarbox). Images are never stretched to fill the rectangle.
- **Pixel-size reporting.** Every pane's PTY reports both cell and pixel dimensions on spawn and on every resize, and the `CSI 14t` / `CSI 16t` queries answer for the pane that is actually painting, not whichever pane holds focus.

### Preview tools

| Tool           | Command                        | What you get                                 |
| :------------- | :----------------------------- | :------------------------------------------- |
| yazi 26.x      | `yazi`                         | Image previews through Unicode placeholders. |
| chafa          | `chafa -f kitty image.png`     | A Kitty-protocol render of the image.        |
| kitty's `icat` | `kitty +kitten icat image.png` | Image display plus `--print-window-size`.    |

A tool that prefers SIXEL or iTerm2 inline images will not paint here: Bitty implements bounded Kitty graphics only. To stop children from misdetecting the outer terminal, Bitty sets `TERM_PROGRAM=bitty` in the PTY and strips inherited `KITTY_*`, `VTE_VERSION`, and iTerm2 marker variables, so a tool that honours `TERM_PROGRAM` chooses the Kitty path instead of trying an unsupported protocol.

### Limits and failures

- Images live inside their pane: splitting, moving, or resizing a pane recomputes the placement from live cell metrics, and closing the pane drops its images.
- A frame paints at most 32 image blits and 64 MiB of image data. Overflow is deferred to the next frame rather than painted out of bounds.
- A failed decode or a missing local file drops that image's previous placement; placeholder cells are blanked, so a pending or failed preview never appears as a black band or replacement glyphs.
- Bitty never fetches remote images itself. The program that owns the image (yazi, chafa, `icat`) reads the file and sends the pixels.
- yazi shows names but no preview, or `icat` says the terminal cannot report screen sizes in pixels: the build predates the placeholder and pixel-size fixes (bitty#2458). Upgrade Bitty; no tool setting change is needed.
- An image in a pane disappears after you quit a full-screen app: the build predates the per-screen image planes that keep the main image while the alternate screen is active. Upgrade to Bitty 0.0.26 or later; the image returns at its original position and no tool setting change is needed.
- A tool paints a solid block or replacement characters: it chose SIXEL or iTerm2 output. Force its Kitty mode; Bitty advertises `TERM_PROGRAM=bitty` and no SIXEL support.
