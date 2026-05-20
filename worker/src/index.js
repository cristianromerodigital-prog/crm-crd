const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

function now() { return Date.now(); }

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });

    const url  = new URL(request.url);
    const path = url.pathname.replace(/\/$/, '');
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
      const t = now();
      await env.DB.prepare(
        `INSERT OR REPLACE INTO leads
         (id,salon,name,phone,wa_jid,source,event_type,event_year,stage,guests,notes,last_message,created_at,updated_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
      ).bind(
        b.id || ('wa_' + t), b.salon||'otros', b.name||'', b.phone||'',
        b.wa_jid||'', b.source||'whatsapp', b.event_type||'', b.event_year||'',
        b.stage||'nuevo_lead', b.guests||0, b.notes||'', b.last_message||'',
        b.created_at||t, t
      ).run();
      return json({ ok: true });
    }

    // PUT /leads/:id
    const leadMatch = path.match(/^\/leads\/([^/]+)$/);
    if (method === 'PUT' && leadMatch) {
      const id = leadMatch[1];
      const b  = await request.json();
      const fields = [];
      const vals   = [];
      const allowed = ['salon','name','phone','wa_jid','source','event_type','event_year','stage','guests','notes','last_message'];
      for (const k of allowed) {
        if (k in b) { fields.push(`${k} = ?`); vals.push(b[k]); }
      }
      if (!fields.length) return json({ ok: true });
      fields.push('updated_at = ?'); vals.push(now()); vals.push(id);
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
      const t  = now();
      await env.DB.prepare(
        'INSERT INTO messages (lead_id,direction,text,author,ts) VALUES (?,?,?,?,?)'
      ).bind(id, b.direction||'in', b.text||'', b.author||'', b.ts||t).run();
      // Actualizar last_message del lead
      await env.DB.prepare(
        'UPDATE leads SET last_message = ?, updated_at = ? WHERE id = ?'
      ).bind(b.text, t, id).run();
      return json({ ok: true });
    }

    return json({ error: 'Not found' }, 404);
  }
};
