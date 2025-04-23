// extension/src/services/utils/doubaoApiClient.ts

// --- Doubao API Configuration ---
const DOUBAO_API_URL = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';
// Make Model ID easily configurable if needed in the future, maybe via function param?
// For now, keep it constant here as both services use the same one.
export const DOUBAO_MODEL_ID = 'doubao-lite-32k-240828'; 
const STORAGE_API_KEY_NAME = 'doubaoApiKey'; 
const MAX_RETRIES = 1; // Consistent retry count
const RETRY_DELAY = 500; // Consistent delay
// --- End Configuration ---

/**
 * Helper function to get API Key from storage.
 * Exported for potential direct use, though callDoubaoApi should handle it.
 * @throws An error with message 'API Key not configured' if the key is missing.
 * @throws An error with message 'Failed to read API Key' if storage access fails.
 */
export async function getDoubaoApiKey(): Promise<string> {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(STORAGE_API_KEY_NAME, (result) => {
            if (chrome.runtime.lastError) {
                console.error('[DoubaoApiClient] 读取 doubaoApiKey 出错:', chrome.runtime.lastError);
                reject(new Error('Failed to read API Key'));
            } else if (result && result[STORAGE_API_KEY_NAME]) {
                resolve(result[STORAGE_API_KEY_NAME]);
            } else {
                // Specific error for missing key
                reject(new Error('API Key not configured')); 
            }
        });
    });
}

/**
 * Helper delay function. Exported for potential other uses.
 */
export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Define expected message format
interface DoubaoMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// Define options for the API call
interface DoubaoApiOptions {
  temperature?: number;
  max_tokens?: number;
  // Add other potential options if needed
}

/**
 * Core function to call the Doubao Chat Completions API.
 * Handles authentication, request building, fetch execution, retries, and basic error handling.
 * 
 * @param messages - An array of message objects { role: string, content: string }.
 * @param options - Optional parameters like temperature and max_tokens.
 * @returns A promise resolving to the content string of the assistant's reply.
 * @throws An error if the API key is missing, the request fails after retries, 
 *         or the response format is invalid. Specific error messages are provided.
 */
export async function callDoubaoApi(
    messages: DoubaoMessage[],
    options: DoubaoApiOptions = {} // Default to empty options object
): Promise<string> {
    let apiKey: string;
    try {
        apiKey = await getDoubaoApiKey();
    } catch (error) {
        console.error('[DoubaoApiClient] Failed to get API key:', error);
        // Re-throw the specific error from getDoubaoApiKey
        throw error; 
    }

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
    };

    const body = JSON.stringify({
        model: DOUBAO_MODEL_ID,
        messages: messages,
        // Spread options, providing defaults if necessary
        temperature: options.temperature ?? 0.5, // Default temperature
        max_tokens: options.max_tokens ?? 1000,  // Default max tokens
        // Add stream: false if needed, though default is usually non-stream
    });

    let retries = MAX_RETRIES;
    while (retries >= 0) {
        try {
            console.log('[DoubaoApiClient] Calling Doubao API with options:', options);
            const response = await fetch(DOUBAO_API_URL, {
                method: 'POST',
                headers: headers,
                body: body
            });

            if (!response.ok) {
                // Handle retryable errors (e.g., 5xx, 429)
                if ((response.status >= 500 || response.status === 429) && retries > 0) {
                    console.warn(`[DoubaoApiClient] API Request Failed (${response.status}), retrying in ${RETRY_DELAY}ms (${retries} retries left)...`);
                    await delay(RETRY_DELAY);
                    retries--;
                    continue; // Retry the fetch
                }
                // Non-retryable errors or final retry failed
                const errorData = await response.json().catch(() => ({})); // Try to parse error details
                console.error(`[DoubaoApiClient] Doubao API Request Failed: ${response.status} ${response.statusText}`, errorData);
                // Throw a specific error indicating API failure status
                throw new Error(`API Request Failed (${response.status})`); 
            }

            // Process successful response
            const responseData = await response.json();
            if (responseData.choices?.[0]?.message?.content) {
                const assistantReply = responseData.choices[0].message.content;
                console.log('[DoubaoApiClient] Doubao API Call Successful.');
                return assistantReply; // Return the content string
            } else {
                console.error('[DoubaoApiClient] Invalid Doubao API response format:', responseData);
                throw new Error('Invalid API Response Format');
            }

        } catch (error: unknown) {
            // Handle network errors or errors thrown from response handling
            if (error instanceof Error && error.message.startsWith('API Request Failed')) {
                 // If it's an API error we already processed, re-throw it directly
                 throw error;
            }
            
            // Handle errors during fetch itself or if retries exhausted on API errors
             if (retries <= 0) {
                console.error('[DoubaoApiClient] API request failed after maximum retries or other error occurred:', error);
                 throw new Error(`API Call Failed (${error instanceof Error ? error.message : 'Unknown Network/Fetch Error'})`);
            } else {
                 // If it was likely a network error before the first successful fetch and retries remain
                 console.warn(`[DoubaoApiClient] Network or fetch error occurred, retrying in ${RETRY_DELAY}ms (${retries} retries left)...`, error);
                 await delay(RETRY_DELAY);
                 retries--;
                 // continue; // Continue to retry the whole try block
                 // Let's rethrow for now for simplicity, retrying only on 5xx/429 seems safer.
                 // If network errors are common, specific retry logic for them might be needed.
                 console.error('[DoubaoApiClient] Unhandled fetch/network error during retry:', error);
                 throw new Error(`API Call Failed (${error instanceof Error ? error.message : 'Unknown Network/Fetch Error'})`);

            }

        }
    }
    // This line should technically be unreachable if MAX_RETRIES >= 0
    throw new Error('API Call Failed (Max Retries Exceeded)');
} 