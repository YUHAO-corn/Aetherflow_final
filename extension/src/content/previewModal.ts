import { showToastNotification } from './toastNotification';

// --- Interfaces & Types ---
interface PreviewModalState {
    modal: HTMLDivElement;
    header: HTMLDivElement;
    titleInput: HTMLInputElement;
    contentTextArea: HTMLTextAreaElement;
    optimizeLink: HTMLButtonElement;
    saveButton: HTMLButtonElement;
    pinButton: HTMLButtonElement;
    closeButton: HTMLButtonElement;
    titleSpinner: HTMLSpanElement;
    isPinned: boolean;
    isDragging: boolean;
    offsetX: number;
    offsetY: number;
}

// --- Module State ---
export let previewModalState: PreviewModalState | null = null;

// --- DOM Creation ---
function createModalElements(): PreviewModalState {
    const modal = document.createElement('div');
    modal.className = 'aetherflow-capture-modal';
    modal.style.display = 'none'; // Initially hidden

    // --- Header (Draggable) ---
    const header = document.createElement('div');
    header.className = 'aetherflow-capture-modal-header';

    const titleElement = document.createElement('h2');
    titleElement.className = 'aetherflow-capture-modal-title';
    titleElement.textContent = 'Save to AetherFlow';

    const controls = document.createElement('div');
    controls.className = 'aetherflow-capture-modal-controls';

    const pinButton = document.createElement('button');
    pinButton.className = 'aetherflow-capture-pin-button aetherflow-modal-control-button';
    pinButton.title = 'Pin window';
    pinButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
            <circle cx="12" cy="10" r="3"></circle>
        </svg>`;

    const closeButton = document.createElement('button');
    closeButton.className = 'aetherflow-capture-close-button aetherflow-modal-control-button';
    closeButton.title = 'Close';
    closeButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>`;

    controls.appendChild(pinButton);
    controls.appendChild(closeButton);
    header.appendChild(titleElement);
    header.appendChild(controls);
    modal.appendChild(header);

    // --- Body ---
    const body = document.createElement('div');
    body.className = 'aetherflow-capture-modal-body';

    const titleArea = document.createElement('div');
    titleArea.className = 'aetherflow-capture-title-area';
    const titleLabel = document.createElement('label');
    titleLabel.htmlFor = 'aetherflow-capture-title';
    titleLabel.textContent = 'Title';
    const titleInputContainer = document.createElement('div');
    titleInputContainer.className = 'aetherflow-capture-title-input-container';
    const titleInput = document.createElement('input');
    titleInput.type = 'text';
    titleInput.id = 'aetherflow-capture-title';
    titleInput.placeholder = 'Enter title (auto-generating...)';
    const titleSpinner = document.createElement('span');
    titleSpinner.className = 'aetherflow-capture-title-spinner';
    titleSpinner.style.display = 'none';
    titleSpinner.innerHTML = '⏳';
    titleInputContainer.appendChild(titleInput);
    titleInputContainer.appendChild(titleSpinner);
    titleArea.appendChild(titleLabel);
    titleArea.appendChild(titleInputContainer);

    const contentArea = document.createElement('div');
    contentArea.className = 'aetherflow-capture-content-area';
    const contentLabel = document.createElement('label');
    contentLabel.htmlFor = 'aetherflow-capture-content';
    contentLabel.textContent = 'Content';
    const contentTextArea = document.createElement('textarea');
    contentTextArea.id = 'aetherflow-capture-content';
    contentArea.appendChild(contentLabel);
    contentArea.appendChild(contentTextArea);

    body.appendChild(titleArea);
    body.appendChild(contentArea);
    modal.appendChild(body);

    // --- Footer ---
    const footer = document.createElement('div');
    footer.className = 'aetherflow-capture-modal-footer';

    const optimizeLink = document.createElement('button');
    optimizeLink.className = 'aetherflow-capture-optimize-link'; // Use link class
    optimizeLink.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.71 0L11.4 9.61a3.54 3.54 0 0 0-1 2.49l.09 1.54 1.54.09a3.54 3.54 0 0 0 2.49-1L21.64 5.35a1.21 1.21 0 0 0 0-1.71Z"/>
            <path d="m14 7 3 3"/><path d="M5 6v4"/><path d="M19 14v4"/><path d="M3 8h4"/><path d="M17 16h4"/><path d="M11 19v-4"/><path d="M7 11H3"/>
        </svg>
        <span>Optimize Content</span>
    `;
    optimizeLink.title = 'Optimize the current content'; // Add tooltip

    const saveButton = document.createElement('button');
    saveButton.className = 'aetherflow-capture-modal-save-button';
    saveButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        <span>Save</span>
    `;

    footer.appendChild(optimizeLink);
    footer.appendChild(saveButton);
    modal.appendChild(footer);

    document.body.appendChild(modal);

    return {
        modal, header, titleInput, contentTextArea, optimizeLink, saveButton,
        pinButton, closeButton, titleSpinner,
        isPinned: false, isDragging: false, offsetX: 0, offsetY: 0
    };
}

