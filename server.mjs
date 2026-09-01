import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { liveLabs, createLabState, labStatus } from './server/live-labs.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const ROOT_REAL = await fs.realpath(ROOT);
const MAX_BODY = 64 * 1024;
const SESSION_TTL = 2 * 60 * 60 * 1000;
const sessions = new Map();

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8'
};

function securityHeaders() {
  return {
    'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'self'",
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
  };
}
function parseCookies(raw = '') {
  const out = {};
  for (const pair of raw.split(';')) {
    const split = pair.indexOf('=');
    if (split <= 0) continue;
    out[pair.slice(0, split).trim()] = pair.slice(split + 1).trim();
  }
  return out;
}

function getSession(req) {
  const cookies = parseCookies(req.headers.cookie);
  let id = cookies.srl_session;
  let isNew = false;
  if (!id || !/^[a-f0-9-]{36}$/.test(id) || !sessions.has(id)) {
    id = crypto.randomUUID();
    sessions.set(id, { labs: new Map(), touchedAt: Date.now() });
    isNew = true;
  }
  const session = sessions.get(id);
  session.touchedAt = Date.now();
  return { id, session, isNew };
}

function cleanSessions() {
  const cutoff = Date.now() - SESSION_TTL;
  for (const [id, session] of sessions) if (session.touchedAt < cutoff) sessions.delete(id);
}

function send(res, status, body, headers = {}, cookie = null) {
  const finalHeaders = { 'Cache-Control': 'no-store', ...headers };
  if (cookie) finalHeaders['Set-Cookie'] = `srl_session=${cookie}; Path=/; HttpOnly; SameSite=Lax`;
  res.writeHead(status, finalHeaders);
  res.end(body);
}

async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY) {
      const error = new Error('request body exceeds 64 KiB lab limit');
      error.statusCode = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

function stateFor(session, id) {
  if (!session.labs.has(id)) session.labs.set(id, createLabState(id));
  return session.labs.get(id);
}

async function handleLiveLab(req, res, url, id, subpath) {
  const definition = liveLabs[id];
  if (!definition) return send(res, 404, JSON.stringify({ error: 'unknown live lab' }), { 'Content-Type': MIME['.json'] });
  const auth = getSession(req);
  const state = stateFor(auth.session, id);
  let bodyPromise;
  const getText = () => bodyPromise || (bodyPromise = readBody(req));
  const ctx = {
    method: req.method || 'GET',
    subpath,
    url,
    headers: req.headers,
    state,
    delay(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); },
    readText: getText,
    async readJson() {
      const raw = await getText();
      try { return JSON.parse(raw || '{}'); }
      catch {
        const error = new Error('request body must be valid JSON');
        error.statusCode = 400;
        throw error;
      }
    },
    json(status, data, headers = {}) {
      send(res, status, JSON.stringify(data, null, 2), { 'Content-Type': MIME['.json'], ...headers }, auth.isNew ? auth.id : null);
    },
    raw(status, data, headers = {}) {
      send(res, status, data, headers, auth.isNew ? auth.id : null);
    }
  };
  try {
    await definition.handle(ctx);
  } catch (error) {
    const status = error.statusCode || 500;
    const message = status >= 500 ? 'lab server error' : error.message;
    if (!res.headersSent) ctx.json(status, { error: message });
  }
}

async function handleStatus(req, res, id) {
  if (req.method !== 'GET') return send(res, 405, JSON.stringify({ error: 'GET required' }), { 'Content-Type': MIME['.json'], Allow: 'GET' });
  const definition = liveLabs[id];
  if (!definition) return send(res, 404, JSON.stringify({ error: 'unknown live lab' }), { 'Content-Type': MIME['.json'] });
  const auth = getSession(req);
  const status = labStatus(id, stateFor(auth.session, id));
  send(res, 200, JSON.stringify(status), { 'Content-Type': MIME['.json'] }, auth.isNew ? auth.id : null);
}

