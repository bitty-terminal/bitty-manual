# network (native extension)

The shared, optional network runtime: connection pooling, DNS, TLS, and the wire framing for the native component path. Core links the first-party wire codec and owns the component broker; the current user-facing Lua path still uses the embedded `bitty-network-lua` binding, while `bitty-net` is the separate component executable (`bitty-network` README).

- Source checkout: `$BITTY_WORKSPACE/bitty-network` ([github.com/bitty-terminal/bitty-network](https://github.com/bitty-terminal/bitty-network))
- Crates: `bitty-network-api`, `bitty-network-core`, `bitty-network-dns`, `bitty-network-tls`, `bitty-network-wire`, `bitty-network-lua`, `bitty-net`
- Maturity: mainline source includes the `bitty-net` executable, but no mainline packaging workflow or component artifact is published; the native `bitty-net` path is not yet the user-facing production Lua path.

## Install status

> Unpublished; packaging pending — current release-readiness evidence reports no live CDN bundle or `v0.0.24` tag. Packaging source on a non-mainline preparation branch is release machinery only: no tag or upload was evidenced, and there is no version to pass to `extension install`.

Track the source checkout above. The component name is `net` and its executable is `bitty-net`. A locally available compatible executable may be staged with `bitty extension add <path>`; staging does not make the native component the user-facing Lua network path. The implemented seed installer is currently blocked because no matching CDN artifact is published. If a matching artifact is published, installation follows the standard shape:

```bash
bitty extension list   # inspect the local component inventory
# Local mechanism only, when a compatible executable is available:
# bitty extension add <path>
# When the matching `net` artifact is available:
# bitty extension install net --version X.Y.Z
```

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
