export interface OptimizationVersion {
  id: number;
  content: string;
  isLoading?: boolean;
  isNew?: boolean;
  createdAt?: number;
  parentId?: number;
  editedContent?: string;
  isEdited?: boolean;
  position?: number;
}

export interface OptimizeOptions {
  mode?: 'standard' | 'creative' | 'concise';
  temperature?: number;
  maxTokens?: number;
} 