import React, { useState, useRef, useEffect } from 'react';
import { Search } from 'lucide-react';
import { usePromptsData } from '../../../hooks/usePromptsData';
import { Prompt } from '../../../services/prompt/types';
import { Card } from '../../../components/common/Card';
import { LoadingIndicator } from '../../../components/common/LoadingIndicator';

interface PromptShortcutProps {
  onSelect: (prompt: Prompt) => void;
}

export function PromptShortcut({ onSelect }: PromptShortcutProps) {
  const [isActive, setIsActive] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { loading, searchPrompts, incrementUseCount } = usePromptsData();
  const [searchResults, setSearchResults] = useState<Prompt[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // 当搜索词变化时执行搜索
  useEffect(() => {
    if (searchTerm && searchTerm.startsWith('/')) {
      const fetchResults = async () => {
        const results = await searchPrompts({
          searchTerm: searchTerm.slice(1)
        });
        setSearchResults(results);
      };
      fetchResults();
    } else {
      setSearchResults([]);
    }
  }, [searchTerm, searchPrompts]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && !isActive) {
        e.preventDefault();
        setIsActive(true);
        inputRef.current?.focus();
      } else if (e.key === 'Escape' && isActive) {
        setIsActive(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isActive]);

  const handlePromptSelect = async (prompt: Prompt) => {
    await incrementUseCount(prompt.id);
    onSelect(prompt);
    setIsActive(false);
    setSearchTerm('');
  };

  if (!isActive) {
    return (
      <button
        onClick={() => setIsActive(true)}
        className="w-full px-4 py-2 text-left text-sm text-magic-400 bg-magic-800/30 border border-magic-700/50 rounded-lg hover:bg-magic-700/30 transition-colors"
      >
        按 "/" 快速搜索提示词...
      </button>
    );
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-magic-400" size={16} />
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder="搜索提示词..."
          className="w-full pl-10 pr-4 py-2 bg-magic-800/30 border border-magic-700/50 rounded-lg text-sm text-magic-200 placeholder-magic-500 focus:outline-none focus:ring-2 focus:ring-magic-500 focus:border-transparent"
          autoFocus
        />
      </div>

      {searchTerm.startsWith('/') && (
        <div className="absolute w-full mt-2 bg-magic-800 border border-magic-700/50 rounded-lg shadow-xl overflow-hidden z-50">
          {loading ? (
            <div className="p-4">
              <LoadingIndicator size="sm" />
            </div>
          ) : searchResults.length > 0 ? (
            <div className="max-h-64 overflow-y-auto">
              {searchResults.map((prompt: Prompt) => (
                <Card key={prompt.id} onClick={() => handlePromptSelect(prompt)} className="m-2">
                  <div className="flex items-start">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-magic-200 truncate">
                        {prompt.title}
                      </h4>
                      <p className="text-xs text-magic-400 mt-1 line-clamp-2">{prompt.content}</p>
                    </div>
                    {prompt.isFavorite && <span className="ml-2 text-yellow-500">★</span>}
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="p-4 text-sm text-magic-400 text-center">未找到匹配的提示词</div>
          )}
        </div>
      )}
    </div>
  );
} 