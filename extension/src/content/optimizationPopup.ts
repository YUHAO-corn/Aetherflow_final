import { showToast } from './toast'; // Assuming toast is used for copy feedback

export let optimizePopupElement: HTMLDivElement | null = null;

// --- Message Listener --- 
// Listen for results from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'OPTIMIZATION_RESULT') {
        // --- More Detailed Logging --- 
        console.log('[AetherFlow Popup Listener] Received OPTIMIZATION_RESULT.');
        const optimizedContent = message.payload?.optimizedContent;
        console.log('[AetherFlow Popup Listener] Content payload:', optimizedContent ? optimizedContent.substring(0,100) + '...' : '[EMPTY]');

        if (optimizedContent) {
            // Ensure the popup exists
            const popup = getOrCreateOptimizationPopup(); 
            // Find the content element within the popup
            const contentElement = popup.querySelector<HTMLDivElement>('.aetherflow-optimize-popup-content');
            
            // Log the state of the content element BEFORE trying to update
            console.log('[AetherFlow Popup Listener] Content element BEFORE update:', contentElement); 
            
            if (contentElement) { // Check if element was found
                console.log('[AetherFlow Popup Listener] Attempting to set textContent...');
                contentElement.textContent = optimizedContent;
                // Log the textContent AFTER setting it to verify
                console.log('[AetherFlow Popup Listener] Content element textContent AFTER update:', contentElement.textContent ? contentElement.textContent.substring(0,100) + '...' : '[EMPTY]');
                
                 // Optional: Scroll to top if content is long
                 contentElement.scrollTop = 0;
                 console.log('[AetherFlow Popup Listener] Set content and scroll top.');
            } else {
                console.error('[AetherFlow Popup Listener] Cannot set content because content element (.aetherflow-optimize-popup-content) not found within popup!');
            }
        } else {
            console.warn('[AetherFlow Popup Listener] Received optimization result but content is missing or empty.');
             // Optionally display an error message in the popup
             const popup = getOrCreateOptimizationPopup();
             const contentElement = popup.querySelector<HTMLDivElement>('.aetherflow-optimize-popup-content');
             if (contentElement) {
                 contentElement.textContent = 'Optimization failed. Please try again.';
                 console.log('[AetherFlow Popup Listener] Displayed failure message.');
             } else {
                 console.error('[AetherFlow Popup Listener] Cannot display failure message because content element not found.');
             }
        }
        return true; // Indicates message handled
    }
    return false; // Let other listeners handle messages not meant for this script
});

/**
 * Placeholder function to handle copying optimized text.
 * TODO: Implement copy logic.
 */
