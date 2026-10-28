# network (native extension)

The shared, optional network runtime: connection pooling, DNS, TLS, and the wire framing for the native extension path. Core links the first-party wire codec and owns the internal component broker; the current user-facing Lua path still uses the embedded `bitty-network-lua` binding, while `bitty-net` is the separate extension executable (`bitty-network` README).

- Source checkout: `$BITTY_WORKSPACE/bitty-network` ([github.com/bitty-terminal/bitty-network](https://github.com/bitty-terminal/bitty-network))
- Crates: `bitty-network-api`, `bitty-network-core`, `bitty-network-dns`, `bitty-network-tls`, `bitty-network-wire`, `bitty-network-lua`, `bitty-net`
- Maturity: mainline source includes the `bitty-net` executable and `net 0.0.2` is published on the CDN; making the native extension the user-facing Lua path remains a separate routing change.

## Install status

> Published — `net 0.0.2` has live CDN tarballs and `SHA256SUMS` for linux x86_64/aarch64, macOS arm64/x86_64, and Windows x86_64 (verified 2026-10-28), and `extensions/catalog.v1` lists all five targets. A bare `bitty extension install net` resolves it as the latest release for the host target.

Track the source checkout above. The extension name is `net` and its executable is `bitty-net`. Install the published extension:

```bash
bitty extension install net              # latest catalog release (0.0.2)
bitty extension install net --version 0.0.2   # exact pin
bitty extension install bitty-net --version 0.0.2   # repo-style alias

bitty extension list   # inspect the local extension inventory
```

A locally available compatible executable may still be staged with `bitty extension add <path>`. Installing the extension does not make it the user-facing Lua network path: that routing remains a separate change.

## Lua / host surface

`bitty-network-lua` registers a `bitty.network` table in the plugin VM (`crates/bitty-network-lua/src/lib.rs:159`, `register_network_module`):

- `bitty.network.echo` — round-trip probe used by the crate's own tests (`src/callback.rs:16`)
- `bitty.network.info` — runtime metadata query (`src/callback.rs:48`)

Callers need the corresponding network capability grant; without it the host denies the call fail-closed.

## Minimal config

Native extensions take no per-extension user config file. Verify staging only:

```bash
bitty extension list
```
