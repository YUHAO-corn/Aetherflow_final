import React, { useState } from 'react';
import { optimizePrompt, OptimizationMode } from '../../../services/optimizationService';

export function ApiTest() {
  const [testInput, setTestInput] = useState('请优化我的提示词：我想让AI写一个故事。');
  const [testResult, setTestResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<OptimizationMode>('standard');

  const runTest = async () => {
    if (!testInput.trim()) return;
    
    setIsLoading(true);
    setError(null);
    setTestResult('');
    
    try {
      const result = await optimizePrompt(testInput, mode);
      setTestResult(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '测试失败，请稍后重试';
      setError(errorMessage);
      console.error('API测试失败:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 bg-magic-800 rounded-lg border border-magic-700/50 mt-4">
      <h2 className="text-lg font-medium text-magic-200 mb-2">DeepSeek API 测试</h2>
      
      <div className="mb-4">
        <label className="block text-sm text-magic-400 mb-1">测试输入</label>
        <textarea 
          value={testInput}
          onChange={(e) => setTestInput(e.target.value)}
          className="w-full p-2 bg-magic-700/50 border border-magic-600/30 rounded text-sm text-magic-200"
          rows={3}
        />
      </div>
      
      <div className="mb-4">
        <label className="block text-sm text-magic-400 mb-1">优化模式</label>
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value as OptimizationMode)}
          className="w-full p-2 bg-magic-700/50 border border-magic-600/30 rounded text-sm text-magic-200"
        >
          <option value="standard">标准模式</option>
          <option value="creative">创意模式</option>
          <option value="concise">简洁模式</option>
        </select>
      </div>
      
      <button
        onClick={runTest}
        disabled={isLoading}
        className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed mb-4 w-full"
      >
        {isLoading ? '测试中...' : '执行API测试'}
      </button>
      
      {error && (
        <div className="p-2 mb-4 bg-red-900/30 border border-red-700/30 rounded text-red-400 text-sm">
          <strong>错误:</strong> {error}
        </div>
      )}
      
      {testResult && (
        <div className="mt-4">
          <h3 className="text-sm font-medium text-magic-400 mb-1">API返回结果:</h3>
          <div className="p-3 bg-magic-700/30 border border-magic-600/20 rounded-lg text-sm text-magic-200 whitespace-pre-wrap">
            {testResult}
          </div>
        </div>
      )}
    </div>
  );
} 