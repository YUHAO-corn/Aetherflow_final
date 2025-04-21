import React, { useState, useEffect } from 'react';
import { Search, Copy, Trash2, Plus, ArrowDownUp, Star, FileText, Highlighter, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { Input } from '../../../components/common/Input';
import { Card } from '../../../components/common/Card';
import { LoadingIndicator } from '../../../components/common/LoadingIndicator';
import { PromptFormModal } from './PromptFormModal';
import { PromptDetailDrawer } from './PromptDetailDrawer';
import { Prompt } from '../../../services/prompt/types';
import { Menu, MenuItem } from '../../../components/common/Menu';
import { usePromptsData, SortCriteria } from '../../../hooks/usePromptsData';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { calculateByteLength, smartTruncate } from '../../../utils/stringUtils';
import { TITLE_LIMITS } from '../../../utils/constants';

type SortOption = 'createdDesc' | 'createdAsc' | 'useCount';

export function LibraryTab() {
  const { 
    loading,
    prompts,
    incrementUseCount, 
    deletePrompt, 
    toggleFavorite,
    searchPrompts,
    sortCriteria,
    setSortCriteria
  } = usePromptsData();
  
  // 状态管理
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | undefined>(undefined);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<Prompt | undefined>(undefined);
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  
  // 确认对话框状态
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [promptToDelete, setPromptToDelete] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<'delete' | 'unfavorite'>('delete');
  
  // --- State for Expanded Cards ---
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  // --- End of State ---

  // 修正: 添加一个 useEffect 来处理搜索过滤 (如果需要实时过滤)
  const [displayPrompts, setDisplayPrompts] = useState<Prompt[]>(prompts);

  useEffect(() => {
    // 当 searchTerm 变化时，过滤 `prompts` (来自hook，已排序)
    if (searchTerm) {
        // 异步过滤，因为 searchPrompts 是异步的
        searchPrompts({ searchTerm }).then(filtered => {
            setDisplayPrompts(filtered);
        });
    } else {
        // 没有搜索词时，显示所有已排序的 prompts
        setDisplayPrompts(prompts);
    }
  }, [searchTerm, prompts, searchPrompts]);
  
  // 修正: 修改 getSortOptionName，移除 updatedAt 相关逻辑
  const getSortOptionName = (criteria: SortCriteria): string => {
    const { key, order } = criteria;
    if (key === 'createdAt' && order === 'desc') return 'Created Date (New→Old)';
    if (key === 'createdAt' && order === 'asc') return 'Created Date (Old→New)';
    if (key === 'useCount' && order === 'desc') return 'Usage Frequency';
    return 'Created Date (New→Old)'; // 默认显示创建时间
  };

  // 修正: 修改 mapUiOptionToSortCriteria，移除 updatedAt，更新默认值
  const mapUiOptionToSortCriteria = (option: SortOption): SortCriteria => {
    switch (option) {
      case 'createdDesc': return { key: 'createdAt', order: 'desc' };
      case 'createdAsc': return { key: 'createdAt', order: 'asc' };
      case 'useCount': return { key: 'useCount', order: 'desc' };
      default: return { key: 'createdAt', order: 'desc' }; // 新默认值
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
    setPromptToDelete(id);
    setConfirmAction('delete');
    setConfirmDialogOpen(true);
  };
  
  // 确认操作
  const confirmAction1 = async () => {
    if (promptToDelete) {
      if (confirmAction === 'delete') {
        await deletePrompt(promptToDelete);
      } else if (confirmAction === 'unfavorite') {
        await toggleFavorite(promptToDelete);
      }
      setPromptToDelete(null);
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
      setPromptToDelete(promptId);
      setConfirmAction('unfavorite');
      setConfirmDialogOpen(true);
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
  
  // 修改formatTitle函数
  const formatTitle = (title: string) => {
    if (!title) return '';
    
    // 使用统一的字节限制和截断逻辑，不添加省略号
    return smartTruncate(title, TITLE_LIMITS.DISPLAY, false);
  };

  // --- Toggle Card Expansion Function ---
  const toggleCardExpansion = (promptId: string) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(promptId)) {
        newSet.delete(promptId);
      } else {
        newSet.add(promptId);
      }
      return newSet;
    });
  };
  // --- End of Toggle Function ---

  // --- Empty State Component ---
  const renderEmptyState = () => {
    if (searchTerm) {
      // Search returned no results
      return (
        <div className="text-center text-magic-400 py-16 flex flex-col items-center">
          <Search size={48} className="mb-4 text-magic-500" />
          <h3 className="text-lg font-semibold text-magic-300 mb-2">No Prompts Found</h3>
          <p className="text-sm mb-4">Your search for \"{searchTerm}\" did not match any prompts.</p>
          <button 
            onClick={() => setSearchTerm('')} 
            className="px-4 py-2 bg-magic-600 text-white rounded-md hover:bg-magic-500 text-sm transition-colors"
          >
            Clear Search
          </button>
        </div>
      );
    } else {
      // Library is empty (New user guidance)
      return (
        <div className="text-center text-magic-400 py-12 flex flex-col items-center">
          {/* You can replace FileText with a more relevant custom illustration/icon */}
          <FileText size={56} className="mb-6 text-magic-500 opacity-70" /> 
          <h3 className="text-xl font-semibold text-magic-200 mb-3">Your Prompt Library is Empty</h3>
          <p className="text-sm mb-8 max-w-md mx-auto">Start building your collection! Here's how you can add prompts:</p>
          
          <div className="space-y-5 text-left max-w-sm w-full">
            {/* Method 1: Add New */}
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 mt-1 p-1.5 bg-magic-700/50 rounded-full">
                 <Plus size={16} className="text-magic-300" />
              </div>
              <div>
                <h4 className="font-medium text-magic-300 text-sm">Add New Manually</h4>
                <p className="text-xs text-magic-400">Click the <span className="font-bold">+ Add New</span> button above to create a prompt from scratch.</p>
              </div>
            </div>

            {/* Method 2: Capture from Web (Updated) */}
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 mt-1 p-1.5 bg-magic-700/50 rounded-full">
                 {/* Use Highlighter icon or similar for selection step */}
                 <Highlighter size={16} className="text-magic-300" /> 
              </div>
              <div>
                <h4 className="font-medium text-magic-300 text-sm">Capture from Webpage</h4>
                <p className="text-xs text-magic-400">
                  Highlight text on any webpage, then click the 
                  {/* Inline Capture icon */}
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none" className="inline-block mx-1 relative bottom-[-2px]">
                    <path d="m19 21-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>
                    <line x1="12" x2="12" y1="7" y2="13" stroke="var(--aetherflow-toolbar-bg, white)" stroke-width="3"/> 
                    <line x1="9" x2="15" y1="10" y2="10" stroke="var(--aetherflow-toolbar-bg, white)" stroke-width="3"/>
                  </svg> 
                  icon on the toolbar that appears.
                </p>
              </div>
            </div>

             {/* Optional: Add more methods if applicable */}

          </div>
        </div>
      );
    }
  };
  // --- End of Empty State Component ---

  return (
    <div className="px-4 pt-2 pb-4">
      {/* 搜索栏和操作按钮 */}
      <div className="mb-4 flex items-center space-x-2">
        <div className="relative flex-1">
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search prompts..."
            icon={<Search size={16} />}
          />
        </div>
        
        {/* 添加提示词按钮 - 轻量级无文字 */}
        <button
          onClick={handleAddNew}
          className="p-2 bg-magic-700 hover:bg-magic-600 rounded-md text-magic-200 transition-colors"
          title="Add to Library"
        >
          <Plus size={18} />
        </button>
        
        {/* 排序按钮 - 轻量级无文字 */}
        <div className="relative">
          <button
            onClick={() => setIsSortMenuOpen(!isSortMenuOpen)}
            className="p-2 bg-magic-700 hover:bg-magic-600 rounded-md text-magic-200 transition-colors"
            title={`Sort: ${getSortOptionName(sortCriteria)}`}
          >
            <ArrowDownUp size={18} />
          </button>
          
          {/* 排序菜单 */}
          <Menu isOpen={isSortMenuOpen} onClose={() => setIsSortMenuOpen(false)}>
            {/* 修正: 移除 Last Edited 选项 */}
            {/* <MenuItem ... onClick={() => { setSortCriteria(mapUiOptionToSortCriteria('updatedDesc')); ... }}>Last Edited (New→Old)</MenuItem> */}
            {/* <MenuItem ... onClick={() => { setSortCriteria(mapUiOptionToSortCriteria('updatedAsc')); ... }}>Last Edited (Old→New)</MenuItem> */}
            
            {/* 修正: 添加 text-xs 类缩小字体 */}
            <MenuItem 
              className="text-xs" // 添加字体大小类
              selected={sortCriteria.key === 'createdAt' && sortCriteria.order === 'desc'} 
              onClick={() => { setSortCriteria(mapUiOptionToSortCriteria('createdDesc')); setIsSortMenuOpen(false); }}
            >
              Created Date (New→Old)
            </MenuItem>
            <MenuItem 
              className="text-xs" // 添加字体大小类
              selected={sortCriteria.key === 'createdAt' && sortCriteria.order === 'asc'} 
              onClick={() => { setSortCriteria(mapUiOptionToSortCriteria('createdAsc')); setIsSortMenuOpen(false); }}
            >
              Created Date (Old→New)
            </MenuItem>
            <MenuItem 
              className="text-xs" // 添加字体大小类
              selected={sortCriteria.key === 'useCount' && sortCriteria.order === 'desc'} 
              onClick={() => { setSortCriteria(mapUiOptionToSortCriteria('useCount')); setIsSortMenuOpen(false); }}
            >
              Usage Frequency
            </MenuItem>
          </Menu>
        </div>
      </div>

      {/* 加载状态 */}
      {(loading) && (
        <div className="flex justify-center my-8">
          <LoadingIndicator />
        </div>
      )}

      {/* Prompt list or Empty State */}
      {!loading && (
        <div className="space-y-3">
          {displayPrompts.length === 0 ? (
            renderEmptyState()
          ) : (
            displayPrompts.map(prompt => {
              // Check if the current card is expanded
              const isExpanded = expandedCards.has(prompt.id);
              return (
                <Card
                  key={prompt.id}
                  // Keep group class for hover effects on action buttons
                  className="group"
                  // Prevent card click when clicking expand/collapse button
                  onClick={(e) => {
                      // Check if the click target is the expand/collapse button or its icon
                      const target = e.target as HTMLElement;
                      if (target.closest('.expand-toggle-button')) {
                        return; // Do nothing if the toggle button was clicked
                      }
                      handleViewDetail(prompt);
                    }
                  }
                >
                  {/* Card content */}
                  <div className="relative">
                    {/* Title */}
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-xs font-medium text-magic-300 w-full break-words">
                        {formatTitle(prompt.title)}
                      </h3>
                    </div>
                    
                    {/* Content Preview - Conditional line-clamp */}
                    <p className={`text-[10px] text-magic-200 mb-1 relative z-10 whitespace-pre-line break-words ${
                      isExpanded ? '' : 'line-clamp-6' 
                    }`}>
                      {formatContentPreview(prompt.content)}
                    </p>

                    {/* Bottom Metadata & Action Buttons */}
                    <div className="text-xs text-magic-600 flex justify-between items-center mt-1.5">
                      {/* Left Group: Expand Button + Metadata */}
                      <div className="flex items-center space-x-2">
                        {/* Expand/Collapse Button - Always visible, on the left */}
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleCardExpansion(prompt.id);
                          }}
                          className="expand-toggle-button p-1 rounded-full text-magic-500 hover:text-magic-300 hover:bg-magic-700/50 transition-colors flex-shrink-0"
                          title={isExpanded ? 'Show Less' : 'Show More'}
                        >
                          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />} 
                        </button>
                        {/* Metadata Container */}
                        <div className="flex items-center space-x-2 transition-opacity duration-150 flex-shrink-0">
                          <span>
                            Used: {prompt.useCount || 0} times
                          </span>
                          <span>
                            {new Date(prompt.updatedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      {/* Right Group: Action Buttons Container - Hidden by default, shows on hover */}
                      <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                        <button 
                          onClick={(e) => { 
                            e.stopPropagation();
                            handleCopy(prompt.id, prompt.content);
                          }}
                          className="p-1.5 hover:bg-magic-700/50 rounded-full transition-all duration-300 transform hover:scale-110"
                          title="Copy prompt content"
                        >
                          <Copy size={14} className="text-magic-400" />
                        </button>
                        <button 
                           onClick={(e) => { 
                            e.stopPropagation();
                            handleDelete(prompt.id);
                          }}
                          className="p-1.5 hover:bg-magic-700/50 rounded-full transition-all duration-300 transform hover:scale-110"
                          title="Remove from Library"
                        >
                          <Trash2 size={14} className="text-magic-400 hover:text-red-500" />
                        </button>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* 确认对话框 */}
      <ConfirmDialog
        isOpen={confirmDialogOpen}
        onClose={() => {
          setConfirmDialogOpen(false);
          setPromptToDelete(null);
        }}
        onConfirm={confirmAction1}
        message="Are you sure you want to remove this prompt from your library?"
        confirmText="Remove"
        cancelText="Cancel"
        fastAnimation={true}
      />

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