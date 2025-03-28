import React, { useState } from 'react';
import { Search, Copy, Wand2, Library, Settings, Sparkles } from 'lucide-react';

interface OptimizationVersion {
  id: number;
  content: string;
  isLoading?: boolean;
  isNew?: boolean;
}

function App() {
  const [activeTab, setActiveTab] = useState<'library' | 'optimize'>('library');
  const [optimizeInput, setOptimizeInput] = useState('');
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationVersions, setOptimizationVersions] = useState<OptimizationVersion[]>([]);
  const [magicianLevel, setMagicianLevel] = useState(1);

  const handleStartOptimize = async () => {
    if (!optimizeInput.trim()) return;

    setIsOptimizing(true);

    const placeholderVersion: OptimizationVersion = {
      id: optimizationVersions.length + 1,
      content: '',
      isLoading: true,
      isNew: true,
    };
    setOptimizationVersions([placeholderVersion]);

    await new Promise(resolve => setTimeout(resolve, 2000));

    const newVersion: OptimizationVersion = {
      id: placeholderVersion.id,
      content: optimizeInput,
      isLoading: false,
      isNew: true,
    };

    setOptimizationVersions([newVersion]);
    setMagicianLevel(prev => Math.min(prev + 1, 99));

    setTimeout(() => {
      setOptimizationVersions(prev => prev.map(v => ({ ...v, isNew: false })));
    }, 1200);

    setIsOptimizing(false);
  };

  const handleContinueOptimize = async (version: OptimizationVersion) => {
    setIsOptimizing(true);

    const placeholderVersion: OptimizationVersion = {
      id: optimizationVersions.length + 1,
      content: '',
      isLoading: true,
      isNew: true,
    };

    const versionIndex = optimizationVersions.findIndex(v => v.id === version.id);
    const newVersions = [
      ...optimizationVersions.slice(0, versionIndex + 1),
      placeholderVersion,
      ...optimizationVersions.slice(versionIndex + 1),
    ];
    setOptimizationVersions(newVersions);

    await new Promise(resolve => setTimeout(resolve, 2000));

    const newVersion: OptimizationVersion = {
      id: placeholderVersion.id,
      content: version.content + ' [优化版本]',
      isLoading: false,
      isNew: true,
    };

    const updatedVersions = [
      ...optimizationVersions.slice(0, versionIndex + 1),
      newVersion,
      ...optimizationVersions.slice(versionIndex + 1),
    ];

    setOptimizationVersions(updatedVersions);
    setMagicianLevel(prev => Math.min(prev + 1, 99));

    setTimeout(() => {
      setOptimizationVersions(prev => prev.map(v => ({ ...v, isNew: false })));
    }, 1200);

    setIsOptimizing(false);
  };

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
  };

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
    <div className="w-[400px] h-screen bg-gradient-to-br from-magic-900 via-magic-800 to-magic-900 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-magic-700/30 bg-magic-800/50 backdrop-blur-sm">
        <div className="flex items-center space-x-2">
          <h1 className="text-lg font-semibold text-white">AetherFlow</h1>
          <div className="flex items-center space-x-1 px-2 py-0.5 bg-magic-700/30 rounded-full">
            <span className="text-xs text-magic-300">Lv.{magicianLevel}</span>
          </div>
        </div>
        <button className="px-3 py-1 text-sm text-magic-200 hover:bg-magic-700/30 rounded-full transition-all duration-300">
          登录
        </button>
      </div>

      {/* Navigation */}
      <div className="flex border-b border-magic-700/30">
        <button
          onClick={() => setActiveTab('library')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-all duration-300 ${
            activeTab === 'library'
              ? 'text-magic-200 border-b-2 border-magic-400 bg-magic-800/30'
              : 'text-magic-400 hover:text-magic-300'
          }`}
        >
          <div className="flex items-center justify-center space-x-2">
            <Library size={16} />
            <span>提示词库</span>
          </div>
        </button>
        <button
          onClick={() => setActiveTab('optimize')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-all duration-300 ${
            activeTab === 'optimize'
              ? 'text-magic-200 border-b-2 border-magic-400 bg-magic-800/30'
              : 'text-magic-400 hover:text-magic-300'
          }`}
        >
          <div className="flex items-center justify-center space-x-2">
            <Wand2 size={16} />
            <span>提示词优化</span>
          </div>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto scrollbar-thin scrollbar-thumb-magic-600 scrollbar-track-magic-900">
        {activeTab === 'library' ? (
          <div className="p-4">
            {/* Search */}
            <div className="relative mb-4">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-magic-400"
                size={16}
              />
              <input
                type="text"
                placeholder="搜索提示词..."
                className="w-full pl-10 pr-4 py-2 bg-magic-800/30 border border-magic-700/50 rounded-lg text-sm text-magic-200 placeholder-magic-500 focus:outline-none focus:ring-2 focus:ring-magic-500 focus:border-transparent transition-all duration-300"
              />
            </div>

            {/* Prompt Cards */}
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div
                  key={i}
                  className="relative p-4 bg-gradient-to-r from-magic-800/50 via-magic-700/30 to-magic-800/50 border border-magic-700/30 rounded-lg hover:border-magic-500/50 transition-all duration-500 cursor-pointer group transform hover:-rotate-1 hover:scale-[1.02] before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-magic-500/10 before:to-transparent before:animate-shimmer-fast before:pointer-events-none"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-magic-500/20 to-magic-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-lg pointer-events-none" />
                  <p className="text-sm text-magic-200 mb-3 relative z-10">
                    请帮我优化以下文本，使其更加专业、清晰和有说服力，同时保持原意。我希望输出的内容语言更加规范，表达更加准确，并且增强文本的说服力和专业性。请确保优化后的文本保持原有的核心信息和主要观点不变。
                  </p>
                  <div className="flex items-center justify-end relative z-10">
                    <button className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-magic-700/50 rounded-full transition-all duration-300 transform hover:scale-110">
                      <Copy size={14} className="text-magic-400" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-4">
            {/* Optimize Input */}
            <div className="mb-4">
              <textarea
                value={optimizeInput}
                onChange={e => setOptimizeInput(e.target.value)}
                placeholder="请输入需要优化的提示词..."
                className="w-full h-32 p-3 bg-magic-800/30 border border-magic-700/50 rounded-lg text-sm text-magic-200 placeholder-magic-500 focus:outline-none focus:ring-2 focus:ring-magic-500 focus:border-transparent resize-none transition-all duration-300"
              />
              <button
                onClick={handleStartOptimize}
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

            {/* Optimization Results */}
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
                    <span className="text-xs font-medium text-magic-400">
                      优化版本 v{version.id}
                    </span>
                    {!version.isLoading && (
                      <button
                        onClick={() => handleCopy(version.content)}
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
                      onClick={() => handleContinueOptimize(version)}
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
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-magic-700/30 bg-magic-800/50 backdrop-blur-sm">
        <button className="flex items-center space-x-2 text-sm text-magic-400 hover:text-magic-300 transition-colors duration-300">
          <Settings size={14} />
          <span>设置</span>
        </button>
      </div>
    </div>
  );
}

export default App;
