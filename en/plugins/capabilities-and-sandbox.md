# Capabilities & Sandboxing

Bitty's plugin runtime is built from the ground up around **Capability-based Security** and strict resource isolation. Unlike traditional editor and terminal plugin systems where plugins run with the user's full ambient operating system privileges, Bitty operates on a strict **Deny-by-Default** posture.

## The Sandboxed VM Architecture

Each active plugin instance runs inside an isolated, stackless **Phodopus** (pure-Rust Lua) virtual machine.

### Restricted Standard Library

To eliminate attack vectors and prevent privilege escalation, the Lua environment strictly strips hazardous standard library functions:

| Restricted Domain         | Host Behavior          | Rationale                                                                                                     |
| :------------------------ | :--------------------- | :------------------------------------------------------------------------------------------------------------ |
| `debug`                   | **Completely Removed** | Prevents metatable tampering, closure introspection, and sandbox escapes.                                     |
| `os.execute` / `io.popen` | **Denied**             | Plugins cannot spawn arbitrary subshells or execute host binaries.                                            |
| Raw Sockets / FFI         | **Denied**             | Plugins cannot open raw network sockets or load C dynamic libraries (`dlopen`).                               |
| Rooted `require`          | **Enforced**           | Module resolution strictly locks inside the plugin's own directory. Directory traversal (`../`) fails closed. |

## Capability System

Plugins declare their required capabilities in `bitty-plugin.toml`. Bitty computes a cryptographic manifest hash to bind granted permissions permanently to that specific manifest version.

```toml
[capabilities]
platform.notify = true
ui = ["ui.rich", "ui.overlay"]
workspace = ["workspace.read", "workspace.control"]
network = ["http"]

[network]
allow = ["api.github.com"]

[tools.git]
required = true
version = ">=2.30"
```

### Core Capability Families

1. **`ui` Family**:
   - `ui.rich`: Grants permission to mount and update declarative UI scenes. In the current host, `top` and `bottom` are painted bands; the other accepted slot names either fail closed as unavailable or, for `overlay`, require the additional `ui.overlay` grant.
   - `ui.overlay`: Grants permission to mount and present a component in the `overlay` slot. Presentation does not capture keyboard input.
   - `ui.overlay.focus`: Grants permission to acquire transient keyboard/input capture via `bitty.ui.overlay.acquire`. It is separate from the `ui.overlay` presentation grant; safe mode denies the focusable surface.
2. **`platform` Family**:
   - `platform.notify`: Grants permission to post desktop notifications via `bitty.notify.show`.
3. **`workspace` Family**:
   - `workspace.read`: Allows inspecting workspaces via `bitty.workspace.list`.
   - `workspace.control`: Allows switching, creating, closing, and moving workspaces and panels.
4. **`network` Family**:
   - Mediated exclusively through an upstream native coprocess behind the Native Component Boundary (see [Native Component Boundary](../extensions/upstream-components.md)). Plugins never touch raw sockets.
   - Hosts and domains must be allowlisted under `[network].allow`.
5. **`process.spawn` & Tool Family**:
   - Ambient process creation is strictly forbidden. No shell is ever constructed: argument arrays go directly to the spawn call, so metacharacters in arguments are inert data.
   - Plugins can only invoke explicit, allowlisted system tools declared in `[tools.<name>]` (e.g. `process.spawn:git`), subject to host argument sanitization, timeout, and output caps (8 KiB default).
   - Every spawn decision (allow or deny) is recorded exactly once in a bounded audit ledger: caller identity, tool name, and bounded argument previews only. Environment values and secrets never enter the ledger. The ledger retains at most 1024 entries with drop-oldest semantics and counts evicted entries.
   - On Linux, admitted tool invocations additionally run under inherited OS confinement (Landlock execute rules covering the tool binaries plus their loaders), so an admitted binary cannot exec outside the allowlist from inside. Confinement setup failure refuses the spawn fail-closed with a confinement diagnostic; no admitted spawn ever runs unconfined. Non-Linux platforms refuse admitted spawns the same fail-closed way until their mechanisms land.
6. **`config` Family**:
   - `config.manage`: high-risk head for the bounded configuration read query and the token-bound configuration writes. It requires a recorded grant; a development (`local-path`) package declaration does not grant it, and safe mode denies every call even when a grant is recorded.
