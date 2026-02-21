importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js');

// This allows the browser to handle incoming pushes even when the tab is closed
self.addEventListener('push', function(event) {
    console.log('[OneSignal Worker] Push Received.');
});

self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    event.waitUntil(
        clients.openWindow('/') // Opens the dashboard when notification is clicked
    );
});