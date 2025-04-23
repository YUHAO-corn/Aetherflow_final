/**
 * Displays a short-lived toast notification on the page.
 * @param message The message to display.
 * @param type The type of notification ('success' or 'error').
 */
export function showToastNotification(message: string, type: 'success' | 'error'): void {
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