7. **Consent & Revocation**:
   - Capability grants use explicit confirmation: `bitty plugin install` prompts `Grant these capabilities? [y/N]` (up to 3 attempts); `--yes` approves non-interactively, while a decline aborts with nothing changed. Grants are bound to the exact manifest hash, so a later manifest that adds a capability blocks until re-approved.
   - Revoke without dropping the record: `bitty plugin revoke <id>` drops every granted capability and disables the plugin; `bitty plugin revoke <id> --cap <capability>` drops one capability and remembers it as explicitly denied (no silent re-prompt). Re-grant with `install` under explicit consent.

### Configuration reads and writes (`config.manage`)

A plugin declares the head in its manifest:

```toml
[capabilities]
config.manage = true
```

`config.manage` is high-risk and requires a recorded grant. Approve it through
`bitty plugin install` consent or explicitly with `bitty plugin grant <id> --cap
config.manage`; the grant is recorded in the managed plugin ledger bound to the
manifest hash. The head covers both halves: a read call never mints a write
approval, and every write still needs its own preview token. Every call is
denied in `--safe` mode.

#### Read-only queries

These calls need the recorded grant but no preview token:

```lua
local theme = bitty.config.get("appearance.theme")
-- { key, found, value, kind, source, redacted }

local sources = bitty.config.sources()
-- { rows = { { key, source }, ... }, count, truncated }

local plugins = bitty.plugins.list()
-- { rows = { { id, enabled, managed, source, version }, ... }, count, truncated }

local profiles = bitty.profiles.list()
-- { rows = { { name, active }, ... }, active, count, truncated }
```

`config.get` accepts one dotted key from the same scalar allowlist the write
path uses. `source` is a logical label — `default`, `user`, or `plugin:<id>` —
and never a host path. Profiles are user-owned, so a value inherited from a
profile reports `user`. Secret-shaped values are replaced with
`***REDACTED***` and the row reports `redacted = true`.

`plugins.list` carries no grants and no paths; `source` is the provenance label
(`bundled`, `registry`, `local-path`, ...). `managed` reports whether the row
has a managed `bitty-plugins.lua` record: a catalog-only bundled row reports
`enabled = false, managed = false`, so it is never mistaken for a recorded
disabled plugin, and only managed rows accept `config.set_enabled` (store
packages stay on the CLI path). `profiles.list` evaluates no Lua. Its `active`
names the profile the running instance loaded — `--profile`/`BITTY_PROFILE`
first, then the persisted selector — so after `profiles.use` it still names the
startup profile until the next launch.

#### Token-bound writes

Every write is a two-call flow. `preview` renders the exact candidate bytes and
returns a one-shot `digest`; `set`/`use` re-renders and commits only if the
bytes still match.

```lua
-- One allowlisted scalar setting (user layer only).
local preview = bitty.config.preview("window.opacity", 0.95)
-- { digest, rendered, keys }
local applied = bitty.config.set("window.opacity", 0.95, preview.digest)
-- { applied = true, reload = "auto" }

-- One managed plugin record's enable bit.
local toggle = bitty.config.preview_enabled("owner.plugin", true)
-- { digest, rendered, keys, changed }
local changed = bitty.config.set_enabled("owner.plugin", true, toggle.digest)
-- { changed = true, reload = "restart" }

-- One persisted profile switch.
local switch = bitty.profiles.preview_use("work")
-- { digest, rendered, keys, changed }
local active = bitty.profiles.use("work", switch.digest)
-- { active = "work", changed = true, reload = "auto", pending_restart = true }
```

`preview` returns the bounded exact `rendered` diff and the `keys` it changes;
pinning an inherited table expands `keys` to the seeded leaves.
`config.preview_enabled` and `profiles.preview_use` also report `changed`, so a
no-op is visible before the apply call (`keys` is empty exactly when `changed`
is `false`). `set` consumes the digest once and invalidates it when the plugin
generation reloads. A moved profile, ledger, or concurrent edit returns
`E_CONFIG_STALE` with nothing written. A missing or replayed token returns
`E_CONFIG_APPROVAL_REQUIRED`.

`config.set` writes only the user layer (`init.lua` or its `config.lua` alias).
`config.set_enabled` flips only the `enabled` bit of one managed
`bitty-plugins.lua` record and re-checks the bundled manifest pin and granted
capabilities exactly like `bitty plugin enable`/`disable`; installed store
packages remain on the CLI path. The ledger is read at activation and nothing
re-activates the generation at runtime, so an applied toggle reports
`reload = "restart"` (a no-op reports `none`). `profiles.use` rewrites only the
selector's `profile = "..."` value through the same validated atomic writer as
`bitty config profile use`. `default` is not a magic reset: it must name the
existing `profiles/default.lua` that `bitty init` created.

