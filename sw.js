/* Minimal service worker: lets phones offer "Add to home screen". It caches nothing, so customers always get the latest shop and prices. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});
