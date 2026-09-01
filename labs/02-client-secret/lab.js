registerLab({
  id: "02-client-secret",
  order: 2,
  title: "Secret API key shipped to the browser",
  difficulty: "easy",
  category: "secrets",
  env: "browser",
  mode: "static",
  description: "A dashboard's client-side config object holds the credentials it uses to call the backend.",
  code: [
    "const CONFIG = {",
    "  apiBase: 'https://api.shop.example',",
    "  // used to authenticate admin API calls from the dashboard",
    "  adminApiKey: 'sk_live_9f2c1a7b4e8d0c6f3a2b',",
    "  currency: 'USD'",
    "};",
    "",
    "async function loadAdminStats() {",
    "  const res = await fetch(CONFIG.apiBase + '/admin/stats', {",
    "    headers: { 'Authorization': 'Bearer ' + CONFIG.adminApiKey }",
    "  });",
    "  return res.json();",
    "}"
  ].join("\n"),
  vulnerableLines: [4],
  hints: [
    "Everything in front-end JavaScript is fully readable by anyone who opens DevTools.",
    "Which value here is a credential that should never leave the server?",
    "A live secret key (<code>sk_live_...</code>) hardcoded in client code is exposed to every visitor."
  ],
  vulnerabilityType: "Sensitive Data Exposure (hardcoded secret)",
  explanation:
    "<h4>Why it's vulnerable</h4>" +
    "<p>Client-side JavaScript is downloaded and executed by the user's browser. There is no such thing as a hidden value in it — " +
    "<code>adminApiKey</code> is visible in the Sources tab, in the network response, and in <code>window.CONFIG</code> from the console.</p>" +
    "<h4>Exploit</h4>" +
    "<p>Any visitor opens DevTools and reads the key, then calls the admin API directly:</p>" +
    "<pre>curl https://api.shop.example/admin/stats \\\n  -H 'Authorization: Bearer sk_live_9f2c1a7b4e8d0c6f3a2b'</pre>" +
    "<p>The <code>sk_live_</code> prefix signals a production secret with real privileges.</p>" +
    "<h4 class='badge-impact'>Impact</h4>" +
    "<p>Full access to whatever the key authorizes — reading admin data, charging cards, exfiltrating records. This is a top cause of real breaches (leaked keys in bundles, source maps, and public repos).</p>" +
    "<h4 class='badge-fix'>Fix</h4>" +
    "<p>Keep secrets on the server. The browser should call your own backend with the user's <em>session</em>; the backend attaches the privileged key server-side. Rotate any key that ever shipped to a client, and scope keys to least privilege.</p>"
});
