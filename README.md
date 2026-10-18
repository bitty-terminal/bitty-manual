# Bitty Manual

Canonical user manual, configuration reference, Lua API, and guides for [Bitty](https://github.com/bitty-terminal/bitty).

## Purpose & Scope

Unlike the architectural and governance corpora (`bitty-docs`, `bitty-terminal-docs`, `bitty-plugins-docs`, `bitty-ai-docs`) which focus on internal designs, RFCs, and ADRs, `bitty-manual` is the **authoritative, concise, human-oriented manual** for end users and plugin authors.

It serves as the single source of truth for:

- **Online Documentation**: Consumed by [bitty-website](https://github.com/bitty-terminal/bitty-website) to render `https://bitty.run/docs`.
- **Terminal-Native Doc Viewer**: Consumed by the `bitty doc` CLI and downstream panel plugin for local offline viewing (`https://cdn.bitty.run/manual/`).
- **CDN Distribution & Offline Bundles**: Continuous Delivery automatically publishes versioned packages, search indices, and raw markdown to Cloudflare R2.

## Distribution & CDN Endpoints

Documentation artifacts are continuously published to the `bitty` Cloudflare R2 bucket and served at `https://cdn.bitty.run/manual/`. The canonical layout is per-package (`manual/<package>/`, package `bitty-manual`); a new locale ships as new files without renaming existing keys.

- **Manifest**: `https://cdn.bitty.run/manual/bitty-manual/manifest.json`
- **Search Index**: `https://cdn.bitty.run/manual/bitty-manual/search-index.json` (offline fuzzy search)
- **Table of Contents**: `https://cdn.bitty.run/manual/bitty-manual/toc.json` (hierarchical navigation)
- **Per-Locale Tarballs**: `https://cdn.bitty.run/manual/bitty-manual/<locale>.tar.gz` (e.g. `en.tar.gz`, `zh-CN.tar.gz`)
- **Per-Locale Zips**: `https://cdn.bitty.run/manual/bitty-manual/<locale>.zip`
- **Versioned (immutable)**: `https://cdn.bitty.run/manual/bitty-manual/v<version>/<locale>.tar.gz` plus versioned `manifest.json`, `search-index.json`, `toc.json`
- **Raw Documents**: `https://cdn.bitty.run/manual/bitty-manual/<locale>/<section>/<file>.md`

### Legacy Compat (Dual-Publish)

The previous flat keys keep working and are dual-published on every deploy — no existing URL breaks:

| Legacy key                                                                      | Canonical replacement                                                   |
| :------------------------------------------------------------------------------ | :---------------------------------------------------------------------- |
| `manual/manifest.json`                                                          | `manual/bitty-manual/manifest.json`                                     |
| `manual/search-index.json`, `manual/toc.json`                                   | `manual/bitty-manual/search-index.json`, `manual/bitty-manual/toc.json` |
| `manual/bitty-manual-latest.tar.gz` / `.zip` (and versioned `-<version>` files) | `manual/bitty-manual/<locale>.tar.gz` / `.zip`                          |
| `manual/<locale>/<section>/<file>.md`                                           | `manual/bitty-manual/<locale>/<section>/<file>.md`                      |
| `manual/latest/...` mirror                                                      | `manual/bitty-manual/...`                                               |

Compat mechanism is copies, not redirects (plain R2 public serving has no redirect primitive). Sunset: legacy keys stop being published once `bitty doc` and the website cut over to canonical keys; removal is tracked follow-up work, announced before it lands.

### Live Verification (CD-Run Step)

A local listing is not possible with the available tooling (`wrangler r2 object` supports get/put/delete only), so the expected key set is reconstructed from `scripts/upload-r2.mjs` and verified live in CD: after `just upload-r2`, the `Verify published keys` step fetches the canonical manifest, one per-locale bundle, and the legacy manifest over public HTTPS. Local work validates the same mapping with `just upload-r2-dry`, which prints every key without network access.

## Downstream `bitty doc` Offline Panel Integration

The downstream documentation viewer plugin runs inside a Bitty Panel (similar to `cargo doc` or `tldr`):

1. **Initial Sync / Update**: Fetches `https://cdn.bitty.run/manual/bitty-manual/manifest.json` or downloads `bitty-manual/<locale>.tar.gz` into `$XDG_DATA_HOME/bitty/manual/` (Linux) or `%LOCALAPPDATA%\bitty\manual` (Windows). Legacy flat keys under `manual/` keep working until the documented sunset.
2. **Offline Fuzzy Finder**: Loads `search-index.json` to enable instant keyword search across all sections and headings without network latency.
3. **In-Terminal Markdown Rendering**: Directly displays selected documentation inside an active terminal panel.

## Anti-Drift Architecture

To ensure all documented configuration fields, types, and API signatures are 100% accurate and never drift from the Rust runtime:

1. Canonical schema definitions are tracked in `schemas/config-fields.json`.
2. CI enforces `scripts/verify-config-schema.mjs` on every commit, failing closed if any documented configuration field does not exist in the authoritative schema.

## Directory Layout

```text
bitty-manual/
├── manifest.json              # Canonical table of contents and version mapping
├── schemas/                   # Authoritative schema snapshots
│   └── config-fields.json
├── en/                        # Canonical English documentation
│   ├── getting-started/       # Installation & initial tour
│   ├── configuration/         # Configuration keys, types, and reload classes
│   ├── extensions/            # Upstream Rust-level extension catalog
│   ├── plugins/               # Plugin architecture, manifests, and capabilities
│   │   └── catalog/           # Downstream Lua plugin catalog
│   ├── api/                   # Sandboxed Lua API reference
│   └── faq/                   # Troubleshooting, safe mode, and diagnostics
├── zh-CN/                     # Simplified Chinese mirror of en/ (same layout)
├── scripts/                   # Verification and validation scripts
│   ├── verify-config-schema.mjs
│   ├── package-manual.mjs     # Packaging & archive bundling
│   └── upload-r2.mjs          # Cloudflare R2 continuous delivery
└── justfile                   # Quality gate automation
```

### Published keys

The manual publishes one bundle per locale plus a legacy compatibility tree (see
`distribution` in `manifest.json`):

- canonical: `manual/bitty-manual/manifest.json`, `manual/bitty-manual/<locale>.tar.gz`
  and `manual/bitty-manual/v<version>/...`, with `SHA256SUMS.txt`
- legacy compatibility: `manual/manifest.json`, `manual/<locale>/<section>/<file>.md`,
  `manual/latest/...`

Two catalog trees must not be confused: `en/extensions/` and `zh-CN/extensions/`
list **upstream Rust-level extensions**, while `en/plugins/catalog/` and
`zh-CN/plugins/catalog/` list **downstream Lua plugins**.

The catalog split ([#28](https://github.com/bitty-terminal/bitty-manual/pull/28))
renamed published keys — section keys `extensions/<name>.md` →
`plugins/catalog/<name>.md`, and search ids `en:extensions:<slug>` →
`en:plugins:catalog-<slug>`. This is an accepted pre-1.0 break: the old raw keys
stop resolving from the next `main` deploy onward, and no redirect shim is
published.

## Quality Gates & Commands

Run the local quality checks:

```bash
just check
```

This verifies formatting (Prettier), Markdown linting, GitHub Actions workflow linting (`actionlint`), schema anti-drift, and builds the distribution package.

Other recipes:

```bash
just fmt              # Auto-format all files
just package          # Build dist/ release archives and search index
just upload-r2-dry    # Dry-run R2 upload simulation
```
