# CLI 命令行参数与控制

Bitty 提供了统一、纯解析的命令行工具链，用于启动终端、检查运行时状态、管理多环境配置（Profile）、配置插件以及驱动外部自动化。

运行 `bitty --help` 查看精简概览，`bitty --help -v` 查看全部标志，`bitty <command> --help` 查看单命令详情。

> [!NOTE]
> `bitty help [cmd]` 是一个真实子命令，**不会启动任何程序**：单独运行 `bitty help` 打印与 `bitty --help` 相同的精简概览（追加 `-v` 可获得完整详情，等价于 `bitty --help -v`），`bitty help <cmd>` 打印与 `bitty <command> --help` 相同的单命令详情。未知命令名会以退出码 2 失败关闭，并列出有效命令。若程序本身名为 `help`，需写作 `bitty -- help ...`（或 `bitty run -- help ...`），因为裸 `bitty help` 从不派生进程。依据：`crates/bitty-terminal/src/cli.rs` 中 `"help" => Some("help")`，并提供 `help_usage()`。

## 终端调用 (`bitty`)

主二进制程序用于启动 GUI 窗口并派生 Shell 会话：

```bash
bitty [OPTIONS] [PROGRAM [ARGS...]]
bitty [OPTIONS] -- PROGRAM [ARGS...]
```

### 核心启动参数

| 参数                   | 说明                                                                               |
| :--------------------- | :--------------------------------------------------------------------------------- |
| `--config <PATH>`      | 显式指定配置文件路径（覆盖 `$XDG_CONFIG_HOME/bitty/init.lua` 与 `BITTY_CONFIG`）。 |
| `--profile <NAME>`     | 加载 `$XDG_CONFIG_HOME/bitty/profiles/<name>.lua` 命名配置（作为基础层生效）。     |
| `--theme <NAME>`       | 单次启动 CLI 色彩主题覆盖（优先级高于配置文件和 Profile）。                        |
| `--font-family <NAME>` | 单次启动 CLI 字体系列覆盖。                                                        |
| `--font-size <PTS>`    | 单次启动 CLI 字体点阵大小覆盖（例如 `12.5`）。                                     |
| `--opacity <FLOAT>`    | 单次启动 CLI 窗口透明度覆盖（例如 `0.85`）。                                       |
| `--safe`               | **安全恢复模式**：禁用所有第三方插件、监听器与用户配置；强制使用内置默认值。       |
| `--fail-loud`          | 若主 Shell 或启动步骤失败则立即以非零状态码中止（调试姿态）。                      |
| `--test-mode`          | 启动确定性无头端到端伺服循环，连接至 `BITTY_SOCKET` IPC 接口直至退出。             |
| `-v, --verbose`        | `--log-level debug` 的简写；在 stderr 输出逐帧渲染 tick 统计。                     |
| `--log-level <LEVEL>`  | 设置 stderr 日志等级（`error`, `warn`, `info`, `debug`, `trace`）。                |
| `--mascot`             | 向标准输出打印吉祥物 Bittie ASCII 艺术字并退出。                                   |
| `--no-splash`          | 抑制首次启动的吉祥物欢迎画面。                                                     |
| `--no-color`           | 禁用 ANSI 着色（同时遵循 `NO_COLOR`）。                                            |
| `--socket <PATH>`      | 控制目标 socket（配合 `ctl` / `list instances`）。                                 |
| `--instance <ID>`      | 控制目标实例（配合 `ctl` / `list instances`）。                                    |
| `--`                   | 标志结束符；剩余词元均为 `PROGRAM` 参数。                                          |
| `-h, --help`           | 显示命令行参数帮助摘要并退出。                                                     |
| `-V, --version`        | 显示版本号、目标架构及构建元数据。                                                 |

### 布局与分屏参数

在启动时直接进入特定的分屏与布局状态：

| 参数                     | 说明                                                                                       |
| :----------------------- | :----------------------------------------------------------------------------------------- |
| `--split [AXIS[:RATIO]]` | 分屏启动窗格（`horizontal`/`h`、`vertical`/`v`，默认 `h`，比例默认 `0.5`）。               |
| `--split-ratio <FLOAT>`  | 设置分屏比例（0.10 至 0.90，例如 `0.3`）。                                                 |
| `--stack`                | 请求堆叠布局模式（Stack Layout）。                                                         |
| `--overlay`              | 请求覆层展示模式（Overlay Presentation）。                                                 |
| `--layout <SPEC>`        | 原始布局规范字符串（例如 `"single"`, `"split:h:0.5"`, `"stack"`, `"overlay:5,5,20,10"`）。 |
| `--focus <TARGET>`       | 初始焦点目标（`"next"`, `"prev"`, `"up"`, `"down"`, `"left"`, `"right"` 或 id）。          |

