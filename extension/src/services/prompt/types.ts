export interface Prompt {
  id: string;
  title: string;
  content: string;
  favorite: boolean;
  useCount?: number;
  lastUsed?: number;
}

export interface PromptFilter {
  searchTerm?: string;
  sortBy?: 'usage' | 'favorite' | 'time';
  limit?: number;
} 