const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const BRIDGE_URL = 'https://bridge.cristianromerodigital.ar';

const FIELDS = ['name','event_type','event_year','event_date','venue','city','guests','schedule','service','pre_service','honoree_name','couple_names'];
const FIELD_LABELS = {
  name:          'nombre completo',
  event_type:    'tipo de evento (boda, 15 años, corporativo, etc.)',
  event_year:    'año del evento',
  event_date:    'fecha aproximada del evento (día y mes)',
  venue:         'nombre del lugar o salón donde se realiza',
  city:          'localidad o ciudad donde se realiza el evento',
  guests:        'cantidad aproximada de invitados',
  schedule:      'horario (inicio y fin estimado)',
  service:       'cobertura: "Foto", "Video" o "Foto y video"',
  pre_service:   'si le interesa hacer un Pre (book de exteriores antes del evento)',
  honoree_name:  'nombre de la quinceañera',
  couple_names:  'nombres de los novios',
};
const FIELD_WHY = {
  name:          'para personalizar la propuesta',
  event_type:    'porque cada tipo de evento tiene cobertura diferente',
  event_year:    'para verificar disponibilidad y armar la propuesta correctamente',
  event_date:    'para verificar disponibilidad de Cristian ese día',
  venue:         'para saber si hay traslado incluido en la cotización',
  city:          'para calcular si hay traslado y los costos de movilidad',
  guests:        'porque más invitados implica más horas de cobertura',
  schedule:      'para calcular las horas exactas de trabajo',
  service:       'porque foto y video tienen precios distintos',
  pre_service:   'es una sesión de fotos de exteriores previa al evento, muy recomendada para bodas y 15 años',
  honoree_name:  'para personalizar la propuesta y los materiales del evento',
  couple_names:  'para personalizar la propuesta y los materiales del evento',
};

function buildSystemPrompt(lead) {
  const collected = {};
  for (const f of FIELDS) {
    const val = lead[f] || lead[f.replace('_','')];
    if (val && val !== '' && val !== '0') collected[f] = val;
  }

  const eventType = (collected['event_type'] || '').toLowerCase();
  const isBoV    = eventType.includes('boda') || eventType.includes('casamiento') || eventType.includes('matrimonio') || eventType.includes('15') || eventType.includes('xv') || eventType.includes('quince');
  const isQuince = eventType.includes('15') || eventType.includes('xv') || eventType.includes('quince');
  const isBoda   = eventType.includes('boda') || eventType.includes('casamiento') || eventType.includes('matrimonio');

  const missing = FIELDS.filter(f => {
    if (collected[f]) return false;
    if (f === 'pre_service'  && !isBoV)   return false;
    if (f === 'honoree_name' && !isQuince) return false;
    if (f === 'couple_names' && !isBoda)   return false;
    return true;
  });

  const missingDesc  = missing.map(f => `- ${FIELD_LABELS[f]} (${FIELD_WHY[f]})`).join('\n');
  const collectedDesc = Object.entries(collected).map(([f,v]) => `- ${FIELD_LABELS[f]}: ${v}`).join('\n');

  const now = new Date();
  const MESES_ES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  const currentDateStr = `${now.getDate()} de ${MESES_ES[now.getMonth()]} de ${now.getFullYear()}`;
  const currentYear = now.getFullYear();

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
- Hoy es ${currentDateStr}. Para el año del evento: "26" = 2026, "el año próximo" = ${currentYear + 1}, "este año" = ${currentYear}. Siempre extraé un año de 4 dígitos.
- No aceptes fechas de eventos anteriores a hoy. Si el cliente menciona una fecha pasada, aclaráselo amablemente y pedí la fecha correcta.
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
    "event_year": null,
    "event_date": null,
    "venue": null,
    "city": null,
    "guests": null,
    "schedule": null,
    "service": null,
    "pre_service": null,
    "honoree_name": null,
    "couple_names": null
  },
  "stage": "consultando"
}