async function handleReset(req, res, id) {
  if (req.method !== 'POST') return send(res, 405, JSON.stringify({ error: 'POST required' }), { 'Content-Type': MIME['.json'], Allow: 'POST' });
  if (!liveLabs[id]) return send(res, 404, JSON.stringify({ error: 'unknown live lab' }), { 'Content-Type': MIME['.json'] });
  const auth = getSession(req);
  auth.session.labs.set(id, createLabState(id));
  send(res, 200, JSON.stringify({ reset: true }), { 'Content-Type': MIME['.json'] }, auth.isNew ? auth.id : null);
}

async function serveStatic(req, res, pathname) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return send(res, 405, 'Method not allowed', { ...securityHeaders(), 'Content-Type': 'text/plain; charset=utf-8', Allow: 'GET, HEAD' });
  }
  let decoded;
  try { decoded = decodeURIComponent(pathname); }
  catch { return send(res, 400, 'Invalid path encoding', { ...securityHeaders(), 'Content-Type': 'text/plain; charset=utf-8' }); }
  if (decoded.includes('\0')) return send(res, 400, 'Invalid path', { ...securityHeaders(), 'Content-Type': 'text/plain; charset=utf-8' });
  if (decoded === '/') decoded = '/index.html';
  const candidate = path.resolve(ROOT, '.' + decoded);
  if (candidate !== ROOT && !candidate.startsWith(ROOT + path.sep)) {
    return send(res, 403, 'Forbidden', { ...securityHeaders(), 'Content-Type': 'text/plain; charset=utf-8' });
  }
  try {
    const real = await fs.realpath(candidate);
    if (real !== ROOT_REAL && !real.startsWith(ROOT_REAL + path.sep)) throw Object.assign(new Error('outside root'), { code: 'EACCES' });
    const stat = await fs.stat(real);
    if (!stat.isFile()) throw Object.assign(new Error('not a file'), { code: 'ENOENT' });
    const ext = path.extname(real).toLowerCase();
    if (!MIME[ext]) return send(res, 415, 'Unsupported file type', { ...securityHeaders(), 'Content-Type': 'text/plain; charset=utf-8' });
    const data = req.method === 'HEAD' ? '' : await fs.readFile(real);
    send(res, 200, data, { ...securityHeaders(), 'Content-Type': MIME[ext], 'Content-Length': stat.size });
  } catch (error) {
    const status = error.code === 'EACCES' ? 403 : 404;
    send(res, status, status === 403 ? 'Forbidden' : 'Not found', { ...securityHeaders(), 'Content-Type': 'text/plain; charset=utf-8' });
  }
}

export function createLabServer() {
  return http.createServer(async (req, res) => {
    cleanSessions();
    let url;
    try { url = new URL(req.url || '/', 'http://lab.local'); }
    catch { return send(res, 400, 'Bad request', { 'Content-Type': 'text/plain; charset=utf-8' }); }

    const live = url.pathname.match(/^\/lab-api\/([a-z0-9-]+)(\/.*)?$/);
    if (live) return handleLiveLab(req, res, url, live[1], live[2] || '/');
    const status = url.pathname.match(/^\/__lab\/status\/([a-z0-9-]+)$/);
    if (status) return handleStatus(req, res, status[1]);
    const reset = url.pathname.match(/^\/__lab\/reset\/([a-z0-9-]+)$/);
    if (reset) return handleReset(req, res, reset[1]);
    if (url.pathname.startsWith('/__lab/')) return send(res, 404, JSON.stringify({ error: 'unknown lab control route' }), { 'Content-Type': MIME['.json'] });
    return serveStatic(req, res, url.pathname);
  });
}

function parsePort(argv) {
  const index = argv.indexOf('--port');
  const raw = index >= 0 ? argv[index + 1] : process.env.PORT || '8000';
  const port = Number(raw);
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('port must be 0..65535');
  return port;
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) {
  const port = parsePort(process.argv.slice(2));
  const host = '127.0.0.1';
  const server = createLabServer();
  server.listen(port, host, () => {
    const address = server.address();
    console.log(`Security Research Labs running at http://${host}:${address.port}`);
    console.log('Live labs are isolated in memory and have no outbound network access.');
  });
}
