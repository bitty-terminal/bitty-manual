# Extension Catalog

Bitty has two installable extension kinds. This catalog gives each one a page with what it does, how to install it, the Lua API surface it exposes or consumes, and a minimal config example.

## The two tracks

- **Native extensions** (Rust binaries behind the [Native Component Boundary](upstream-components.md); "component" is the internal seam name, the installable artifact is an _extension_): installed with the seed installer `bitty extension install <name>` (latest release for this host from the bounded CDN catalog) or `bitty extension install <name> --version <X.Y.Z>` (exact pin), or staged locally with `bitty extension add <path>`. The catalog (`https://cdn.bitty.run/extensions/catalog.v1`) is published (schema 1, verified 2026-10-22) and lists `graphics 0.0.24` and `net 0.0.1`, so a bare install resolves the highest strict version for the host target. A pinned install never depends on the catalog: if the catalog is unreachable it falls back to the release `SHA256SUMS`, and it reuses an already-installed verified version without any download. Repo-style names (`bitty-graphics`) are accepted aliases for the stored extension name (`graphics`).
- **Lua plugins** (sandboxed Lua over the Plugin API): installed by official catalog id with `bitty plugin install <id>` (or from a local directory, Git URL, or archive) and activated with `bitty plugin enable <id>`. Lua plugins carry no CDN versions; each page cites the version declared in its `bitty-plugin.toml`. The current official catalog has 11 entries, pinned and hash-verified at build time. Its generated metadata records each entry's declared minimum host version, which Core evaluates before fetching an official entry.

## Install-status legend

- **Published** — a real `SHA256SUMS` exists on the CDN; the page shows the exact install command.
- **Unpublished** — no CDN bundle exists; the page says so and gives the repo path for a local `add` or the implemented installer once its matching artifact and Core release are available.

Publication status below is based on the current release-readiness evidence: only the artifacts marked **Published** have live CDN bundles, and a merged packaging workflow or a packaging pilot is source evidence only, not publication evidence.

## Native upstream extensions

| Extension                                 | Status           | Page                                      |
| ----------------------------------------- | ---------------- | ----------------------------------------- |
| net (shared network runtime)              | Published 0.0.1  | [network](network.md)                     |
| ipc (out-of-process IPC bridge)           | Unpublished      | [ipc](ipc.md)                             |
| agent (agent protocol vocabulary)         | Unpublished      | [agent](agent.md)                         |
| ai (AI host and Lua capability surface)   | Unpublished      | [ai](ai.md)                               |
| observability (debug/trace seam)          | Unpublished      | [observability](observability.md)         |
| execution (job supervisor)                | Unpublished      | [execution](execution.md)                 |
| graphics (bounded image decode)           | Published 0.0.24 | [graphics](graphics.md)                   |
| a11y (accessibility adapter)              | Unpublished      | [a11y](a11y.md)                           |
| storage (bounded KV mechanics)            | Unpublished      | [storage](storage.md)                     |
| url-detector (plaintext link scan)        | Unpublished      | [url-detector](url-detector.md)           |
| platform-services (desktop notify bridge) | Unpublished      | [platform-services](platform-services.md) |

Current evidence: `graphics 0.0.24` and `net 0.0.1` tarballs and `SHA256SUMS` are live on the CDN (verified 2026-10-22), and `extensions/catalog.v1` publishes both with schema 1 (read back from `https://cdn.bitty.run/extensions/catalog.v1` after upload). The catalog is generated from the published `SHA256SUMS` objects by `scripts/make-extension-catalog.sh` in `bitty` (`--check` fails on drift, `--publish` re-verifies the object), so an install never selects a version whose bytes are not on the CDN. No Lua-facing network module is currently registered; the native `net` component is separately installable, and routing it into a user-facing Lua path remains a separate, design-gated change. `graphics` publishes the bounded decode extension while the host seam and placement policy stay in Core. The other nine extensions remain library-only source checkouts with no published artifact; `extension add <path>` applies only to a locally available compatible executable. Extensions are distributed on their own release track: a Core release tag does not imply a matching extension version, so use the catalog rather than assuming `<core-version>` exists.

## Lua plugins

| Plugin                                       | Manifest version | Registry | Page                                                           |
| :------------------------------------------- | :--------------- | :------- | :------------------------------------------------------------- |
| activity (`bitty-featured.activity`)         | 0.0.1            | official | [activity](../plugins/catalog/activity.md)                     |
| bar (`bitty-terminal.bar`)                   | 0.0.1            | official | [bar](../plugins/catalog/bar.md)                               |
| composer (`bitty-terminal.composer`)         | 0.0.1            | official | [composer](../plugins/catalog/composer.md)                     |
| copy-mode (`bitty-terminal.copy-mode`)       | 0.0.1            | official | [copy-mode](../plugins/catalog/copy-mode.md)                   |
| dashboard (`bitty-terminal.dashboard`)       | 0.0.1            | official | [dashboard](../plugins/getting-started.md#the-dashboard-panel) |
| devtools (`bitty-featured.devtools`)         | 0.1.0            | official | [devtools](../plugins/catalog/devtools.md)                     |
| file-manager (`bitty-terminal.file-manager`) | 0.1.0            | official | [file-manager](../plugins/catalog/file-manager.md)             |
| git-panel (`bitty-terminal.git-panel`)       | 0.1.0            | official | [git-panel](../plugins/catalog/git-panel.md)                   |
| history (`bitty-terminal.history`)           | 0.0.1            | official | [history](../plugins/catalog/history.md)                       |
| palette (`bitty-terminal.palette`)           | 0.0.1            | official | [palette](../plugins/catalog/palette.md)                       |
| search (`bitty-terminal.search`)             | 0.0.1            | official | [search](../plugins/catalog/search.md)                         |
| statusline (`bitty-terminal.statusline`)     | 0.1.0 (last)     | archived | [statusline](../plugins/catalog/statusline.md)                 |

`beacon` (target-navigation candidate) is excluded: it is a metadata-only scaffold with no manifest or Lua implementation yet. `wheel` is also outside the plugin set: its repository carries a transitional manifest, but the 0.1.0 deliverable is the standalone harness artifact described on its [page](../plugins/catalog/wheel.md), not an installable plugin package.
