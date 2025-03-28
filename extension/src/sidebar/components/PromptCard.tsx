import React from 'react';
import { Copy } from 'lucide-react';

interface Prompt {
  id: number;
  title: string;
  content: string;
}

interface PromptCardProps {
  prompt: Prompt;
  onSelect: (prompt: Prompt) => void;
  onCopy: (content: string) => void;
}

export function PromptCard({ prompt, onSelect, onCopy }: PromptCardProps) {
  return (
    <div
      onClick={() => onSelect(prompt)}
      className="relative p-4 bg-gradient-to-r from-magic-800/50 via-magic-700/30 to-magic-800/50 border border-magic-700/30 rounded-lg hover:border-magic-500/50 transition-all duration-500 cursor-pointer group transform hover:-rotate-1 hover:scale-[1.02] before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-magic-500/10 before:to-transparent before:animate-shimmer-fast before:pointer-events-none"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-magic-500/20 to-magic-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-lg pointer-events-none" />
      <h3 className="text-sm font-medium text-magic-200 mb-2 relative z-10">{prompt.title}</h3>
      <p className="text-sm text-magic-200 mb-3 relative z-10 line-clamp-3">{prompt.content}</p>
      <div className="flex items-center justify-end relative z-10">
        <button
          onClick={e => {
            e.stopPropagation();
            onCopy(prompt.content);
          }}
          className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-magic-700/50 rounded-full transition-all duration-300 transform hover:scale-110"
        >
          <Copy size={14} className="text-magic-400" />
        </button>
      </div>
    </div>
  );
}
