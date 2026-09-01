import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createLabServer } from '../server.mjs';

const server = createLabServer();
server.listen(0, '127.0.0.1');
await once(server, 'listening');
const { port } = server.address();
const origin = `http://127.0.0.1:${port}`;

function createClient() {
  let cookie = '';
  return {
    get cookie() { return cookie; },
    async request(path, options = {}) {
      const headers = new Headers(options.headers || {});
      if (cookie) headers.set('Cookie', cookie);
      const response = await fetch(origin + path, { ...options, headers, redirect: 'manual' });
      const setCookie = response.headers.get('set-cookie');
      if (setCookie) cookie = setCookie.split(';', 1)[0];
      const text = await response.text();
      let json = null;
      if ((response.headers.get('content-type') || '').includes('application/json')) {
        try { json = JSON.parse(text); } catch { /* asserted by individual tests */ }
      }
      return { response, status: response.status, headers: response.headers, text, json };
    }
  };
}

async function reset(client, id) {
  const result = await client.request(`/__lab/reset/${id}`, { method: 'POST' });
  assert.equal(result.status, 200, `${id}: reset must succeed`);
}

async function status(client, id) {
  const result = await client.request(`/__lab/status/${id}`);
  assert.equal(result.status, 200, `${id}: status must succeed`);
  return result.json;
}

