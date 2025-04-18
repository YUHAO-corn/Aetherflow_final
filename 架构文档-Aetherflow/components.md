# AetherFlow Component Documentation

## Table of Contents

1. [Common Components](#common-components)
   - [Button](#button)
   - [Card](#card)
   - [ErrorBoundary](#error-boundary)
   - [ErrorMessage](#error-message)
   - [HoverEffect](#hover-effect)
   - [Input](#input)
   - [LoadingIndicator](#loading-indicator)
   - [MagicParticles](#magic-particles)
   - [Modal](#modal)
   - [Shimmer](#shimmer)
   - [Toast](#toast)

2. [Navigation Components](#navigation-components)
   - [Header](#header)
   - [Navigation](#navigation)
   - [Footer](#footer)

3. [Feature Components](#feature-components)
   - [LibraryTab](#library-tab)
   - [OptimizeTab](#optimize-tab)

4. [Application Structure](#application-structure)
   - [App](#app)
   - [AppContext](#app-context)

5. [Hooks](#hooks)
   - [useAppContext](#use-app-context)

## Common Components

### Button
**Description**: 一个多功能按钮组件，支持多种变体和状态。

**Props**:
- `variant`: 'primary' | 'secondary' (默认: 'primary')
- `loading`: boolean (默认: false)
- `icon`: React.ReactNode
- `fullWidth`: boolean (默认: false)
- 其他所有标准按钮 HTML 属性

**Usage Example**:
```tsx
<Button 
  variant="primary"
  loading={isLoading}
  icon={<Sparkles size={16} />}
  onClick={handleOptimize}
  fullWidth
>
  开始优化
</Button>
```

### Card
**Description**: 一个带有悬停效果和可选操作的容器组件。

**Props**:
- `title`: string (可选)
- `children`: React.ReactNode
- `actions`: React.ReactNode (可选)
- `className`: string (可选)
- `onClick`: () => void (可选)

**Usage Example**:
```tsx
<Card
  actions={
    <button onClick={handleCopy}>
      <Copy size={14} className="text-magic-400" />
    </button>
  }
>
  <p className="text-sm text-magic-200">提示词内容</p>
</Card>
```

### ErrorBoundary
**Description**: 错误边界组件，用于捕获子组件树中的 JavaScript 错误，并渲染备用 UI。

**Props**:
- `children`: React.ReactNode
- `fallback`: React.ReactNode (可选，自定义错误UI)

**Usage Example**:
```tsx
<ErrorBoundary>
  <ComponentThatMightError />
</ErrorBoundary>
```

### ErrorMessage
**Description**: 错误消息提示组件，用于显示错误信息。

**Props**:
- `message`: string
- `onClose`: () => void (可选)
- `className`: string (可选)

**Usage Example**:
```tsx
<ErrorMessage 
  message="操作失败，请稍后重试"
  onClose={() => setError(null)}
/>
```

### HoverEffect
**Description**: 一个为子元素添加悬停动画效果的包装组件。

**Props**:
- `children`: React.ReactNode
- `className`: string (可选)

**Usage Example**:
```tsx
<HoverEffect>
  <div>带悬停效果的内容</div>
</HoverEffect>
```

### Input
**Description**: 增强型输入组件，支持图标和错误处理。

**Props**:
- `icon`: React.ReactNode (可选)
- `error`: string (可选)
- 所有标准输入框 HTML 属性

**Usage Example**:
```tsx
<Input
  icon={<Search size={16} />}
  placeholder="搜索提示词..."
  value={searchTerm}
  onChange={handleSearchChange}
  error={validationError}
/>
```

### LoadingIndicator
**Description**: 一个可定制大小的加载指示器组件。

**Props**:
- `size`: 'sm' | 'md' | 'lg' (默认: 'md')
- `className`: string (可选)

**Usage Example**:
```tsx
<LoadingIndicator size="sm" />
```

### MagicParticles
**Description**: 创建动画粒子效果的装饰组件。

**Props**: 无

**Usage Example**:
```tsx
<div className="relative">
  <MagicParticles />
  <div>带粒子效果的内容</div>
</div>
```

### Modal
**Description**: 带有背景遮罩和动画的模态对话框组件。

**Props**:
- `isOpen`: boolean
- `onClose`: () => void
- `title`: string
- `children`: React.ReactNode
- `className`: string (可选)

**Usage Example**:
```tsx
<Modal
  isOpen={isSettingsOpen}
  onClose={() => setIsSettingsOpen(false)}
  title="设置"
>
  <div>模态框内容</div>
</Modal>
```

### Shimmer
**Description**: 加载闪烁效果组件。

**Props**:
- `className`: string (可选)

**Usage Example**:
```tsx
<div className="relative">
  <Shimmer />
  <div>带闪烁效果的内容</div>
</div>
```

### Toast
**Description**: 带有成功/错误状态的通知提示组件。

**Props**:
- `message`: string
- `type`: 'success' | 'error'
- `duration`: number (默认: 3000)
- `onClose`: () => void

**Usage Example**:
```tsx
<Toast
  message="修改已成功保存"
  type="success"
  duration={5000}
  onClose={() => setShowToast(false)}
/>
```

## Navigation Components

### Header
**Description**: 应用头部组件，显示应用标题和用户等级。

**Props**:
- `magicianLevel`: number

**Usage Example**:
```tsx
<Header magicianLevel={magicianLevel} />
```

### Navigation
**Description**: 标签页导航组件，用于在应用的不同部分之间切换。

**Props**:
- `activeTab`: 'library' | 'optimize' 
- `onTabChange`: (tab: 'library' | 'optimize') => void

**Usage Example**:
```tsx
<Navigation 
  activeTab={activeTab} 
  onTabChange={setActiveTab} 
/>
```

### Footer
**Description**: 应用底部组件，包含设置按钮。

**Props**: 无

**Usage Example**:
```tsx
<Footer />
```

## Feature Components

### LibraryTab
**Description**: 提示词库主页面组件，显示保存的提示词列表和搜索功能。

**Props**: 无 (使用AppContext获取数据)

**Features**:
- 提示词搜索
- 收藏提示词
- 复制提示词
- 使用次数跟踪
- 提示词列表展示

**Usage Example**:
```tsx
<LibraryTab />
```

### OptimizeTab
**Description**: 提示词优化页面组件，提供优化功能。

**Props**:
- `onLevelUp`: () => void

**Features**:
- 提示词输入
- 提示词优化
- 优化版本历史
- 继续优化选项
- 保存优化结果到库
- 复制优化内容

**Usage Example**:
```tsx
<OptimizeTab onLevelUp={handleLevelUp} />
```

## Application Structure

### App
**Description**: 应用程序根组件，提供全局上下文并组织整体结构。

**Key Components**:
- `AppProvider` - 全局状态提供者
- `AppContent` - 使用全局状态的主要内容区域
- `ErrorBoundary` - 顶级错误处理

**Structure**:
```tsx
function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </ErrorBoundary>
  );
}
```

### AppContext
**Description**: 应用程序状态管理上下文，提供全局状态和操作。

**State**:
- `activeTab`: 当前活动标签
- `magicianLevel`: 用户等级
- `error`: 错误信息
- `prompts`: 提示词库内容
- `isLoading`: 加载状态
- `currentOptimizationInput`: 当前优化输入
- `optimizationVersions`: 优化版本历史

**Actions**:
- `setActiveTab`: 切换活动标签
- `incrementMagicianLevel`: 增加用户等级
- `setError`: 设置错误信息
- `searchPrompts`: 搜索提示词
- `incrementPromptUse`: 增加提示词使用次数
- `toggleFavorite`: 切换提示词收藏状态
- `setOptimizationInput`: 设置优化输入
- `startOptimization`: 开始优化
- `continueOptimization`: 继续优化
- `addPrompt`: 添加提示词到库

## Hooks

### useAppContext
**Description**: 用于访问应用全局状态和操作的自定义Hook。

**Returns**:
- `state`: 全局应用状态
- 各种状态操作方法

**Usage Example**:
```tsx
const { 
  state, 
  setActiveTab, 
  incrementMagicianLevel, 
  setError 
} = useAppContext();
```

## Best Practices

1. **状态管理**
   - 使用AppContext进行全局状态管理
   - 使用本地状态处理组件内部UI状态
   - 实现适当的加载和错误状态

2. **性能优化**
   - 为搜索操作实现防抖
   - 使用React.memo()优化频繁重渲染的组件
   - 使用正确的依赖数组优化重渲染

3. **错误处理**
   - 使用ErrorBoundary捕获意外错误
   - 使用ErrorMessage显示用户反馈
   - 为异步操作实现适当的错误处理

4. **可访问性**
   - 确保适当的ARIA属性
   - 支持键盘导航
   - 保持足够的颜色对比度

5. **Chrome扩展最佳实践**
   - 遵循Chrome的Manifest V3指南
   - 实现组件之间的正确消息传递
   - 适当处理权限

## Version History

### Version 1.0.0
- 初始发布
- 基本提示词管理功能
- 提示词优化功能
- 用户等级系统

### Version 1.0.1 (计划中)
- 增强提示词搜索
- 改进优化算法
- 添加更多提示词模板
- 性能优化