En "extracted" poné SOLO los valores que el cliente mencionó en ESTE mensaje (null si no los dijo).
CRÍTICO: si el cliente menciona el tipo de evento (XV, boda, cumpleaños, etc.) en CUALQUIER parte del mensaje, extraelo en "event_type" SIEMPRE, incluso si es el primer mensaje.
En "stage" SIEMPRE poné un valor: "consultando" mientras seguís recopilando datos, "datos_completos" ÚNICAMENTE cuando ya tenés ABSOLUTAMENTE TODOS los datos faltantes listados arriba y "event_type" está confirmado.`;
}

function normalizeEventYear(s) {
  if (!s) return s;
  const t = s.toLowerCase().trim();
  const cy = new Date().getFullYear();
  if (t === 'este año' || t === 'este') return String(cy);
  if (t.includes('próximo') || t.includes('proximo') || t.includes('que viene') || t.includes('entrante')) return String(cy + 1);
  const two = t.match(/^(\d{2})$/);
  if (two) return String(2000 + parseInt(two[1]));
  const four = t.match(/\b(20\d{2})\b/);
  if (four) return four[1];
  return s;
}

function normalizeEventType(s) {
  if (!s) return s;
  const t = s.toLowerCase().trim();
  if (t === 'xv' || t === 'xv años' || t.includes('quince') || t.includes('quinceañ') || t.includes('15')) return '15 años';
  if (t.includes('boda') || t.includes('casamiento') || t.includes('matrimonio')) return 'Boda';
  if (t.includes('corporat')) return 'Corporativo';
  if (t.includes('bautism'))  return 'Bautismo';
  if (t.includes('cumple'))   return 'Cumpleaños';
  return s;
}

function normalizeService(s) {
  if (!s) return s;
  const t = s.toLowerCase().trim();
  if (t.includes('ambos') || t.includes('ambas') || (t.includes('foto') && t.includes('video'))) return 'Foto y video';
  if (t.includes('foto'))  return 'Foto';
  if (t.includes('video')) return 'Video';
  return s;
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


async function callOpenAI(env, messages) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages,
      max_tokens: 800,
      temperature: 0.7,
    }),
  });
  const data = await res.json();
  if (!data.choices) console.error('OpenAI error:', JSON.stringify(data).slice(0, 300));
  return data.choices?.[0]?.message?.content || '';
}

async function resolvePhone(waJid) {
  try {
    const res = await fetch(`${BRIDGE_URL}/api/resolve-phone?jid=${encodeURIComponent(waJid)}`, {
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return '';
    const data = await res.json();
    return data.phone || '';
  } catch (_) { return ''; }
}

async function sendWA(waJid, message, mediaUrl = null, filename = null) {
  try {
    const body = { recipient: waJid, message };
    if (mediaUrl) { body.media_url = mediaUrl; body.filename = filename || 'presupuesto.pdf'; }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), mediaUrl ? 25000 : 8000);
    await fetch(`${BRIDGE_URL}/api/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timer);
  } catch (e) {
    console.error('WA send failed', e);
  }
}

const PDF_BODAS  = 'https://drive.google.com/uc?export=download&confirm=t&id=16gSQoRAa5Ao5whsbuoP7uT1v2ioOE0lH';
const PDF_QUINCE = 'https://drive.google.com/uc?export=download&confirm=t&id=14EL4HQumkWAOVBqjnx3seIqg6YVpXymx';

const PDF_CAPTION = 'Mientras tanto, te envío algunos valores y packs estimados. ¡Tienen una validez de 15 días!';
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
function pdfFilename(type) {
  const d = new Date();
  const mes = MESES[d.getMonth()];
  const anio = d.getFullYear();
  return `Presupuesto ${type} - ${mes} ${anio}.pdf`;
}

