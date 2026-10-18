# network (native extension)

The shared, optional network runtime: connection pooling, DNS, TLS, and the wire framing that Lua plugins share instead of each vendoring their own stack. Core links no network code; this crate is the single place network mechanism lives (`bitty-network` README).

- Source checkout: `$BITTY_WORKSPACE/bitty-network` ([github.com/bitty-terminal/bitty-network](https://github.com/bitty-terminal/bitty-network))
- Crates: `bitty-network-api`, `bitty-network-core`, `bitty-network-dns`, `bitty-network-tls`, `bitty-network-wire`, `bitty-network-lua`, `bitty-net`
- Maturity: source includes the `bitty-net` executable and merged packaging/publisher workflow; no component artifact is published, and the Core production broker path is not verified or in use.

## Install status

> Unpublished; packaging pending — current release-readiness evidence reports no live CDN bundle or `0.0.24` release. The merged packaging workflow is release machinery only: no tag or upload was evidenced, and there is no version to pass to `extension install`.

Track the source checkout above. A locally available compatible executable may be staged with `bitty extension add <path>`; the native component path is not thereby verified for Core production use. The implemented seed installer is currently blocked because no matching CDN artifact is published and Core `0.0.24` is not released. If those inputs become available, installation follows the standard shape:

```bash
bitty extension list   # inspect the local component inventory
# Local mechanism only, when a compatible executable is available:
# bitty extension add <path>
# When the matching artifact and Core release are available:
# bitty extension install <name> --version X.Y.Z
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
