import {
    currentSelection,
    // showPreviewModal, // No longer needed here
    // getOrCreateOptimizationPopup, // Moved to optimizationPopup
    // hideOptimizationPopup, // We define hideOptimizationPopup locally
} from './capture';
import { showPreviewModal } from './previewModal'; // Correct import path
import { getOrCreateOptimizationPopup, hideOptimizationPopup, showOptimizationPopup } from './optimizationPopup'; // Import from new file

export let floatingToolbar: HTMLDivElement | null = null;

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

/**
 * Placeholder handler for the Optimize button click.
 * TODO: Implement optimization request logic and show popup on result.
 */
function handleOptimizeClick(event: MouseEvent): void {
    console.log('Optimize button clicked');
    
    // Get button and its position *before* hiding the toolbar
    const optimizeButton = event.currentTarget as HTMLButtonElement;
    if (!optimizeButton) {
        console.error('Could not find the optimize button element.');
        return;
    }
    const buttonRect = optimizeButton.getBoundingClientRect();

    // Get the selected text
    const selectedText = currentSelection ? currentSelection.toString() : null;
    if (!selectedText) {
        console.error('No text selected for optimization.');
        // Optionally show a user message here
        hideFloatingToolbar();
        return;
    }

    // Now hide the toolbar
    hideFloatingToolbar();

    // --- Send message to background script --- 
    console.log('[Content Script] Sending OPTIMIZE_SELECTION for:', selectedText.substring(0, 100) + '...');
    chrome.runtime.sendMessage({ type: 'OPTIMIZE_SELECTION', payload: { content: selectedText } }, (response) => {
        if (chrome.runtime.lastError) {
            console.error('[Content Script] Error sending OPTIMIZE_SELECTION message:', chrome.runtime.lastError);
            // Handle error - maybe show an error toast?
        } else {
            console.log('[Content Script] OPTIMIZE_SELECTION message sent, response:', response);
            // Response might indicate acceptance, actual result comes later via another message
        }
    });

    // --- Show the popup (maybe initially with a loading state later) ---
    // For now, just show it immediately after sending the message
    showOptimizationPopup(buttonRect);
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
    // X icon (Feather icons)
    disableButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
    `;
    disableButton.addEventListener('click', handleDisableSiteClick);
    floatingToolbar.appendChild(disableButton);

    // 2. Capture Button (Main action)
    const captureButton = document.createElement('button');
    captureButton.className = 'aetherflow-capture-action-button';
    captureButton.title = 'Capture to AetherFlow';
    // BookmarkPlus icon (Needs fill for new style)
    captureButton.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none">
        <path d="m19 21-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>
        <line x1="12" x2="12" y1="7" y2="13" stroke="var(--aetherflow-toolbar-bg, white)" stroke-width="2"/>
        <line x1="9" x2="15" y1="10" y2="10" stroke="var(--aetherflow-toolbar-bg, white)" stroke-width="2"/>
      </svg>
    `;
    captureButton.addEventListener('click', handleCaptureClick);
    floatingToolbar.appendChild(captureButton);

    // 3. Optimize Button (New)
    const optimizeButton = document.createElement('button');
    optimizeButton.className = 'aetherflow-capture-optimize-button';
    optimizeButton.title = 'Optimize selection';
    // Magic Wand icon (e.g., Wand-2 from Feather/Lucide)
    optimizeButton.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.71 0L11.4 9.61a3.54 3.54 0 0 0-1 2.49l.09 1.54 1.54.09a3.54 3.54 0 0 0 2.49-1L21.64 5.35a1.21 1.21 0 0 0 0-1.71Z"/>
        <path d="m14 7 3 3"/>
        <path d="M5 6v4"/><path d="M19 14v4"/>
        <path d="M3 8h4"/><path d="M17 16h4"/>
        <path d="M11 19v-4"/><path d="M7 11H3"/>
      </svg>
    `;
    optimizeButton.addEventListener('click', handleOptimizeClick);
    floatingToolbar.appendChild(optimizeButton);

    // 4. Logo Button (Rightmost)
    const logoButton = document.createElement('button');
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
export function showFloatingToolbar(selection: Selection, event: MouseEvent): void {
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
export function hideFloatingToolbar(): void {
  if (floatingToolbar) {
    floatingToolbar.style.display = 'none';
    console.log('Hiding toolbar');
  }
} 