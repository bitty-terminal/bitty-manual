# bitty.services、通知与状态管理参考手册

本文档介绍上游服务发现、系统桌面通知、插件持久化键值存储以及异步定时器调度系统。

## 服务提供总线 (`bitty.services`)

服务总线允许插件发现并调用由宿主、上游原生协进程或其他平台插件提供的带版本能力，而无需与外部文件或源码紧密耦合。

### 调用服务

```lua
-- 按照语义化版本约束发现服务
local git = bitty.services.get("git.repository")

if git then
  local branch = git.branch(bitty.env.get("PWD"))
  bitty.notify.show({
    title = "Git Status",
    body = "Current branch: " .. tostring(branch),
  })
end
```

### 上游网络服务 (`network`)

当在 `bitty-plugin.toml` 中声明 `network` 能力后，Bitty 会暴露由 `bitty-net` 协进程提供的上游 HTTP 客户端：

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

## 桌面通知 (`bitty.notify`)

在被授予 `platform.notify` 能力时向系统发送原生桌面通知。

### `bitty.notify.show(payload)`

```lua
local accepted = bitty.notify.show({
  title = "Build Complete",
  body = "Compilation finished in 4.2 seconds.",
  urgency = "normal", -- "low" | "normal" | "critical"
})
```

- **参数**：
  - `title` (`string`)：受长度限制的标题字符串（由宿主渲染）。
  - `body` (`string`)：可选的通知正文。
  - `urgency` (`string`)：优先级等级（`"low"`, `"normal"` 或 `"critical"`）。
- **返回值**：`boolean` — 宿主通知队列成功接收时返回 `true`。

---

## 键值存储 (`bitty.store`)

每个插件分配一个沙箱化、代次隔离的持久化键值存储空间。数据在重启或插件重新加载后依然持久保存。

```lua
-- 保存状态值
bitty.store.set("last_sync_key", "snapshot-2026-10-08")

-- 读取已保存的值
local last_sync = bitty.store.get("last_sync_key")

-- 传入 nil 清除指定的键
bitty.store.set("temporary_cache", nil)
```

- **配额**：每个插件的存储空间受硬性配额限制（默认 256 KiB）以防止磁盘写满。超出配额将抛出 `E_STORE_QUOTA` 错误。

---

## 定时器 (`bitty.timers`)

高精度异步定时器调度器，直接由 Bitty Core 的统一事件循环驱动。Lua 代码绝不会通过 sleep 循环阻塞主线程：

```lua
-- 创建延迟执行的毫秒定时器
local timer_handle = bitty.timers.create(1000, function()
  bitty.notify.show({
    title = "Timer",
    body = "Fired after 1 second",
  })
end)

-- 取消活动定时器
local cancelled = bitty.timers.cancel(timer_handle)
```

- **`bitty.timers.create(delay_ms, callback)`**：调度在 `delay_ms` 毫秒后执行回调函数。返回整数句柄。
- **`bitty.timers.cancel(handle)`**：取消等待中的定时器。成功移除时返回 `true`。
