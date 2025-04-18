# AetherFlow组件使用指南

## 概述

本文档旨在解决项目中存在的组件冗余问题，明确哪些组件应该使用，哪些组件已废弃。AetherFlow项目目前存在两套并行的组件体系：

- `src/components/` - 包含按功能域组织的组件
- `src/pages/sidepanel/components/` - 侧边栏实际使用的组件

为确保项目稳定和一致性，请遵循以下指南。

## 活跃使用的组件目录

### 1. 基础通用组件 (`src/components/common/`)

这些组件已被多个地方引用，应该继续使用：

| 组件名称 | 文件路径 | 用途 |
|---------|---------|------|
| Button | src/components/common/Button.tsx | 通用按钮组件 |
| Card | src/components/common/Card.tsx | 卡片容器组件 |
| Input | src/components/common/Input.tsx | 输入框组件 |
| Modal | src/components/common/Modal.tsx | 模态对话框 |
| ErrorBoundary | src/components/common/ErrorBoundary.tsx | 错误边界组件 |
| ErrorMessage | src/components/common/ErrorMessage.tsx | 错误消息显示 |
| LoadingIndicator | src/components/common/LoadingIndicator.tsx | 加载指示器 |
| Menu | src/components/common/Menu.tsx | 下拉菜单组件 |
| Toast | src/components/common/Toast.tsx | 消息提示组件 |
| MarkdownContent | src/components/common/MarkdownContent.tsx | Markdown渲染组件 |

### 2. 导航组件 (`src/components/navigation/`)

以下组件被实际使用：

| 组件名称 | 文件路径 | 用途 |
|---------|---------|------|
| SettingsDrawer | src/components/navigation/SettingsDrawer.tsx | 设置抽屉组件，在sidepanel/App.tsx中引用 |

### 3. 侧边栏组件 (`src/pages/sidepanel/components/`)

这些组件是侧边栏的核心，实际构建使用了这些组件：

| 组件名称 | 文件路径 | 用途 |
|---------|---------|------|
| App | src/pages/sidepanel/components/App.tsx | 侧边栏主应用组件 |
| Navigation | src/pages/sidepanel/components/Navigation.tsx | 导航切换组件 |
| LibraryTab | src/pages/sidepanel/components/LibraryTab.tsx | 提示词库标签页 |
| OptimizeSection | src/pages/sidepanel/components/OptimizeSection.tsx | 提示词优化标签页 |
| PromptDetailDrawer | src/pages/sidepanel/components/PromptDetailDrawer.tsx | 提示词详情抽屉 |
| OptimizationDetailDrawer | src/pages/sidepanel/components/OptimizationDetailDrawer.tsx | 优化详情抽屉 |
| PromptFormModal | src/pages/sidepanel/components/PromptFormModal.tsx | 提示词表单模态框 |
| OptimizationModeSelector | src/pages/sidepanel/components/OptimizationModeSelector.tsx | 优化模式选择器 |
| PromptShortcut | src/pages/sidepanel/components/PromptShortcut.tsx | 提示词快捷方式组件 |
| ApiTest | src/pages/sidepanel/components/ApiTest.tsx | API测试组件 |

## 废弃组件 (@deprecated)

以下组件目前未在构建中使用，应视为废弃，不应在新代码中引用：

| 组件名称 | 文件路径 | 备注 |
|---------|---------|------|
| LibraryTab | src/components/library/LibraryTab.tsx | 使用 src/pages/sidepanel/components/LibraryTab.tsx 替代 |
| PromptDetailDrawer | src/components/library/PromptDetailDrawer.tsx | 使用 src/pages/sidepanel/components/PromptDetailDrawer.tsx 替代 |
| PromptFormModal | src/components/library/PromptFormModal.tsx | 使用 src/pages/sidepanel/components/PromptFormModal.tsx 替代 |
| OptimizeTab | src/components/optimize/OptimizeTab.tsx | 使用 src/pages/sidepanel/components/OptimizeSection.tsx 替代 |
| OptimizationDetailDrawer | src/components/optimize/OptimizationDetailDrawer.tsx | 使用 src/pages/sidepanel/components/OptimizationDetailDrawer.tsx 替代 |
| OptimizationModeSelector | src/components/optimize/OptimizationModeSelector.tsx | 使用 src/pages/sidepanel/components/OptimizationModeSelector.tsx 替代 |
| Navigation | src/components/navigation/Navigation.tsx | 使用 src/pages/sidepanel/components/Navigation.tsx 替代 |
| Header | src/components/navigation/Header.tsx | 在sidepanel中直接实现 |
| Footer | src/components/navigation/Footer.tsx | 在sidepanel中直接实现 |

## 开发新功能的最佳实践

1. **优先使用通用组件**：从`src/components/common/`引入基础UI组件
2. **扩展现有组件**：尽量扩展现有组件而非创建新组件
3. **保持一致性**：遵循项目现有的设计模式和组件接口
4. **文档注释**：为新组件添加JSDoc注释，说明用途和使用方法
5. **组件位置**：
   - 基础UI组件 → `src/components/common/`
   - 特定功能组件 → `src/pages/sidepanel/components/`或相应功能域目录

## 长期改进计划

未来可能进行的重构（需要团队讨论决定）：

1. 统一组件库结构，消除冗余
2. 创建组件风格指南
3. 实现组件故事书(Storybook)，便于组件开发和测试
4. 进一步模块化大型组件，提高可维护性

## 注意事项

- 请勿删除任何现有组件，即使它们被标记为废弃
- 更改组件时确保进行充分测试
- 如有疑问，优先使用`src/pages/sidepanel/components/`中的组件 