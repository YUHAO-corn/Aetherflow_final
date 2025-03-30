/**
 * @deprecated 此组件已废弃，请使用 src/pages/sidepanel/components/LibraryTab.tsx 替代
 * 保留此文件是为了确保项目稳定性，请勿在新代码中引用
 */

import React, { useState, useEffect } from 'react';
import { Search, Copy, Trash2, Plus, ArrowDownUp } from 'lucide-react';
import { Input } from '../common/Input';
import { Card } from '../common/Card';
import { useAppContext } from '../../hooks/AppContext';
import { LoadingIndicator } from '../common/LoadingIndicator';
import { PromptFormModal } from './PromptFormModal';
import { PromptDetailDrawer } from './PromptDetailDrawer';
import { Prompt } from '../../services/prompt/types';
import { Menu, MenuItem } from '../common/Menu';

type SortOption = 'updatedDesc' | 'updatedAsc' | 'createdDesc' | 'createdAsc' | 'useCount';

export function LibraryTab() {
  const { state, searchPrompts, incrementPromptUse, deletePrompt } = useAppContext();
  
  // 状态管理
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredPrompts, setFilteredPrompts] = useState(state.prompts);
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | undefined>(undefined);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<Prompt | undefined>(undefined);
  const [sortOption, setSortOption] = useState<SortOption>('updatedDesc');
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  
  // 搜索和排序提示词
  useEffect(() => {
    const filterAndSortPrompts = async () => {
      // 1. 先搜索
      let results = await searchPrompts(searchTerm);
      
      // 2. 再排序
      results = sortPrompts(results, sortOption);
      
      setFilteredPrompts(results);
    };
    
    filterAndSortPrompts();
  }, [searchTerm, searchPrompts, state.prompts, sortOption]);
  
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
    incrementPromptUse(id);
  };
  
  // 处理查看提示词详情
  const handleViewDetail = (prompt: Prompt) => {
    setSelectedPrompt(prompt);
    setIsDetailOpen(true);
  };
  
  // 处理编辑提示词
  const handleEdit = (prompt: Prompt) => {
    setEditingPrompt(prompt);
    setIsFormOpen(true);
    if (isDetailOpen) {
      setIsDetailOpen(false);
    }
  };
  
  // 处理添加新提示词
  const handleAddNew = () => {
    setEditingPrompt(undefined);
    setIsFormOpen(true);
  };
  
  // 处理删除提示词
  const handleDelete = async (id: string) => {
    if (window.confirm('确定要删除这个提示词吗？')) {
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

  return (
    <div className="p-4">
      {/* 顶部工具栏 */}
      <div className="mb-4 space-y-3">
        <div className="flex justify-end space-x-2">
          {/* 添加提示词按钮 */}
          <button
            onClick={handleAddNew}
            className="flex items-center justify-center px-3 py-2 bg-magic-600 hover:bg-magic-500 rounded-md text-white transition-colors transform hover:scale-105"
            title="添加新提示词"
          >
            <Plus size={16} className="mr-1" /> 添加至收藏夹
          </button>
          
          {/* 排序按钮 */}
          <div className="relative">
            <button
              onClick={() => setIsSortMenuOpen(!isSortMenuOpen)}
              className="flex items-center justify-center px-3 py-2 bg-magic-700 hover:bg-magic-600 rounded-md text-magic-200 transition-colors"
              title="排序提示词"
            >
              <ArrowDownUp size={16} className="mr-1" /> {getSortOptionName(sortOption)}
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
        
        {/* 搜索框 */}
        <div className="relative">
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="搜索提示词..."
            icon={<Search size={16} />}
          />
        </div>
      </div>

      {/* 加载状态 */}
      {state.isLoading && (
        <div className="flex justify-center my-8">
          <LoadingIndicator />
        </div>
      )}

      {/* 提示词列表 */}
      {!state.isLoading && (
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
                actions={
                  <>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(prompt.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-700/50 rounded-full transition-all duration-300 transform hover:scale-110 mr-1"
                      title="删除提示词"
                    >
                      <Trash2 size={14} className="text-red-400" />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopy(prompt.id, prompt.content);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-magic-700/50 rounded-full transition-all duration-300 transform hover:scale-110"
                      title="复制提示词内容"
                    >
                      <Copy size={14} className="text-magic-400" />
                    </button>
                  </>
                }
              >
                <div className="flex justify-between mb-2">
                  <h3 className="text-sm font-medium text-magic-300 truncate">{prompt.title}</h3>
                  {prompt.useCount > 0 && (
                    <span className="text-xs text-magic-400 flex items-center">
                      <span className="inline-block w-4 h-4 rounded-full bg-magic-600 flex items-center justify-center mr-1">
                        {prompt.useCount}
                      </span>
                    </span>
                  )}
                </div>
                <p className="text-sm text-magic-200 mb-3 relative z-10 line-clamp-3">
                  {prompt.content}
                </p>
              </Card>
            ))
          )}
        </div>
      )}
      
      {/* 提示词详情抽屉 */}
      <PromptDetailDrawer
        prompt={selectedPrompt}
        isOpen={isDetailOpen}
        onClose={handleCloseDetail}
        onEdit={handleEdit}
      />
      
      {/* 提示词表单模态框 */}
      <PromptFormModal
        isOpen={isFormOpen}
        onClose={handleCloseForm}
        prompt={editingPrompt}
      />
    </div>
  );
} 