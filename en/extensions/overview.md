# Extension Catalog

Bitty has two installable extension kinds. This catalog gives each one a page with what it does, how to install it, the Lua API surface it exposes or consumes, and a minimal config example.

## The two tracks

- **Native extensions** (Rust binaries behind the [Native Component Boundary](upstream-components.md); "component" is the internal seam name, the installable artifact is an _extension_): installed with the seed installer `bitty extension install <name> --version <X.Y.Z>` (exact pin; the version is required) or staged locally with `bitty extension add <path>`. A bare `install` without `--version` is a usage error (exit 2): Core no longer reads the extension catalog or resolves a latest release; catalog resolution and latest selection belong to `bitty-plugin-manager` (W-72). The catalog (`https://cdn.bitty.run/extensions/catalog.v1`) remains published (schema 1, verified 2026-10-28) and lists `graphics 0.0.25` and `net 0.0.2` for five targets each; it is the manager's resolution input, not Core's. A pinned install fetches exactly the release `SHA256SUMS` plus its tarball; if the manifest is unreachable, an already-installed exact version that verifies locally is reused without a download. Repo-style names (`bitty-graphics`) are accepted aliases for the stored extension name (`graphics`).
- **Lua plugins** (sandboxed Lua over the Plugin API): installed by official catalog id with `bitty plugin install <id>` (or from a local directory, Git URL, or archive) and activated with `bitty plugin enable <id>`. Lua plugins carry no CDN versions; each page cites the version declared in its `bitty-plugin.toml`. The current official catalog has 13 entries, pinned and hash-verified at build time. Its generated metadata records each entry's declared minimum host version, which Core evaluates before fetching an official entry.

## Install-status legend

- **Published** — a real `SHA256SUMS` exists on the CDN; the page shows the exact install command.
- **Unpublished** — no CDN bundle exists; the page says so and gives the repo path for a local `add` or the implemented installer once its matching artifact and Core release are available.

Publication status below is based on the current release-readiness evidence: only the artifacts marked **Published** have live CDN bundles, and a merged packaging workflow or a packaging pilot is source evidence only, not publication evidence.

## Native upstream extensions

| Extension                                 | Status           | Page                                      |
| ----------------------------------------- | ---------------- | ----------------------------------------- |
| net (shared network runtime)              | Published 0.0.2  | [network](network.md)                     |
| ipc (out-of-process IPC bridge)           | Unpublished      | [ipc](ipc.md)                             |
| agent (agent protocol vocabulary)         | Unpublished      | [agent](agent.md)                         |
| ai (AI host and Lua capability surface)   | Unpublished      | [ai](ai.md)                               |
| observability (debug/trace seam)          | Unpublished      | [observability](observability.md)         |
| execution (job supervisor)                | Unpublished      | [execution](execution.md)                 |
| graphics (bounded image decode)           | Published 0.0.25 | [graphics](graphics.md)                   |
| a11y (accessibility adapter)              | Unpublished      | [a11y](a11y.md)                           |
| storage (bounded KV mechanics)            | Unpublished      | [storage](storage.md)                     |
| url-detector (plaintext link scan)        | Unpublished      | [url-detector](url-detector.md)           |
| platform-services (desktop notify bridge) | Unpublished      | [platform-services](platform-services.md) |

Current evidence: `graphics 0.0.25` and `net 0.0.2` tarballs and `SHA256SUMS` are live on the CDN (verified 2026-10-28), and `extensions/catalog.v1` publishes both with schema 1 (read back from `https://cdn.bitty.run/extensions/catalog.v1` after upload). The catalog is generated from the published `SHA256SUMS` objects by `scripts/make-extension-catalog.sh` in `bitty` (`--check` fails on drift, `--publish` re-verifies the object), so the manager never selects a version whose bytes are not on the CDN; Core's pinned seed does not read the catalog. No Lua-facing network module is currently registered; the native `net` component is separately installable, and routing it into a user-facing Lua path remains a separate, design-gated change. `graphics` publishes the bounded decode extension while the host seam and placement policy stay in Core. The other nine extensions remain library-only source checkouts with no published artifact; `extension add <path>` applies only to a locally available compatible executable. Extensions are distributed on their own release track: a Core release tag does not imply a matching extension version, so resolve through the catalog or fetch the release `SHA256SUMS` rather than assuming `<core-version>` exists.

## Lua plugins

