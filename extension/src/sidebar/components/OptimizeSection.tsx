import React from 'react';
import { Sparkles, Wand2, Copy } from 'lucide-react';

interface OptimizationVersion {
  id: number;
  content: string;
  isLoading?: boolean;
  isNew?: boolean;
}

interface OptimizeSectionProps {
  optimizeInput: string;
  setOptimizeInput: (input: string) => void;
  isOptimizing: boolean;
  optimizationVersions: OptimizationVersion[];
  onStartOptimize: () => void;
  onContinueOptimize: (version: OptimizationVersion) => void;
  onCopy: (content: string) => void;
}

export function OptimizeSection({
  optimizeInput,
  setOptimizeInput,
  isOptimizing,
  optimizationVersions,
  onStartOptimize,
  onContinueOptimize,
  onCopy,
}: OptimizeSectionProps) {
  const MagicParticles = () => (
    <div className="magic-particles">
      <div className="magic-particle"></div>
      <div className="magic-particle"></div>
      <div className="magic-particle"></div>
      <div className="magic-particle"></div>
      <div className="magic-particle"></div>
      <div className="magic-particle"></div>
      <div className="magic-particle"></div>
      <div className="magic-particle"></div>
      <div className="magic-particle"></div>
      <div className="magic-particle"></div>
    </div>
  );

  return (
    <div className="p-4">
      <div className="mb-4">
        <textarea
          value={optimizeInput}
          onChange={e => setOptimizeInput(e.target.value)}
          placeholder="请输入需要优化的提示词..."
          className="w-full h-32 p-3 bg-magic-800/30 border border-magic-700/50 rounded-lg text-sm text-magic-200 placeholder-magic-500 focus:outline-none focus:ring-2 focus:ring-magic-500 focus:border-transparent resize-none transition-all duration-300"
        />
        <button
          onClick={onStartOptimize}
          disabled={!optimizeInput.trim() || isOptimizing}
          className="relative w-full mt-2 px-4 py-2 bg-magic-600 text-white rounded-lg text-sm font-medium hover:bg-magic-500 disabled:bg-magic-800/50 disabled:cursor-not-allowed transition-all duration-300 group overflow-hidden"
        >
          <span className="flex items-center justify-center space-x-2">
            <Sparkles
              className={`w-4 h-4 ${isOptimizing ? 'animate-spin' : 'group-hover:animate-bounce'}`}
            />
            <span>{isOptimizing ? '优化中...' : '开始优化'}</span>
          </span>
          {isOptimizing && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer-fast" />
          )}
        </button>
      </div>

      <div className="space-y-4">
        {optimizationVersions.map(version => (
          <div
            key={version.id}
            className={`relative p-4 bg-gradient-to-r from-magic-800/50 via-magic-700/30 to-magic-800/50 border border-magic-700/30 rounded-lg group transform hover:-rotate-1 hover:scale-[1.02] transition-all duration-300 before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-magic-500/10 before:to-transparent before:animate-shimmer-fast before:pointer-events-none ${
              version.isNew ? 'animate-magic-reveal' : ''
            } ${version.isLoading ? 'animate-pulse' : ''}`}
          >
            {version.isLoading && <MagicParticles />}
            <div className="absolute inset-0 bg-gradient-to-r from-magic-500/20 to-magic-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-lg pointer-events-none" />
            <div className="flex items-center justify-between mb-3 relative z-10">
              <span className="text-xs font-medium text-magic-400">优化版本 v{version.id}</span>
              {!version.isLoading && (
                <button
                  onClick={() => onCopy(version.content)}
                  className="p-1.5 hover:bg-magic-700/50 rounded-full transition-all duration-300 transform hover:scale-110"
                >
                  <Copy size={14} className="text-magic-400" />
                </button>
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
              <button
                onClick={() => onContinueOptimize(version)}
                disabled={isOptimizing}
                className="relative w-full px-3 py-1.5 text-sm text-magic-200 bg-magic-700/30 rounded hover:bg-magic-600/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed group overflow-hidden"
              >
                <span className="flex items-center justify-center space-x-2">
                  <Wand2
                    className={`w-4 h-4 ${isOptimizing ? 'animate-spin' : 'group-hover:animate-bounce'}`}
                  />
                  <span>{isOptimizing ? '优化中...' : '继续优化'}</span>
                </span>
                {isOptimizing && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer-fast" />
                )}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
