import React from 'react';
import { Search } from 'lucide-react';
import { PromptCard } from './PromptCard';

interface Prompt {
  id: number;
  title: string;
  content: string;
}

interface PromptLibraryProps {
  prompts: Prompt[];
  onSelectPrompt: (prompt: Prompt) => void;
  onCopy: (content: string) => void;
}

export function PromptLibrary({ prompts, onSelectPrompt, onCopy }: PromptLibraryProps) {
  return (
    <div className="p-4">
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-magic-400" size={16} />
        <input
          type="text"
          placeholder="搜索提示词..."
          className="w-full pl-10 pr-4 py-2 bg-magic-800/30 border border-magic-700/50 rounded-lg text-sm text-magic-200 placeholder-magic-500 focus:outline-none focus:ring-2 focus:ring-magic-500 focus:border-transparent transition-all duration-300"
        />
      </div>
      <div className="space-y-3">
        {prompts.map(prompt => (
          <PromptCard key={prompt.id} prompt={prompt} onSelect={onSelectPrompt} onCopy={onCopy} />
        ))}
      </div>
    </div>
  );
}
