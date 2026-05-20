const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const BRIDGE_URL = 'https://bridge.cristianromerodigital.ar';

const FIELDS = ['name','event_type','event_date','venue','guests','schedule','service','pre_service'];
const FIELD_LABELS = {
  name:        'nombre completo',
  event_type:  'tipo de evento (boda, 15 años, corporativo, etc.)',
  event_date:  'fecha del evento',
  venue:       'lugar o salón donde se realiza',
  guests:      'cantidad aproximada de invitados',
  schedule:    'horario (inicio y fin estimado)',
  service:     'si necesita foto, video o ambos',
  pre_service: 'si le interesa hacer un Pre (book de exteriores antes del evento)',
};
const FIELD_WHY = {
  name:        'para personalizar la propuesta',
  event_type:  'porque cada tipo de evento tiene cobertura diferente',
  event_date:  'para verificar disponibilidad de Cristian ese día',
  venue:       'para saber si hay traslado incluido en la cotización',
  guests:      'porque más invitados implica más horas de cobertura',
  schedule:    'para calcular las horas exactas de trabajo',
  service:     'porque foto y video tienen precios distintos',
  pre_service: 'es una sesión de fotos de exteriores previa al evento, muy recomendada para bodas y 15 años',
};

function buildSystemPrompt(lead) {
  const collected = {};
  for (const f of FIELDS) {
    const val = lead[f] || lead[f.replace('_','')];
    if (val && val !== '' && val !== '0') collected[f] = val;
  }
  const missing = FIELDS.filter(f => !collected[f]);
  const missingDesc = missing.map(f => `- ${FIELD_LABELS[f]} (${FIELD_WHY[f]})`).join('\n');
  const collectedDesc = Object.entries(collected).map(([f,v]) => `- ${FIELD_LABELS[f]}: ${v}`).join('\n');

  const eventType = (collected['event_type'] || '').toLowerCase();
  const isBoV = eventType.includes('boda') || eventType.includes('casamiento') || eventType.includes('matrimonio') || eventType.includes('15') || eventType.includes('quince');

  return `Sos Ángela, del equipo de Cristian Romero Digital, fotógrafo profesional de eventos sociales en Buenos Aires.

Tu objetivo es recopilar los datos del cliente de forma natural y amigable para que Cristian pueda armar una propuesta personalizada.

DATOS YA RECOPILADOS:
${collectedDesc || '(ninguno aún)'}

DATOS QUE FALTAN OBTENER:
${missingDesc || '¡Todos los datos están completos!'}

INSTRUCCIONES:
- Hablá en español rioplatense, tono cálido y cercano, nunca robótico
- En el primer mensaje saludá con tu nombre sin decir que sos asistente ni nada por el estilo, simplemente "Hola, soy Ángela, del equipo de Cristian"
- Pedí los datos faltantes de forma natural, de a uno o dos por mensaje como máximo
- El campo "pre_service" solo preguntalo si el evento es boda o 15 años${isBoV ? ' (aplica para este evento)' : ' (NO aplica para este evento, omitilo)'}
- Cuando el cliente no dé un dato, insistí amablemente UNA sola vez explicando el motivo
- Si el cliente esquiva un dato más de una vez, avanzá con lo que tenés
- Si el cliente manda un mensaje ofensivo, inapropiado o completamente irrelevante, NO lo tomes como respuesta válida. Respondé con calma, ignorá el contenido ofensivo y repetí la pregunta que estabas haciendo
- NUNCA menciones precios — Cristian los manda personalmente
- NUNCA inventes información sobre servicios, packs o disponibilidad
- Cuando todos los datos estén completos, avisale que Cristian le va a hacer llegar una propuesta personalizada y que lo ideal sería poder coordinar una entrevista para conocerse y terminar de ajustar los detalles
- Máximo 3 oraciones por mensaje, texto corrido sin listas

FORMATO DE RESPUESTA — Respondé ÚNICAMENTE con JSON válido:
{
  "reply": "texto del mensaje para enviar al cliente",
  "extracted": {
    "name": null,
    "event_type": null,
    "event_date": null,
    "venue": null,
    "guests": null,
    "schedule": null,
    "service": null,
    "pre_service": null
  },
  "stage": null
}

En "extracted" poné SOLO los valores que el cliente mencionó en ESTE mensaje (null si no los dijo).
En "stage" poné: "consultando" si seguís recopilando, "datos_completos" si ya tenés todos los datos.`;
}

