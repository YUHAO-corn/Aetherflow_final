# AetherFlow Z-Index 层级设计规范

## 1. 现状评估报告

### 1.1 当前层级使用情况

经过全面的代码审查，AetherFlow项目中z-index的使用存在以下特点：

| 组件类型 | 当前z-index值 | 文件位置 |
|---------|--------------|---------|
| 模态窗口 (Modal/ConfirmDialog) | z-50 | components/common/Modal.tsx |
| 提示词快捷输入 (PromptShortcut) | z-50 | pages/sidepanel/components/PromptShortcut.tsx |
| 抽屉组件 (Drawer系列) | z-30 | pages/sidepanel/components/PromptDetailDrawer.tsx |
| 抽屉背景遮罩 | z-20 | pages/sidepanel/components/SettingsDrawer.tsx |
| 下拉菜单 (Menu) | z-20 | components/common/Menu.tsx |
| 内部内容层 (Card内容) | z-10 | components/common/Card.tsx |
| 认证模态窗口 | z-[100]/z-[110] | pages/sidepanel/components/AuthModal.tsx |
| 内容脚本通知 | z-999999 | content/notification.ts |
| 优化模式选择器 | z-999999 | pages/sidepanel/components/OptimizationModeSelector.tsx |
| 提示词快捷输入悬浮框 | z-10000 | styles/promptShortcut.ts |

### 1.2 主要问题

1. **层级值不一致**：相同功能的组件使用不同的z-index值，比如模态框和认证窗口
2. **魔术数值使用**：使用特定的大数值（如999999）而没有系统化的层级管理
3. **层级冲突**：分析显示部分组件可能存在层级遮挡问题，如弹窗和抽屉同时打开时
4. **缺乏文档**：没有明确的z-index层级设计指南，导致开发者随意设置值
5. **内联样式与类名混用**：有些组件使用内联样式设置z-index，有些使用Tailwind类

## 2. 问题分类清单

### 2.1 层级冲突问题

1. **模态窗口被自定义通知遮挡**
   - 模态窗口使用z-50，而通知使用z-999999
   - 可能影响用户操作体验，特别是重要的确认对话框

2. **抽屉组件与模态窗口的层级关系不明确**
   - 抽屉使用z-30，模态窗口使用z-50
   - 同时打开时遵循预期，但缺乏明确的设计意图

3. **认证窗口与其他UI元素的层级不一致**
   - 认证窗口使用z-[100]/z-[110]，与其他模态窗口不统一

### 2.2 开发规范问题

1. **缺乏命名约定**
   - 直接使用数字值而非语义化变量
   - 不便于维护和理解不同组件的层级关系

2. **重复定义z-index值**
   - 没有集中管理z-index的机制
   - 导致代码冗余和不一致性

3. **缺乏增量管理机制**
   - 没有预留层级空间，难以在现有组件间插入新的层级

### 2.3 实现方式问题

1. **内联样式与Tailwind类混用**
   - 不一致的样式实现方式
   - 增加维护难度并可能导致意外覆盖

2. **过度使用极大值**
   - 使用极大数值（如999999）作为z-index
   - 不符合良好实践，且可能在未来导致层级混乱

## 3. 层级规范提案

### 3.1 基础层级分类

我们建议将z-index划分为以下9个基础层级，每个层级之间预留空间以便未来扩展：

| 层级名称 | 基础值 | 应用场景 |
|---------|-------|---------|
| `z-base` | 0 | 默认层级，普通内容 |
| `z-raised` | 10 | 略微提升的内容（Card内容、相对定位元素） |
| `z-dropdown` | 100 | 下拉菜单和选择器 |
| `z-sticky` | 200 | 粘性头部和导航栏 |
| `z-drawer` | 300 | 侧边抽屉和面板 |
| `z-overlay` | 400 | 背景遮罩层 |
| `z-modal` | 500 | 模态窗口和对话框 |
| `z-notification` | 600 | 通知和提示 |
| `z-highest` | 900 | 最高层级（开发工具、紧急提示） |

### 3.2 子层级划分

每个基础层级可以划分为10个子层级，以处理同类组件之间的层级关系：

```scss
// 示例：模态窗口相关层级
$z-modal-backdrop: 500;    // 模态窗口背景
$z-modal-container: 510;   // 模态窗口容器
$z-modal-content: 520;     // 模态窗口内容
```

### 3.3 跨域层级管理

针对不同上下文环境（主应用、内容脚本、侧边栏等），建立命名空间前缀：

```scss
// 侧边栏上下文
$sidebar-z-modal: 500;

// 内容脚本上下文（注入到页面）
$content-z-notification: 10000; // 较高值以确保在页面任何内容之上
```

### 3.4 CSS变量实现

使用CSS变量统一管理z-index值，便于维护和更新：

```css
:root {
  /* 基础层级 */
  --z-base: 0;
  --z-raised: 10;
  --z-dropdown: 100;
  --z-sticky: 200;
  --z-drawer: 300;
  --z-overlay: 400;
  --z-modal: 500;
  --z-notification: 600;
  --z-highest: 900;
  
  /* 子层级示例 */
  --z-modal-backdrop: 500;
  --z-modal-container: 510;
  --z-modal-content: 520;
  
  /* 跨域层级 */
  --content-z-dropdown: 10100;
  --content-z-notification: 10600;
}
```

## 4. 实施路线图

### 4.1 前期准备

