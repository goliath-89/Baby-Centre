// Test doubles for the two sync backends.
// 1. A Firebase Realtime Database look-alike: REST + EventSource streaming, drops nulls, can go offline or refuse writes.
// 2. A fake of the hosted page's `claude.use("db")` store, backed by this server so two browser contexts share it.
const http = require('http');
function strip(v) { if (v === null || v === undefined) return undefined; if (typeof v !== 'object') return v; const o = Array.isArray(v) ? [] : {}; let n = 0; for (const k in v) { const x = strip(v[k]); if (x !== undefined) { o[k] = x; n++; } } return n ? o : undefined; }
function start(staticHandler) {
  const rooms = {}, streams = new Set(), docs = {}, docStreams = new Set(), state = { down: false, denyWrites: false, writes: 0 };
  const send = (res, ev, data) => res.write(`event: ${ev}\ndata: ${JSON.stringify(data)}\n\n`);
  const server = http.createServer((req, res) => {
    const url = req.url.split('?')[0];
    if (!url.startsWith('/rooms/') && !url.startsWith('/cdb')) return staticHandler(req, res);
    if (state.down) return req.socket.destroy();
    res.setHeader('Access-Control-Allow-Origin', '*'); res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,PATCH,POST,OPTIONS'); res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
    let body = ''; req.on('data', c => body += c); req.on('end', () => {
      if (url.startsWith('/cdb')) { // fake document store: GET stream, POST {op,id,fields,level}
        if (req.method === 'GET') { res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' }); send(res, 'docs', docs); docStreams.add(res); res.on('close', () => docStreams.delete(res)); return; }
        const m = JSON.parse(body); let out = { ok: true };
        if (m.op === 'get') out = { exists: !!docs[m.id], data: docs[m.id] || null };
        else if (m.level === 'view') out = { error: 'invalid_argument' };
        else if (m.op === 'update') { if (!docs[m.id]) out = { error: 'invalid_argument' }; else Object.assign(docs[m.id], m.fields); }
        else if (m.op === 'set') docs[m.id] = m.fields;
        if (out.ok) { state.writes++; docStreams.forEach(s => send(s, 'docs', docs)); }
        res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify(out));
      }
      const m = /^\/rooms\/([A-Za-z0-9]+)\/r(?:\/([^/]+))?\.json$/.exec(url); if (!m) { res.writeHead(404); return res.end('null'); }
      const room = m[1], key = m[2]; rooms[room] = rooms[room] || {};
      if (req.method === 'GET') {
        if ((req.headers.accept || '').includes('text/event-stream')) { res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' }); send(res, 'put', { path: '/', data: Object.keys(rooms[room]).length ? rooms[room] : null }); const s = { res, room }; streams.add(s); res.on('close', () => streams.delete(s)); return; }
        res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify(key ? rooms[room][key] || null : rooms[room]));
      }
      if (state.denyWrites) { res.writeHead(401, { 'Content-Type': 'application/json' }); return res.end('{"error":"Permission denied"}'); }
      const data = strip(JSON.parse(body)); state.writes++;
      if (req.method === 'PATCH' && !key) { for (const k in data || {}) rooms[room][k] = data[k]; streams.forEach(s => s.room === room && send(s.res, 'patch', { path: '/', data })); }
      else if (req.method === 'PUT' && key) { if (data === undefined) delete rooms[room][key]; else rooms[room][key] = data; streams.forEach(s => s.room === room && send(s.res, 'put', { path: '/' + key, data: data === undefined ? null : data })); }
      res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(data === undefined ? null : data));
    });
  });
  return { server, rooms, docs, state, goDown() { state.down = true; streams.forEach(s => s.res.destroy()); docStreams.forEach(s => s.destroy()); }, goUp() { state.down = false; } };
}
// Runs inside the page (addInitScript). Mimics the parts of the host store the app uses.
function fakeClaude(level) {
  const post = m => fetch('/cdb', { method: 'POST', body: JSON.stringify(Object.assign({ level }, m)) }).then(r => r.json()).then(r => { if (r.error) throw { code: r.error, message: r.error }; return r; });
  const snapDoc = (id, data) => ({ id, exists: !!data, data: () => data, metadata: { fromCache: false, hasPendingWrites: false } });
  const db = {
    collection: () => ({
      doc: id => ({ id, update: fields => post({ op: 'update', id, fields }).then(() => { }), set: fields => post({ op: 'set', id, fields }).then(() => { }), get: () => post({ op: 'get', id }).then(r => snapDoc(id, r.data)) }),
      onSnapshot(next) {
        let prev = {}; const es = new EventSource('/cdb');
        es.addEventListener('docs', e => {
          const docs = JSON.parse(e.data), changes = [];
          for (const id in docs) { const j = JSON.stringify(docs[id]); if (prev[id] !== j) { changes.push({ type: prev[id] ? 'modified' : 'added', doc: snapDoc(id, docs[id]) }); prev[id] = j; } }
          next({ docs: Object.keys(docs).map(id => snapDoc(id, docs[id])), docChanges: () => changes, metadata: { fromCache: false, hasPendingWrites: false } });
        });
        return () => es.close();
      }
    })
  };
  window.claude = { use: name => new Promise(ok => setTimeout(() => ok(name === 'db' ? db : null), 50)) };
}
module.exports = { start, fakeClaude };
