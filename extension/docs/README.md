# AetherFlow项目文档

## 项目介绍

AetherFlow是一款Chrome浏览器扩展，用于管理和优化AI提示词。它允许用户快速调用存储的提示词、建立个人提示词库，并通过大语言模型API分析和改进提示词质量。

## 文档导航

### 架构文档

- [组件使用指南](ComponentGuidelines.md) - 明确项目中组件的使用规范与废弃状态
- [服务层使用指南](ServiceGuidelines.md) - 明确项目中服务的使用规范与废弃状态
- [数据层架构](DataLayerArchitecture.md) - 数据层设计与实现

### 开发指南

- [避免重复造轮子](../架构文档-Aetherflow/补充文档/入门引导补充-避免重复造轮子.md) - 如何有效利用现有代码
- [统一数据层实现指南](../架构文档-Aetherflow/补充文档/统一数据层实现指南.md) - 数据层实现详细指南

## 项目结构

```
extension/src/
├── assets/           # 静态资源
├── background/       # 后台脚本
├── components/       # 组件库
│   ├── common/       # 通用基础组件（活跃使用）
│   ├── library/      # 提示词库组件（已废弃）
│   ├── navigation/   # 导航组件（部分使用）
│   └── optimize/     # 优化组件（已废弃）
├── content/          # 内容脚本
├── hooks/            # React钩子
├── pages/            # 页面入口
│   └── sidepanel/    # 侧边栏页面（主要活跃代码）
│       └── components/ # 侧边栏组件（活跃使用）
├── services/         # 服务层
│   ├── content/      # 内容服务
│   ├── export/       # 导出服务
│   ├── messaging/    # 消息服务
│   ├── optimize/     # 优化服务（已废弃）
│   ├── prompt/       # 提示词服务
│   └── storage/      # 存储服务
│   └── optimizationService.ts # 优化服务（活跃使用）
├── types/            # 全局类型定义
└── utils/            # 工具函数
```

## 构建入口

项目使用Webpack构建，有三个主要入口点：

1. `background` - 后台脚本入口 (`src/background/index.ts`)
2. `content` - 内容脚本入口 (`src/content/index.ts`)
3. `sidepanel` - 侧边栏入口 (`src/pages/sidepanel/index.tsx`)

## 近期清理工作

我们已完成以下清理工作：

1. 删除了未使用的入口文件 `src/main.tsx`
2. 删除了未使用的组件 `src/App.tsx`
3. 删除了备份文件 `src/pages/sidepanel/components/Navigation.old.tsx`
4. 删除了空目录 `src/services/optimization/`

## 开发注意事项

- 请参照[组件使用指南](ComponentGuidelines.md)和[服务层使用指南](ServiceGuidelines.md)确定应使用哪些组件和服务
- 请勿删除标记为废弃的组件或服务，以确保项目稳定性
- 添加新功能时优先考虑复用现有组件和服务
- 有任何疑问，请参考文档或咨询团队成员 