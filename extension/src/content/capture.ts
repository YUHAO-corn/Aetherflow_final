// AetherFlow Capture Feature - Content Script Logic
import '../styles/captureUI.css'; // Import CSS for webpack

console.log('AetherFlow Capture script loaded.');

let floatingToolbar: HTMLDivElement | null = null;
let previewModal: { modal: HTMLDivElement; isPinned: boolean } | null = null; 
let currentSelection: Selection | null = null;

/**
 * Initializes the capture feature.
 * Sets up event listeners and message listeners.
 */
export function initCaptureFeature(): void {
  console.log('Initializing AetherFlow Capture Feature...');

  // --- Event Listeners for UI --- 
  document.addEventListener('mouseup', handleMouseUp, true);
  document.addEventListener('mousedown', handleMouseDown, true);

  // --- Message Listener from Background/Popup --- 
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('[Capture Script] Received message:', message);
    if (message.type === 'SHOW_CAPTURE_MODAL_FROM_CONTEXT') {
        if (message.payload && message.payload.content) {
            console.log('[Capture Script] Handling SHOW_CAPTURE_MODAL_FROM_CONTEXT');
            // Ensure any existing toolbar is hidden
            hideFloatingToolbar(); 
            // Show the preview modal with the provided content
            showPreviewModal(message.payload.content);
            sendResponse({ success: true });
        } else {
            console.error('[Capture Script] Invalid payload for SHOW_CAPTURE_MODAL_FROM_CONTEXT');
            sendResponse({ success: false, error: 'Invalid payload' });
        }
        return true; // Indicate async response if needed, though showing modal is mostly sync
    } else if (message.type === 'TITLE_GENERATED') {
        console.log('[Capture Script] Received generated title:', message.payload.title);
        if (previewModal) {
            const titleInput = previewModal.modal.querySelector('#aetherflow-capture-title') as HTMLInputElement;
            const titleSpinner = previewModal.modal.querySelector('.aetherflow-capture-title-spinner') as HTMLSpanElement;

            if (titleSpinner) {
                titleSpinner.style.display = 'none'; // Hide spinner
            }
            if (titleInput) {
                // Only update if user hasn't manually edited the title
                if (titleInput.dataset.edited === 'false') {
                    titleInput.value = message.payload.title;
                }
            }
        }
        sendResponse({ success: true }); // Acknowledge receipt
        return true;
    } else if (message.type === 'PING') {
        // Respond to PING from background to indicate script is ready
        console.log('[Capture Script] Received PING, sending PONG');
        sendResponse({ type: 'PONG' });
        return true; // Important to return true for async/sync response
    }
    // Handle other message types if needed
    // Return false or nothing if not handling the message or response is synchronous
    // return false; 
  });

  // Send ready message to background on initialization
  // Use a slight delay to ensure background listener is ready
  setTimeout(() => {
      chrome.runtime.sendMessage({ type: 'CONTENT_SCRIPT_READY', data: { url: window.location.href } }).catch(err => {
          console.warn('[Capture Script] Could not send ready message to background:', err);
      });
  }, 100); 
  
}

/**
 * Handles the mouseup event to detect text selection.
 * @param event The MouseEvent object.
 */
function handleMouseUp(event: MouseEvent): void {
  // Debounce or throttle might be needed here if logic becomes complex
  const selection = window.getSelection();

  if (selection && selection.toString().trim().length > 0) {
    currentSelection = selection;
    // Check if selection is inside an input/textarea? Maybe disable there.
    console.log('Text selected:', selection.toString());
    showFloatingToolbar(selection, event);
  } else {
    // If no text is selected, ensure the toolbar is hidden
    // This might be redundant if handleMouseDown covers it
    hideFloatingToolbar();
  }
}

/**
 * Handles the mousedown event to hide the toolbar/modal when clicking outside.
 * @param event The MouseEvent object.
 */
function handleMouseDown(event: MouseEvent): void {
  // Hide Toolbar if click is outside
  if (floatingToolbar && !floatingToolbar.contains(event.target as Node)) {
    const captureButton = floatingToolbar.querySelector('.aetherflow-capture-action-button');
    if (!captureButton || !captureButton.contains(event.target as Node)) {
         hideFloatingToolbar();
    }
  }

  // Hide Modal ONLY if it exists, is NOT pinned, and the click is OUTSIDE the modal content
  if (previewModal && !previewModal.isPinned && !previewModal.modal.contains(event.target as Node)) {
     console.log('Click detected outside unpinned modal, hiding...');
     hidePreviewModal();
   }
}