async function jsonRequest(client, path, method, body, headers = {}) {
  return client.request(path, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
}

try {
  const client = createClient();

  const home = await client.request('/');
  assert.equal(home.status, 200, 'home page must be served');
  assert.match(home.headers.get('content-security-policy') || '', /default-src 'self'/);
  assert.equal(home.headers.get('x-content-type-options'), 'nosniff');
  assert.equal((await client.request('/..%2F..%2Fetc%2Fpasswd')).status, 403, 'encoded traversal must be blocked');
  assert.equal((await client.request('/server.mjs')).status, 415, 'server source must not be served');

  const oversized = await client.request('/lab-api/25-stored-xss/comments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: 'A'.repeat(70 * 1024) })
  });
  assert.equal(oversized.status, 413, 'request bodies above the lab limit must be rejected');
  assert.equal((await client.request('/__lab/reset/25-stored-xss')).status, 405, 'reset must require POST');
  assert.equal((await client.request('/__lab/status/25-stored-xss', { method: 'POST' })).status, 405, 'status must require GET');

  await reset(client, '25-stored-xss');
  await jsonRequest(client, '/lab-api/25-stored-xss/comments', 'POST', { content: '<script>alert(1)</script>' });
  await jsonRequest(client, '/lab-api/25-stored-xss/victim/visit', 'POST', {});
  assert.equal((await status(client, '25-stored-xss')).success, false, 'innerHTML script tags alone must not be graded as executable');
  await jsonRequest(client, '/lab-api/25-stored-xss/comments', 'POST', { content: '<img src=x onerror=alert(1)>' });
  await jsonRequest(client, '/lab-api/25-stored-xss/victim/visit', 'POST', {});
  assert.equal((await status(client, '25-stored-xss')).success, true, 'event-handler stored XSS proof must succeed');

  await reset(client, '26-reset-poisoning');
  await jsonRequest(client, '/lab-api/26-reset-poisoning/request', 'POST', { email: 'alice@lab.local' });
  assert.equal((await status(client, '26-reset-poisoning')).success, false, 'trusted reset host must not pass the exploit objective');
  await jsonRequest(client, '/lab-api/26-reset-poisoning/request', 'POST', { email: 'alice@lab.local' }, { 'X-Forwarded-Host': 'attacker.test' });
  assert.equal((await status(client, '26-reset-poisoning')).success, true, 'poisoned reset host must be detected');

  await reset(client, '27-live-bola');
  assert.equal((await client.request('/lab-api/27-live-bola/invoices/inv-100', { headers: { 'X-Lab-User': 'alice' } })).status, 200);
  assert.equal((await status(client, '27-live-bola')).success, false, 'own-object access is not a BOLA proof');
  assert.equal((await client.request('/lab-api/27-live-bola/invoices/inv-200', { headers: { 'X-Lab-User': 'alice' } })).status, 200);
  assert.equal((await status(client, '27-live-bola')).success, true, 'cross-owner access must prove BOLA');

  await reset(client, '28-mime-upload');
  const upload = await client.request('/lab-api/28-mime-upload/upload?filename=proof.html', {
    method: 'POST', headers: { 'Content-Type': 'image/png' }, body: '<img src=x onerror=alert(document.domain)>'
  });
  assert.equal(upload.status, 201);
  const servedUpload = await client.request('/lab-api/28-mime-upload/files/proof.html');
  assert.equal(servedUpload.status, 200);
  assert.match(servedUpload.headers.get('content-security-policy') || '', /sandbox/, 'active upload output must stay sandboxed');
  assert.equal((await status(client, '28-mime-upload')).success, true, 'MIME/extension confusion proof must succeed');

  await reset(client, '29-live-ssrf');
  assert.equal((await jsonRequest(client, '/lab-api/29-live-ssrf/preview', 'POST', { url: 'http://127.0.0.1/admin' })).status, 403);
  assert.equal((await status(client, '29-live-ssrf')).success, false, 'blocked loopback notation must not pass');
  const ssrf = await jsonRequest(client, '/lab-api/29-live-ssrf/preview', 'POST', { url: 'http://0.0.0.0/latest/meta-data' });
  assert.equal(ssrf.status, 200);
  assert.match(ssrf.json.credential, /^LAB-IAM-CREDENTIAL-/);
  assert.equal((await status(client, '29-live-ssrf')).success, true, 'alternate internal-host representation must prove SSRF');

  await reset(client, '30-live-ssti');
  const arithmetic = await jsonRequest(client, '/lab-api/30-live-ssti/preview', 'POST', { template: '{{7*7}}' });
  assert.equal(arithmetic.json.rendered, '49');
  assert.equal((await status(client, '30-live-ssti')).success, false, 'arithmetic fingerprint alone is not secret access');
  const templateRead = await jsonRequest(client, '/lab-api/30-live-ssti/preview', 'POST', { template: '{{env.LAB_SECRET}}' });
  assert.match(templateRead.json.rendered, /^SSTI-SERVER-SECRET-/);
  assert.equal((await status(client, '30-live-ssti')).success, true, 'server-only value access must prove impact');

  await reset(client, '31-oauth-linking');
  await client.request('/lab-api/31-oauth-linking/link/callback?code=alice-code', { headers: { 'X-Lab-User': 'alice' } });
  assert.equal((await status(client, '31-oauth-linking')).success, false, 'legitimate identity linking must not pass');
  await client.request('/lab-api/31-oauth-linking/link/callback?code=attacker-code', { headers: { 'X-Lab-User': 'alice' } });
  assert.equal((await status(client, '31-oauth-linking')).success, true, 'unbound authorization code must prove login-linking CSRF');

  await reset(client, '32-excessive-data');
  const profile = await client.request('/lab-api/32-excessive-data/profile', { headers: { 'X-Lab-User': 'alice' } });
  assert.equal(profile.status, 200);
  assert.ok(profile.json.passwordHash && profile.json.resetToken && profile.json.internalRole);
  assert.equal((await status(client, '32-excessive-data')).success, true, 'unnecessary sensitive fields must be observed');

  await reset(client, '33-live-race');
  await status(client, '33-live-race');
  const burst = await Promise.all(Array.from({ length: 8 }, () =>
    jsonRequest(client, '/lab-api/33-live-race/redeem', 'POST', { code: 'SAVE50' })
  ));
  assert.ok(burst.filter((result) => result.status === 200).length > 1, 'race burst must produce multiple successful redemptions');
  assert.equal((await status(client, '33-live-race')).success, true, 'concurrent redemption must prove the race condition');

  await reset(client, '34-safe-ownership');
  assert.equal((await client.request('/lab-api/34-safe-ownership/invoices/inv-100', { headers: { 'X-Lab-User': 'alice' } })).status, 200);
  assert.equal((await client.request('/lab-api/34-safe-ownership/invoices/inv-200', { headers: { 'X-Lab-User': 'alice' } })).status, 404);
  assert.equal((await status(client, '34-safe-ownership')).success, true, 'secure lab requires positive and negative authorization evidence');

  const isolatedClient = createClient();
  assert.equal((await status(isolatedClient, '27-live-bola')).success, false, 'lab state must be isolated between sessions');

  console.log('QA PASS: 10 live labs executed through isolated HTTP sessions');
  console.log('Security controls: body limit, method guards, traversal containment, CSP sandbox, session isolation');
} finally {
  server.close();
  await once(server, 'close');
}
