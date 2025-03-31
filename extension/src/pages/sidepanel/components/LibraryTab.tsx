import React, { useState, useEffect } from 'react';
import { Search, Copy, Trash2, Plus, ArrowDownUp, Star } from 'lucide-react';
import { Input } from '../../../components/common/Input';
import { Card } from '../../../components/common/Card';
import { LoadingIndicator } from '../../../components/common/LoadingIndicator';
import { PromptFormModal } from './PromptFormModal';
import { PromptDetailDrawer } from './PromptDetailDrawer';
import { Prompt } from '../../../services/prompt/types';
import { Menu, MenuItem } from '../../../components/common/Menu';
import { usePromptsData } from '../../../hooks/usePromptsData';

type SortOption = 'updatedDesc' | 'updatedAsc' | 'createdDesc' | 'createdAsc' | 'useCount';

export function LibraryTab() {
  const { 
    loading: apiLoading, 
    prompts: apiPrompts, 
    incrementUseCount, 
    deletePrompt, 
    toggleFavorite,
    searchPrompts
  } = usePromptsData();
  
  // 状态管理
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredPrompts, setFilteredPrompts] = useState<Prompt[]>([]);
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | undefined>(undefined);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<Prompt | undefined>(undefined);
  const [sortOption, setSortOption] = useState<SortOption>('updatedDesc');
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 使用API数据
  const prompts = apiPrompts;
  
  // 获取并过滤提示词
  useEffect(() => {
    const getPrompts = async () => {
      try {
        setLoading(true);
        // 获取提示词
        const allPrompts = await searchPrompts({
          searchTerm: searchTerm,
          sortBy: mapSortOptionToApiSortBy(sortOption),
          onlyFavorites: true // 确保只显示收藏的提示词
        });
        
        setFilteredPrompts(allPrompts);
        setLoading(false);
      } catch (error) {
        console.error('获取提示词失败:', error);
        setError('获取提示词失败，请稍后重试');
        setLoading(false);
      }
    };
    
    getPrompts();
  }, [searchTerm, sortOption, searchPrompts]);
  
  // 排序提示词
  const sortPrompts = (prompts: Prompt[], option: SortOption): Prompt[] => {
    const sorted = [...prompts];
    
    switch (option) {
      case 'updatedDesc':
        return sorted.sort((a, b) => b.updatedAt - a.updatedAt);
      case 'updatedAsc':
        return sorted.sort((a, b) => a.updatedAt - b.updatedAt);
      case 'createdDesc':
        return sorted.sort((a, b) => b.createdAt - a.createdAt);
      case 'createdAsc':
        return sorted.sort((a, b) => a.createdAt - b.createdAt);
      case 'useCount':
        return sorted.sort((a, b) => (b.useCount || 0) - (a.useCount || 0));
      default:
        return sorted;
    }
  };
  
  // 获取排序选项显示名称
  const getSortOptionName = (option: SortOption): string => {
    switch (option) {
      case 'updatedDesc': return '编辑时间（新→旧）';
      case 'updatedAsc': return '编辑时间（旧→新）';
      case 'createdDesc': return '创建时间（新→旧）';
      case 'createdAsc': return '创建时间（旧→新）';
      case 'useCount': return '使用频率';
      default: return '默认排序';
    }
  };
  
  // 处理复制提示词
  const handleCopy = (id: string, content: string) => {
    navigator.clipboard.writeText(content);
    // 增加使用次数，使用新方法
    incrementUseCount(id);
  };
  
  // 处理查看提示词详情
  const handleViewDetail = (prompt: Prompt) => {
    setSelectedPrompt(prompt);
    setIsDetailOpen(true);
  };
  
  // 处理编辑提示词
  const handleEdit = (prompt: Prompt) => {
    // 不再打开模态框，仅在直接编辑时透过updatePromptHook更新提示词数据
    console.log('Prompt edited:', prompt.id);
  };
  
  // 处理添加新提示词
  const handleAddNew = () => {
    setEditingPrompt(undefined);
    setIsFormOpen(true);
  };
  
  // 处理删除提示词
  const handleDelete = async (id: string) => {
    if (window.confirm('确定要取消收藏这个提示词吗？')) {
      // 调用API删除
      await deletePrompt(id);
    }
  };
  
  // 关闭详情抽屉
  const handleCloseDetail = () => {
    setIsDetailOpen(false);
    setSelectedPrompt(undefined);
  };
  
  // 关闭表单模态框
  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingPrompt(undefined);
  };

  // 处理收藏切换
  const handleToggleFavorite = async (promptId: string, isFavorited: boolean) => {
    if (isFavorited) {
      // 如果已收藏，则显示确认对话框
      if (window.confirm('确定要移出收藏夹吗？')) {
        await toggleFavorite(promptId);
      }
    } else {
      // 如果未收藏，直接收藏
      await toggleFavorite(promptId);
    }
  };
  
  // 格式化内容预览，保留原始格式
  const formatContentPreview = (content: string) => {
    // 仅去除多余的空行，保留正常换行
    return content.replace(/\n{3,}/g, '\n\n');
  };
  
  // 限制卡片标题长度，最多24个字节
  const formatTitle = (title: string) => {
    return title.length > 24 ? title.substring(0, 21) + '...' : title;
  };

  // 映射排序选项到API排序类型
  const mapSortOptionToApiSortBy = (option: SortOption): 'usage' | 'favorite' | 'time' | 'alphabetical' | 'relevance' | undefined => {
    switch (option) {
      case 'useCount':
        return 'usage';
      case 'updatedDesc':
      case 'updatedAsc':
      case 'createdDesc':
      case 'createdAsc':
        return 'time';
      default:
        return 'time';
    }
  };

  return (
    <div className="p-4">
      {/* 搜索栏和操作按钮 */}
      <div className="mb-4 flex items-center space-x-2">
        <div className="relative flex-1">
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="搜索提示词..."
            icon={<Search size={16} />}
          />
        </div>
        
        {/* 添加提示词按钮 - 轻量级无文字 */}
        <button
          onClick={handleAddNew}
          className="p-2 bg-magic-700 hover:bg-magic-600 rounded-md text-magic-200 transition-colors"
          title="添加至收藏夹"
        >
          <Plus size={18} />
        </button>
        
        {/* 排序按钮 - 轻量级无文字 */}
        <div className="relative">
          <button
            onClick={() => setIsSortMenuOpen(!isSortMenuOpen)}
            className="p-2 bg-magic-700 hover:bg-magic-600 rounded-md text-magic-200 transition-colors"
            title={`排序：${getSortOptionName(sortOption)}`}
          >
            <ArrowDownUp size={18} />
          </button>
          
          {/* 排序菜单 */}
          <Menu isOpen={isSortMenuOpen} onClose={() => setIsSortMenuOpen(false)}>
            <MenuItem 
              selected={sortOption === 'updatedDesc'} 
              onClick={() => { setSortOption('updatedDesc'); setIsSortMenuOpen(false); }}
            >
              编辑时间（新→旧）
            </MenuItem>
            <MenuItem 
              selected={sortOption === 'updatedAsc'} 
              onClick={() => { setSortOption('updatedAsc'); setIsSortMenuOpen(false); }}
            >
              编辑时间（旧→新）
            </MenuItem>
            <MenuItem 
              selected={sortOption === 'createdDesc'} 
              onClick={() => { setSortOption('createdDesc'); setIsSortMenuOpen(false); }}
            >
              创建时间（新→旧）
            </MenuItem>
            <MenuItem 
              selected={sortOption === 'createdAsc'} 
              onClick={() => { setSortOption('createdAsc'); setIsSortMenuOpen(false); }}
            >
              创建时间（旧→新）
            </MenuItem>
            <MenuItem 
              selected={sortOption === 'useCount'} 
              onClick={() => { setSortOption('useCount'); setIsSortMenuOpen(false); }}
            >
              使用频率
            </MenuItem>
          </Menu>
        </div>
      </div>

      {/* 加载状态 */}
      {(loading || apiLoading) && (
        <div className="flex justify-center my-8">
          <LoadingIndicator />
        </div>
      )}

      {/* 提示词列表 */}
      {!loading && !apiLoading && (
        <div className="space-y-3">
          {filteredPrompts.length === 0 ? (
            <div className="text-center text-magic-400 py-8">
              {searchTerm ? "没有找到匹配的提示词" : "收藏夹为空"}
            </div>
          ) : (
            filteredPrompts.map(prompt => (
              <Card
                key={prompt.id}
                onClick={() => handleViewDetail(prompt)}
              >
                {/* 卡片内容 */}
                <div className="relative">
                  {/* 标题和操作按钮部分 */}
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-medium text-magic-300 truncate">
                      {formatTitle(prompt.title)}
                    </h3>
                    
                    {/* 操作按钮，默认隐藏，hover时显示 */}
                    <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          const isFavorited = prompt.isFavorite || prompt.favorite || false;
                          handleToggleFavorite(prompt.id, isFavorited);
                        }}
                        className="p-1.5 hover:bg-magic-700/50 rounded-full transition-all duration-300 transform hover:scale-110"
                        title={prompt.isFavorite || prompt.favorite ? "移出收藏夹" : "加入收藏夹"}
                      >
                        <Star size={14} className={prompt.isFavorite || prompt.favorite ? "text-yellow-400 fill-yellow-400" : "text-magic-400"} />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopy(prompt.id, prompt.content);
                        }}
                        className="p-1.5 hover:bg-magic-700/50 rounded-full transition-all duration-300 transform hover:scale-110"
                        title="复制提示词内容"
                      >
                        <Copy size={14} className="text-magic-400" />
                      </button>
                    </div>
                  </div>
                  
                  {/* 提示词内容 */}
                  <p className="text-xs text-magic-200 mb-3 relative z-10 whitespace-pre-line break-words line-clamp-6">
                    {formatContentPreview(prompt.content)}
                  </p>
                  
                  {/* 底部元信息 */}
                  <div className="text-xs text-magic-500 flex justify-between mt-2">
                    <span>
                      使用次数: {prompt.useCount || 0}
                    </span>
                    <span>
                      {new Date(prompt.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* 提示词详情抽屉 */}
      {selectedPrompt && (
        <PromptDetailDrawer
          isOpen={isDetailOpen}
          prompt={selectedPrompt}
          onClose={handleCloseDetail}
          onEdit={() => {
            setEditingPrompt(selectedPrompt);
            setIsFormOpen(true);
            setIsDetailOpen(false);
          }}
        />
      )}

      {/* 提示词表单模态框 */}
      <PromptFormModal
        isOpen={isFormOpen}
        prompt={editingPrompt}
        onClose={handleCloseForm}
      />
    </div>
  );
} 