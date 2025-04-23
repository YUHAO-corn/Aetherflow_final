import { showToastNotification } from './toastNotification';

export let previewModal: { modal: HTMLDivElement; isPinned: boolean } | null = null;

/**
 * Handles the click event on the save button in the preview modal.
 */
function handleSaveClick(): void {
  console.log('Save button clicked');
  const titleInput = previewModal?.modal.querySelector('#aetherflow-capture-title') as HTMLInputElement;
  const contentTextarea = previewModal?.modal.querySelector('#aetherflow-capture-content') as HTMLTextAreaElement;

  if (titleInput && contentTextarea) {
    const title = titleInput.value.trim();
    const content = contentTextarea.value.trim();

    if (!title || !content) {
      // Use toast for validation error too
      showToastNotification('Title and content cannot be empty.', 'error');
      // alert('Title and content cannot be empty.'); // Remove alert
      return;
    }

    console.log('Attempting to save:', { title, content });
    chrome.runtime.sendMessage({ type: 'SAVE_PROMPT_CAPTURE', payload: { title, content } }, (response) => {
        if (chrome.runtime.lastError) {
            console.error('Error sending message:', chrome.runtime.lastError);
            showToastNotification(`Failed to save: ${chrome.runtime.lastError.message || 'Connection error'}`, 'error');
            // alert('Failed to save prompt. See console for details.'); // Remove alert
        } else if (response && response.success) {
            console.log('Save successful response:', response);
            showToastNotification('Prompt saved successfully!', 'success');
            // Maybe show a success notification?
            // alert('Prompt saved successfully!'); // Remove alert
        } else {
            console.error('Save failed response:', response);
            showToastNotification(`Failed to save: ${response?.error || 'Unknown error'}`, 'error');
            // alert(`Failed to save prompt: ${response?.error || 'Unknown error'}`); // Remove alert
        }
    });

    hidePreviewModal(); // Close modal after attempting to save
  } else {
    console.error('Could not find title or content fields in modal.');
    // Optionally show an error toast here too if fields are missing
    showToastNotification('Internal error: Could not find input fields.', 'error');
  }
}

/**
 * Toggles the pinned state of the preview modal.
 */
function togglePinModal(): void {
    if (!previewModal) return;
    previewModal.isPinned = !previewModal.isPinned;
    console.log('Modal pinned state:', previewModal.isPinned);

    const pinButton = previewModal.modal.querySelector('.aetherflow-capture-pin-button') as HTMLButtonElement | null;
    if (pinButton) {
        pinButton.classList.toggle('active', previewModal.isPinned);
        pinButton.title = previewModal.isPinned ? 'Unpin window' : 'Pin window';
    }
}

/**
 * Hides the preview modal.
 */
export function hidePreviewModal(): void {
  if (previewModal) {
    // Hide the modal directly
    previewModal.modal.style.display = 'none';
    console.log('Hiding preview modal');

    // Clear fields after hiding
    const titleInput = previewModal.modal.querySelector('#aetherflow-capture-title') as HTMLInputElement;
    const contentTextarea = previewModal.modal.querySelector('#aetherflow-capture-content') as HTMLTextAreaElement;
    const titleSpinner = previewModal.modal.querySelector('.aetherflow-capture-title-spinner') as HTMLSpanElement;
    if(titleInput) titleInput.value = '';
    if(contentTextarea) contentTextarea.value = '';
    if(titleSpinner) titleSpinner.style.display = 'none'; // Ensure spinner is hidden
  }
}

/**
 * Creates or gets the preview modal DOM element structure.
 * Returns the modal state object { modal, isPinned }.
 */
