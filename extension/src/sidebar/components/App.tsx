import React, { useState } from 'react';
import { Settings } from 'lucide-react';
import { Header } from './Header';
import { Navigation } from './Navigation';
import { PromptLibrary } from './PromptLibrary';
import { OptimizeSection } from './OptimizeSection';
import { PromptModal } from './PromptModal';
import { AuthModal } from './AuthModal';
import { SettingsModal } from './SettingsModal';

interface OptimizationVersion {
  id: number;
  content: string;
  isLoading?: boolean;
  isNew?: boolean;
}

interface Prompt {
  id: number;
  title: string;
  content: string;
}

function App() {
  const [_loginVisible, _setLoginVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<'library' | 'optimize'>('library');
  const [optimizeInput, setOptimizeInput] = useState('');
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationVersions, setOptimizationVersions] = useState<OptimizationVersion[]>([]);
  const [magicianLevel, setMagicianLevel] = useState(1);

  // Modal states
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isUserProfileOpen, setIsUserProfileOpen] = useState(false);
  const [isLoggedIn, _setIsLoggedIn] = useState(false);

  // Sample prompts data
  const prompts: Prompt[] = [
    {
      id: 1,
      title: '专业文本优化',
      content:
        '请帮我优化以下文本，使其更加专业、清晰和有说服力，同时保持原意。我希望输出的内容语言更加规范，表达更加准确，并且增强文本的说服力和专业性。请确保优化后的文本保持原有的核心信息和主要观点不变。',
    },
    {
      id: 2,
      title: '创意写作助手',
      content:
        '作为一位创意写作助手，请帮助我扩展和丰富以下创意写作内容。注重增加细节描写，营造独特的氛围，并保持叙事的连贯性。可以适当加入比喻、隐喻等修辞手法，但要确保不过分华丽，保持文字的自然流畅。',
    },
    {
      id: 3,
      title: '技术文档改进',
      content:
        '请协助我改进这份技术文档，使其更加清晰、准确和易于理解。需要注意专业术语的使用准确性，确保文档结构清晰，并加入适当的示例说明。同时，请保持技术文档的简洁性和专业性。',
    },
  ];

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

  return (
    <div className="h-screen bg-gradient-to-br from-magic-900 via-magic-800 to-magic-900 flex flex-col">
      <Header
        magicianLevel={magicianLevel}
        isLoggedIn={isLoggedIn}
        isUserProfileOpen={isUserProfileOpen}
        setIsUserProfileOpen={setIsUserProfileOpen}
        setIsAuthModalOpen={setIsAuthModalOpen}
        setIsSettingsModalOpen={setIsSettingsModalOpen}
      />

      <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="flex-1 overflow-auto scrollbar-thin scrollbar-thumb-magic-600 scrollbar-track-magic-900">
        {activeTab === 'library' ? (
          <PromptLibrary prompts={prompts} onSelectPrompt={setSelectedPrompt} onCopy={handleCopy} />
        ) : (
          <OptimizeSection
            optimizeInput={optimizeInput}
            setOptimizeInput={setOptimizeInput}
            isOptimizing={isOptimizing}
            optimizationVersions={optimizationVersions}
            onStartOptimize={handleStartOptimize}
            onContinueOptimize={handleContinueOptimize}
            onCopy={handleCopy}
          />
        )}
      </div>

      <div className="px-4 py-2 border-t border-magic-700/30 bg-magic-800/50 backdrop-blur-sm">
        <button
          onClick={() => setIsSettingsModalOpen(true)}
          className="flex items-center space-x-2 text-sm text-magic-400 hover:text-magic-300 transition-colors duration-300"
        >
          <Settings size={14} />
          <span>设置</span>
        </button>
      </div>

      {/* Modals */}
      <PromptModal
        isOpen={!!selectedPrompt}
        onClose={() => setSelectedPrompt(null)}
        prompt={selectedPrompt || { content: '' }}
      />
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
      <SettingsModal isOpen={isSettingsModalOpen} onClose={() => setIsSettingsModalOpen(false)} />
    </div>
  );
}

export default App;