Official and community Lua plugins are listed on the dedicated [Bitty Plugins directory](https://github.com/bitty-terminal/bitty-plugins), separate from the core terminal manual. The official catalog has 13 entries, generated from that registry at build time with an exact repository, commit pin, and manifest hash per entry:

| Plugin                                       | Manifest version | Purpose                                                                                      | Page                                                           |
| :------------------------------------------- | :--------------- | :------------------------------------------------------------------------------------------- | :------------------------------------------------------------- |
| activity (`bitty-featured.activity`)         | 0.0.1            | Privacy-first local activity timeline                                                        | [activity](https://github.com/bitty-terminal/activity)         |
| bar (`bitty-terminal.bar`)                   | 0.0.1            | Unified workspace-bar, tabs, and statusline presentation over generic chrome insets          | [bar](https://github.com/bitty-terminal/bar)                   |
| beacon (`bitty-terminal.beacon`)             | 0.0.1            | Spatial and semantic workspace targeting policy: label pickers, workspace jumps, panel moves | [beacon](https://github.com/bitty-terminal/beacon)             |
| composer (`bitty-terminal.composer`)         | 0.0.1            | Modal command-line editor that submits through the Core paste pipeline                       | [composer](https://github.com/bitty-terminal/composer)         |
| copy-mode (`bitty-terminal.copy-mode`)       | 0.0.1            | Modal visual selection over bounded transcript snapshots with grant-gated yank               | [copy-mode](https://github.com/bitty-terminal/copy-mode)       |
| dashboard (`bitty-terminal.dashboard`)       | 0.3.0            | Configuration and status dashboard over the read-only runtime snapshot                       | [dashboard](https://github.com/bitty-terminal/dashboard)       |
| devtools (`bitty-featured.devtools`)         | 0.2.1            | Read-only runtime inspection and event tracing                                               | [devtools](https://github.com/bitty-terminal/devtools)         |
| file-manager (`bitty-terminal.file-manager`) | 0.1.3            | Bounded read-only directory listing, navigation, and preview                                 | [file-manager](https://github.com/bitty-terminal/file-manager) |
| git-panel (`bitty-terminal.git-panel`)       | 0.1.0            | Read-only branch, status, diff, and log panel for the focused pane's repository              | [git-panel](https://github.com/bitty-terminal/git-panel)       |
| help (`bitty-terminal.help`)                 | 0.0.1            | Help and which-key shortcut overlay over the live keymap registry                            | [help](https://github.com/bitty-terminal/help)                 |
| history (`bitty-terminal.history`)           | 0.0.1            | Opt-in history queries over transcript, commands, and plugin KV                              | [history](https://github.com/bitty-terminal/history)           |
| palette (`bitty-terminal.palette`)           | 0.0.1            | Command palette and picker UI through the overlay slot                                       | [palette](https://github.com/bitty-terminal/palette)           |
| search (`bitty-terminal.search`)             | 0.0.1            | Bounded scrollback search with typed denials and grant-gated export                          | [search](https://github.com/bitty-terminal/search)             |

Every entry above is pre-release: none is bundled with Bitty, and none is verified against a released host. Verification evidence is headless — the `bitty-plugin-sdk` mock host or a named `bitty` `main` revision — and a catalog install fetches the pinned registry commit into the plugin store. The only compiled-in bundled plugin is `bitty-terminal.shell-integration`, and it ships disabled.

`bitty-terminal.statusline` is archived and was removed from the official set; its [repository](https://github.com/bitty-terminal/statusline) stays as historical reference, and `bar` owns the visible status presentation. `wheel` is also outside the plugin set: its repository carries a transitional manifest, but the 0.1.0 deliverable is the standalone harness artifact in [bitty-terminal/wheel](https://github.com/bitty-terminal/wheel), not an installable plugin package.

### Activation and default state

Nothing is enabled by default. `bitty plugin install <catalog-id>` records the package and its declared capability set, `bitty plugin info <id>` shows the grants to review, and `bitty plugin enable <id>` activates it. A fresh install is staged disabled, and an update preserves the existing enabled or disabled state; a bundled id takes the same install, consent, and enable path.

- `bar` has no open command: it mounts on activation when the `show` setting is `true` (the shipped default) and installs no keyboard chord.
- `beacon` suggests `alt+b` (`bitty-terminal.beacon:start`), `alt+g` (`goto-workspace`), and `alt+m` (`move-panel`).
- `composer` suggests `alt+e` for `bitty-terminal.composer:open`.
- `help` suggests `` alt+` `` for `bitty-terminal.help:toggle_help`, plus the historical `alt+?`, `alt+shift+?`, and `alt+shift+/` chords.
