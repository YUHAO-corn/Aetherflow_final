// React组件测试
// 此脚本展示了如何在React组件中使用统一数据层

import React, { useState, useEffect } from 'react';
import { usePromptsData } from '../src/hooks/usePromptsData';

/**
 * 用于测试的简单提示词展示组件
 */
export function PromptListTest() {
  const { 
    prompts, 
    loading, 
    error, 
    addPrompt, 
    updatePrompt, 
    deletePrompt,
    toggleFavorite,
    incrementUseCount,
    searchPrompts,
    refresh
  } = usePromptsData();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [newPromptTitle, setNewPromptTitle] = useState('');
  const [newPromptContent, setNewPromptContent] = useState('');
  
  // 添加新提示词
  const handleAddPrompt = async () => {
    if (!newPromptTitle.trim() || !newPromptContent.trim()) return;
    
    await addPrompt({
      title: newPromptTitle,
      content: newPromptContent,
      tags: ['新建', '测试'],
      isFavorite: false
    });
    
    // 重置表单
    setNewPromptTitle('');
    setNewPromptContent('');
  };
  
  // 搜索提示词
  const handleSearch = async () => {
    const results = await searchPrompts({
      searchTerm: searchTerm
    });
    
    setSearchResults(results);
  };
  
  // 渲染单个提示词
  const renderPrompt = (prompt) => (
    <div key={prompt.id} style={{ 
      border: '1px solid #ccc', 
      padding: '10px', 
      margin: '10px 0',
      borderRadius: '5px',
      backgroundColor: prompt.isFavorite ? '#fffbf0' : '#fff'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <h3>{prompt.title}</h3>
        <div>
          <button 
            onClick={() => toggleFavorite(prompt.id)}
            style={{ marginRight: '5px' }}
          >
            {prompt.isFavorite ? '取消收藏' : '收藏'}
          </button>
          <button 
            onClick={() => incrementUseCount(prompt.id)}
            style={{ marginRight: '5px' }}
          >
            使用
          </button>
          <button onClick={() => deletePrompt(prompt.id)}>删除</button>
        </div>
      </div>
      <p>{prompt.content}</p>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#888' }}>
        <span>使用次数: {prompt.useCount || 0}</span>
        <span>更新时间: {new Date(prompt.updatedAt).toLocaleString()}</span>
      </div>
    </div>
  );
  
  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>提示词数据层测试</h1>
      
      {/* 添加提示词表单 */}
      <div style={{ marginBottom: '20px', padding: '15px', border: '1px solid #eee', borderRadius: '5px' }}>
        <h2>添加新提示词</h2>
        <div>
          <input
            type="text"
            value={newPromptTitle}
            onChange={(e) => setNewPromptTitle(e.target.value)}
            placeholder="提示词标题"
            style={{ width: '100%', padding: '8px', marginBottom: '10px' }}
          />
        </div>
        <div>
          <textarea
            value={newPromptContent}
            onChange={(e) => setNewPromptContent(e.target.value)}
            placeholder="提示词内容"
            style={{ width: '100%', padding: '8px', marginBottom: '10px', minHeight: '100px' }}
          />
        </div>
        <button 
          onClick={handleAddPrompt}
          style={{ padding: '8px 15px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px' }}
        >
          添加提示词
        </button>
      </div>
      
      {/* 搜索提示词 */}
      <div style={{ marginBottom: '20px', display: 'flex' }}>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="搜索提示词..."
          style={{ flex: 1, padding: '8px', marginRight: '10px' }}
        />
        <button 
          onClick={handleSearch}
          style={{ padding: '8px 15px', backgroundColor: '#2196F3', color: 'white', border: 'none', borderRadius: '4px' }}
        >
          搜索
        </button>
        <button 
          onClick={refresh}
          style={{ padding: '8px 15px', backgroundColor: '#607D8B', color: 'white', border: 'none', borderRadius: '4px', marginLeft: '10px' }}
        >
          刷新
        </button>
      </div>
      
      {/* 搜索结果 */}
      {searchTerm && searchResults.length > 0 && (
        <div style={{ marginBottom: '30px' }}>
          <h2>搜索结果 ({searchResults.length})</h2>
          {searchResults.map(renderPrompt)}
        </div>
      )}
      
      {/* 加载状态 */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          加载中...
        </div>
      )}
      
      {/* 错误提示 */}
      {error && (
        <div style={{ color: 'red', padding: '10px', border: '1px solid red', borderRadius: '5px', marginBottom: '20px' }}>
          发生错误: {error.message}
        </div>
      )}
      
      {/* 所有提示词列表 */}
      <div>
        <h2>所有提示词 ({prompts.length})</h2>
        {prompts.length === 0 ? (
          <p>没有提示词数据</p>
        ) : (
          prompts.map(renderPrompt)
        )}
      </div>
    </div>
  );
} 