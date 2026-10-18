# Extension Catalog

Bitty has two installable extension kinds. This catalog gives each one a page with what it does, how to install it, the Lua API surface it exposes or consumes, and a minimal config example.

## The two tracks

- **Native upstream extensions** (Rust components behind the [Native Component Boundary](upstream-components.md)): installed with the implemented seed installer `bitty extension install <name> --version X.Y.Z` (hash-verified CDN bundle), or staged locally with `bitty extension add <path>`. Names and versions are exact — there is no `latest` pointer. The installer currently cannot succeed because no matching CDN artifact is published and Core `0.0.24` is not released; `extension add` remains a local mechanism for a compatible executable.
- **Lua plugins** (sandboxed Lua over the Plugin API): installed with `bitty plugin install <git-url>` (or a local directory) and activated with `bitty plugin enable <id>`. Lua plugins carry no CDN versions; each page cites the version declared in its `bitty-plugin.toml`.

## Install-status legend

- **Published** — a real `SHA256SUMS` exists on the CDN; the page shows the exact install command.
- **Unpublished** — no CDN bundle exists; the page says so and gives the repo path for a local `add` or the implemented installer once its matching artifact and Core release are available.

Publication status below is based on the current release-readiness evidence: no live native-extension CDN bundle or `0.0.24` release is available. A merged packaging workflow or a packaging pilot is source evidence only, not publication evidence.

## Native upstream extensions

| Extension                                 | Status                         | Page                                      |
| ----------------------------------------- | ------------------------------ | ----------------------------------------- |
| network (shared network runtime)          | Unpublished; packaging pending | [network](network.md)                     |
| ipc (out-of-process IPC bridge)           | Unpublished                    | [ipc](ipc.md)                             |
| agent (agent protocol vocabulary)         | Unpublished                    | [agent](agent.md)                         |
| observability (debug/trace seam)          | Unpublished                    | [observability](observability.md)         |
| execution (job supervisor)                | Unpublished                    | [execution](execution.md)                 |
| graphics (bounded image decode)           | Unpublished; pilot pending     | [graphics](graphics.md)                   |
| a11y (accessibility adapter)              | Unpublished                    | [a11y](a11y.md)                           |
| storage (bounded KV mechanics)            | Unpublished                    | [storage](storage.md)                     |
| url-detector (plaintext link scan)        | Unpublished                    | [url-detector](url-detector.md)           |
| platform-services (desktop notify bridge) | Unpublished                    | [platform-services](platform-services.md) |

Current evidence is more specific than a library-only catalog: `network` has a `bitty-net` executable and merged packaging/publisher source, but no published artifact and no verified Core production path. `graphics` has packaging source and workflow, a descriptor, and pack scripts only on a non-mainline branch; no built or published pilot binary is evidenced, and the packaging material is not evidence of a feature-usable worker. The other eight extensions remain library-only source checkouts with no component binary. None is currently installable from the CDN; `extension add <path>` applies only to a locally available compatible executable, while the implemented `extension install` seed installer lacks its required published artifact and released Core input.

## Lua plugins

| Plugin                                       | Manifest version | Registry           | Page                                               |
| -------------------------------------------- | ---------------- | ------------------ | -------------------------------------------------- |
| activity (`bitty-featured.activity`)         | 0.0.1            | official           | [activity](../plugins/catalog/activity.md)         |
| bar (`bitty-terminal.bar`)                   | 0.0.1            | official           | [bar](../plugins/catalog/bar.md)                   |
| composer (`bitty-terminal.composer`)         | 0.0.1            | official           | [composer](../plugins/catalog/composer.md)         |
| copy-mode (`bitty-terminal.copy-mode`)       | 0.0.1            | official           | [copy-mode](../plugins/catalog/copy-mode.md)       |
| file-manager (`bitty-terminal.file-manager`) | 0.1.0            | official           | [file-manager](../plugins/catalog/file-manager.md) |
| git-panel (`bitty-terminal.git-panel`)       | 0.1.0            | official           | [git-panel](../plugins/catalog/git-panel.md)       |
| history (`bitty-terminal.history`)           | 0.0.1            | official           | [history](../plugins/catalog/history.md)           |
| palette (`bitty-terminal.palette`)           | 0.0.1            | official           | [palette](../plugins/catalog/palette.md)           |
| search (`bitty-terminal.search`)             | 0.0.1            | official           | [search](../plugins/catalog/search.md)             |
| statusline (`bitty-terminal.statusline`)     | 0.0.1            | not yet registered | [statusline](../plugins/catalog/statusline.md)     |
| wheel (`bitty-terminal.wheel`)               | 0.0.1            | official           | [wheel](../plugins/catalog/wheel.md)               |
| devtools (`bitty-featured.devtools`)         | 0.1.0            | not yet registered | [devtools](../plugins/catalog/devtools.md)         |

`beacon` (target-navigation candidate) is excluded: it is a metadata-only scaffold with no manifest or Lua implementation yet.
