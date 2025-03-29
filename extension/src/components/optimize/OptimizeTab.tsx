import React from 'react';
import { Wand2, Copy, Sparkles, Bookmark } from 'lucide-react';
import { Button } from '../common/Button';
import { Card } from '../common/Card';
import { MagicParticles } from '../common/MagicParticles';
import { useAppContext } from '../../hooks/AppContext';

interface OptimizeTabProps {
  onLevelUp: () => void;
}

export function OptimizeTab({ onLevelUp }: OptimizeTabProps) {
  const { 
    state, 
    setOptimizationInput, 
    startOptimization, 
    continueOptimization, 
    addPrompt 
  } = useAppContext();

  const handleStartOptimize = async () => {
    if (!state.currentOptimizationInput.trim()) return;
    await startOptimization();
    onLevelUp();
  };

  const handleContinueOptimize = async (versionId: number) => {
    await continueOptimization(versionId);
    onLevelUp();
  };

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
  };
  
  const handleSaveToLibrary = (content: string) => {
    addPrompt({
      title: content.substring(0, 30) + (content.length > 30 ? '...' : ''),
      content,
      isFavorite: false,
      isActive: true,
      useCount: 0,
      lastUsed: Date.now(),
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
  };

  return (
    <div className="p-4">
      {/* 优化输入框 */}
      <div className="mb-4">
        <textarea
          value={state.currentOptimizationInput}
          onChange={e => setOptimizationInput(e.target.value)}
          placeholder="请输入需要优化的提示词..."
          className="w-full h-32 p-3 bg-magic-800/30 border border-magic-700/50 rounded-lg text-sm text-magic-200 placeholder-magic-500 focus:outline-none focus:ring-2 focus:ring-magic-500 focus:border-transparent resize-none transition-all duration-300"
        />
        <Button
          onClick={handleStartOptimize}
          disabled={!state.currentOptimizationInput.trim() || state.isLoading}
          fullWidth
          loading={state.isLoading}
          icon={<Sparkles className="w-4 h-4" />}
          className="mt-2"
        >
          {state.isLoading ? '优化中...' : '开始优化'}
        </Button>
      </div>

      {/* 优化结果 */}
      <div className="space-y-4">
        {state.optimizationVersions.map(version => (
          <div
            key={version.id}
            className={`relative p-4 bg-gradient-to-r from-magic-800/50 via-magic-700/30 to-magic-800/50 border border-magic-700/30 rounded-lg group transform hover:-rotate-1 hover:scale-[1.02] transition-all duration-300 before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-magic-500/10 before:to-transparent before:animate-shimmer-fast before:pointer-events-none ${
              version.isNew ? 'animate-magic-reveal' : ''
            } ${version.isLoading ? 'animate-pulse' : ''}`}
          >
            {version.isLoading && <MagicParticles />}
            <div className="absolute inset-0 bg-gradient-to-r from-magic-500/20 to-magic-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-lg pointer-events-none" />
            <div className="flex items-center justify-between mb-3 relative z-10">
              <span className="text-xs font-medium text-magic-400">
                优化版本 v{version.id}
              </span>
              {!version.isLoading && (
                <div className="flex items-center">
                  <button
                    onClick={() => handleSaveToLibrary(version.content)}
                    className="p-1.5 hover:bg-magic-700/50 rounded-full transition-all duration-300 transform hover:scale-110 mr-1"
                  >
                    <Bookmark size={14} className="text-magic-400" />
                  </button>
                  <button
                    onClick={() => handleCopy(version.content)}
                    className="p-1.5 hover:bg-magic-700/50 rounded-full transition-all duration-300 transform hover:scale-110"
                  >
                    <Copy size={14} className="text-magic-400" />
                  </button>
                </div>
              )}
            </div>
            {version.isLoading ? (
              <div className="space-y-2">
                <div className="h-4 bg-magic-700/30 rounded animate-pulse" />
                <div className="h-4 bg-magic-700/30 rounded animate-pulse w-3/4" />
                <div className="h-4 bg-magic-700/30 rounded animate-pulse w-1/2" />
              </div>
            ) : (
              <p className="text-sm text-magic-200 mb-3 relative z-10">{version.content}</p>
            )}
            {!version.isLoading && (
              <Button
                onClick={() => handleContinueOptimize(version.id)}
                disabled={state.isLoading}
                variant="secondary"
                fullWidth
                loading={state.isLoading}
                icon={<Wand2 className="w-4 h-4" />}
              >
                {state.isLoading ? '优化中...' : '继续优化'}
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
} 