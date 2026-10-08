# 故障排查与安全模式 (Troubleshooting & Safe Mode)

本指南提供 Bitty 的排错诊断流程、自检命令以及恢复策略。

## 应急安全模式 (`--safe`)

如果新安装的插件、配置文件语法错误或不兼容的硬件状态导致 Bitty 无法正常启动，请以**安全模式 (Safe Mode)** 启动：

```bash
bitty --safe
```

### 安全模式的行为特点

- **禁用所有插件**：完全忽略所有第三方插件，不实例化任何 Lua 虚拟机。
- **强制使用内置默认值**：绕过用户的 `init.lua`，Bitty 直接采用编译内置的兜底默认配置启动。
- **挂起文件监听**：临时停用动态文件监听器与后台重新加载钩子。

安全模式允许你正常打开终端会话，定位出错的配置文件或移除损坏的插件，避免 GUI 崩溃闪退。

---

## 离线校验配置文件

在重新加载终端前，可以在不启动图形界面的情况下离线验证 Lua 配置文件：

```bash
bitty ctl config check
```

- 若所有语法与 Schema 字段均合法，返回退出码 `0`。
- 若解析或校验失败，输出具体的行号、列偏移量与错误描述。

---

## 插件诊断自检 (`bitty plugin doctor`)

当插件行为异常、运行迟缓或丢失事件时，运行 `bitty plugin doctor`：

```bash
bitty plugin doctor
```

### 诊断输出核心内容

1. **内存与燃料**：汇报每个插件 VM 相对 32 MiB 上限的活动堆内存占用以及指令燃料消耗计数。
2. **事件队列**：突出显示因事件消费过慢而导致的丢弃事件（缓冲区溢出指标）。
3. **工具依赖**：对照用户宿主环境检查声明的 `[tools.*]` 依赖（如 `git`, `rg`, `fd`），并报告缺失的二进制程序或版本不匹配。

---

## 日志文件与详细程度

Bitty 依据操作系统规范将结构化诊断日志写入磁盘：

- **Linux / BSD**：`$XDG_STATE_HOME/bitty/bitty.log`（默认为 `~/.local/state/bitty/bitty.log`）
- **macOS**：`~/Library/Logs/bitty/bitty.log`

### 提高日志详细程度

从现有 Shell 启动时设置 `RUST_LOG` 环境变量：

```bash
RUST_LOG=bitty=debug,bitty_runtime=trace bitty
```

---

## GPU 与渲染后备方案 (GPU Fallbacks)

Bitty 基于 `wgpu` 自动选择可用的最快原生图形后端（Linux 下为 Vulkan，macOS 下为 Metal）。

如果你的环境缺乏硬件 GPU 加速（例如在虚拟机或纯软件渲染的容器内）：

```bash
# 强制回退至 OpenGL 后端
WGPU_BACKEND=gl bitty

# 强制选择低功耗 GPU 适配器
WGPU_POWER_PREF=low bitty
```
