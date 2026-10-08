# bitty.services, Notify & State

This page documents upstream service discovery, desktop notifications, persistent plugin storage, and asynchronous timer schedulers.

## Service Provider Bus (`bitty.services`)

The service bus allows plugins to discover and consume versioned capabilities provided by the host, upstream native coprocesses, or peer platform plugins without directly coupling to external files or source code.

### Consuming Services

```lua
-- Discover a service with semver constraints
local git = bitty.services:get("git.repository", { version = ">=2.0" })

if git then
  local branch = git.branch(bitty.env.get("PWD"))
  print("Current git branch: " .. tostring(branch))
end
```

### Upstream Network Service (`network`)

When the `network` capability is declared in `bitty-plugin.toml`, Bitty exposes the upstream HTTP client provided by the `bitty-net` coprocess:

```lua
local net = bitty.services:get("network")

net.request({
  method = "GET",
  url = "https://api.github.com/zen",
  timeout_ms = 3000,
}, function(res)
  if res.ok then
    print("GitHub Zen: " .. res.body)
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
bitty.store.set("last_sync_timestamp", os.time())

-- Retrieve a saved value
local last_sync = bitty.store.get("last_sync_timestamp")

-- Delete a key
bitty.store.delete("temporary_cache")
```

- **Quotas**: Storage is capped per plugin (default 256 KiB) to prevent disk exhaustion. Exceeding quota raises error `E_STORE_QUOTA`.

---

## Timers (`bitty.timers`)

High-precision asynchronous timer scheduler managed directly by Bitty Core's unified event loop. Lua code never blocks the main thread with sleep loops:

```lua
-- One-shot delayed timer
local timer_id = bitty.timers.after(1000, function()
  print("Fired after 1 second")
end)

-- Recurring periodic timer
local interval_id = bitty.timers.every(5000, function()
  -- Runs every 5 seconds
end)

-- Cancel an active timer
bitty.timers.cancel(interval_id)
```
