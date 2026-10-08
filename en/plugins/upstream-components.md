# Upstream Native Components (DIR-030)

Bitty Core ships with **zero network code** and **zero extraneous background runtime code**. Yet, plugins often need network connectivity, HTTP APIs, or heavy computation. Bitty resolves this tension through its **Native Component Boundary (DIR-030)** architecture.

## The Architectural Axioms

To prevent the ecosystem entropy seen in traditional extensible environments (where each plugin pulls in separate Python/Node runtimes, uncoordinated worker processes, and duplicate connection pools), Bitty establishes two core axioms:

$$\boxed{\text{Plugins share infrastructure, not duplicate infrastructure}}$$
$$\boxed{\text{Plugins request capabilities, not own system privileges}}$$

## The Coprocess Model

Native components are independent, single-purpose native binaries that act as **upstream capability providers**:

```text
Plugin Lua Sandbox (Phodopus)
       │ (1) Capability Request: network.http("https://api.github.com/...")
       ▼
Bitty Core Host (Rust)
       │ (2) Policy Authority: Checks manifest grant, timeout, byte budget
       ▼
stdio Wire Protocol v1 (Framed JSON / Binary IPC)
       ▼
bitty-net Native Coprocess (Rust)
       │ (3) Shares HTTP/2 connection pool & TLS session cache across all plugins
       ▼
Internet (api.github.com)
```

### Key Design Tenets

1. **On-Demand Stdio Coprocess**: Bitty Core spawns the native component upon first usage, communicates over standard input and output (`stdin` / `stdout`), and gracefully suspends or terminates it when idle.
2. **Zero `dlopen` & Zero Ambient Daemon**: Components are never dynamically loaded into the Core process space (preserving host stability and memory boundaries), nor do they run as lingering system background daemons.
3. **No PATH Scanning**: Bitty Core never scans system `$PATH` for components. Binaries are installed to explicit paths with cryptographic SHA-256 digest validation.
4. **Mechanism vs. Policy Separation**:
   - **Core is the Policy Authority**: Core validates permission grants, user consent, request deadlines, and body byte ceilings.
   - **The Component is the Execution Mechanism**: The component performs the heavy work (e.g. TLS handshakes, HTTP/2 multiplexing, DNS resolution) and re-verifies handed capability tokens as defense-in-depth.

## The `bitty-net` Network Component

The canonical first native component is `bitty-net` (built from the `bitty-network` repository).

### How Plugins Consume Network Capabilities

Plugins never construct sockets directly. Instead, they declare requirements in `bitty-plugin.toml`:

```toml
[capabilities]
network = ["http"]

[network]
allow = ["api.github.com", "crates.io"]
```

In Lua, the plugin consumes the service through the host service bus:

```lua
-- Resolves the host-mediated network service
local net = bitty.services:get("network")

-- Performs an asynchronous HTTP request
net.request({
  method = "GET",
  url = "https://api.github.com/repos/bitty-terminal/bitty",
  headers = { ["User-Agent"] = "BittyPlugin/0.1" },
  timeout_ms = 5000,
}, function(response)
  if response.status == 200 then
    bitty.notify.show({
      title = "GitHub Update",
      body = "Fetched repo data successfully",
    })
  end
end)
```

### Shared Resource Benefits

- **Connection Reuse**: Five different plugins making requests to `api.github.com` automatically share a single HTTP/2 multiplexed TCP/TLS connection.
- **Unified Proxy & DNS**: System proxies (`HTTPS_PROXY`), custom CA certificates, and DNS caches are handled consistently by `bitty-net` without individual plugin configuration.
- **Fail-Closed Deadlines**: If a network request hangs, Core enforces request timeouts (default 30s, max 300s) and cleans up in-flight requests deterministically.

## Component Administration

Manage registered native components via the CLI:

```bash
# List registered components and verify binary digest integrity
bitty component list

# Register a verified binary
bitty component add /usr/local/bin/bitty-net

# Remove a component
bitty component remove net
```
