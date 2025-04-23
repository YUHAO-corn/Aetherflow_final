/**
 * Creates and displays a simple toast notification.
 */
export function showToast(message: string, type: 'success' | 'error' = 'success', duration: number = 3000): void {
    console.log(`[AetherFlow Toast] Showing ${type}: ${message}`);

    // Remove existing toast if any
    const existingToast = document.getElementById('aetherflow-toast-container');
    if (existingToast) {
        existingToast.remove();
    }

    // Create toast container
    const toast = document.createElement('div');
    toast.id = 'aetherflow-toast-container';
    toast.style.position = 'fixed';
    toast.style.bottom = '20px';
    toast.style.left = '50%';
    toast.style.transform = 'translateX(-50%)';
    toast.style.padding = '10px 20px';
    toast.style.borderRadius = '6px';
    toast.style.color = 'white';
    toast.style.fontSize = '14px';
    toast.style.zIndex = '2147483647'; // Max z-index
    toast.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif';
    toast.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease-in-out';

    // Apply type-specific styles
    if (type === 'success') {
        toast.style.backgroundColor = '#4CAF50'; // Green
        toast.textContent = `✓ ${message}`;
    } else {
        toast.style.backgroundColor = '#f44336'; // Red
        toast.textContent = `✗ ${message}`;
    }

    // Append to body
    document.body.appendChild(toast);

    // Fade in
    requestAnimationFrame(() => {
        toast.style.opacity = '1';
    });

    // Set timeout to fade out and remove
    setTimeout(() => {
        toast.style.opacity = '0';
        // Remove the element after the transition completes
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300); // Match the transition duration
    }, duration - 300); // Start fade-out before total duration
} 