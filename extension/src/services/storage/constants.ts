// 存储键名常量
export const STORAGE_KEYS = {
  PROMPTS: 'aetherflow_prompts',
  SETTINGS: 'aetherflow_settings',
  USER: 'aetherflow_user',
  HISTORY: 'aetherflow_history'
};

// 存储限制常量
export const STORAGE_LIMITS = {
  // Chrome存储限制 (字节数)
  SYNC_STORAGE_MAX_BYTES: 102400, // 100KB
  LOCAL_STORAGE_MAX_BYTES: 5242880, // 5MB
  
  // 业务逻辑限制
  MAX_PROMPTS: 100,
  MAX_PROMPT_LENGTH: 8000,
  MAX_TITLE_LENGTH: 50
}; 