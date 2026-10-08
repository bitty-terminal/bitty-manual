# CLI 命令与控制

Bitty 提供了一套统一的命令行工具链，用于启动终端、检查运行状态、管理插件以及驱动外部自动化。

## 终端调用 (`bitty`)

主二进制文件负责启动 GUI 窗口并派生 Shell 会话：

```bash
bitty [OPTIONS] [COMMAND [ARGS...]]
```

### 启动选项

| 选项                     | 描述                                                               |
| :----------------------- | :----------------------------------------------------------------- |
| `--config <PATH>`        | 从自定义文件路径加载配置，而非默认的 `$XDG_CONFIG_HOME`。          |
| `--safe`                 | **安全模式**：禁用所有第三方插件与文件监视器；以内置默认参数启动。 |
| `-e, --execute <CMD...>` | 执行指定的命令，替代默认的用户 Shell。                             |
| `--hold`                 | 当子进程退出后保持终端窗口开启。                                   |
| `--title <TITLE>`        | 覆盖初始窗口标题字符串。                                           |
| `-v, --version`          | 显示版本号、Git 提交 SHA 及目标架构。                              |
| `-h, --help`             | 显示命令行参数摘要。                                               |

## 控制客户端 (`bitty ctl`)

`bitty ctl` 子命令用于与正在运行的 Bitty 实例通信，或执行离线静态校验：

```bash
# 在不启动 GUI 的情况下离线校验配置文件
bitty ctl config check

# 校验指定的配置文件
bitty ctl config check --path ~/.config/bitty/test.lua

# 触发原子级的单帧主题热重载
bitty ctl theme reload
```

## 文档查看器 (`bitty doc`)

Bitty 内置了专为终端设计的参考手册查看器，支持在工作流中离线查阅：

```bash
# 打开交互式 TUI 文档浏览器
bitty doc

# 直接阅读指定主题
bitty doc configuration
bitty doc api/ui
```

## 插件管理 (`bitty plugin`)

Bitty 原生管理插件，无需依赖外部包管理器：

```bash
# 列出已安装的插件、激活状态与被授予的能力
bitty plugin list

# 运行诊断检查，分析内存、燃料、事件队列与工具依赖
bitty plugin doctor

# 从本地目录或归档包安装插件
bitty plugin add ./my-plugin

# 移除已安装的插件
bitty plugin remove custom.my-plugin
```

## 原生组件管理 (`bitty component`)

依据 DIR-030（原生组件边界）规范，重量级原生副进程（如 `bitty-net`）通过 `bitty component` 进行管理：

```bash
# 列出已安装的原生组件及其二进制散列摘要
bitty component list

# 注册并验证原生组件二进制文件
bitty component add /usr/local/bin/bitty-net

# 移除已注册的原生组件
bitty component remove net
```
