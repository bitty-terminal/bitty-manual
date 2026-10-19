# 插件配置

每个插件都有一个可选的用户配置文件。它按**键**逐个覆盖插件声明的设置。配置只承载**取值**：可以改变插件显示或行为的方式，但绝不会授予 capability。

文件缺席是正常状态。插件会使用出厂默认值运行。

## 文件位置

宿主按以下优先级解析唯一的配置根目录：

| 优先级 | 来源               | 结果目录                          |
| :----- | :----------------- | :-------------------------------- |
| 1      | `$XDG_CONFIG_HOME` | `$XDG_CONFIG_HOME/bitty/plugins/` |
| 2      | `%APPDATA%`        | `%APPDATA%\bitty\plugins\`        |
| 3      | `$HOME/.config`    | `~/.config/bitty/plugins/`        |
| 4      | `%LOCALAPPDATA%`   | `%LOCALAPPDATA%\bitty\plugins\`   |

第一个非空值生效。该顺序与主配置一致，因此同时设置了 `%APPDATA%` 与 `$HOME` 的 Windows 宿主仍优先使用 `%APPDATA%`。

宿主在激活时只选择一个文件：

1. 规范 Lua 文件：`<owner>.<name>.lua`，例如 `bitty-terminal.bar.lua`。
2. 短名别名：`<name>.lua`，例如短名 `bar` 加上 `.lua` 扩展名；仅当规范 Lua 文件缺席，且插件发现结果中恰好只有一个所有者声明该短名时才会选中。存在歧义的别名会被忽略。
3. 旧版 TOML：`<owner>.<name>.toml`，例如 `bitty-terminal.bar.toml`；仅当没有选中任何 Lua 文件时才会使用。

文件存在但被拒绝时，不会继续尝试其他别名或 TOML 文件。选中文件中缺失的键也不会与另一个文件合并。

### 文件名就是插件 id

文件主干是校验过的插件 id：恰好为 `owner.name`，一个点；每段以小写字母开头，只包含小写字母、数字、`-` 和 `_`（每段最长 64 字节）。由于 id 不能包含路径分隔符，无法逃出 `plugins/` 目录。非法 id 永远不会生成文件路径。

## 格式

### 受限 Lua（规范格式）

规范文件返回一个包含已声明设置的表：

```lua
-- $XDG_CONFIG_HOME/bitty/plugins/bitty-terminal.bar.lua
return {
  show = true,
  show_single = true,
  name_max_chars = 24,
  modules_left = { "workspaces" },
  modules_right = { "clock" },
}
```

该表在全新的受限 Lua VM 中求值，不提供宿主服务、插件 API、模块加载或有副作用的库。类型必须与插件声明匹配：接受布尔值、整数、字符串和字符串数组，且不做强制转换。未知或类型错误的条目会被忽略。源码和结果都有边界（源码 16 KiB、嵌套深度 16、每表 64 项、256 个返回值、每字符串 2048 字节、聚合输出 16 KiB）；超限或格式错误的结果会拒绝整个文件。

### TOML 数据子集（旧版）

TOML 文件按数据解析。它绝不会作为 Lua 求值，也不会执行任何内容：没有 `include`、没有 `exec`、没有 shell、没有分节、没有点键、没有嵌套。

```toml
# 仅扁平键
show = true                           # 布尔值
name_max_chars = 32                   # 裸整数
edge = "bottom"                       # 双引号字符串
modules_left = ["workspaces", "cpu"]  # 单行字符串数组
```

支持的取值包括布尔值、裸整数、双引号字符串和单行字符串数组。浮点数、带引号的数字、内联表、嵌套数组和多行值不在子集内。带引号的数字仍然是字符串，不能覆盖整数设置。

| 限制             | 取值   | 超出时         |
| :--------------- | :----- | :------------- |
| 文件大小         | 16 KiB | 整个文件被拒绝 |
| 文件行数         | 512    | 整个文件被拒绝 |
| 每行字节数       | 1024   | 整个文件被拒绝 |
| 每文件键数       | 64     | 整个文件被拒绝 |
| 每个字符串值字节 | 512    | 该键被跳过     |
| 每个字符串数组项 | 32     | 该键被跳过     |
| 每个数组项字节   | 128    | 该键被跳过     |

非 UTF-8 输入会拒绝整个文件。包含 NUL 字节的键会被拒绝。

## 优先级与失败行为

取值按已声明的键逐个解析，优先级从低到高：

```text
manifest 出厂默认值 < 宿主共享源 < 选中的用户文件
```

任何一层的类型错误取值只会让该键保留更低一层的正确类型取值。未知键会被丢弃：记录为跳过，不改变任何东西。只有插件声明过的设置才可读取。

整文件失败与单键失败不同：

| 问题                                             | 结果                     |
| :----------------------------------------------- | :----------------------- |
| 重复键、`[section]`、没有 `=` 的行、非法键名     | 整个文件被拒绝；使用下层 |
| 超过 64 个键、超过 16 KiB、超过 512 行、非 UTF-8 | 整个文件被拒绝；使用下层 |
| 未闭合的字符串或数组、不支持或超长的取值         | 该键被跳过；其余仍然生效 |
| manifest 从未声明的键                            | 丢弃；记录为跳过         |

> [!NOTE]
> 安全编辑：错误取值绝不会中止插件，也绝不会授予 capability。最坏情况是隐藏某个模块，或让该键保留出厂默认值。结构性错误会让整个文件在该次激活中失效，插件继续使用下层取值运行。

## 生效时机

宿主在插件激活时读取选中的文件，并把解析结果固定到该插件 generation。宿主不会监视文件。

保存文件**不会**热重载正在运行的插件。配置重载事件会送达订阅该事件的插件，但不会重新解析每插件设置。正在运行的 generation 会保留激活时解析出的取值。

重启 Bitty 以应用编辑。延迟激活的插件会在编辑后的首次激活时读取文件；已在运行的插件需要新的 generation。

`bitty config check` 只校验主配置，不是插件文件的完整校验器。每插件的选择与解析警告是激活期间的宿主日志摘要；每次激活最多保留四条摘要，且不包含设置名和取值。

## 示例

### 状态栏：工作区与时钟分组

```toml
# $XDG_CONFIG_HOME/bitty/plugins/bitty-terminal.bar.toml
show = true
show_single = true
edge = "bottom"
name_max_chars = 24
modules_left = ["workspaces"]
modules_center = []
modules_right = ["clock"]
```

三个模块列表是有序分组。`modules_left` 默认为 `["workspaces"]`，`modules_center` 与 `modules_right` 默认为空。未知模块名或解析为空的计划会回退为单个工作区分组，因此状态栏不会意外消失。

工作区标签是固定文本：每个胶囊显示 `{stable-id}:{name}`，活动胶囊带有 `*`，工作区数量跟在胶囊之后。名称会截断到 `name_max_chars`（1 到 32，默认 32）。目前没有单独的标签模式键。`show_single = true` 会在只有一个工作区时保持状态栏可见；`show = false` 隐藏整个状态栏。

每模块选项组（例如时钟格式或轮询间隔）由插件声明，但当前设置契约不接受 map 取值。它们会按模块默认值读取。当前真正生效的是上面的框架标量和三个模块列表。

### 作曲家：和弦

```toml
# $XDG_CONFIG_HOME/bitty/plugins/bitty-terminal.composer.toml
newline = "enter"
submit = "ctrl+enter"
close = "escape"
external_editor = "alt+e"
open_chord = "alt+e"
```

四个模态内角色（`newline`、`submit`、`close`、`external_editor`）必须两两不同。匹配顺序为提交、关闭、外部编辑器、换行和文本。打开和弦必须恰好为 `<mod>+...+<single-char>`，并位于宿主键位图上；它在模态关闭时指向打开命令。打开和弦与模态内的外部编辑器角色彼此独立，因此两个 `alt+e` 默认值不会冲突。

### 搜索：分页预算

```toml
# $XDG_CONFIG_HOME/bitty/plugins/bitty-terminal.search.toml
row_count = 10
max_bytes = 4096
```

`row_count` 默认 10，`max_bytes` 默认 4096。宿主每次查询最多允许 16 行和 4096 字节；超出范围的配置值会回退到默认值，而不会扩大查询。

### 用 Lua 表达同样的键

键名不变。要使用规范格式，请用 Lua 数组语法把它们作为表返回：

```lua
-- $XDG_CONFIG_HOME/bitty/plugins/bitty-terminal.bar.lua
return {
  show = true,
  show_single = true,
  edge = "bottom",
  name_max_chars = 24,
  modules_left = { "workspaces" },
  modules_center = {},
  modules_right = { "clock" },
}
```

## 检查配置

```bash
bitty plugin list          # 状态与 capability 授权
bitty plugin info <id>     # manifest 与已记录的授权
bitty doctor               # 宿主环境健康检查
```

不存在 `bitty plugin doctor` 子命令。`bitty config check` 成功并不代表每插件文件有效，因为这些文件在插件激活时才会读取。如果某个取值似乎被忽略，请依次检查选中的文件名、键拼写、类型和插件授权。

## 下一步

- [每插件配置文件](../plugins/plugin-settings.md)——选择顺序、格式限制与取值层优先级的参考说明。
- [状态栏模块用户指南](../plugins/bar-modules.md)——每个模块的显示内容。
- [作曲家模态框用法](../plugins/composer.md)——打开、提交与关闭行为。
- [故障排查与安全模式](../faq/troubleshooting.md)——激活错误与设置警告。