// --- Event Handlers ---

function handleSaveClick(): void {
    if (!previewModalState) return;
    const { titleInput, contentTextArea } = previewModalState;
    const title = titleInput.value.trim();
    const content = contentTextArea.value.trim();

    if (!title || !content) {
        showToastNotification('Title and content cannot be empty.', 'error');
        return;
    }

    console.log('Attempting to save:', { title, content });
    chrome.runtime.sendMessage({ type: 'SAVE_PROMPT_CAPTURE', payload: { title, content } }, (response) => {
        if (chrome.runtime.lastError) {
            console.error('Error sending save message:', chrome.runtime.lastError);
            showToastNotification(`Failed to save: ${chrome.runtime.lastError.message || 'Connection error'}`, 'error');
        } else if (response?.success) {
            console.log('Save successful response:', response);
            showToastNotification('Prompt saved successfully!', 'success');
        } else {
            console.error('Save failed response:', response);
            showToastNotification(`Failed to save: ${response?.error || 'Unknown error'}`, 'error');
        }
    });

    hidePreviewModal(); // Close modal after attempting to save
}

function handleOptimizeModalContentClick(): void {
    if (!previewModalState) return;
    const { modal, contentTextArea } = previewModalState;
    const contentToOptimize = contentTextArea.value;

    if (!contentToOptimize.trim()) {
        console.warn('[PreviewModal] Content is empty, nothing to optimize.');
        return;
    }

    console.log('[PreviewModal] Requesting optimization for modal content...');
    modal.classList.add('aetherflow-modal-loading');

    chrome.runtime.sendMessage({ type: 'OPTIMIZE_MODAL_CONTENT', payload: { content: contentToOptimize } }, (response) => {
        if (chrome.runtime.lastError) {
            console.error('[PreviewModal] Error sending OPTIMIZE_MODAL_CONTENT message:', chrome.runtime.lastError);
            showToastNotification(`Optimization request failed: ${chrome.runtime.lastError.message || 'Connection error'}`, 'error');
            modal.classList.remove('aetherflow-modal-loading');
        } else if (response && !response.success) {
            console.error('[PreviewModal] Background failed to process OPTIMIZE_MODAL_CONTENT:', response.error);
            showToastNotification(`Optimization request failed: ${response.error?.message || 'Background error'}`, 'error');
            modal.classList.remove('aetherflow-modal-loading');
        } else {
            console.log('[PreviewModal] OPTIMIZE_MODAL_CONTENT message sent successfully.');
            // Loading state removed by result listener
        }
    });
}

function togglePinModal(): void {
    if (!previewModalState) return;
    previewModalState.isPinned = !previewModalState.isPinned;
    const { modal, pinButton } = previewModalState;
    modal.classList.toggle('aetherflow-modal-pinned', previewModalState.isPinned);
    pinButton.classList.toggle('active', previewModalState.isPinned);
    pinButton.title = previewModalState.isPinned ? 'Unpin window' : 'Pin window';
    console.log('Modal pinned state:', previewModalState.isPinned);
}

function onDragMouseDown(event: MouseEvent): void {
    if (!previewModalState || !(event.target as HTMLElement)?.closest('.aetherflow-capture-modal-header')) {
        return; // Only drag by the header
    }
    const state = previewModalState;
    state.isDragging = true;
    state.offsetX = event.clientX - state.modal.offsetLeft;
    state.offsetY = event.clientY - state.modal.offsetTop;
    state.modal.style.cursor = 'grabbing';
    state.header.style.cursor = 'grabbing'; // Also set on header

    window.addEventListener('mousemove', onDragMouseMove, true);
    window.addEventListener('mouseup', onDragMouseUp, true);
    event.preventDefault();
}

function onDragMouseMove(event: MouseEvent): void {
    if (!previewModalState?.isDragging) return;
    const state = previewModalState;
    let newLeft = event.clientX - state.offsetX;
    let newTop = event.clientY - state.offsetY;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const modalWidth = state.modal.offsetWidth;
    const modalHeight = state.modal.offsetHeight;
    const margin = 5;

    newLeft = Math.max(margin, Math.min(newLeft, viewportWidth - modalWidth - margin));
    newTop = Math.max(margin, Math.min(newTop, viewportHeight - modalHeight - margin));

    state.modal.style.left = `${newLeft}px`;
    state.modal.style.top = `${newTop}px`;
    state.modal.style.transform = 'translate(0, 0)'; // Override the initial centering transform
}

function onDragMouseUp(): void {
    if (!previewModalState?.isDragging) return;
    const state = previewModalState;
    state.isDragging = false;
    state.modal.style.cursor = 'default';
    state.header.style.cursor = 'grab';

    window.removeEventListener('mousemove', onDragMouseMove, true);
    window.removeEventListener('mouseup', onDragMouseUp, true);
}

function handleTitleInput(): void {
    if (!previewModalState) return;
    previewModalState.titleInput.dataset.edited = 'true';
    previewModalState.titleInput.placeholder = 'Enter title';
}