function buildFollowupMsg(lead) {
  const name = lead.name ? `, ${lead.name.split(' ')[0]}` : '';
  return `¡Hola${name}! 😊 Soy Ángela, el asistente de Cristian Romero Digital. Hace una semana estuvimos hablando sobre tu evento y quería saber si todavía estás buscando fotógrafo. ¡Estamos disponibles para ayudarte! ¿Querés que retomemos?`;
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

async function callGemini(env, messages) {
  const contents = messages
    .filter(m => m.role !== 'system')
    .map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));

  const system = messages.find(m => m.role === 'system')?.content || '';

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: system }] },
        contents,
        generationConfig: { maxOutputTokens: 800, temperature: 0.7 },
      }),
    }
  );
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

async function sendWA(waJid, message, mediaUrl = null, filename = null) {
  try {
    const body = { recipient: waJid, message };
    if (mediaUrl) { body.media_url = mediaUrl; body.filename = filename || 'presupuesto.pdf'; }
    await fetch(`${BRIDGE_URL}/api/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (e) {
    console.error('WA send failed', e);
  }
}

const PDF_BODAS  = 'https://drive.google.com/uc?export=download&id=16gSQoRAa5Ao5whsbuoP7uT1v2ioOE0lH';
const PDF_QUINCE = 'https://drive.google.com/uc?export=download&id=14EL4HQumkWAOVBqjnx3seIqg6YVpXymx';

function getPdfUrl(eventType) {
  const t = (eventType || '').toLowerCase();
  if (t.includes('15') || t.includes('quince') || t.includes('años')) return { url: PDF_QUINCE, name: 'Presupuesto-15años-CRD.pdf' };
  if (t.includes('boda') || t.includes('casamiento') || t.includes('matrimonio')) return { url: PDF_BODAS, name: 'Presupuesto-Bodas-CRD.pdf' };
  return null;
}

export default {
  // ── HTTP handler ──────────────────────────────────────────
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });

    const url    = new URL(request.url);
    const path   = url.pathname.replace(/\/$/, '');
    const method = request.method;

    // GET /leads
    if (method === 'GET' && path === '/leads') {
      const { results } = await env.DB.prepare(
        'SELECT * FROM leads ORDER BY updated_at DESC'
      ).all();
      return json(results);
    }

    // POST /leads
    if (method === 'POST' && path === '/leads') {
      const b = await request.json();
      const t = Date.now();
      await env.DB.prepare(
        `INSERT OR REPLACE INTO leads
         (id,salon,name,phone,wa_jid,source,event_type,event_year,stage,guests,notes,last_message,
          event_date,venue,schedule,service,last_msg_at,created_at,updated_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
      ).bind(
        b.id||('wa_'+t), b.salon||'otros', b.name||'', b.phone||'',
        b.wa_jid||'', b.source||'whatsapp', b.event_type||'', b.event_year||'',
        b.stage||'nuevo_lead', b.guests||0, b.notes||'', b.last_message||'',
        b.event_date||'', b.venue||'', b.schedule||'', b.service||'',
        t, b.created_at||t, t
      ).run();
      return json({ ok: true });
    }

    // PUT /leads/:id
    const leadMatch = path.match(/^\/leads\/([^/]+)$/);
    if (method === 'PUT' && leadMatch) {
      const id  = leadMatch[1];
      const b   = await request.json();
      const allowed = ['salon','name','phone','wa_jid','source','event_type','event_year',
                       'stage','guests','notes','last_message','event_date','venue',
                       'schedule','service','last_msg_at','followup_due'];
      const fields = [], vals = [];
      for (const k of allowed) {
        if (k in b) { fields.push(`${k} = ?`); vals.push(b[k]); }
      }
      if (!fields.length) return json({ ok: true });
      fields.push('updated_at = ?'); vals.push(Date.now()); vals.push(id);
      await env.DB.prepare(`UPDATE leads SET ${fields.join(',')} WHERE id = ?`).bind(...vals).run();
      return json({ ok: true });
    }

    // DELETE /leads/:id
    if (method === 'DELETE' && leadMatch) {
      const id = leadMatch[1];
      await env.DB.prepare('DELETE FROM messages WHERE lead_id = ?').bind(id).run();
      await env.DB.prepare('DELETE FROM leads WHERE id = ?').bind(id).run();
      return json({ ok: true });
    }

    // GET /leads/:id/messages
    const msgsMatch = path.match(/^\/leads\/([^/]+)\/messages$/);
    if (method === 'GET' && msgsMatch) {
      const { results } = await env.DB.prepare(
        'SELECT * FROM messages WHERE lead_id = ? ORDER BY ts ASC'
      ).bind(msgsMatch[1]).all();
      return json(results);
    }

    // POST /leads/:id/messages
    if (method === 'POST' && msgsMatch) {
      const id = msgsMatch[1];
      const b  = await request.json();
      const t  = Date.now();
      await env.DB.prepare(
        'INSERT INTO messages (lead_id,direction,text,author,ts) VALUES (?,?,?,?,?)'
      ).bind(id, b.direction||'in', b.text||'', b.author||'', b.ts||t).run();
      await env.DB.prepare(
        'UPDATE leads SET last_message=?, last_msg_at=?, updated_at=? WHERE id=?'
      ).bind(b.text, t, t, id).run();
      return json({ ok: true });
    }

    // POST /ai/chat  ── núcleo de la IA ──────────────────────
    if (method === 'POST' && path === '/ai/chat') {
      const { leadId, message, history = [] } = await request.json();

      // Cargar lead desde D1
      const lead = (await env.DB.prepare('SELECT * FROM leads WHERE id = ?').bind(leadId).first()) || {};

      const systemPrompt = buildSystemPrompt(lead);
      const messages = [
        { role: 'system', content: systemPrompt },
        ...history.slice(-12),
        { role: 'user', content: message },
      ];

      const raw = await callGemini(env, messages);

      // Parsear JSON de la respuesta
      let parsed = {};
      try {
        const match = raw.match(/\{[\s\S]*\}/);
        parsed = match ? JSON.parse(match[0]) : {};
      } catch (_) {}

      const fallback = 'Perdoná, ¿me repetís eso? Quiero asegurarme de entenderte bien. 😊';
      const reply     = parsed.reply || raw || fallback;
      const extracted = parsed.extracted || {};
      const newStage  = parsed.stage || null;

      // Actualizar lead con campos extraídos + last_msg_at
      const updates = { last_msg_at: Date.now(), followup_due: 0 };
      if (extracted.name       && extracted.name       !== 'null') updates.name       = extracted.name;
      if (extracted.event_type && extracted.event_type !== 'null') updates.event_type = extracted.event_type;
      if (extracted.event_date && extracted.event_date !== 'null') updates.event_date = extracted.event_date;
      if (extracted.venue      && extracted.venue      !== 'null') updates.venue      = extracted.venue;
      if (extracted.guests     && extracted.guests     !== 'null') updates.guests     = parseInt(extracted.guests)||0;
      if (extracted.schedule   && extracted.schedule   !== 'null') updates.schedule   = extracted.schedule;
      if (extracted.service     && extracted.service     !== 'null') updates.service     = extracted.service;
      if (extracted.pre_service && extracted.pre_service !== 'null') updates.pre_service = extracted.pre_service;
      if (newStage) updates.stage = newStage;

      const setClauses = Object.keys(updates).map(k => `${k} = ?`).join(', ');
      await env.DB.prepare(`UPDATE leads SET ${setClauses}, updated_at = ? WHERE id = ?`)
        .bind(...Object.values(updates), Date.now(), leadId).run();

      // Guardar mensaje de la IA en tabla messages
      await env.DB.prepare(
        'INSERT INTO messages (lead_id,direction,text,author,ts) VALUES (?,?,?,?,?)'
      ).bind(leadId, 'out', reply, 'Ángela', Date.now()).run();

      // Si completó datos, enviar PDF y pasar a presupuesto_enviado
      if (newStage === 'datos_completos') {
        const fresh = await env.DB.prepare('SELECT wa_jid, event_type FROM leads WHERE id = ?').bind(leadId).first();
        const waJid = fresh?.wa_jid || lead.wa_jid || '';
        const eventType = fresh?.event_type || updates.event_type || '';
        const pdf = getPdfUrl(eventType);
        if (waJid && pdf) {
          await sendWA(waJid, '', pdf.url, pdf.name);
          await env.DB.prepare('UPDATE leads SET stage = ?, updated_at = ? WHERE id = ?')
            .bind('presupuesto_enviado', Date.now(), leadId).run();
        }
      }

      return json({ reply, extracted: updates, stage: newStage });
    }

    return json({ error: 'Not found' }, 404);
  },

  // ── Cron: follow-up semanal ───────────────────────────────
  async scheduled(event, env) {
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const skipStages = ['datos_completos','presupuesto_enviado','contrato_pendiente',
                        'cliente_confirmado','lead_perdido'];

    const { results } = await env.DB.prepare(
      `SELECT * FROM leads
       WHERE source = 'whatsapp'
         AND wa_jid != ''
         AND last_msg_at > 0
         AND last_msg_at < ?
         AND followup_due = 0
         AND stage NOT IN (${skipStages.map(() => '?').join(',')})
      `
    ).bind(oneWeekAgo, ...skipStages).all();

    for (const lead of results) {
      const msg = buildFollowupMsg(lead);
      await sendWA(lead.wa_jid, msg);
      await env.DB.prepare(
        'UPDATE leads SET followup_due = 1, last_msg_at = ?, updated_at = ? WHERE id = ?'
      ).bind(Date.now(), Date.now(), lead.id).run();
    }
  },
};
