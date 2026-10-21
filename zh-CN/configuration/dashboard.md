# 配置面板

配置面板（Configuration Dashboard）是一个全屏概览，用于查看当前生效的配置以及其背后的配置文件。当你不想打开配置文件、也不想运行 CLI 命令，只想回答"现在到底生效的是什么"时，它最有用。

该面板属于终端本体：不使用插件，不启动 shell，也不访问网络。

## 打开配置面板

面板没有默认快捷键。请在 `$XDG_CONFIG_HOME/bitty/init.lua`（默认为 `~/.config/bitty/init.lua`）中绑定一次：

```lua
return {
    keymaps = {
        { chord = "alt+c", action = "toggle_dashboard", context = "global" },
    },
}
```

`toggle_dashboard` 也接受 `config_dashboard` 与 `dashboard` 两种别名。该动作在所有能派发 chrome action 的位置都可用，因此已有按键映射可以直接改指它，无需记忆新的名字。

面板打开期间会独占无修饰键，避免输入泄漏到背后的 shell。带修饰键的组合（Ctrl/Alt/Super）仍然生效——这正是切换快捷键能再次关闭面板的原因。

当某个插件浮层（例如命令面板）持有输入捕获时，打开请求会被拒绝。请先关闭该浮层。

## 键盘导航

| 按键                                             | 作用                             |
| ------------------------------------------------ | -------------------------------- |
| `j` / `k`、`Down` / `Up`                         | 移动选中行                       |
| `h` / `l`、`Left` / `Right`、`Tab` / `Shift+Tab` | 上一个 / 下一个分区              |
| `1` … `5`                                        | 跳转到指定分区                   |
| `g` / `G`、`Home` / `End`                        | 首行 / 末行                      |
| `PageUp` / `PageDown`                            | 翻一页                           |
| `Enter`                                          | 执行选中行（写操作需要再按一次） |
| `r`                                              | 重新读取数据                     |
| `q` / `Esc`                                      | 关闭                             |

较长的分区最多保留 128 行，末尾显示 `+more` 行，因此插件很多时也不会变成无界列表。超出面板宽度的值会用 `…` 截断。

## 分区说明

### Overview（概览）

显示当前配置名（未选择时显示 `default (no profile)`）、解析后的主题及其生效层（`cli`、`file`、`profile`、`default`）、实时字体族与字号、装饰几何参数，以及解析出的配置文件路径。下面列出全部内置主题预设。

选中某个预设并连续按两次 `Enter`，会**实时预览、但不保存**。面板会把该状态标注为 `live preview, not saved`；下一次配置重载或重启后会回到原来的层。要永久生效，请写入配置：

```lua
return { appearance = { theme = "bitty-light" } }
```

### Plugins（插件）

每个内置目录条目和已安装记录占一行：启用/禁用/可用状态、来源（`bundled`、`registry`、`git`、`local-path`）以及版本。

拥有托管记录的内置插件可以在此启用或禁用。按 `Enter` 会先"预备"这次修改，再按一次 `Enter` 才会写入。任何移动都会取消待确认的修改。写入与 `bitty plugin enable` / `bitty plugin disable` 使用的是同一套托管清单更新流程，包含 pin 与授权校验，因此自用户同意以来清单发生变化的记录会被拒绝并提示，而不是被写入。未知记录会被拒绝，且不会创建任何文件。没有托管记录的插件只会列出，不能在此切换——请先用 `bitty plugin install <id>` 安装。

### Settings（设置）

只读。对每个声明了设置的已安装插件，逐项显示当前值、出厂默认值以及来源（你的文件设置了该键时显示 `user`，否则显示 `default`）。被忽略的键和设置文件解析错误会带上插件前缀列出。

插件设置请编辑 `$XDG_CONFIG_HOME/bitty/plugins/<owner>.<name>.toml`（或 `.lua` 形式），详见[插件配置](plugin-config.md)；保存后按 `r` 重新读取。

### Profiles（配置档案）

只读。列出 `default` 以及所有合法的 `profiles/<name>.lua`，并标记当前生效项。配置档案在启动时选择，切换需要重启：

```bash
bitty --profile work
```

主配置文件仍然优先于所选档案，具体规则见[配置参考手册](overview.md#命名配置named-profiles)。

### Extensions（原生扩展）

只读。每个已安装的原生扩展占一行，显示当前版本、归属层（`user` 或 `system`）以及已安装的版本数量。安装、升级与删除请使用 `bitty extension` 命令。

## 文件位置

| 数据         | 路径                                                              |
| ------------ | ----------------------------------------------------------------- |
| 主配置       | `$XDG_CONFIG_HOME/bitty/init.lua`（回退 `config.lua`）            |
| 命名配置     | `$XDG_CONFIG_HOME/bitty/profiles/<name>.lua`                      |
| 插件设置     | `$XDG_CONFIG_HOME/bitty/plugins/<owner>.<name>.toml`（或 `.lua`） |
| 托管插件清单 | `$XDG_CONFIG_HOME/bitty/bitty-plugins.toml` —— 请勿手工编辑       |
| 插件包       | `$XDG_DATA_HOME/bitty/plugins/packages/<id>/<version>/`           |
| 原生扩展     | `$XDG_DATA_HOME/bitty/components/`（系统层位于打包安装位置）      |

`bitty config path` 会打印精确的解析路径，`bitty config check` 会打印每个值的来源——与面板展示的是同一份数据。

## 当分区显示 "unavailable"

`unavailable: <reason>` 表示数据读取失败（例如托管插件清单不可读，或无法解析配置根目录），而不是"没有配置任何内容"。空结果会显示为空（"none installed"）。修复原因后按 `r` 重新读取；分区不可用期间面板不会执行任何写入。

## 面板明确不做的事

- 不会为了主题预览而修改配置文件或其他任何文件。
- 不会安装或删除插件与原生扩展。
- 不会执行 shell 命令、打开 URL 或访问网络。
- 不会读取环境变量、令牌或凭据。
- 不会创建插件沙箱，也不会加载插件代码。
