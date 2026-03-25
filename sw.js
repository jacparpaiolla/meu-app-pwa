// ─────────────────────────────────────────────────────────────
//  FinTrack — Service Worker
//  Aprenda o que cada parte faz lendo os comentários!
// ─────────────────────────────────────────────────────────────

// VERSÃO DO CACHE
// Sempre que você atualizar o app, mude este nome (ex: v2, v3...)
// Isso força o navegador a baixar os arquivos novos.
const CACHE_NAME = 'fintrack-v2';

// ARQUIVOS PARA CACHEAR
// Tudo que o app precisa para funcionar offline.
// Inclua todos os arquivos do projeto aqui.
const ASSETS = [
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
];



// ── EVENTO: install ───────────────────────────────────────────
// Dispara quando o Service Worker é instalado pela primeira vez.
// Aqui a gente abre o cache e salva todos os arquivos.
self.addEventListener('install', event => {
  console.log('[SW] Instalando e cacheando arquivos...');

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Cache aberto:', CACHE_NAME);
        return cache.addAll(ASSETS); // baixa e salva todos os arquivos
      })
      .then(() => {
        // Força o SW novo a ativar imediatamente,
        // sem esperar o usuário fechar e reabrir o app.
        return self.skipWaiting();
      })
  );
});


// ── EVENTO: activate ─────────────────────────────────────────
// Dispara após o install. Ótimo momento para limpar caches antigos.
// Se você atualizou CACHE_NAME para 'v2', aqui o 'v1' é deletado.
self.addEventListener('activate', event => {
  console.log('[SW] Ativando Service Worker...');

  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys
          .filter(key => key !== CACHE_NAME) // pega os caches que NÃO são o atual
          .map(key => {
            console.log('[SW] Deletando cache antigo:', key);
            return caches.delete(key); // deleta os antigos
          })
      );
    }).then(() => {
      // Assume o controle de todas as abas abertas imediatamente.
      return self.clients.claim();
    })
  );
});


// ── EVENTO: fetch ─────────────────────────────────────────────
// O mais importante! Intercepta TODA requisição de rede do app.
// Estratégia usada: "Cache First" — serve do cache, só vai à rede se não tiver.
// Perfeito para apps que precisam funcionar offline.
self.addEventListener('fetch', event => {

  event.respondWith(
    caches.match(event.request) // procura no cache
      .then(cachedResponse => {

        if (cachedResponse) {
          // ✅ Achou no cache! Retorna na hora, sem internet.
          return cachedResponse;
        }

        // ❌ Não estava no cache. Tenta buscar na rede.
        return fetch(event.request)
          .then(networkResponse => {
            // Chegou da rede! Vamos salvar no cache para a próxima vez.
            const responseToCache = networkResponse.clone(); // precisa clonar antes de usar

            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseToCache);
            });

            return networkResponse;
          })
          .catch(() => {
            // Sem cache E sem internet.
            // Para arquivos HTML, retorna o index.html como fallback.
            if (event.request.destination === 'document') {
              return caches.match('./index.html');
            }
          });
      })
  );
});
