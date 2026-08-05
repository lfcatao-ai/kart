// RACHA! SW — network-first: nunca serve versão velha quando há rede
self.addEventListener('install', function(e){ self.skipWaiting(); });
self.addEventListener('activate', function(e){ e.waitUntil(clients.claim()); });
self.addEventListener('fetch', function(e){
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).then(function(r){
        var c = r.clone();
        caches.open('racha-v2').then(function(x){ x.put('./offline', c); });
        return r;
      }).catch(function(){ return caches.match('./offline'); })
    );
  }
});