1. **创建层级变量文件**
   - 新建`extension/src/styles/z-index.css`文件
   - 定义所有层级相关的CSS变量
   - 引入到全局样式

2. **建立层级可视化工具**
   - 创建调试模式查看当前页面的所有z-index层级
   - 帮助开发者理解层级关系

### 4.2 分阶段实施

#### 阶段一：核心组件更新（优先级高）

1. **更新模态窗口组件**
   ```jsx
   // 修改前
   <div className="fixed inset-0 bg-magic-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
   
   // 修改后
   <div className="fixed inset-0 bg-magic-900/80 backdrop-blur-sm z-modal flex items-center justify-center p-4">
   ```

2. **更新抽屉组件**
   ```jsx
   // 修改前
   <div className={`fixed inset-y-0 right-0 w-80 ... z-30 ...`}>
   
   // 修改后
   <div className={`fixed inset-y-0 right-0 w-80 ... z-drawer ...`}>
   ```

3. **更新通知组件**
   - 修改内容脚本通知的z-index使用CSS变量

#### 阶段二：其它组件更新（优先级中）

1. **更新下拉菜单和选择器**
2. **更新卡片组件内部z-index**
3. **更新认证相关组件**

#### 阶段三：规范完善（优先级低）

1. **创建z-index设计规范文档**
2. **添加eslint规则检查原生z-index使用**
3. **实现自动化测试检查层级问题**

### 4.3 测试验证方法

1. **视觉回归测试**
   - 对比组件更新前后的视觉效果
   - 确保没有出现新的层级问题

2. **交互测试脚本**
   - 创建自动化交互测试脚本
   - 模拟多个组件同时打开的情况

3. **开发者手动验证**
   - 提供验证清单
   - 关注特定交互场景的层级正确性

### 4.4 兼容性策略

为确保平稳过渡，建议采用以下兼容性策略：

1. **双系统并行**
   - 在一段时间内同时支持旧的数字值和新的CSS变量
   - 逐步完全迁移到CSS变量

2. **自动化迁移工具**
   - 开发工具脚本助力迁移过程
   - 识别和替换现有的z-index值

## 5. 最佳实践建议

1. **始终使用CSS变量而非硬编码值**
   ```jsx
   // 不推荐
   <div style={{ zIndex: 100 }}>...</div>
   
   // 推荐
   <div style={{ zIndex: 'var(--z-dropdown)' }}>...</div>
   // 或使用Tailwind类
   <div className="z-dropdown">...</div>
   ```

2. **遵循层级分类原则**
   - 确保组件使用符合其功能的层级值
   - 避免为临时解决问题而提升层级

3. **记录特殊情况**
   - 对于需要特殊处理的层级关系，添加详细注释
   - 解释为何需要特殊的z-index值

## 6. 实施记录

### 6.1 已完成的文件更新

| 文件路径 | 修改内容 | 实施日期 |
|---------|---------|---------|
| extension/src/styles/z-index.css | 新建文件，定义所有z-index变量 | 2023-05-12 |
| extension/src/index.css | 在顶部导入z-index.css | 2023-05-12 |
| extension/tailwind.config.js | 扩展Tailwind配置，添加z-index变量 | 2023-05-12 |
| extension/src/components/common/Modal.tsx | 将z-50更新为z-modal-backdrop | 2023-05-12 |
| extension/src/components/common/ConfirmDialog.tsx | 将z-50更新为z-modal-backdrop | 2023-05-12 |
| extension/src/components/common/Menu.tsx | 将z-20更新为z-dropdown | 2023-05-12 |
| extension/src/components/common/Card.tsx | 将z-10更新为z-raised | 2023-05-12 |
| extension/src/pages/sidepanel/components/SettingsDrawer.tsx | 将z-20/z-30更新为z-drawer-backdrop/z-drawer-container | 2023-05-12 |
| extension/src/pages/sidepanel/components/PromptDetailDrawer.tsx | 将z-30更新为z-drawer-container | 2023-05-12 |
| extension/src/pages/sidepanel/components/OptimizationDetailDrawer.tsx | 将z-30更新为z-drawer-container | 2023-05-12 |
| extension/src/pages/sidepanel/components/PromptShortcut.tsx | 将z-50更新为content-z-dropdown (使用style属性) | 2023-05-12 |
| extension/src/pages/sidepanel/components/OptimizationModeSelector.tsx | 将z-999999更新为z-dropdown-selector | 2023-05-12 |
| extension/src/pages/sidepanel/components/AuthModal.tsx | 将z-[100]/z-[110]更新为z-auth-backdrop/z-auth-container | 2023-05-12 |
| extension/src/content/notification.ts | 将z-999999更新为content-z-notification | 2023-05-12 |
| extension/src/styles/promptShortcut.ts | 将z-10000更新为content-z-dropdown | 2023-05-12 |

### 6.2 验证结果

所有已更新组件的UI行为和层级关系保持一致，没有发现新的层级冲突问题。验证方式包括：

1. 手动测试各种组件组合：
   - 同时打开抽屉和模态窗口
   - 触发通知消息
   - 在有抽屉的情况下使用下拉菜单

2. 跨浏览器测试：
   - Chrome 113
   - Firefox 112

### 6.3 回滚预案

如发现任何问题，可通过以下步骤回滚更改：

1. 恢复所有修改过的文件到上一个版本
2. 删除新增的z-index.css文件
3. 从index.css中移除对z-index.css的导入
4. 恢复tailwind.config.js中的zIndex配置 