/**
 * Creates or gets the floating toolbar DOM element.
 * @returns The floating toolbar element.
 */
function getOrCreateFloatingToolbar(): HTMLDivElement {
  if (!floatingToolbar) {
    floatingToolbar = document.createElement('div');
    floatingToolbar.className = 'aetherflow-capture-toolbar';
    floatingToolbar.innerHTML = ''; // Clear potential previous content

    // 1. Disable Button (Always visible, leftmost)
    const disableButton = document.createElement('button');
    disableButton.className = 'aetherflow-capture-disable-button';
    disableButton.title = 'Turn off AetherFlow on this site'; // Tooltip
    // Replace Power icon with X icon (Feather icons)
    disableButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
    `;
    disableButton.addEventListener('click', handleDisableSiteClick);
    floatingToolbar.appendChild(disableButton); // Add directly to toolbar

    // 2. Capture Button (Main action)
    const captureButton = document.createElement('button');
    captureButton.className = 'aetherflow-capture-action-button';
    captureButton.title = 'Capture to AetherFlow';
    // BookmarkPlus icon (Needs fill for new style)
    captureButton.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none">
        <path d="m19 21-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>
        <line x1="12" x2="12" y1="7" y2="13" stroke="white" stroke-width="2"/> 
        <line x1="9" x2="15" y1="10" y2="10" stroke="white" stroke-width="2"/>
      </svg>
    `; // Note: plus sign lines need explicit stroke color (white)
    captureButton.addEventListener('click', handleCaptureClick);
    floatingToolbar.appendChild(captureButton);

    // 3. Logo Button (Trigger for disable, link?)
    const logoButton = document.createElement('button'); // Using button for hover interaction
    logoButton.className = 'aetherflow-capture-logo-button';
    logoButton.title = 'Open AetherFlow'; // Or just 'AetherFlow'
    // Sparkles icon (Needs fill)
    logoButton.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none">
         <path d="M12 2l2.24 7.37L22 12l-7.37 2.24L12 22l-2.24-7.37L2 12l7.37-2.24L12 2zM8.5 4.5l-1 3 3 1 -1 3 3-1 1 3 1-3 3 1 -3-1 1-3 -3 1 -1-3zM15.5 15.5l-1 3 3 1 -1 3 3-1 1 3 1-3 3 1 -3-1 1-3 -3 1 -1-3z"/> 
      </svg>
    `;
    logoButton.addEventListener('click', handleLogoClick);

    floatingToolbar.appendChild(logoButton);

    document.body.appendChild(floatingToolbar);
  }
  return floatingToolbar;
}

/**
 * Shows the floating toolbar near the selected text, positioned relative to mouseup event.
 * @param selection The current text Selection object.
 * @param event The triggering MouseEvent (for positioning).
 */
function showFloatingToolbar(selection: Selection, event: MouseEvent): void {
  const toolbar = getOrCreateFloatingToolbar();
  if (!toolbar) return; // Should not happen, but good practice

  // --- Calculate Position (Relative to Mouse Up Event) --- //
  const scrollX = window.scrollX;
  const scrollY = window.scrollY;
  const toolbarHeight = toolbar.offsetHeight;
  const toolbarWidth = toolbar.offsetWidth;
  const margin = 5; // Small margin from selection/cursor

  // Get selection bounds for vertical positioning check
  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();

  // --- Vertical Positioning --- 
  // Decide if toolbar should be above or below the selection based on space
  let top: number;
  const spaceAbove = rect.top; // Space between selection top and viewport top
  const spaceBelow = window.innerHeight - rect.bottom; // Space between selection bottom and viewport bottom

  if (spaceAbove >= toolbarHeight + margin) {
    // Prefer position above the *selection range*
    top = rect.top + scrollY - toolbarHeight - margin;
  } else if (spaceBelow >= toolbarHeight + margin) {
    // Place below the *selection range*
    top = rect.bottom + scrollY + margin;
  } else {
    // Fallback: Place above the cursor position if space allows, else below cursor
    // This helps if the selection spans the whole screen height
    if (event.clientY >= toolbarHeight + margin) {
        top = event.clientY + scrollY - toolbarHeight - margin;
    } else {
        top = event.clientY + scrollY + margin;
    }
  }
  // Ensure top position stays within vertical viewport bounds (considering scroll)
  top = Math.max(scrollY, top);
  top = Math.min(top, scrollY + window.innerHeight - toolbarHeight);


  // --- Horizontal Positioning --- 
  // Center the toolbar horizontally based on the mouse cursor's X position
  let left = event.clientX + scrollX - toolbarWidth / 2;

  // Ensure left position stays within horizontal viewport bounds
  const minLeft = scrollX;
  const maxLeft = scrollX + window.innerWidth - toolbarWidth;
  left = Math.max(minLeft, Math.min(left, maxLeft));

  // Apply styles
  toolbar.style.top = `${top}px`;
  toolbar.style.left = `${left}px`;
  toolbar.style.display = 'block';
  console.log('Showing toolbar relative to mouseup at', { top, left });
}

/**
 * Hides the floating toolbar.
 */
function hideFloatingToolbar(): void {
  if (floatingToolbar) {
    floatingToolbar.style.display = 'none';

    console.log('Hiding toolbar');
  }
}

/**
 * Handles the click event on the capture button in the floating toolbar.
 */
function handleCaptureClick(): void {
  console.log('Capture button clicked');
  if (currentSelection) {
    const selectedText = currentSelection.toString();
    hideFloatingToolbar(); // Hide toolbar before showing modal
    showPreviewModal(selectedText);
  } else {
    console.error('No selection found when capture clicked.');
  }
}

// --- Preview Modal Functions --- //

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
function showPreviewModal(selectedText: string): void {
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

/**
 * Hides the preview modal.
 */
function hidePreviewModal(): void {
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
 * Displays a short-lived toast notification on the page.
 * @param message The message to display.
 * @param type The type of notification ('success' or 'error').
 */
function showToastNotification(message: string, type: 'success' | 'error'): void {
  // Remove any existing toast first
  const existingToast = document.querySelector('.aetherflow-toast-notification');
  if (existingToast) {
    existingToast.remove();
  }

  const toast = document.createElement('div');
  toast.className = `aetherflow-toast-notification ${type}`;
  
  // Simple icon based on type
  const icon = type === 'success' ? '✓' : '✗';
  toast.textContent = `${icon} ${message}`;

  document.body.appendChild(toast);

  // Animate in
  requestAnimationFrame(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateY(0)';
  });

  // Auto dismiss after 3 seconds
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(20px)';
    // Remove from DOM after animation
    toast.addEventListener('transitionend', () => {
      if (toast.parentNode) {
        toast.remove();
      }
    });
  }, 3000);
}

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

// Add Placeholder Handlers for new buttons

/**
 * Handles the click event on the disable button.
 * TODO: Implement logic to disable on site (send message to background).
 */
function handleDisableSiteClick(): void {
  console.log('Disable on this site clicked');
  alert('Disable functionality not yet implemented.'); // Placeholder feedback
  hideFloatingToolbar(); // Hide after click
}

/**
 * Handles the click event on the logo button.
 * TODO: Implement logic to open AetherFlow (e.g., extension popup or options page).
 */
function handleLogoClick(): void {
  console.log('Logo clicked - requesting sidebar open');
  // Send message to background script to open the side panel
  chrome.runtime.sendMessage({ type: 'OPEN_SIDEBAR' }, (response) => {
    if (chrome.runtime.lastError) {
      console.error('Error sending OPEN_SIDEBAR message:', chrome.runtime.lastError);
      // Maybe provide fallback feedback if messaging fails
    } else {
      console.log('OPEN_SIDEBAR message sent, response:', response);
    }
  });
  // Decide whether to hide the toolbar immediately or not.
  // Usually opening the sidebar doesn't require hiding the trigger.
  // hideFloatingToolbar(); 
}

// --- Initialization Call --- //
// Ensure the script runs only in the top frame, or handle frames appropriately
if (window.self === window.top) {
    // Call init function
    initCaptureFeature();
} else {
    console.log('[Capture Script] Running in iframe, capture feature may be limited or disabled.');
    // Optionally initialize limited functionality or specific listeners for iframes
} 