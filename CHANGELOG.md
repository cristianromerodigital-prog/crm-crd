# Changelog — CRM CRD Fotografía

> **Estados:** ✅ Estable · ⚠️ Funcional con limitaciones · ❌ Roto · 🔄 En prueba
>
> **Restaurar versión estable:** `git checkout tags/stable-VX.XX -- worker/src/index.js` → `cd worker && npx wrangler deploy`

---

## V2.41 — 2026-05-22 · 🔄 En prueba
**Commit:** `d0df9e3`
PDF enviado atómicamente al completar datos — sin esperar respuesta del cliente.
- Cuando la IA devuelve `datos_completos`, el stage pasa a `presupuesto_enviado` **antes** de enviar nada (bloquea race condition)
- Resumen de Ángela y PDF se envían en background vía `ctx.waitUntil`
- Elimina el intercept de `datos_completos` introducido en V2.40

---

## V2.40 — 2026-05-22 · ❌ Roto
**Commit:** `0d6e6a4`
Nuevo flujo: PDF se enviaba al responder la pregunta de entrevista.
- `datos_completos` → Ángela pregunta por entrevista → cliente responde → PDF
- **Problema:** el PDF nunca llegaba porque el intercept no funcionaba correctamente

---

## V2.39 — 2026-05-22 · ❌ Roto
**Commit:** `7d3e16a`
Agrega `datos_completos` a doneStages para cortar race condition.
- **Problema:** cortaba el flujo del AI y Ángela dejaba de responder por completo

---

## V2.38 — 2026-05-22 · ⚠️ Funcional con limitaciones
**Commit:** `f688101`
Angela deja de responder después de `presupuesto_enviado`.
- Agrega `doneStages` check antes del call al AI
- Mensajes de clientes en stage terminal se guardan en DB pero sin respuesta automática
- **Limitación:** race condition aún presente (mensaje concurrente podía duplicar el resumen)

---

## V2.37 — 2026-05-22 · ✅ Estable — `stable-V2.37`
**Commit:** `3e1e29f` · **Tag:** `stable-V2.37`
PDF visible en el CRM como tarjeta clickeable.
- Worker: `followupText` usa formato `pdf:URL|FILENAME|CAPTION` en la DB
- Worker: `getPdfUrl` expone `viewUrl` (Drive viewer) separado del `url` de descarga
- CRM: `renderMsgBubble` detecta formato `pdf:` y renderiza tarjeta con link al Drive viewer
- CRM: compatibilidad con formato viejo `FILENAME.pdf - CAPTION` (mensajes anteriores en DB)

---

## V2.36 — 2026-05-22 · ✅ Estable — `stable-V2.36`
**Commit:** `0fee2b8` · **Tag:** `stable-V2.36`
Fix: tipo de evento genérico ya no pisa el valor válido en DB.
- `normalizeEventType` devuelve `''` para tipos como "evento", "fiesta", "social"
- El update de DB ahora verifica que la normalización devuelva un valor no vacío antes de guardar
- Sin este fix, el bot podía sobreescribir "Boda" con `''` y nunca enviar el PDF

---

## V2.35 — 2026-05-21
**Commit:** `858e71b`
Rechazar `event_type` genérico — el bot sigue preguntando si el cliente no especifica.
- `normalizeEventType` retorna `''` para "evento", "fiesta", "social", "celebración", etc.
- Label del campo actualizado para que el bot enumere los tipos válidos explícitamente

---

## V2.34 — 2026-05-21
**Commit:** `98426e3`
Eliminar acentos, ñ y emojis de textos enviados al bridge WA.
- `PDF_CAPTION`, `followupText`, `buildFollowupMsg` sin caracteres especiales
- Filename del PDF: `15 Anos` en lugar de `15 Años`
- Author Angela sin tilde en DB

---

## V2.33 — 2026-05-21
**Commit:** `4909595`
DB sincrónica antes del return — solo `sendWA` del PDF en `ctx.waitUntil`.
- Fix de V2.32: con todo en background la DB podía no confirmar antes de responder
- Operaciones DB (SELECT, INSERT, UPDATE stage) son síncronas
- Solo el envío WA del PDF va en background

---

## V2.32 — 2026-05-21
**Commits:** `0fd741f` / `35a393c`
PDF send via `ctx.waitUntil` — resuelve timeout de 30s en CF Workers.
- El bloque `datos_completos` pasa a background para no bloquear la respuesta al bridge
- Marcado de funciones compartidas con comentarios `[COMPARTIDA]` y callers

---

## V2.31 — 2026-05-21
**Commit:** `f9b2b3b`
`pre_service` requerido para todos los tipos de evento (no solo bodas/XV).

---

## V2.30 — 2026-05-21
**Commit:** `ded8944`
Guardia `event_type` en `datos_completos` + normalización XV en card/select.

---

## V2.29 — 2026-05-21
**Commit:** `099ac8a`
Teléfono resuelto desde `whatsmeow_lid_map` vía `/api/resolve-phone` del bridge.

---

## V2.28 — 2026-05-21
**Commit:** `df600eb`
`event_year` requerido + normalización de año + fix phone `@lid` + validación de fechas pasadas.

---

## V2.27 — 2026-05-21
**Commit:** `fb0b7a8`
Normalización `event_type` y `service`, teléfono desde `waJid`, `isBoV` incluye XV.

---

## V2.26 — 2026-05-21
**Commit:** `63f6d54`
Nuevos campos en Info panel y bot: ciudad, lugar, horario, cobertura, book exteriores, nombre quinceañera, nombres novios.

---

## V2.25 — 2026-05-21
**Commits:** `571fc97` / `06bba4d` / `9fa3d03`
- Live chat refresh cada 4s mientras el panel está abierto (`startChatRefresh`)
- Fix: segundo mensaje de Ángela no aparecía en CRM → ahora se guarda en D1 antes de actualizar stage
- PDF: URLs de Drive con `&confirm=t`, timeout `sendWA` a 25s para media

---

## V2.24 — anterior
**Commit:** `a40db9f`
Fix stage auto-transition + PDF/aviso al completar datos. Trigger AI movido al bridge (proceso único).

---

## V2.23 — anterior
**Commit:** `879f92b`
Limpieza: eliminación de código muerto.

---

## V2.22 — anterior
**Commit:** `14c5bb8`
Browser ya no dispara AI — solo muestra mensajes. AI exclusivamente del bridge.

---

## V2.21 — anterior
**Commit:** `b9765b3`
Trigger AI al bridge — fix definitivo de respuesta doble.

---

## V2.13 — anterior
**Commit:** `27804b4`
Ángela sin presentación de asistente, agrega Pre (book exteriores), avisa entrevista al completar datos, stage `presupuesto_enviado` al enviar PDF.

---

## V2.12 — anterior
**Commit:** `5c788c1`
Bot renombrado a Ángela, fallback reply, manejo de insultos, envío PDF presupuesto (bodas/XV) al completar datos.

---

## V2.11 — anterior
**Commit:** `5c788c1`
IA OpenAI gpt-4o-mini auto-responde mensajes WA, extrae datos, mueve stages, cron follow-up semanal.

---

## V2.9 — anterior
**Commit:** `9200bb0`
Backend Cloudflare D1: leads y mensajes persisten en la nube (migración desde localStorage).

---

## V2.0 — anterior
**Commit:** `80c6859`
`pushName` en leads, auto-reply primer contacto por WA.

---

## V1.0 — origen
**Commit:** `ed617ea`
CRM CRD Fotografía — versión inicial Cristian Romero Digital.
