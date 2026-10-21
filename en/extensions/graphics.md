# graphics (native extension)

Bounded PNG decode plus the raster mechanics subset for inline images. Placement policy, rect helpers, and renderer upload validation stay in Core (`bitty-graphics` README; `src/kitty_decode.rs`, `src/kitty_raster.rs`, `src/geometry.rs`).

- Source checkout: `$BITTY_WORKSPACE/bitty-graphics` ([github.com/bitty-terminal/bitty-graphics](https://github.com/bitty-terminal/bitty-graphics))
- Crate: `bitty-graphics` (library, `src/lib.rs`)
- Maturity: the graphics host seam is merged and tested; the published `0.0.24` component carries the bounded decode/raster subset, while placement policy, rect helpers, and renderer upload validation stay in Core.

## Install status

> Published — `graphics 0.0.24` has a live CDN tarball and `SHA256SUMS` (verified 2026-10-21). The extension catalog (`extensions/catalog.v1`) is still unpublished (404), so `bitty extension install graphics` (bare latest) currently fails closed with a `--version` hint; pin the published release.

Track the source checkout above. Install the published component exactly:

```bash
# Recommended: pin the verified release (catalog latest needs the catalog)
bitty extension install graphics --version 0.0.24
# Repo-style alias (same stored component name)
bitty extension install bitty-graphics --version 0.0.24

bitty extension list   # inspect the local component inventory
```

Core retains protocol intake, placement, resource policy, and renderer upload validation; installing the component does not move those responsibilities.

## Lua / host surface

This crate exposes no direct `bitty.*` Lua namespace. It is Core-consumed mechanism: decode and raster math run behind Core's graphics intake, which enforces protocol, placement, and resource bounds. Lua plugins never call it directly.

## Minimal config

Native extensions take no per-extension user config file. Verify staging only:

```bash
bitty extension list
```