### 无头与测试参数

| 参数          | 说明                                                                   |
| :------------ | :--------------------------------------------------------------------- |
| `--headless`  | 仅执行单次无头渲染冒烟测试，不创建显示服务器窗口直接退出。             |
| `--test-mode` | 启动确定性无头端到端伺服循环，连接至 `BITTY_SOCKET` IPC 接口直至退出。 |

---

## 子命令

Bitty 共 16 个子命令（含 `help`）。本地动词无需运行实例；运行时动词（`ctl`、`cmd`）通过 IPC（仅 Unix）操控一个 live 实例。

### 显式子进程启动 (`bitty run`)

```bash
# 以前台子进程运行程序（本地，继承 stdio）
bitty run -- COMMAND [ARGS...]
```

### 运行时控制 (`bitty ctl`)

控制一个运行中的实例（需要一个 live 实例；仅 Unix IPC）：

```bash
bitty ctl instance list
bitty ctl window list
bitty ctl "view list" | view split [--left|--right|--up|--down] | view focus v:N
bitty ctl terminal list | terminal spawn [--cwd PATH] | terminal close t:N
bitty ctl terminal send t:N TEXT | terminal text t:N
bitty ctl workspace list | workspace new | workspace close ws:N
bitty ctl workspace focus ws:N | workspace move ws:N
bitty ctl workspace rename ws:N NAME | workspace move-panel POSITION
bitty ctl config reload
```

输出形状：`--format table|json|jsonl`。目标优先级：`--socket`、`--instance`、`BITTY_SOCKET`/`BITTY_INSTANCE_ID`、唯一 live 实例兜底。