// --- Message Listeners ---
function setupMessageListeners(): void {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (!previewModalState) return false; // Don't handle if modal not initialized

        const { modal, contentTextArea, titleInput, titleSpinner } = previewModalState;

        switch (message.type) {
            case 'MODAL_OPTIMIZATION_RESULT':
                console.log('[PreviewModal] Received MODAL_OPTIMIZATION_RESULT');
                modal.classList.remove('aetherflow-modal-loading');
                const optimizedContent = message.payload?.optimizedContent;
                if (optimizedContent !== undefined) {
                    contentTextArea.value = optimizedContent;
                } else if (message.payload?.error) {
                    console.error('[PreviewModal] Optimization failed:', message.payload.error);
                    showToastNotification(`Optimization failed: ${message.payload.error.message || 'Unknown error'}`, 'error');
                } else {
                    showToastNotification('Optimization failed to update content.', 'error');
                }
                return true; // Async handled

            case 'TITLE_GENERATED':
                console.log('[PreviewModal] Received generated title:', message.payload.title);
                titleSpinner.style.display = 'none';
                if (titleInput.dataset.edited === 'false') {
                    titleInput.value = message.payload.title;
                }
                 // Acknowledge receipt (can send simple success)
                 try {
                     sendResponse({ success: true });
                 } catch (e) {
                     console.warn('[PreviewModal] Could not send response for TITLE_GENERATED.', e);
                 }
                return true; // Indicate async if sendResponse might be called later, otherwise false

            default:
                return false; // Let other listeners handle
        }
    });
}

// --- Initialization and Control ---

function initializeModalState(): PreviewModalState {
    const elements = createModalElements();
    previewModalState = elements;

    // Add event listeners
    elements.saveButton.addEventListener('click', handleSaveClick);
    elements.optimizeLink.addEventListener('click', handleOptimizeModalContentClick);
    elements.pinButton.addEventListener('click', togglePinModal);
    elements.closeButton.addEventListener('click', hidePreviewModal);
    elements.header.addEventListener('mousedown', onDragMouseDown);
    elements.titleInput.addEventListener('input', handleTitleInput);

    // Stop propagation on modal clicks to prevent closing when clicking inside
    elements.modal.addEventListener('mousedown', (e) => {
        // Allow drag initiation on header
        if (!(e.target as HTMLElement)?.closest('.aetherflow-capture-modal-header')) {
            e.stopPropagation();
        }
    });

    setupMessageListeners(); // Setup listeners once
    return elements;
}

export function hidePreviewModal(): void {
    if (!previewModalState) return;
    const { modal, titleInput, contentTextArea, titleSpinner } = previewModalState;
    modal.style.display = 'none';
    // Reset fields and state
    titleInput.value = '';
    contentTextArea.value = '';
    titleSpinner.style.display = 'none';
    titleInput.dataset.edited = 'false';
    // Reset position if needed
    modal.style.left = '50%';
    modal.style.top = '50%';
    modal.style.transform = 'translate(-50%, -50%)';

    console.log('Hiding preview modal');
}

export function showPreviewModal(selectedText: string): void {
    if (!previewModalState) {
        previewModalState = initializeModalState();
    }
    const { modal, titleInput, contentTextArea, titleSpinner, pinButton } = previewModalState;

    // Reset state on show
    previewModalState.isPinned = false;
    modal.classList.remove('aetherflow-modal-pinned', 'aetherflow-modal-loading');
    pinButton.classList.remove('active');
    pinButton.title = 'Pin window';

    // Reset position and transform before showing
    modal.style.left = '50%';
    modal.style.top = '50%';
    modal.style.transform = 'translate(-50%, -50%)';
    modal.style.cursor = 'default';
    previewModalState.header.style.cursor = 'grab';

    // Populate content
    contentTextArea.value = selectedText;

    // Set temporary title and prepare for auto-generation
    const tempTitle = selectedText.substring(0, 50).trim().replace(/\n/g, ' ') + (selectedText.length > 50 ? '...' : '');
    titleInput.value = tempTitle;
    titleInput.placeholder = 'Generating title...';
    titleInput.dataset.edited = 'false';

    titleInput.focus();
    titleInput.select();

    // Show spinner and request title generation
    titleSpinner.style.display = 'inline-block';
    console.log('[PreviewModal] Requesting title generation...');
    chrome.runtime.sendMessage({ type: 'GENERATE_TITLE', payload: { content: selectedText } }, (response) => {
        if (chrome.runtime.lastError) {
            console.error('[PreviewModal] Error sending GENERATE_TITLE message:', chrome.runtime.lastError);
            titleSpinner.style.display = 'none';
            titleInput.placeholder = 'Enter title';
        } else {
            console.log('[PreviewModal] GENERATE_TITLE message sent, response:', response);
            // Result handled by listener
        }
    });

    // Show the modal
    modal.style.display = 'flex';
    console.log('Showing preview modal');
}

// Note: The global listener in capture.ts (handleMouseDown) still handles closing the modal
// when clicking outside, checking previewModalState.isPinned. 