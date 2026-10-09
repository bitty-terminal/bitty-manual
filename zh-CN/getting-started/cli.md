# CLI 命令行参数与控制

Bitty 提供了统一、纯解析的命令行工具链，用于启动终端、检查运行时状态、管理多环境配置（Profile）、配置插件以及驱动外部自动化。

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
| `--opacity <FLOAT>`    | 单次启动 CLI 窗口透明度覆盖（0.0..=1.0，例如 `0.85`）。                            |
| `--safe`               | **安全恢复模式**：禁用所有第三方插件、监听器与用户配置；强制使用内置默认值。       |
| `--fail-loud`          | 若主 Shell 或启动步骤失败则立即以非零状态码中止（调试姿态）。                      |
| `-v, --verbose`        | `--log-level debug` 的简写；在 stderr 输出逐帧渲染 tick 统计。                     |
| `--log-level <LEVEL>`  | 设置 stderr 日志等级（`error`, `warn`, `info`, `debug`, `trace`）。                |
| `--mascot`             | 向标准输出打印吉祥物 Bittie ASCII 艺术字并退出。                                   |
| `--no-splash`          | 抑制首次启动的吉祥物欢迎画面。                                                     |
| `-h, --help`           | 显示命令行参数帮助摘要并退出。                                                     |
| `--version`            | 显示版本号、目标架构及构建元数据。                                                 |

### 布局与分屏参数

在启动时直接进入特定的分屏与布局状态：

| 参数                    | 说明                                                                                       |
| :---------------------- | :----------------------------------------------------------------------------------------- |
| `--split <h\|v>`        | 沿水平或垂直轴分屏启动窗格。                                                               |
| `--split-ratio <FLOAT>` | 设置分屏比例（0.1 至 0.9，例如 `0.5`）。                                                   |
| `--stack`               | 请求堆叠布局模式（Stack Layout）。                                                         |
| `--overlay`             | 请求覆层展示模式（Overlay Presentation）。                                                 |
| `--layout <SPEC>`       | 原始布局规范字符串（例如 `"single"`, `"split:h:0.5"`, `"stack"`, `"overlay:5,5,20,10"`）。 |
| `--focus <TARGET>`      | 初始焦点目标（`"next"`, `"prev"`, `"up"`, `"down"`, `"left"`, `"right"` 或数字索引）。     |

### 无头与测试参数

| 参数          | 说明                                                                   |
| :------------ | :--------------------------------------------------------------------- |
| `--headless`  | 仅执行单次无头渲染冒烟测试，不创建显示服务器窗口直接退出。             |
| `--test-mode` | 启动确定性无头端到端伺服循环，连接至 `BITTY_SOCKET` IPC 接口直至退出。 |

---

## 常用子命令

Bitty 包含完备的一级子命令，用于配置管理、环境诊断及组件维护：

### 配置管理 (`bitty config`)

别名：`bitty cfg`

```bash
# 打印当前生效的配置文件绝对路径
bitty config path

# 离线验证配置文件语法与 Schema 结构，无需启动 GUI
bitty config check

# 使用 $VISUAL 或 $EDITOR 打开当前配置文件
bitty config edit
```

### 初始化向导 (`bitty init`)

交互式终端配置生成向导：

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
```

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

### 插件管理 (`bitty plugin`)

```bash
# 列出已安装插件、清单状态及授予的能力
bitty plugin list

# 运行针对内存占用、指令燃料与事件队列的诊断
bitty plugin doctor

# 从本地目录添加插件
bitty plugin add ./my-plugin

# 移除已安装插件
bitty plugin remove custom.my-plugin
```

### 原生组件管理 (`bitty component`)

管理基于 DIR-030 规范的进程外上游协进程（如 `bitty-net`）：

```bash
# 列出已安装的原生协进程组件及其二进制摘要
bitty component list

# 注册经验证的原生组件二进制程序
bitty component add /usr/local/bin/bitty-net

# 移除已注册的原生组件
bitty component remove net
```

### Shell 补全脚本生成 (`bitty completion`)

别名：`bitty comp`

```bash
# 生成 Shell 补全脚本 (bash, zsh, fish)
bitty completion bash > ~/.bash_completion.d/bitty
bitty completion zsh > ~/.zfunc/_bitty
bitty completion fish > ~/.config/fish/completions/bitty.fish
```
