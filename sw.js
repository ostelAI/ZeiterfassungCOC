// Zeiterfassung Service Worker – macht die App offline verfügbar.
// Strategie "Netzwerk zuerst": bei Internet immer die neueste Version, ohne Internet
// springt die zuletzt erfolgreich geladene Version aus dem Cache ein.
var CACHE_NAME = "zeiterfassung-cache-v1";
var CACHE_FILES = ["./", "./index.html", "./zeiterfassung.html"];

self.addEventListener("install", function(event){
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      return Promise.all(CACHE_FILES.map(function(url){
        return cache.add(url).catch(function(){});
      }));
    })
  );
});

self.addEventListener("activate", function(event){
  event.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){ return k !== CACHE_NAME; }).map(function(k){ return caches.delete(k); }));
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", function(event){
  if(event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request).then(function(response){
      var copy = response.clone();
      caches.open(CACHE_NAME).then(function(cache){ cache.put(event.request, copy); });
      return response;
    }).catch(function(){
      return caches.match(event.request).then(function(cached){
        return cached || caches.match("./index.html") || caches.match("./zeiterfassung.html");
      });
    })
  );
});
