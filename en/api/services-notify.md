# bitty.services, Notify & State

This page documents upstream service discovery, desktop notifications, persistent plugin storage, and asynchronous timer schedulers.

## Service Provider Bus (`bitty.services`)

The service bus allows plugins to discover and consume versioned capabilities provided by the host, upstream native coprocesses, or peer platform plugins without directly coupling to external files or source code.

### Consuming Services

```lua
-- Discover a service with semver constraints
local git = bitty.services.get("git.repository")

if git then
  local branch = git.branch(bitty.env.get("PWD"))
  bitty.notify.show({
    title = "Git Status",
    body = "Current branch: " .. tostring(branch),
  })
end
```

### Upstream Network Service (`network`)

When the `network` capability is declared in `bitty-plugin.toml`, Bitty exposes the upstream HTTP client provided by the `bitty-net` coprocess:

```lua
local net = bitty.services.get("network")

net.request({
  method = "GET",
  url = "https://api.github.com/zen",
  timeout_ms = 3000,
}, function(res)
  if res.ok then
    bitty.notify.show({
      title = "GitHub Zen",
      body = res.body,
    })
  end
end)
```

---

## Desktop Notifications (`bitty.notify`)

Displays native desktop notifications when the `platform.notify` capability is granted.

### `bitty.notify.show(payload)`

```lua
local accepted = bitty.notify.show({
  title = "Build Complete",
  body = "Compilation finished in 4.2 seconds.",
  urgency = "normal", -- "low" | "normal" | "critical"
})
```

- **Parameters**:
  - `title` (`string`): Bounded title string (rendered by host).
  - `body` (`string`): Optional notification body.
  - `urgency` (`string`): Priority level (`"low"`, `"normal"`, or `"critical"`).
- **Returns**: `boolean` — `true` if accepted by the host notification queue.

---

## Key-Value Storage (`bitty.store`)

Each plugin receives a sandboxed, generation-isolated persistent key-value store. Data survives across restarts and plugin reloads.

```lua
-- Save a state value
bitty.store.set("last_sync_key", "snapshot-2026-10-08")

-- Retrieve a saved value
local last_sync = bitty.store.get("last_sync_key")

-- Clear a key by setting nil
bitty.store.set("temporary_cache", nil)
```

- **Quotas**: Storage is capped per plugin (default 256 KiB) to prevent disk exhaustion. Exceeding quota raises error `E_STORE_QUOTA`.

---

## Timers (`bitty.timers`)

High-precision asynchronous timer scheduler managed directly by Bitty Core's unified event loop. Lua code never blocks the main thread with sleep loops:

```lua
-- Create a timer delayed by milliseconds
local timer_handle = bitty.timers.create(1000, function()
  bitty.notify.show({
    title = "Timer",
    body = "Fired after 1 second",
  })
end)

-- Cancel an active timer
local cancelled = bitty.timers.cancel(timer_handle)
```

- **`bitty.timers.create(delay_ms, callback)`**: Schedules a callback execution after `delay_ms`. Returns an integer handle.
- **`bitty.timers.cancel(handle)`**: Cancels a pending timer handle. Returns `true` if successfully removed.
