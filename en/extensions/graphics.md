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
