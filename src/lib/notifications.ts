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
          } as any);
        });
      } else {
        new Notification(title, {
          icon: '/logo.svg',
          badge: '/logo.svg',
          vibrate: [200, 100, 200],
          ...options
        } as any);
      }
    } catch (e) {
      console.error("Error sending notification", e);
    }
  }
}

export function playAlarm(soundId: 'digital' | 'analog' | 'gentle' | 'vibrate_only' = 'digital') {
  if (soundId === 'vibrate_only') {
    if (navigator.vibrate) {
      navigator.vibrate([300, 100, 300, 100, 300]);
    }
    return;
  }

  try {
    const audioContentContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    const playBeep = (freq: number, duration: number, startTime: number) => {
      const oscillator = audioContentContext.createOscillator();
      const gainNode = audioContentContext.createGain();
      
      oscillator.type = soundId === 'gentle' ? 'sine' : soundId === 'analog' ? 'triangle' : 'square';
      oscillator.frequency.setValueAtTime(freq, audioContentContext.currentTime + startTime);
      
      gainNode.gain.setValueAtTime(0.1, audioContentContext.currentTime + startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContentContext.currentTime + startTime + duration);
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContentContext.destination);
      
      oscillator.start(audioContentContext.currentTime + startTime);
      oscillator.stop(audioContentContext.currentTime + startTime + duration);
    };

    if (soundId === 'gentle') {
      playBeep(440, 0.5, 0);
      playBeep(523.25, 0.5, 0.5);
      playBeep(659.25, 1, 1.0);
    } else if (soundId === 'analog') {
      playBeep(600, 0.3, 0);
      playBeep(600, 0.3, 0.4);
      playBeep(600, 0.8, 0.8);
    } else {
      playBeep(800, 0.2, 0);
      playBeep(800, 0.2, 0.3);
      playBeep(800, 0.2, 0.6);
      playBeep(800, 0.2, 0.9);
    }
    
    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200, 100, 400]);
    }
  } catch (err) {
    console.error("Audio block", err);
  }
}