function getOrCreatePreviewModal(): { modal: HTMLDivElement; isPinned: boolean } {
  if (!previewModal) {
    // --- Create Modal Box --- 
    const modal = document.createElement('div');
    modal.className = 'aetherflow-capture-modal';
    // Click handler for closing moved to global handleMouseDown
    // Stop propagation is not strictly needed now but harmless
    modal.addEventListener('mousedown', (e) => e.stopPropagation());

    // --- Header --- 
    const header = document.createElement('div');
    header.className = 'aetherflow-capture-modal-header';

    const titleElement = document.createElement('h2');
    titleElement.className = 'aetherflow-capture-modal-title';
    titleElement.textContent = 'Save to AetherFlow';

    const controls = document.createElement('div');
    controls.className = 'aetherflow-capture-modal-controls';

    const pinButton = document.createElement('button') as HTMLButtonElement;
    pinButton.className = 'aetherflow-capture-pin-button aetherflow-modal-control-button';
    pinButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
            <circle cx="12" cy="10" r="3"></circle>
        </svg>`;
    pinButton.title = 'Pin window';
    pinButton.addEventListener('click', togglePinModal);

    const closeButton = document.createElement('button') as HTMLButtonElement;
    closeButton.className = 'aetherflow-capture-close-button aetherflow-modal-control-button';
    closeButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>`;
    closeButton.title = 'Close';
    closeButton.addEventListener('click', hidePreviewModal);

    controls.appendChild(pinButton);
    controls.appendChild(closeButton);
    header.appendChild(titleElement);
    header.appendChild(controls);
    modal.appendChild(header);

    // --- Body --- 
    const body = document.createElement('div');
    body.className = 'aetherflow-capture-modal-body';

    // Title Input Area
    const titleArea = document.createElement('div');
    titleArea.className = 'aetherflow-capture-title-area';
    const titleLabel = document.createElement('label');
    titleLabel.htmlFor = 'aetherflow-capture-title';
    titleLabel.textContent = 'Title';
    const titleInputContainer = document.createElement('div'); // Container for input and spinner
    titleInputContainer.className = 'aetherflow-capture-title-input-container';
    const titleInput = document.createElement('input');
    titleInput.type = 'text';
    titleInput.id = 'aetherflow-capture-title';
    titleInput.placeholder = 'Enter title (auto-generating...)'; // Placeholder indicates generation
    const titleSpinner = document.createElement('span') as HTMLSpanElement;
    titleSpinner.className = 'aetherflow-capture-title-spinner';
    titleSpinner.style.display = 'none';
    titleSpinner.innerHTML = '⏳';

    titleInputContainer.appendChild(titleInput);
    titleInputContainer.appendChild(titleSpinner);
    titleArea.appendChild(titleLabel);
    titleArea.appendChild(titleInputContainer);
    body.appendChild(titleArea);

    // Content Textarea
    const contentArea = document.createElement('div');
    const contentLabel = document.createElement('label');
    contentLabel.htmlFor = 'aetherflow-capture-content';
    contentLabel.textContent = 'Content';
    const contentTextarea = document.createElement('textarea');
    contentTextarea.id = 'aetherflow-capture-content';
    contentArea.appendChild(contentLabel);
    contentArea.appendChild(contentTextarea);
    body.appendChild(contentArea);

    modal.appendChild(body);

    // --- Footer --- 
    const footer = document.createElement('div');
    footer.className = 'aetherflow-capture-modal-footer';
    const saveButton = document.createElement('button');
    saveButton.className = 'aetherflow-capture-modal-save-button';
    // Add Checkmark Icon + Text
    saveButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        <span>Save</span>
    `;
    saveButton.addEventListener('click', handleSaveClick);
    footer.appendChild(saveButton);
    modal.appendChild(footer);

    // --- Final Assembly --- 
    // Append modal directly to body
    document.body.appendChild(modal);
    
    // Initialize state without overlay
    previewModal = { modal, isPinned: false }; 
  }
  return previewModal;
}

/**
 * Shows the preview modal with the selected text and sets temporary title.
 * Also initiates title generation.
 * @param selectedText The text selected by the user.
 */
export function showPreviewModal(selectedText: string): void {
  const modalState = getOrCreatePreviewModal();
  const titleInput = modalState.modal.querySelector('#aetherflow-capture-title') as HTMLInputElement;
  const contentTextarea = modalState.modal.querySelector('#aetherflow-capture-content') as HTMLTextAreaElement;
  const titleSpinner = modalState.modal.querySelector('.aetherflow-capture-title-spinner') as HTMLSpanElement;

  // Reset pinned state on show
  if (modalState.isPinned) {
      modalState.isPinned = false; // Force unpin on show
      const pinButton = modalState.modal.querySelector('.aetherflow-capture-pin-button') as HTMLButtonElement | null;
       if (pinButton) {
           pinButton.classList.remove('active');
           pinButton.title = 'Pin window';
       }
  }

  // Populate content
  if (contentTextarea) {
    contentTextarea.value = selectedText;
  }

  // Set temporary title and prepare for auto-generation
  if (titleInput) {
    const tempTitle = selectedText.substring(0, 50).trim().replace(/\n/g, ' ') + (selectedText.length > 50 ? '...' : '');
    titleInput.value = tempTitle;
    titleInput.placeholder = 'Generating title...'; // Update placeholder
    titleInput.dataset.edited = 'false'; // Reset edited state
    
    // Clear previous listener if any
    titleInput.oninput = null; 
    // Add listener to track user edits
    titleInput.oninput = () => {
        titleInput.dataset.edited = 'true';
        titleInput.placeholder = 'Enter title'; // Change placeholder after edit
        // Optionally remove the listener after first edit if desired
        // titleInput.oninput = null; 
    };

    titleInput.focus();
    titleInput.select(); 
  }
  
  // Show spinner and request title generation
  if (titleSpinner) {
    titleSpinner.style.display = 'inline-block'; // Show spinner
  }
  console.log('[Capture Script] Requesting title generation for content length:', selectedText.length);
  chrome.runtime.sendMessage({ type: 'GENERATE_TITLE', payload: { content: selectedText } }, (response) => {
      if (chrome.runtime.lastError) {
          console.error('[Capture Script] Error sending GENERATE_TITLE message:', chrome.runtime.lastError);
          // Handle error - maybe hide spinner and show default placeholder?
          if (titleSpinner) titleSpinner.style.display = 'none';
          if (titleInput) titleInput.placeholder = 'Enter title';
      } else {
          console.log('[Capture Script] GENERATE_TITLE message sent, response:', response); 
          // Response handling is done in the TITLE_GENERATED listener
      }
  });

  // Show the modal directly
  modalState.modal.style.display = 'flex'; 
  console.log('Showing preview modal directly');
} 