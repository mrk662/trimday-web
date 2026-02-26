importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js');

// 1. Better Push Handling
self.addEventListener('push', function(event) {
    console.log('[TrimDay] Booking Alert Received.');
});

// 2. Advanced Click Logic (Handles closed/minimized app)
self.addEventListener('notificationclick', function(event) {
    event.notification.close();

    // Logic to focus the window if it's already open, or open a new one if closed
    const promiseChain = clients.matchAll({
        type: 'window',
        includeUncontrolled: true
    }).then((windowClients) => {
        // If a dashboard tab is already open, just focus it
        for (let i = 0; i < windowClients.length; i++) {
            const client = windowClients[i];
            if (client.url.includes('/dashboard') && 'focus' in client) {
                return client.focus();
            }
        }
        // If the app is closed, open the main dashboard
        if (clients.openWindow) {
            return clients.openWindow('/dashboard');
        }
    });

    event.waitUntil(promiseChain);
});