> [!NOTE]
> `ctl` 中没有 panel 资源：当前 panel id 尚无查询途径。`view list` 报告视图（`v:N` 加 `focused` 标记）。见 [bitty#1900](https://github.com/bitty-terminal/bitty/issues/1900)。

### 配置管理 (`bitty config`)

别名：`bitty cfg`

```bash
# 打印当前生效的配置文件绝对路径
bitty config path

# 离线验证配置文件语法与 Schema 结构，无需启动 GUI
bitty config check

# 使用 $VISUAL 或 $EDITOR 打开当前配置文件
bitty config edit

# 把配置文件升级到当前 schema 版本
bitty config migrate
bitty config migrate --dry-run
```

`config migrate` 会写入 `config_version` 并按注册顺序执行迁移：原子写入（临时文件、`fsync`、重命名、目录 `fsync`，保留权限），并在旁边保留 `.bak-<原版本>` 备份；`--dry-run` 只列出变更，`--backup`/`--no-backup` 控制备份，已是最新版本时不改动文件。比当前 Bitty 更新的文件会被拒绝（`ConfigVersionUnsupported`），`--safe` 在任何写入前拒绝。

### 初始化向导 (`bitty init`)

按需使用的交互式配置向导：

```bash
# 运行交互式配置向导
bitty init

# 跳过交互提示，直接写入合理的默认配置
bitty init --yes

# 强制覆盖已有配置文件（会自动生成 .bak 备份）
bitty init --force
```

### 安装与环境诊断 (`bitty doctor`)

诊断 GPU 驱动、字体、环境依赖与健康状态：

```bash
# 显示格式化诊断表格
bitty doctor

# 以 JSON 格式输出诊断报告
bitty doctor --format json

# 修复可安全回退的问题（建议先 dry run）
bitty doctor --fix --dry-run
bitty doctor --fix
```

`--fix` 只处理有安全、可回退修复方式的条目：用户自有的 `0700` 目录下的失效实例 socket、宿主查找失败时安装内置 terminfo、以及指向已删除 profile 的选择器（仅当 `profiles/default.lua` 存在）。每条修复都会报告改了什么、原值是什么、如何撤销；没有修复方式的条目只给出提示。`--safe` 会在任何探测前拒绝，`--fix` 不改变退出码。

### 应用配置到运行中的实例 (`bitty reload`)

在不重启实例的情况下重新读取用户配置与所选 profile：

```bash
# 应用到默认 socket 上的实例
bitty reload

# 只显示将要发生的变更，不写入
bitty reload --dry-run

# 指定实例或 socket
bitty reload --instance work --socket /run/user/1000/bitty/work.sock
```

计划是原子的：被拒绝的配置不会改动运行中的实例，并打印第一个错误的点分路径（退出码 `3`）。`--dry-run` 以 `would-apply` 报告同一计划并退出 `0`。无法在线应用的变更——目前是 `terminal.shell` 和启用插件集合的变化——会以 `restart-required` 报告并列出受影响的键或插件 id，退出码 `4`，重启后再次执行即可。写入需要与 `bitty ctl config reload` 相同的 `config.modify` 提权（`BITTY_CTL_ELEVATE=config.modify`）。

### 自更新 (`bitty upgrade`)

从安装时所用的发布通道更新二进制：

```bash
# 报告当前版本与安装通道
bitty upgrade --check

# 显示下载与替换计划，不做任何更改
bitty upgrade --dry-run

# 执行更新，并用 SHA256SUMS 校验资产
bitty upgrade --yes

# 回滚到上一个二进制
bitty upgrade --rollback
```

通道识别读取安装脚本写入的标记（`$XDG_DATA_HOME/bitty/install.json`）和二进制自身路径：脚本安装、AppImage、Homebrew、Scoop、Nix、APT、DNF、RPM、pacman/AUR 或未知。系统级通道（APT、DNF、RPM、pacman）只打印应执行的命令并退出 `7`；脚本、AppImage、Homebrew、Scoop 安装会原子替换二进制，把旧版本保留为 `bitty.prev`，并在替换前用发布页的 `SHA256SUMS` 校验下载内容。Windows 上需要运行安装器，因为正在运行的 exe 无法被替换。

### 会话宿主 (`bittyd`)

`bittyd` 是可选的会话宿主：它持有 PTY，使会话可以比创建它的窗口存活更久。它随 Linux 软件包安装，前台运行；请用用户级 unit 托管，而不是手动放到后台。

```bash
# 启动宿主（前台；每个用户一个实例）
bittyd start

# 打印 crate 与服务 API 版本
bittyd --version

# 停止宿主
bittyd stop
bittyd stop --drain
bittyd stop --force
```

```bash
# 启用随包安装的用户级 unit
systemctl --user enable --now bittyd
loginctl enable-linger "$USER"   # 未登录时也保持运行
```

`bittyd stop` 在仍有会话附着时以退出码 `3` 拒绝；`--drain` 停止接受新会话并在最后一个会话结束后退出，`--force` 直接终止。退出码：`0` 已停止或没有守护进程，`1` 传输失败，`3` 存在活跃会话，`4` 需要强制完成的 drain，`5` 强制停止但无法验证清理，`6` 认证不变量失败。守护进程忽略 `SIGHUP`，终端关闭不会杀死它；端点目录或操作员文件权限不正确时以 `6` 退出。

### 资源枚举 (`bitty list`)

别名：`bitty ls`

```bash
# 列出可用的内置与用户色彩主题
bitty list themes

# 列出已安装插件及其激活状态
bitty list plugins

# 列出当前正在运行的 Bitty 终端实例
bitty list instances
```

### 状态解释 (`bitty inspect`)

解释生效状态与归属，不加载任何插件 VM：

```bash
bitty inspect command core.terminal.text
bitty inspect key ctrl+shift+m
bitty inspect plugin bitty-terminal.shell-integration
bitty inspect config font.size
bitty inspect protocol kitty-graphics
```

### 开发者工具 (`bitty dev`)

无头追踪、帧捕获、输入合成、转储与渲染覆层（本地；部分动词需要 `dev-tools` cargo feature）：

```bash
bitty dev trace <startup|latency> [--iterations N]
bitty dev capture [--layout single|split|stack|overlay]
bitty dev synthesize
bitty dev dump <grid|scene|atlas> [--rows N] [--cols N]
bitty dev overlay <list|show <damage|cells|glyphs|images|layout|banner>>
```

### 插件管理 (`bitty plugin`)

本地插件记录管理（绝不加载插件 VM）：

```bash
# 列出已记录与已安装插件、来源与能力授予
bitty plugin list

# 安装内置插件 id、本地目录包、git 来源或本地压缩包
bitty plugin install <id> [--yes]
bitty plugin install <path> [--yes]
bitty plugin install <git-url> [--yes]
bitty plugin install <archive> [--yes]

# 移除记录（内置：删除条目；已安装：删除树）
bitty plugin remove <id> --force

# 不删除记录的前提下重新启用 / 禁用
bitty plugin enable <id>
bitty plugin disable <id>

# 不删除记录的前提下撤销授予（全部或单个能力）
bitty plugin revoke <id> [--cap <capability>]

# 显示单个插件的清单与已记录授予
bitty plugin info <id>
```

> [!NOTE]
> `install` 接受四种来源形式：内置插件 **id**、本地**路径/目录**包、**git URL**（精确为 `https://<host>/<path>.git`、`git+https://…` 或 `git@<host>:<path>`），或本地**压缩包**（`.tar.gz`/`.tgz`/`.tar.zst`/`.zip`）。git 与压缩包来源会经由同一套本地路径流水线完成暂存；不支持的方案（`file://`、`http://`、`ssh://` 等）会以具名诊断失败关闭。见 [bitty#1901](https://github.com/bitty-terminal/bitty/issues/1901)。

git 安装使用系统的 `git`；压缩包安装使用 `tar`（`.tar.zst` 需要 `unzstd`）或 `unzip`。所需工具必须在 `PATH` 上；工具缺失或拉取/解压失败会中止安装。git checkout 与解压出的目录会和本地目录包一样，经过同一套清单、兼容性、哈希与能力同意检查。安装期间不运行任何插件代码。

能力安装时提示 `Grant these capabilities? [y/N]`；`--yes` 以非交互方式批准。授权绑定到精确的清单哈希，新增能力始终需要重新确认。

### 原生扩展管理 (`bitty extension`)

管理进程外上游扩展二进制（用户 `$XDG_DATA_HOME/bitty/extensions/` 优先于系统路径；SHA-256 摘要校验）。`component` 是 `extension` 的隐藏已弃用别名（同一处理逻辑，至少保留至 0.1.0），绝不出现在帮助文本中。

```bash
# 列出已安装的扩展及其二进制摘要
bitty extension list

# 仅从本地路径暂存扩展（不下载）
bitty extension add /usr/local/bin/bitty-net

# 拉取一个经哈希校验的 R2 预构建版本（显式确认，TOFU 锁定）
# 省略 --version 即取本机可用的最新目录版本
bitty extension install graphics
# 精确锁定（脚本推荐）
bitty extension install graphics --version 0.0.24
bitty extension install net --version 0.0.1

# 接受仓库风格名称别名（bitty-graphics -> graphics）
bitty extension install bitty-graphics --version 0.0.24

# 移除用户层扩展（绝不触碰系统层）
bitty extension remove net

# 打印精确锁定的可执行文件字节（来源信息输出至 stderr）
bitty extension show-source net
```

### 直接调用 (`bitty cmd`)

```bash
# 按限定 id 直接调用任意注册可执行体（自动化逃生舱）
bitty cmd core.terminal.text --format json -- '{"terminal_id": "t:4"}'
```

### 插件命名空间 (`bitty x`)

```bash
# 无需别名再生，直接寻址已安装插件命令
bitty x <publisher>.<name> <command> [args]
bitty x <id> --help
```

### Shell 补全脚本生成 (`bitty completion`)

别名：`bitty comp`。支持的 Shell：`bash`、`zsh`、`fish`、`powershell`、`nushell`（`nu`）。

```bash
# 生成 Shell 补全脚本
bitty completion bash > ~/.bash_completion.d/bitty
bitty completion zsh > ~/.zfunc/_bitty
bitty completion fish > ~/.config/fish/completions/bitty.fish
```

### Shell 集成 (`bitty shell-init`)

输出 prompt hook（OSC 7 cwd + OSC 133 标记）与补全装配。Shell 列表同 `completion`。

```bash
bitty shell-init bash
```

### 帮助 (`bitty help`)

在不启动任何程序的前提下打印帮助（本地命令，无需实例）。与 `--help` 相同的 16 个规范命令名；`cfg`/`ls`/`comp` 别名解析为其规范命令，`component` 是 `extension` 的隐藏已弃用别名。

```bash
# 精简概览（与 `bitty --help` 完全一致）
bitty help

# 单命令详情（与 `bitty <command> --help` 完全一致）
bitty help plugin
bitty help ctl
```

### 版本 (`bitty version`)

```bash
bitty version
bitty version --format json
```
