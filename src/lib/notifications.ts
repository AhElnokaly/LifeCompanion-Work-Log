export function sendAppNotification(title: string, options?: NotificationOptions) {
  if (!('Notification' in window)) return;
  
  if (Notification.permission === 'granted') {
    try {
      if (navigator.serviceWorker && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready.then((registration) => {
          registration.showNotification(title, {
            icon: '/logo.svg',
            badge: '/logo.svg',
            vibrate: [200, 100, 200],
            ...options
          });
        });
      } else {
        new Notification(title, {
          icon: '/logo.svg',
          badge: '/logo.svg',
          vibrate: [200, 100, 200],
          ...options
        });
      }
    } catch (e) {
      console.error("Error sending notification", e);
    }
  }
}
