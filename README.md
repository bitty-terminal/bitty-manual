# Bitty Manual

Canonical user manual, configuration reference, Lua API, and guides for [Bitty](https://github.com/bitty-terminal/bitty).

## Purpose & Scope

Unlike the architectural and governance corpora (`bitty-docs`, `bitty-terminal-docs`, `bitty-plugins-docs`, `bitty-ai-docs`) which focus on internal designs, RFCs, and ADRs, `bitty-manual` is the **authoritative, concise, human-oriented manual** for end users and plugin authors.

It serves as the single source of truth for:

- **Online Documentation**: Consumed by [bitty-website](https://github.com/bitty-terminal/bitty-website) to render `https://bitty.run/docs`.
- **Terminal-Native Doc Viewer**: Consumed by the `bitty doc` CLI and downstream panel plugin for local offline viewing (`https://cdn.bitty.run/manual/`).
- **CDN Distribution & Offline Bundles**: Continuous Delivery automatically publishes versioned packages, search indices, and raw markdown to Cloudflare R2.

## Distribution & CDN Endpoints

Documentation artifacts are continuously published to Cloudflare R2 and served at `https://cdn.bitty.run/manual/`:

- **Manifest**: `https://cdn.bitty.run/manual/manifest.json` (also `/latest/manifest.json`)
- **Search Index**: `https://cdn.bitty.run/manual/search-index.json` (offline fuzzy search)
- **Table of Contents**: `https://cdn.bitty.run/manual/toc.json` (hierarchical navigation)
- **Offline Tarball**: `https://cdn.bitty.run/manual/bitty-manual-latest.tar.gz`
- **Offline Zip**: `https://cdn.bitty.run/manual/bitty-manual-latest.zip`
- **Raw Documents**: `https://cdn.bitty.run/manual/<locale>/<section>/<file>.md`

## Downstream `bitty doc` Offline Panel Integration

The downstream documentation viewer plugin runs inside a Bitty Panel (similar to `cargo doc` or `tldr`):

1. **Initial Sync / Update**: Fetches `https://cdn.bitty.run/manual/manifest.json` or downloads `bitty-manual-latest.tar.gz` into `$XDG_DATA_HOME/bitty/manual/` (Linux) or `%LOCALAPPDATA%\bitty\manual` (Windows).
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
│   ├── plugins/               # Plugin architecture, manifests, and capabilities
│   ├── api/                   # Sandboxed Lua API reference
│   └── faq/                   # Troubleshooting, safe mode, and diagnostics
├── scripts/                   # Verification and validation scripts
│   ├── verify-config-schema.mjs
│   ├── package-manual.mjs     # Packaging & archive bundling
│   └── upload-r2.mjs          # Cloudflare R2 continuous delivery
└── justfile                   # Quality gate automation
```

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