function getPdfUrl(eventType) {
  const t = (eventType || '').toLowerCase();
  if (t.includes('15') || t.includes('xv') || t.includes('quince') || t.includes('años')) return { url: PDF_QUINCE, name: pdfFilename('15 Años') };
  if (t.includes('boda') || t.includes('casamiento') || t.includes('matrimonio')) return { url: PDF_BODAS, name: pdfFilename('Bodas') };
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
                       'stage','guests','notes','last_message','event_date','venue','city',
                       'schedule','service','pre_service','honoree_name','couple_names',
                       'last_msg_at','followup_due'];
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
      const { leadId, message, history = [], waMessageId } = await request.json();

      // Deduplicación server-side: si este waMessageId ya fue procesado, devolver el reply existente
      if (waMessageId) {
        const dup = await env.DB.prepare(
          'SELECT text FROM messages WHERE wa_msg_id = ? AND direction = "out" LIMIT 1'
        ).bind(waMessageId).first();
        if (dup) return json({ reply: dup.text, extracted: {}, stage: null, duplicate: true });
      }

      // Cargar lead desde D1 — rechazar si no existe (evita zombie tabs con leads fantasma)
      const lead = await env.DB.prepare('SELECT * FROM leads WHERE id = ?').bind(leadId).first();
      if (!lead) return json({ error: 'Lead not found' }, 404);

      const systemPrompt = buildSystemPrompt(lead);
      const messages = [
        { role: 'system', content: systemPrompt },
        ...history.slice(-12),
        { role: 'user', content: message },
      ];

      const raw = await callOpenAI(env, messages);
      if (!raw) return json({ error: 'AI unavailable' }, 503);

      // Parsear JSON de la respuesta
      let parsed = {};
      try {
        const match = raw.match(/\{[\s\S]*\}/);
        parsed = match ? JSON.parse(match[0]) : {};
      } catch (_) {}

      const reply = parsed.reply || raw;
      if (!reply) return json({ error: 'AI unavailable' }, 503);
      const extracted = parsed.extracted || {};
      const newStage  = parsed.stage || null;

      // Actualizar lead con campos extraídos + last_msg_at
      const updates = { last_msg_at: Date.now(), followup_due: 0 };
      if (extracted.name         && extracted.name         !== 'null') updates.name         = extracted.name;
      if (extracted.event_type   && extracted.event_type   !== 'null') updates.event_type   = normalizeEventType(extracted.event_type);
      if (extracted.event_year   && extracted.event_year   !== 'null') updates.event_year   = normalizeEventYear(extracted.event_year);
      if (extracted.event_date   && extracted.event_date   !== 'null') updates.event_date   = extracted.event_date;
      if (extracted.venue        && extracted.venue        !== 'null') updates.venue        = extracted.venue;
      if (extracted.city         && extracted.city         !== 'null') updates.city         = extracted.city;
      if (extracted.guests       && extracted.guests       !== 'null') updates.guests       = parseInt(extracted.guests)||0;
      if (extracted.schedule     && extracted.schedule     !== 'null') updates.schedule     = extracted.schedule;
      if (extracted.service      && extracted.service      !== 'null') updates.service      = normalizeService(extracted.service);
      if (extracted.pre_service  && extracted.pre_service  !== 'null') updates.pre_service  = extracted.pre_service;
      if (extracted.honoree_name && extracted.honoree_name !== 'null') updates.honoree_name = extracted.honoree_name;
      if (extracted.couple_names && extracted.couple_names !== 'null') updates.couple_names = extracted.couple_names;
      if (newStage) updates.stage = newStage;

      const setClauses = Object.keys(updates).map(k => `${k} = ?`).join(', ');
      await env.DB.prepare(`UPDATE leads SET ${setClauses}, updated_at = ? WHERE id = ?`)
        .bind(...Object.values(updates), Date.now(), leadId).run();

      // Guardar mensaje de la IA en tabla messages
      await env.DB.prepare(
        'INSERT INTO messages (lead_id,direction,text,author,ts,wa_msg_id) VALUES (?,?,?,?,?,?)'
      ).bind(leadId, 'out', reply, 'Ángela', Date.now(), waMessageId || null).run();

      // Si completó datos, enviar PDF y pasar a presupuesto_enviado
      if (newStage === 'datos_completos') {
        const fresh = await env.DB.prepare('SELECT wa_jid, event_type FROM leads WHERE id = ?').bind(leadId).first();
        const waJid = fresh?.wa_jid || lead.wa_jid || '';
        const eventType = fresh?.event_type || updates.event_type || '';
        if (!eventType) {
          // AI declaró datos_completos sin event_type — rechazar y seguir consultando
          await env.DB.prepare('UPDATE leads SET stage = ?, updated_at = ? WHERE id = ?')
            .bind('consultando', Date.now(), leadId).run();
        } else if (waJid) {
          const pdf = getPdfUrl(eventType);
          const followupText = pdf ? `📎 ${pdf.name}\n${PDF_CAPTION}` : 'En breve Cristian te hace llegar los valores para tu evento. ¡Gracias por tu consulta! 😊';
          if (pdf) {
            await sendWA(waJid, PDF_CAPTION, pdf.url, pdf.name);
          } else {
            await sendWA(waJid, followupText);
          }
          await env.DB.prepare('INSERT INTO messages (lead_id,direction,text,author,ts) VALUES (?,?,?,?,?)')
            .bind(leadId, 'out', followupText, 'Ángela', Date.now()).run();
          await env.DB.prepare('UPDATE leads SET stage = ?, updated_at = ? WHERE id = ?')
            .bind('presupuesto_enviado', Date.now(), leadId).run();
        }
      }

      return json({ reply, extracted: updates, stage: newStage });
    }

    // POST /ai/inbound  ── llamado por el bridge en cada mensaje WA entrante
    if (method === 'POST' && path === '/ai/inbound') {
      const { waJid, waMessageId, message, pushName } = await request.json();
      if (!waJid || !message) return json({ error: 'missing fields' }, 400);

      // Lock atómico: INSERT OR IGNORE con PRIMARY KEY garantiza que solo UN request procesa este mensaje
      if (waMessageId) {
        const lock = await env.DB.prepare(
          'INSERT OR IGNORE INTO wa_locks (wa_msg_id, ts) VALUES (?, ?)'
        ).bind(waMessageId, Date.now()).run();
        if (lock.meta.changes === 0) return json({ ok: true, duplicate: true });
      }

      // Buscar o crear lead por waJid
      let lead = await env.DB.prepare('SELECT * FROM leads WHERE wa_jid = ? LIMIT 1').bind(waJid).first();
      // Resolver teléfono real desde whatsmeow_lid_map (necesario para JIDs @lid)
      let resolvedPhone = waJid.endsWith('@s.whatsapp.net') ? waJid.split('@')[0] : '';
      if (!resolvedPhone) resolvedPhone = await resolvePhone(waJid);

      if (!lead) {
        const newId = 'wa_' + Date.now();
        const t = Date.now();
        await env.DB.prepare(
          `INSERT INTO leads (id,salon,name,phone,wa_jid,source,stage,guests,notes,last_message,created_at,updated_at)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`
        ).bind(newId,'otros',pushName||'',resolvedPhone,waJid,'whatsapp','nuevo_lead',0,'',message,t,t).run();
        lead = { id: newId, wa_jid: waJid, name: pushName||'', phone: resolvedPhone };
      } else if (!lead.phone && resolvedPhone) {
        await env.DB.prepare('UPDATE leads SET phone = ?, updated_at = ? WHERE id = ?')
          .bind(resolvedPhone, Date.now(), lead.id).run();
      }
      const leadId = lead.id;

      // Historial desde D1
      const { results: hist } = await env.DB.prepare(
        'SELECT direction, text FROM messages WHERE lead_id = ? ORDER BY ts DESC LIMIT 12'
      ).bind(leadId).all();
      const histForAI = hist.reverse().map(m => ({ role: m.direction==='out'?'assistant':'user', content: m.text }));

      // Guardar mensaje entrante
      const tIn = Date.now();
      await env.DB.prepare('INSERT INTO messages (lead_id,direction,text,author,ts) VALUES (?,?,?,?,?)')
        .bind(leadId,'in',message,'',tIn).run();
      await env.DB.prepare('UPDATE leads SET last_message=?,last_msg_at=?,updated_at=? WHERE id=?')
        .bind(message,Math.floor(tIn/1000),tIn,leadId).run();

      // Llamar al AI
      const freshLead = (await env.DB.prepare('SELECT * FROM leads WHERE id = ?').bind(leadId).first()) || {};
      const sysPrompt = buildSystemPrompt(freshLead);
      const aiMessages = [
        { role:'system', content: sysPrompt },
        ...histForAI,
        { role:'user', content: message },
      ];
      const raw = await callOpenAI(env, aiMessages);
      if (!raw) return json({ ok: false, error: 'AI unavailable' });

      let parsed = {};
      try { const m = raw.match(/\{[\s\S]*\}/); parsed = m ? JSON.parse(m[0]) : {}; } catch(_) {}
      const reply = parsed.reply || raw;
      if (!reply) return json({ ok: false });

      // Actualizar lead con datos extraídos
      const extracted = parsed.extracted || {};
      const newStage = parsed.stage || null;
      const upd = { last_msg_at: Date.now(), followup_due: 0 };
      if (extracted.name         && extracted.name         !== 'null') upd.name         = extracted.name;
      if (extracted.event_type   && extracted.event_type   !== 'null') upd.event_type   = normalizeEventType(extracted.event_type);
      if (extracted.event_year   && extracted.event_year   !== 'null') upd.event_year   = normalizeEventYear(extracted.event_year);
      if (extracted.event_date   && extracted.event_date   !== 'null') upd.event_date   = extracted.event_date;
      if (extracted.venue        && extracted.venue        !== 'null') upd.venue        = extracted.venue;
      if (extracted.city         && extracted.city         !== 'null') upd.city         = extracted.city;
      if (extracted.guests       && extracted.guests       !== 'null') upd.guests       = parseInt(extracted.guests)||0;
      if (extracted.schedule     && extracted.schedule     !== 'null') upd.schedule     = extracted.schedule;
      if (extracted.service      && extracted.service      !== 'null') upd.service      = normalizeService(extracted.service);
      if (extracted.pre_service  && extracted.pre_service  !== 'null') upd.pre_service  = extracted.pre_service;
      if (extracted.honoree_name && extracted.honoree_name !== 'null') upd.honoree_name = extracted.honoree_name;
      if (extracted.couple_names && extracted.couple_names !== 'null') upd.couple_names = extracted.couple_names;
      if (newStage) upd.stage = newStage;
      const setCls = Object.keys(upd).map(k=>`${k}=?`).join(',');
      await env.DB.prepare(`UPDATE leads SET ${setCls},updated_at=? WHERE id=?`)
        .bind(...Object.values(upd),Date.now(),leadId).run();

      // Guardar reply y enviar
      await env.DB.prepare('INSERT INTO messages (lead_id,direction,text,author,ts,wa_msg_id) VALUES (?,?,?,?,?,?)')
        .bind(leadId,'out',reply,'Ángela',Date.now(),waMessageId||null).run();
      await sendWA(waJid, reply);

      if (newStage === 'datos_completos') {
        const fr = await env.DB.prepare('SELECT event_type FROM leads WHERE id=?').bind(leadId).first();
        const eventType = fr?.event_type || upd.event_type || '';
        if (!eventType) {
          // AI declaró datos_completos sin event_type — rechazar y seguir consultando
          await env.DB.prepare('UPDATE leads SET stage=?,updated_at=? WHERE id=?')
            .bind('consultando', Date.now(), leadId).run();
        } else {
          const pdf = getPdfUrl(eventType);
          const followupText = pdf ? `📎 ${pdf.name}\n${PDF_CAPTION}` : 'En breve Cristian te hace llegar los valores para tu evento. ¡Gracias por tu consulta! 😊';
          if (pdf) {
            await sendWA(waJid, PDF_CAPTION, pdf.url, pdf.name);
          } else {
            await sendWA(waJid, followupText);
          }
          await env.DB.prepare('INSERT INTO messages (lead_id,direction,text,author,ts) VALUES (?,?,?,?,?)')
            .bind(leadId,'out',followupText,'Ángela',Date.now()).run();
          await env.DB.prepare('UPDATE leads SET stage=?,updated_at=? WHERE id=?')
            .bind('presupuesto_enviado', Date.now(), leadId).run();
        }
      }
      return json({ ok: true, reply });
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
