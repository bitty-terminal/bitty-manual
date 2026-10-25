# wheel (agent harness)

Wheel is the agent harness for the Bitty terminal (mascot: Bittie the hamster).
The 0.1.0 deliverable is a **standalone Lua library artifact**, not a Bitty
plugin package. Wheel runs as its own process with the user's OS authority under
its own policy; a Bitty panel or terminal supplies presentation and input only.

> **Status: pre-release.** The 0.1.0 artifact and its offline install, upgrade,
> and rollback path are implemented and tested, but no tag or artifact has been
> published. Wheel is not a plugin-runtime plugin in 0.1.0, and no released
> Bitty host integration is claimed.

- Artifact version: `0.1.0` (root `VERSION`; archive `dist/wheel-0.1.0.tar.gz`)
- Source: [github.com/bitty-terminal/wheel](https://github.com/bitty-terminal/wheel) · independent repo
- Registry: `bitty-terminal.wheel` is not in the current official registry/catalog; the repository's transitional manifest is repository material, a scaffold rather than an installable plugin package
- Authority and residual risk: [Wheel SECURITY-MODEL.md](https://github.com/bitty-terminal/wheel/blob/main/SECURITY-MODEL.md)
- Context snapshots: [Wheel CONTEXT-SNAPSHOT.md](https://github.com/bitty-terminal/wheel/blob/main/CONTEXT-SNAPSHOT.md)

## Install and launch

The artifact is a Lua 5.1 module tree. Build the deterministic archive from a
clean checkout, verify its SHA-256 sidecar, then install it under a prefix:

```sh
just package
(cd dist && sha256sum -c wheel-0.1.0.tar.gz.sha256)
just install-local "$HOME/.local"
```

`just package` is offline and writes the archive, its `.sha256` sidecar, and a
manifest record. The installer verifies the digest and archive members, extracts
under `<prefix>/wheel/<version>/`, and switches the relative `current` symlink.
The archive is deterministic but unsigned, and 0.1.0 has no update channel.

There is no standalone launcher executable in the artifact. The launch contract
is the Lua module root:

```sh
LUA_PATH="$HOME/.local/wheel/current/lua/?.lua;$HOME/.local/wheel/current/lua/?/init.lua;;" \
  lua5.1 -e 'local wheel = require("wheel"); print(wheel.command_catalog[1].id)'
```

Installing a newer version keeps the old one as `previous`;
`just rollback-local "$HOME/.local"` switches `current` back to it. See the
[Wheel README](https://github.com/bitty-terminal/wheel#install) for the full
install, upgrade, and compatibility contract.

## Commands

The harness catalog in `lua/wheel/init.lua` defines 14 commands: `hello`,
`status`, `graph`, `plan`, `run`, `trust`, `team`, `context`, `tools`,
`orchestrate`, `models`, `branch`, `checkpoint`, and `reflog`. Thirteen take no
arguments; `trust` accepts an optional object with `action`, `hash`, and `path`.
Every command returns a bounded `{ title, body }` notification projection.

The `bitty-terminal.wheel:<command>` qualification belongs to the transitional
plugin surface. No released host integration is claimed, so do not treat the
Bitty plugin manager as a supported way to install or invoke Wheel 0.1.0.

## Transitional plugin manifest

The repository still carries the transitional `bitty-plugin.toml` at manifest version `0.0.1` as repository material.
It is the unchanged template scaffold: it declares the same 14 command triggers
and requests only the `platform.notify` capability. The official plugin registry
does not list the `bitty-terminal.wheel` identity. The manifest is
**not** the 0.1.0 distribution path — the built artifact excludes it, it is not
a supported installation route, and Wheel does not run inside the plugin VM or
receive a plugin capability grant. The 0.1.0 delivery also makes no `plugin-api`
compatibility claim.

## Local session daemon (experimental)

`scripts/wheel-session` is repository-local developer tooling for a detached
local session daemon; it is not part of the 0.1.0 artifact. The daemon owns one
`WheelContext` and serves a local-only control plane over two private POSIX
FIFOs, one bounded JSON document per line with the `wheel-session/1` marker.

```sh
scripts/wheel-session start demo
scripts/wheel-session status demo
scripts/wheel-session snapshot demo
scripts/wheel-session put demo scratch/note < note.txt
scripts/wheel-session get demo scratch/note
scripts/wheel-session list demo
scripts/wheel-session probe demo
scripts/wheel-session stop demo
```

The runtime root defaults to `$XDG_RUNTIME_DIR/wheel/sessions/<name>`, with an
XDG state fallback; `--root` overrides it with an absolute path. Session
directories are `0700`, and metadata plus both FIFOs are `0600`. The control
plane has no network listener, no multi-user authentication, and no peer
credential check: any process running as the same user can open the FIFOs. That
same-user residual is recorded in the
[Wheel security model](https://github.com/bitty-terminal/wheel/blob/main/SECURITY-MODEL.md#local-session-control-plane-experimental);
this slice is not a multi-user service. `stop` requests an explicit shutdown and
never signals a pid it did not read from validated metadata. Snapshots contain
slot metadata, never slot content.

## Offline benchmarks

The benchmark suite measures activation, bounded process calls, runner turns,
orchestration, and context compilation with mock providers. It uses no network,
credentials, live provider, or artificial sleep.

```sh
just bench                 # full suite, human-readable (manual, about a minute)
just bench-json            # full suite, machine-readable JSON on stdout
just bench-release-smoke   # bounded subset with generous regression ceilings
```

`just check` runs only the benchmark unit tests and one short context-scenario
run for this suite; the full suite is manual. Results record the revision,
interpreter, host, and sample statistics, and no host-specific baseline is
committed. The release-smoke ceilings are **regression signals, not accepted
release budgets** or performance claims. See the
[benchmark README](https://github.com/bitty-terminal/wheel/blob/main/bench/README.md)
for the method and limitations.

## Context snapshots

`WheelContext` exports and restores versioned, deterministic snapshots in the
`wheel-context-snapshot/1` format:

```lua
local WheelContext = require("wheel.context")

local snapshot, err = context:export_snapshot()
local valid, validation_err = WheelContext.validate_snapshot(snapshot)
local restored, import_err = WheelContext.import_snapshot(snapshot, opts)
local bytes, encode_err = WheelContext.canonical_snapshot(snapshot)
```

This is an in-memory primitive: the snapshot layer performs no file I/O,
logging, or transport, so the caller owns persistence, storage permissions, and
any wire encoding. Validation rejects malformed or over-bound snapshots with
`E_SNAPSHOT_INVALID`, but it does **not** authenticate the snapshot as a whole;
`head` and `refs` are unauthenticated pointers. Snapshot v1 excludes stash
entries, bus subscribers and callbacks, the kernel link, caller configuration
and budgets, and cached derived values.

See [CONTEXT-SNAPSHOT.md](https://github.com/bitty-terminal/wheel/blob/main/CONTEXT-SNAPSHOT.md)
for the field schema, bounds, integrity limits, and storage rules.

## Current limitations

| Area              | 0.1.0 status                                                                                                   |
| :---------------- | :------------------------------------------------------------------------------------------------------------- |
| Release           | No published tag or artifact; archive is unsigned and has no update channel                                    |
| Launch            | No launcher executable or interactive CLI ships in the artifact; `scripts/wheel-session` is repo-local tooling |
| Bitty integration | No released host integration; a host supplies presentation and input only                                      |
| Providers         | No live-provider configuration loader; live checks use the manual, opt-in `just test-live` target              |
| Plugin packaging  | `bitty-plugin.toml` `0.0.1` is transitional; no plugin compatibility or authority claim                        |

For the authority ceiling, residual risks, and evidence gates, read the
[Wheel README](https://github.com/bitty-terminal/wheel#readme) and
[SECURITY-MODEL.md](https://github.com/bitty-terminal/wheel/blob/main/SECURITY-MODEL.md).
