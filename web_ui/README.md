# Web Remote Monitor 使用指南

## 概述
Web Remote Monitor 是原始桌面版 remoteMonitor.py 的Web浏览器版本，提供相同的功能但通过网页界面访问。

## 功能特性

### 🎯 核心功能
- **实时Agent监控**: 显示所有连接的Agent状态
- **Agent选择**: 点击"Select"按钮选择/取消选择Agent
- **命令模式切换**: 点击"Sync/Local"按钮切换命令模式
- **子系统控制**: 启动/停止各个子系统

### 🔧 技术栈
- **后端**: Flask + SocketIO (实时通信)
- **前端**: Bootstrap + JavaScript (响应式UI)
- **通信**: MQTT (与av_ui系统通信)

## 启动步骤

### 1. 安装依赖
```bash
cd /home/nissan/Documents/nrc_av_ui
pip3 install flask flask-socketio eventlet
```

### 2. 启动Web服务器
```bash
# 使用默认localhost broker
./web_ui/start_web_ui.sh

# 或指定不同的broker
./web_ui/start_web_ui.sh emqx

# 或直接运行Python脚本
python web_ui/app.py --broker localhost
```

### 3. 打开浏览器
访问: `http://localhost:5000`

## 界面说明

### Agent状态卡片
每个Agent显示为一个卡片，包含：
- **Agent名称**: 显示在卡片顶部
- **选择状态**: 蓝色边框表示已选中
- **控制按钮**: 
  - `Select`: 选择/取消选择Agent
  - `Sync/Local`: 切换命令模式
- **子系统列表**: 每个子系统显示状态和控制按钮

### 子系统控制
- **绿色"Start"按钮**: 启动停止的子系统
- **橙色"Stop"按钮**: 停止运行的子系统
- **状态指示**: 
  - 绿色文字 = 运行中
  - 红色文字 = 已停止

## 故障排除

### 连接问题
1. **检查MQTT broker是否运行**
   ```bash
   # 检查本地broker
   mosquitto_pub -h localhost -t test -m "hello"
   ```

2. **检查Web服务器日志**
   ```bash
   # 启动时查看控制台输出
   python web_ui/app.py --broker localhost
   ```

3. **检查浏览器控制台**
   - 按F12打开开发者工具
   - 查看Console标签页的错误信息

### UI问题
1. **按钮无响应**: 检查WebSocket连接状态
2. **Agent不显示**: 确保av_ui系统正在运行
3. **状态不更新**: 检查MQTT消息是否正常

## 开发说明

### 文件结构
```
web_ui/
├── app.py              # 主服务器文件
├── templates/
│   └── index.html      # 前端模板
├── static/             # 静态资源
├── start_web_ui.sh     # 启动脚本
└── test_ui.py          # 测试脚本
```

### 关键配置
- **更新频率**: 
  - 后台: 500ms
  - 前端: 1000ms
- **端口**: 5000
- **WebSocket**: 支持实时双向通信

## 与桌面版对比

| 功能 | 桌面版 | Web版 |
|------|--------|-------|
| Agent监控 | ✅ | ✅ |
| 子系统控制 | ✅ | ✅ |
| 命令模式 | ✅ | ✅ |
| 世界模型视图 | ✅ | 🚧 (规划中) |
| 遥控功能 | ✅ | 🚧 (规划中) |
| 多用户访问 | ❌ | ✅ |
| 跨平台 | ❌ | ✅ |

## 技术细节

### 后端架构
- **事件驱动**: 使用eventlet处理并发
- **线程安全**: 使用锁机制保护共享资源
- **MQTT集成**: 复用原有CloudConnection类

### 前端架构
- **响应式设计**: 适配不同屏幕尺寸
- **实时更新**: WebSocket自动更新状态
- **用户体验**: 按钮禁用防止重复操作

## 更新日志

### v1.0 (当前版本)
- ✅ 基本Agent监控功能
- ✅ 子系统控制
- ✅ 实时状态更新
- ✅ 稳定的按钮交互
- ✅ 移除按钮闪烁问题

### 计划功能
- 🔄 世界模型可视化
- 🔄 遥控操作界面
- 🔄 历史数据查看
- 🔄 多用户权限管理