`pending_restart` is conservative: an applied selector rewrite always reports
`true`, because reads keep resolving the startup profile until the next launch.
The config watcher does re-resolve the persisted selector on the next
config-file change and can live-apply live-class fields (for example
`window.padding`) without a restart, but the flag and `profiles.list.active`
still describe the startup profile in that window. The precise per-field
live-merge contract is tracked in
[bitty#2814](https://github.com/bitty-terminal/bitty/issues/2814).

The scalar allowlist takes one dotted key and one typed scalar per call.
`history.capture.*` is never writable, and neither are `terminal.shell`, the
input aliases (`mod_key`, `mouse.right`, `mouse.middle`), list-valued or
nullable settings, profiles, and any path. There is no parameter for a target
file.

Every scalar candidate is re-validated through the same strict loader `bitty
config check` uses. Writes are atomic and owner-only (`0600`): the previous
bytes are kept at a rolling `.bak` for the user layer and managed ledger, and
the profile selector uses the CLI's collision-free `.bak`/`.bak.N` backup. A
refused validation or failed commit leaves the previous bytes byte-identical.

#### Bounds and refusals

At most 64 rows and 4 KiB of row bytes per list, 128 bytes per list string,
1 KiB per `config.get` value, 16 calls per second, 4 KiB per second, and a
10 ms wall budget per call. A list that would exceed either list bound is
shortened and reports `truncated = true`; every other violated bound fails
closed with `E_DEF_LIMIT`, so values are never clamped silently.

Refusals are typed and path-free:

| Code                         | Meaning                                                       |
| :--------------------------- | :------------------------------------------------------------ |
| `E_CAPABILITY_DENIED`        | No recorded `config.manage` grant, or safe mode.              |
| `E_CONFIG_APPROVAL_REQUIRED` | The write has no fresh preview token for this exact change.   |
| `E_CONFIG_APPROVAL_MISMATCH` | The token is malformed or does not match the change.          |
| `E_CONFIG_KEY`               | The key is outside the scalar allowlist.                      |
| `E_CONFIG_VALUE`             | The value has the wrong type or violates a value bound.       |
| `E_CONFIG_INVALID`           | The request or the resulting configuration is invalid.        |
| `E_CONFIG_UNAVAILABLE`       | No readable/writable layer is available.                      |
| `E_CONFIG_UNSAFE`            | The target is a symlink, special file, or foreign-owned path. |
| `E_CONFIG_STALE`             | The candidate moved between preview and commit.               |
| `E_CONFIG_IO`                | The atomic read or replace failed.                            |
| `E_DEF_LIMIT` / `E_TIMEOUT`  | A row, byte, call, or wall bound was exceeded.                |

See [Per-Plugin Config Files](plugin-settings.md) for the settings files
themselves.

## Resource Quotas & Budgets

To ensure that poorly written or malicious plugins cannot stall the terminal or exhaust system memory, the host enforces deterministic hardware budgets:

### Memory & Execution Ceilings

- **VM Memory Ceiling**: Default 32 MiB per plugin VM. Exceeding memory allocation terminates the plugin generation safely.
- **Instruction Fuel Metering**: The stackless VM meters bytecodes per execution slice. Infinite loops run out of fuel and fail closed without freezing the UI or terminal rendering hot path.
- **Tighten-only overrides**: a plugin manifest's optional `[limits]` table and a local `plugin-budgets.lua` may lower the fuel, wall, and memory bounds below these ceilings; they can never raise them. `bitty --safe` ignores both and runs the host defaults. See [Plugin Configuration](../configuration/plugin-config.md#execution-budget-tightening).
- **Scene Tree Depth & Size**:
  - Maximum UI tree depth: 16 levels.
  - Maximum nodes per block: 2,048 nodes.
  - Maximum text content per block: 256 KiB.
  - Maximum retained UI blocks: 64 blocks per plugin.

### Event Queue Budgets

Events dispatched across the host bus are buffered in three-tier bounded rings:

- **Per-Subscription**: 64 events.
- **Per-Plugin**: 1,024 events (256 KiB).
- **Global Host Queue**: 8,192 events (2 MiB).
- When a plugin fails to drain events in time, the host uses `DropOldest` semantics to prevent memory unbounded growth.

## Diagnostic Introspection (`bitty plugin list`)

Inspect recorded sources, states, and capability grants at any time:

```bash
bitty plugin list
bitty plugin info <id>
```

Those markers come from the decision path described in [How Permissions Are Decided](permissions-decision.md): source trust level, six-layer intersection, explicit grant, and runtime budgets.
