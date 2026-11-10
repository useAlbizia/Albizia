// Service worker do aplicativo do painel. Só cuida de notificação: não guarda
// páginas em cache (painel com dado velho é pior do que painel offline).

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let aviso = {};
  try {
    aviso = event.data ? event.data.json() : {};
  } catch {
    aviso = { titulo: "ALBIZIA", corpo: event.data ? event.data.text() : "" };
  }
  const titulo = aviso.titulo || "ALBIZIA";
  const tarefas = [
    self.registration.showNotification(titulo, {
      body: aviso.corpo || "",
      icon: "/painel-192.png",
      badge: "/painel-192.png",
      tag: aviso.tag || undefined,
      renotify: !!aviso.tag,
      data: { url: aviso.url || "/admin" },
    }),
  ];
  // Número no ícone do app (Android e iPhone com o app instalado).
  if (typeof aviso.contador === "number" && self.navigator && "setAppBadge" in self.navigator) {
    tarefas.push(
      aviso.contador > 0 ? self.navigator.setAppBadge(aviso.contador) : self.navigator.clearAppBadge(),
    );
  }
  event.waitUntil(Promise.all(tarefas).catch(() => {}));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const destino = new URL((event.notification.data && event.notification.data.url) || "/admin", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((janelas) => {
      for (const j of janelas) {
        if (j.url.startsWith(self.location.origin + "/admin") && "focus" in j) {
          return j.navigate(destino).then((w) => (w || j).focus());
        }
      }
      return self.clients.openWindow(destino);
    }),
  );
});
