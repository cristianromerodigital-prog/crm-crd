# Versiones CRM CRD

## Cómo usar este sistema

### Marcar una versión como estable
Decile a Claude: "marcá V2.XX como estable" y se ejecuta:
```
git tag stable-V2.XX <commit-hash>
git push origin stable-V2.XX
```

### Restaurar una versión estable
Decile a Claude: "volvé a stable-V2.XX" y se ejecuta:
```
git checkout tags/stable-V2.XX -- worker/src/index.js
cd worker && npx wrangler deploy
git checkout tags/stable-V2.XX -- index.html   # si también se rompió el HTML
```

---

## Registro de versiones

| Versión | Commit | Tag stable | Estado | Qué hace |
|---------|--------|-----------|--------|----------|
| V2.36 | 0fee2b8 | stable-V2.36 | ✅ Estable | Fix event_type genérico no pisa DB |
| V2.37 | 3e1e29f | stable-V2.37 | ✅ Estable | PDF visible en CRM como tarjeta |
| V2.38 | f688101 | — | ⚠️ Parcial | Angela para de responder post presupuesto_enviado (bueno), pero el race condition de datos_completos sigue |
| V2.39 | 7d3e16a | — | ❌ Roto | Agrega datos_completos a doneStages → corta flujo AI |
| V2.40 | 0d6e6a4 | — | ❌ Roto | PDF espera respuesta cliente → nunca llega |
| V2.41 | d0df9e3 | — | 🔄 En prueba | Atómico: presupuesto_enviado antes de enviar, PDF en ctx.waitUntil |

---

## Archivos de snapshot

Los archivos en esta carpeta son copias exactas del worker en ese momento:
- `worker-V2.36.js` — baseline estable
- `worker-V2.37.js` — + PDF en CRM
- `worker-V2.38.js` — + doneStages
- `worker-V2.41.js` — versión actual en prueba

Para restaurar manualmente sin git:
```
copy versions\worker-V2.36.js worker\src\index.js
cd worker && npx wrangler deploy
```
