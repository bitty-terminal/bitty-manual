# Bitty Manual

Canonical user manual, configuration reference, Lua API, and guides for [Bitty](https://github.com/bitty-terminal/bitty).

## Purpose & Scope

Unlike the architectural and governance corpora (`bitty-docs`, `bitty-terminal-docs`, `bitty-plugins-docs`, `bitty-ai-docs`) which focus on internal designs, RFCs, and ADRs, `bitty-manual` is the **authoritative, concise, human-oriented manual** for end users and plugin authors.

It serves as the single source of truth for:

- **Online Documentation**: Consumed by [bitty-website](https://github.com/bitty-terminal/bitty-website) to render `https://bitty.run/docs`.
- **Terminal-Native Doc Viewer**: Consumed by the `bitty doc` CLI and interactive TUI panel.
- **CDN Offline Language Packs**: Packaged and published to `https://cdn.bitty.run/docs/` for on-demand dynamic downloads.

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
│   └── verify-config-schema.mjs
└── justfile                   # Quality gate automation
```

## Quality Gates

Run the local quality checks:

```bash
just check
```

This verifies formatting (Prettier), Markdown linting, and runs the schema anti-drift verifier.
