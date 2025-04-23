// Import necessary modules
const fetch = require('node-fetch'); // For making HTTP requests
const fs = require('fs'); // For reading files
const path = require('path'); // For handling file paths

// --- Configuration ---
const DOUBAO_API_KEY = '32550ef8-b626-4478-bf53-5fb5e34e114f'; // 已更新 API Key
const DOUBAO_API_ENDPOINT = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions'; // 已更新 Endpoint
const DOUBAO_MODEL_ID = 'doubao-lite-32k-240828'; // 已指定模型 ID

// --- Directory Setup ---
const PROMPT_VERSION_DIR_NAME = 'v3_doubao-lite-32k'; // 更新: 目录名包含模型信息
const BASE_DIR = __dirname;
const PROMPT_VERSION_DIR = path.join(BASE_DIR, PROMPT_VERSION_DIR_NAME);
const SYSTEM_PROMPT_PATH = path.join(PROMPT_VERSION_DIR, 'system_prompt.txt'); // 更新系统提示路径
const TEST_CASES_PATH = path.join(BASE_DIR, 'test_cases.json'); // 测试用例仍在根目录
const RESULTS_DIR = path.join(PROMPT_VERSION_DIR, 'results'); // 结果保存在子目录的 results 下

// --- Helper Functions ---

/**
 * Reads the system prompt from the specified file.
 * @returns {string} The system prompt content.
 */
function readSystemPrompt() {
    // Ensure prompt directory exists before reading
    if (!fs.existsSync(PROMPT_VERSION_DIR)){
        console.error(`Error: Prompt directory not found (${PROMPT_VERSION_DIR}). Please ensure it exists.`);
        process.exit(1);
    }
    try {
        return fs.readFileSync(SYSTEM_PROMPT_PATH, 'utf8');
    } catch (error) {
        console.error(`Error reading system prompt file (${SYSTEM_PROMPT_PATH}):`, error);
        process.exit(1); // Exit if system prompt cannot be read
    }
}

/**
 * Reads and parses test cases from the JSON file.
 * @returns {Array<object>} An array of test case objects (e.g., {id: string, input_prompt: string}).
 */
function readTestCases() {
    try {
        const fileContent = fs.readFileSync(TEST_CASES_PATH, 'utf8');
        const testCases = JSON.parse(fileContent);
        // Validate test case structure slightly
        if (!Array.isArray(testCases) || testCases.some(tc => typeof tc.input_prompt !== 'string')) {
             console.error(`Error: Invalid format in test cases file (${TEST_CASES_PATH}). Expected an array of objects with 'input_prompt' key.`);
             process.exit(1);
        }
        return testCases;
    } catch (error) {
        console.error(`Error reading or parsing test cases file (${TEST_CASES_PATH}):`, error);
        process.exit(1); // Exit if test cases cannot be read/parsed
    }
}

/**
 * Calls the Doubao API to optimize the given input prompt.
 * @param {string} systemPrompt - The system prompt to use.
 * @param {string} userInput - The user's input prompt.
 * @returns {Promise<string>} A promise that resolves with the optimized text or an error message.
 */
async function optimizeWithDoubao(systemPrompt, userInput) {
    // API Key check removed as it's now hardcoded with the provided key for testing

    const headers = {
        'Authorization': `Bearer ${DOUBAO_API_KEY}`,
        'Content-Type': 'application/json',
    };

    // 更新 body 结构以匹配豆包 API 文档
    const body = JSON.stringify({
        model: DOUBAO_MODEL_ID,
        messages: [
            {
                "role": "system",
                "content": systemPrompt
            },
            {
                "role": "user",
                "content": userInput
            }
        ]
        // 可以根据需要添加 stream: false 等其他参数
    });

    try {
        const response = await fetch(DOUBAO_API_ENDPOINT, {
            method: 'POST',
            headers: headers,
            body: body,
        });

        if (!response.ok) {
            // Attempt to read error details from the API response
            let errorDetails = '';
            try {
                const errorJson = await response.json();
                errorDetails = JSON.stringify(errorJson);
            } catch (e) {
                errorDetails = await response.text(); // Fallback to plain text if JSON parsing fails
            }
            console.error(`API Error Response: Status ${response.status}, Body: ${errorDetails}`);
            return `Error: API request failed with status ${response.status}. Check console for details.`;
        }

        const result = await response.json();

        // 更新结果提取逻辑以匹配豆包 API 响应
        if (result && result.choices && result.choices.length > 0 && result.choices[0].message && result.choices[0].message.content) {
            return result.choices[0].message.content.trim(); // 返回 assistant 的回复内容
        } else {
            console.error("Unexpected API response structure:", JSON.stringify(result));
            return `Error: Could not extract optimized text from API response. Unexpected structure. Response: ${JSON.stringify(result)}`;
        }

    } catch (error) {
        console.error("Error calling Doubao API:", error);
        return `Error: Network or other error during API call: ${error.message}`;
    }
}

