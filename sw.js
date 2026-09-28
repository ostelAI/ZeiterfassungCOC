// Zeiterfassung Service Worker – macht die App offline verfügbar.
// Strategie "Netzwerk zuerst": bei Internet immer die neueste Version, ohne Internet
// springt die zuletzt erfolgreich geladene Version aus dem Cache ein.
// WICHTIG: CACHE_NAME bei jedem Versions-Bump mit APP_VERSION aus zeiterfassung.html synchron halten,
// damit beim Update garantiert der alte Cache-Eintrag verworfen wird statt nur überschrieben zu werden
// (verhindert, dass bei kurzem Netzwerkausfall aus Versehen eine sehr alte, längst überschriebene Version einspringt)
var CACHE_NAME = "zeiterfassung-cache-v2.1.0";
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