function handleCopyOptimizedText(event: MouseEvent): void {
  const copyButton = event.currentTarget as HTMLButtonElement;
  if (!copyButton || !optimizePopupElement) return;

  const contentArea = optimizePopupElement.querySelector('.aetherflow-optimize-popup-content');
  if (contentArea) {
    const originalButtonHTML = copyButton.innerHTML;
    const textToCopy = contentArea.textContent || '';

    navigator.clipboard.writeText(textToCopy).then(() => {
      console.log('Optimized text copied!');
      // Change button to checkmark
      copyButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        <span>Copied!</span>`; // Optional: Change text too
      copyButton.disabled = true;

      // Restore button after a delay
      setTimeout(() => {
        copyButton.innerHTML = originalButtonHTML;
        copyButton.disabled = false;
      }, 1500); 
      
      // Remove alert and automatic hiding
      // alert('Copied!'); 
      // hideOptimizationPopup(); 

    }).catch(err => {
      console.error('Failed to copy text: ', err);
      alert('Failed to copy.'); // Keep alert for failure for now
    });
  }
}

/**
 * Placeholder function to hide the optimization popup.
 * TODO: Implement hiding logic.
 */
export function hideOptimizationPopup(): void {
  if (optimizePopupElement) {
    optimizePopupElement.style.display = 'none';
    console.log('[Capture Script] Hiding optimization popup.');
  }
}

/**
 * Shows the optimization popup near the specified button coordinates,
 * ensuring it stays within the viewport.
 * @param buttonRect The DOMRect of the button that triggered the popup.
 */
export function showOptimizationPopup(buttonRect: DOMRect): void {
    const popup = getOrCreateOptimizationPopup();
    if (!popup) return;

    // Ensure popup is visible to measure dimensions, but keep off-screen initially
    popup.style.visibility = 'hidden';
    popup.style.display = 'block'; 
    // It's crucial dimensions are calculated after display is block and styles applied
    // requestAnimationFrame might help ensure layout is done, but often direct access works
    const popupWidth = popup.offsetWidth;
    const popupHeight = popup.offsetHeight;
    popup.style.display = 'none'; // Hide again before positioning
    popup.style.visibility = 'visible';

    if (popupWidth === 0 || popupHeight === 0) {
        console.warn('[AetherFlow Popup] Could not get valid popup dimensions. Aborting positioning.');
        return;
    }

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const margin = 10; // Minimum margin from viewport edges
    const triggerMargin = 5; // Distance from the button

    // --- Calculate Ideal Positions --- 
    // Default: Below the button, horizontally centered relative to the button
    let idealTop = buttonRect.bottom + triggerMargin;
    let idealLeft = buttonRect.left + (buttonRect.width / 2) - (popupWidth / 2);

    // Alternative: Above the button
    let alternativeTop = buttonRect.top - popupHeight - triggerMargin;

    // --- Choose Vertical Position --- 
    let finalTop = idealTop;
    // Check if placing below goes off-screen bottom
    if (idealTop + popupHeight + margin > viewportHeight) {
        // If placing below fails, try placing above
        if (alternativeTop - margin >= 0) { // Check if placing above fits
            finalTop = alternativeTop;
        } else {
            // If neither above nor below fits well, place it aligned with top edge (or bottom if really tall)
            finalTop = margin;
            // If the popup is taller than the viewport space, allow it to align top
            if (popupHeight + 2 * margin > viewportHeight) {
                 finalTop = margin;
            } else {
                 // Try to push it down slightly if it fits
                 finalTop = Math.max(margin, viewportHeight - popupHeight - margin);
            }
        }
    }
    // Ensure it doesn't go off-screen top regardless of calculation
    finalTop = Math.max(margin, finalTop);

    // --- Adjust Horizontal Position --- 
    let finalLeft = idealLeft;
    // Check if goes off-screen right
    if (finalLeft + popupWidth + margin > viewportWidth) {
        finalLeft = viewportWidth - popupWidth - margin;
    }
    // Check if goes off-screen left
    if (finalLeft < margin) {
        finalLeft = margin;
    }
    // Ensure it stays within bounds after adjustments
    finalLeft = Math.max(margin, Math.min(finalLeft, viewportWidth - popupWidth - margin));

    // --- Apply Final Position and Show --- 
    popup.style.top = `${finalTop}px`;
    popup.style.left = `${finalLeft}px`;
    popup.style.display = 'block';

    // Fade-in effect
    popup.style.opacity = '0';
    requestAnimationFrame(() => {
        popup.style.transition = 'opacity 0.2s ease-out';
        popup.style.opacity = '1';
    });

    console.log(`[AetherFlow Popup] Showing optimization popup. Trigger Button Rect:`, buttonRect);
    console.log(`[AetherFlow Popup] Viewport: ${viewportWidth}x${viewportHeight}, Popup: ${popupWidth}x${popupHeight}`);
    console.log(`[AetherFlow Popup] Calculated Position: top=${finalTop}, left=${finalLeft}`);
}

/**
 * Creates or gets the optimization result popup DOM element.
 * @returns The popup DOM element.
 */
export function getOrCreateOptimizationPopup(): HTMLDivElement {
  if (!optimizePopupElement) {
    console.log('[Capture Script] Creating optimization result popup element.');
    optimizePopupElement = document.createElement('div');
    optimizePopupElement.className = 'aetherflow-optimize-popup';
    optimizePopupElement.style.position = 'fixed'; 
    optimizePopupElement.style.display = 'none'; // Hidden by default

    // Prevent clicks inside the popup from closing it via the global listener
    optimizePopupElement.addEventListener('mousedown', (e) => e.stopPropagation());

    // --- Popup Header (Optional, for close button) ---
    const header = document.createElement('div');
    header.className = 'aetherflow-optimize-popup-header';

    const closeButton = document.createElement('button');
    closeButton.className = 'aetherflow-popup-close-button'; // Distinct class
    closeButton.title = 'Close';
    // Use X icon
    closeButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>`;
    closeButton.addEventListener('click', hideOptimizationPopup);
    header.appendChild(closeButton);
    optimizePopupElement.appendChild(header);

    // --- Popup Content Area ---
    const contentArea = document.createElement('div');
    contentArea.className = 'aetherflow-optimize-popup-content';
    contentArea.textContent = 'Optimizing...'; // Initial loading state
    optimizePopupElement.appendChild(contentArea);

    // --- Popup Footer (For copy button) ---
    const footer = document.createElement('div');
    footer.className = 'aetherflow-optimize-popup-footer';

    const copyButton = document.createElement('button');
    copyButton.className = 'aetherflow-popup-copy-button'; // Distinct class
    copyButton.title = 'Copy optimized text';
    // Use Copy icon
    copyButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
        <span>Copy</span>`; // Add text label for clarity
    copyButton.addEventListener('click', handleCopyOptimizedText);
    footer.appendChild(copyButton);
    optimizePopupElement.appendChild(footer);

    // Append to body once, hide/show using display style
    document.body.appendChild(optimizePopupElement);
  }
  return optimizePopupElement;
} 