/**
 * Ensures the results directory exists within the prompt version subdirectory.
 */
function ensureResultsDir() {
    if (!fs.existsSync(RESULTS_DIR)){
        try {
            // Create the prompt version directory if it doesn't exist (e.g., first run)
            if (!fs.existsSync(PROMPT_VERSION_DIR)) {
                fs.mkdirSync(PROMPT_VERSION_DIR, { recursive: true }); // Use recursive in case parent doesn't exist
                 console.log(`Created prompt version directory: ${PROMPT_VERSION_DIR}`);
            }
            fs.mkdirSync(RESULTS_DIR);
            console.log(`Created results directory: ${RESULTS_DIR}`);
        } catch (error) {
            console.error(`Error creating directory (${RESULTS_DIR}):`, error);
            process.exit(1);
        }
    }
}

/**
 * Appends test results to the specified results file.
 * @param {string} resultsFilePath - The full path to the results file for this run.
 * @param {string} content - The content to append.
 */
function appendToResultsFile(resultsFilePath, content) {
    try {
        fs.appendFileSync(resultsFilePath, content + '\n', 'utf8');
    } catch (error) {
        console.error(`Error writing to results file (${resultsFilePath}):`, error);
    }
}

// --- Main Execution Logic ---

// Function to generate a timestamp string for filenames
function getTimestamp() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${year}${month}${day}_${hours}${minutes}${seconds}`;
}

async function runTests() {
    console.log(`Starting prompt optimization tests for version: ${PROMPT_VERSION_DIR_NAME}`);
    console.log(`Reading system prompt from: ${SYSTEM_PROMPT_PATH}`);
    console.log(`Reading test cases from: ${TEST_CASES_PATH}`);

    const systemPrompt = readSystemPrompt();
    const testCases = readTestCases();
    ensureResultsDir(); // Ensure results directory exists inside the version directory

    // Generate a unique results file path for this run using a timestamp
    const timestamp = getTimestamp();
    const currentResultsFile = path.join(RESULTS_DIR, `test_results_${timestamp}.txt`);
    console.log(`Writing results to: ${currentResultsFile}`);

    // Initialize the results file with a header
    const startTime = new Date().toISOString();
    try {
        fs.writeFileSync(currentResultsFile, `--- Test Run Started: ${startTime} ---\n`, 'utf8');
        appendToResultsFile(currentResultsFile, `Prompt Version Dir: ${PROMPT_VERSION_DIR_NAME}`);
        appendToResultsFile(currentResultsFile, `System Prompt Path: ${SYSTEM_PROMPT_PATH}`);
        appendToResultsFile(currentResultsFile, `Test Cases Path: ${TEST_CASES_PATH}`);
        appendToResultsFile(currentResultsFile, `Model ID: ${DOUBAO_MODEL_ID}\n`);
    } catch (error) {
        console.error(`Error initializing results file (${currentResultsFile}):`, error);
        process.exit(1);
    }

    console.log(`\nUsing System Prompt (from ${SYSTEM_PROMPT_PATH}):\n---\n${systemPrompt}\n---\n`);
    appendToResultsFile(currentResultsFile, `\n--- System Prompt Used ---\n${systemPrompt}\n---\n`);

    for (const testCase of testCases) {
        const inputPrompt = testCase.input_prompt; // Correct key from test_cases.json
        console.log(`\nRunning test case ID: ${testCase.id}`);
        console.log(`Input: "${inputPrompt}"`);
        appendToResultsFile(currentResultsFile, `--- Test Case ID: ${testCase.id} ---\nInput: ${inputPrompt}\n`); // Use correct input key

        const startTimeMs = Date.now();
        const optimizedText = await optimizeWithDoubao(systemPrompt, inputPrompt); // Use correct input key
        const durationMs = Date.now() - startTimeMs;

        console.log(`Output:\n"${optimizedText}"`);
        console.log(`(Duration: ${durationMs}ms)`);
        appendToResultsFile(currentResultsFile, `Output:\n${optimizedText}\nDuration: ${durationMs}ms\n`); // Removed extra newline
    }

    const endTime = new Date().toISOString();
    console.log(`\n--- All tests completed for version ${PROMPT_VERSION_DIR_NAME}. (${endTime}) ---`);
    appendToResultsFile(currentResultsFile, `\n--- Test Run Finished: ${endTime} ---`);
}

// Execute the tests
runTests(); 