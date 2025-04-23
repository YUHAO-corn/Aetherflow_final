# Prompt Optimization Test Script

This script tests prompt optimization using the Doubao API with a given system prompt and a set of test cases. It's designed to support testing different system prompt versions and models, organized into subdirectories.

## Directory Structure Convention

```
prompt_testing/
├── [prompt_version]_[model_name]/  # e.g., v3_doubao-lite-32k
│   ├── system_prompt.txt           # The system prompt for this version/model combo
│   └── results/                    # Directory for results
│       ├── test_results_initial.txt # Optional: Results from the very first run
│       └── test_results_[timestamp].txt # Results from subsequent runs
├── test_cases.json                 # Common test cases
├── package.json
├── test_script.js                  # The main testing script
└── README.md
```

To test a new combination (e.g., prompt v4 with model `xyz-model`), create a directory named `v4_xyz-model`, place the corresponding `system_prompt.txt` inside it, and update the `PROMPT_VERSION_DIR_NAME` constant in `test_script.js`. The script will use this configuration and save timestamped results in the `v4_xyz-model/results/` directory.

## Setup

1.  **Install Node.js:** Make sure you have Node.js installed (v14 or later recommended).
2.  **Install Dependencies:** Navigate to the `prompt_testing` directory in your terminal and run:
    ```bash
    npm install
    ```
3.  **Configure API Key:**
    *   Open `test_script.js`. The test API Key `32550ef8-b626-4478-bf53-5fb5e34e114f` is currently configured.
    *   **Security Warning:** Avoid committing real API keys.
4.  **Configure API Endpoint & Model:**
    *   Verify/update `DOUBAO_API_ENDPOINT` and `DOUBAO_MODEL_ID` in `test_script.js`. They are currently set for Doubao Ark endpoint and model `doubao-lite-32k-240828`.
5.  **Prepare System Prompt & Directory:**
    *   Create a directory following the convention `[prompt_version]_[model_name]` (e.g., `v3_doubao-lite-32k`).
    *   Place your `system_prompt.txt` inside this directory.
    *   Update the `PROMPT_VERSION_DIR_NAME` constant in `test_script.js` to match the directory name you created.
6.  **Review Test Cases:** Check `test_cases.json` in the root `prompt_testing` directory.

## Running the Tests

1.  Make sure you are in the `prompt_testing` directory.
2.  Run the script:
    ```bash
    node test_script.js
    ```

## Output

*   The script prints the prompt/model version being tested.
*   For each test case, it prints input, output, and duration.
*   A new timestamped results file (e.g., `test_results_20250422_180000.txt`) is created in the corresponding version directory's `results` subfolder for each run.

## Customization

*   **System Prompt:** Modify `system_prompt.txt` within the target version directory.
*   **Test Cases:** Edit the root `test_cases.json`.
*   **Test Different Version/Model:** Create a new directory (e.g., `v4_some-other-model`), place `system_prompt.txt` inside, and update `PROMPT_VERSION_DIR_NAME` in `test_script.js`.
*   **API Request Body:** Modify the `body` in `optimizeWithDoubao` function if needed. 