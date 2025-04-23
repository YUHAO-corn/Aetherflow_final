// extension/src/services/aiService.ts

// Import the centralized API client using path alias
import { callDoubaoApi } from '@/services/utils/doubaoApiClient'; 

// --- Removed Doubao API Configuration and Helpers (now in apiClient) ---
// const DOUBAO_API_URL = ...;
// const DOUBAO_MODEL_ID = ...;
// const STORAGE_API_KEY_NAME = ...;
// const MAX_RETRIES = ...;
// const RETRY_DELAY = ...;
// async function getDoubaoApiKey(): Promise<string> { ... }
// const delay = (ms: number) => ...;

/**
 * Calls the Doubao API to generate a title for the given content using the centralized client.
 * 
 * @param content - The text content to generate a title for.
 * @returns A promise that resolves with the generated title string.
 * @throws An error if the API call fails or the key is missing (propagated from apiClient).
 */
export async function generateTitleService(content: string): Promise<string> {
  try {
    if (!content || content.trim() === '') {
      throw new Error('内容不能为空 (Content cannot be empty)');
    }

    // Limit content length if necessary 
    const maxContentLength = 1000; 
    const truncatedContent = content.length > maxContentLength 
        ? content.substring(0, maxContentLength) + "... (内容已截断)" 
        : content;

    console.log(`[AIService] 开始生成标题, 原始长度: ${content.length}, 处理长度: ${truncatedContent.length}`);

    // System prompt specifically for title generation
    const systemPrompt = "根据以下内容生成一个简洁、准确、不超过15个字的标题："; 

    // Prepare messages for the API call
    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: truncatedContent } 
    ];

    // Prepare options for the API call
    const options = {
      temperature: 0.5, 
      max_tokens: 50 
    };

    // Call the centralized API client
    console.log('[AIService] Calling doubaoApiClient.callDoubaoApi for title generation...');
    const generatedTitleRaw = await callDoubaoApi(messages, options);

    // Perform post-processing specific to titles
    let generatedTitleFinal = generatedTitleRaw.trim();
    generatedTitleFinal = generatedTitleFinal.replace(/["'”"'']/g, ''); // Remove surrounding quotes
    
    console.log('[AIService] 成功获取并处理了生成的标题:', generatedTitleFinal);
    return generatedTitleFinal; // Return the processed title

  } catch (error: unknown) {
    // Log the error and re-throw a more specific error for this service
    console.error('[AIService] 生成标题请求失败:', error);
    const originalMessage = error instanceof Error ? error.message : '未知错误';
    // Add specific context to the error message
    throw new Error(`生成标题失败 (${originalMessage})`); 
  }
}
 