// Service Worker de NFA — habilita instalación como PWA y un caché mínimo de
// "app shell" para que el dashboard siga siendo usable (con el último dato
// sincronizado) si el celular pierde conexión. Ver Documentacion/SRS.md
// SRS-FR-M3-311 para el detalle de la estrategia de caché.
const CACHE_NAME = "nfa-shell-v1";

const APP_SHELL = [
    "./",
    "./inicio.html",
    "./index.html",
    "./recordatorios-varios.html",
    "./agenda-personal.html",
    "./styles.css",
    "./manifest.json",
    "./grafica/logo 1-1 NF.png",
    "./grafica/icons/icon-192.png",
    "./grafica/icons/icon-512.png",
    "./grafica/icons/icon-maskable-512.png",
    "./grafica/icons/apple-touch-icon.png"
];

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
    );
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
        )
    );
    self.clients.claim();
});

self.addEventListener("fetch", (event) => {
    const { request } = event;

    // Solo se intercepta same-origin GET; peticiones cross-origin (Google Fonts,
    // Notion API si alguna vez se llamara desde el cliente) siguen su curso normal.
    if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) {
        return;
    }

    // Documentos HTML: la data de Notion se inyecta en build-time (extract_and_audit.py),
    // así que siempre se intenta red primero para no mostrar métricas viejas —
    // el caché solo actúa como respaldo si no hay conexión.
    if (request.mode === "navigate" || request.destination === "document") {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    const copy = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
                    return response;
                })
                .catch(() => caches.match(request).then((cached) => cached || caches.match("./inicio.html")))
        );
        return;
    }

    // Assets estáticos (CSS/imágenes/manifest): cache-first con actualización en segundo plano.
    event.respondWith(
        caches.match(request).then((cached) => {
            const fetchPromise = fetch(request)
                .then((response) => {
                    const copy = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
                    return response;
                })
                .catch(() => cached);
            return cached || fetchPromise;
        })
    );
});
