registerLab({
  id: "19-middleware-ordering",
  order: 19,
  title: "Admin API wiring",
  difficulty: "hard",
  category: "auth",
  env: "node",
  mode: "static",
  filename: "app.js",
  description: "The admin API is defined and then protected with a `requireAdmin` guard.",
  code: [
    "const express = require('express');",
    "const app = express();",
    "",
    "// lightweight health check, mounted early so it stays fast",
    "app.get('/admin/health', (req, res) => res.send('ok'));",
    "",
    "// admin API",
    "app.get('/admin/users', (req, res) => {",
    "  res.json(db.users.all());",
    "});",
    "app.post('/admin/users/:id/delete', (req, res) => {",
    "  db.users.remove(req.params.id);",
    "  res.json({ ok: true });",
    "});",
    "",
    "// require admin for everything under /admin",
    "app.use('/admin', requireAdmin);",
    "",
    "app.listen(3000);"
  ].join("\n"),
  vulnerableLines: [8, 11, 17],
  hints: [
    "Express runs matching handlers and middleware in the order they are registered. Read the file top to bottom.",
    "When a request hits <code>/admin/users</code>, which registration matches first — the route handler or the guard?",
    "Where is <code>requireAdmin</code> mounted relative to the admin routes it's meant to protect?",
    "The guard on line 17 is registered <em>after</em> the routes on lines 8–14. For those routes, does <code>requireAdmin</code> ever execute?"
  ],
  vulnerabilityType: "Broken Function Level Authorization via middleware ordering (CWE-285 / CWE-696)",
  explanation:
    "<h4>Vulnerable lines</h4><p>The admin route handlers (lines 8 and 11) combined with the guard being registered too late (line 17). It's an ordering bug — no single line is wrong in isolation.</p>" +
    "<h4>Vulnerability</h4><p>Broken Function Level Authorization. The authorization middleware is unreachable for the routes it's supposed to protect.</p>" +
    "<h4>Attack</h4><pre>GET  /admin/users            -> 200, full user list (no auth)\nPOST /admin/users/42/delete  -> 200, deletes user 42 (no auth)</pre>" +
    "<p>Because Express matches in registration order, the handlers on lines 8–14 run and respond before control ever reaches <code>app.use('/admin', requireAdmin)</code> on line 17. The guard only protects routes declared <em>after</em> it (here, none).</p>" +
    "<h4>Why it works</h4><p>Express middleware is positional. A handler that sends a response ends the chain, so a guard mounted later in the file simply never runs for earlier routes.</p>" +
    "<h4>Secure fix</h4><pre>app.get('/admin/health', (req, res) => res.send('ok'));\napp.use('/admin', requireAdmin);   // guard BEFORE the protected routes\napp.get('/admin/users', ...);\napp.post('/admin/users/:id/delete', ...);</pre>" +
    "<p>Or attach <code>requireAdmin</code> directly to each route: <code>app.get('/admin/users', requireAdmin, handler)</code>, and mount a dedicated pre-guarded <code>adminRouter</code>.</p>" +
    "<h4>Why the fix works</h4><p>Registering the guard before the protected routes puts it earlier in the matching order, so every subsequent <code>/admin</code> request must pass <code>requireAdmin</code> before reaching a handler. Per-route guards make the dependency explicit and ordering-independent.</p>"
});
