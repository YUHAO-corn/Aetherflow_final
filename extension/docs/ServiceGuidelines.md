# AetherFlow服务层使用指南

## 概述

本文档旨在解决项目中服务层存在的冗余问题，明确哪些服务应该使用，哪些服务已废弃。AetherFlow项目的服务层有一些重叠实现：

- `src/services/optimize/` - 优化服务的一个实现
- `src/services/optimizationService.ts` - 优化服务的另一个实现
- 已删除的空目录 `src/services/optimization/`

为确保项目稳定和一致性，请遵循以下指南。

## 活跃使用的服务

### 1. 优化服务

| 服务名称 | 文件路径 | 用途 | 使用位置 |
|---------|---------|------|---------|
| optimizationService | src/services/optimizationService.ts | 提供提示词优化功能 | src/pages/sidepanel/components/App.tsx |

### 2. 提示词服务

| 服务名称 | 文件路径 | 用途 |
|---------|---------|------|
| promptService | src/services/prompt/ | 提示词管理相关功能 |

### 3. 存储服务

| 服务名称 | 文件路径 | 用途 |
|---------|---------|------|
| storageService | src/services/storage/ | 本地数据存储和管理 |

### 4. 消息服务

| 服务名称 | 文件路径 | 用途 |
|---------|---------|------|
| messagingService | src/services/messaging/ | 扩展内部通信 |

### 5. 内容服务

| 服务名称 | 文件路径 | 用途 |
|---------|---------|------|
| contentService | src/services/content/ | 内容脚本相关功能 |

### 6. 导出服务

| 服务名称 | 文件路径 | 用途 |
|---------|---------|------|
| exportService | src/services/export/ | 数据导出功能 |

## 废弃服务 (@deprecated)

以下服务应视为废弃，不应在新代码中引用：

| 服务名称 | 文件路径 | 备注 |
|---------|---------|------|
| optimize | src/services/optimize/ | 使用 src/services/optimizationService.ts 替代 |

## 服务层使用最佳实践

1. **单一职责**：每个服务应当专注于一个功能域
2. **接口一致**：通过index.ts导出统一接口
3. **类型安全**：使用TypeScript类型定义确保类型安全
4. **错误处理**：统一的错误处理方式
5. **服务组织**：
   - 按功能域组织服务
   - 服务实现应放在对应目录中
   - 避免创建与现有服务重叠的新服务

## 添加新服务的步骤

1. **检查现有服务**：首先确认是否已有类似功能的服务
2. **确定放置位置**：按功能域确定应该放在哪个目录
3. **创建类型定义**：在types.ts中定义接口和类型
4. **实现核心逻辑**：在actions.ts或具体文件中实现功能
5. **导出统一接口**：通过index.ts导出公共API
6. **编写测试**：为新服务添加测试用例
7. **更新文档**：在本文档中添加新服务信息

## 长期改进计划

未来可能进行的重构：

1. 统一优化服务实现，解决optimize和optimizationService重叠问题
2. 强化服务层的错误处理和日志记录
3. 添加性能监控和优化
4. 完善服务间的依赖注入机制

## 注意事项

- 请勿删除任何现有服务，即使它们被标记为废弃
- 更改服务时确保进行充分测试
- 如有疑问，参考项目文档或咨询团队成员 