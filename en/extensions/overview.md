# Extension Catalog

Bitty has two installable extension kinds. This catalog gives each one a page with what it does, how to install it, the Lua API surface it exposes or consumes, and a minimal config example.

## The two tracks

- **Native upstream extensions** (Rust components behind the [Native Component Boundary](upstream-components.md)): installed with the implemented seed installer `bitty extension install <name> --version X.Y.Z` (hash-verified CDN bundle), or staged locally with `bitty extension add <path>`. Names and versions are exact — there is no `latest` pointer. For this catalog release, the Core `0.0.24` source release is merged, but no `v0.0.24` tag or matching CDN artifact is published; `extension add` remains a local mechanism for a compatible executable.
- **Lua plugins** (sandboxed Lua over the Plugin API): installed with `bitty plugin install <git-url>` (or a local directory) and activated with `bitty plugin enable <id>`. Lua plugins carry no CDN versions; each page cites the version declared in its `bitty-plugin.toml`.

## Install-status legend

- **Published** — a real `SHA256SUMS` exists on the CDN; the page shows the exact install command.
- **Unpublished** — no CDN bundle exists; the page says so and gives the repo path for a local `add` or the implemented installer once its matching artifact and Core release are available.

Publication status below is based on the current release-readiness evidence: no live native-extension CDN bundle or `v0.0.24` tag is available. A merged packaging workflow or a packaging pilot is source evidence only, not publication evidence.

## Native upstream extensions

| Extension                                 | Status                         | Page                                      |
| ----------------------------------------- | ------------------------------ | ----------------------------------------- |
| network (shared network runtime)          | Unpublished; packaging pending | [network](network.md)                     |
| ipc (out-of-process IPC bridge)           | Unpublished                    | [ipc](ipc.md)                             |
| agent (agent protocol vocabulary)         | Unpublished                    | [agent](agent.md)                         |
| observability (debug/trace seam)          | Unpublished                    | [observability](observability.md)         |
| execution (job supervisor)                | Unpublished                    | [execution](execution.md)                 |
| graphics (bounded image decode)           | Library only                   | [graphics](graphics.md)                   |
| a11y (accessibility adapter)              | Unpublished                    | [a11y](a11y.md)                           |
| storage (bounded KV mechanics)            | Unpublished                    | [storage](storage.md)                     |
| url-detector (plaintext link scan)        | Unpublished                    | [url-detector](url-detector.md)           |
| platform-services (desktop notify bridge) | Unpublished                    | [platform-services](platform-services.md) |

Current evidence is more specific than a library-only catalog: `network` has a `bitty-net` executable in its mainline source, but no mainline packaging workflow or published artifact. Core has the native component broker and wire-codec wiring, while the user-facing network path still uses the embedded binding; the `bitty-net` component is not yet the production Lua path. `graphics` is a library-only source checkout on its mainline branch; no worker binary, descriptor, or published artifact is evidenced, and packaging material from a non-mainline pilot is not evidence of a feature-usable worker. The other eight extensions remain library-only source checkouts with no component binary. None is currently installable from the CDN; `extension add <path>` applies only to a locally available compatible executable, while the implemented `extension install` seed installer lacks its required published artifact.

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
