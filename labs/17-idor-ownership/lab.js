registerLab({
  id: "17-idor-ownership",
  order: 17,
  title: "Fetch an invoice",
  difficulty: "medium",
  category: "auth",
  env: "node",
  mode: "static",
  filename: "routes/invoices.js",
  description: "An authenticated endpoint returns an invoice by id. `requireAuth` populates `req.user`.",
  code: [
    "// GET /api/invoices/:id",
    "router.get('/api/invoices/:id', requireAuth, async (req, res) => {",
    "  const invoice = await Invoice.findById(req.params.id);",
    "",
    "  if (!invoice) {",
    "    return res.status(404).json({ error: 'not found' });",
    "  }",
    "",
    "  res.json(invoice);",
    "});"
  ].join("\n"),
  vulnerableLines: [3, 9],
  hints: [
    "The route requires authentication. Does being authenticated mean you're authorized for <em>this specific</em> record?",
    "<code>req.params.id</code> is attacker-controlled. What links this invoice to the current user?",
    "Is there any comparison between the invoice's owner and <code>req.user</code> anywhere in the handler?",
    "User A calls <code>GET /api/invoices/&lt;B's id&gt;</code>. What in this code stops A from reading B's invoice?"
  ],
  vulnerabilityType: "IDOR / Broken Object Level Authorization (CWE-639)",
  explanation:
    "<h4>Vulnerable lines</h4><p>Line 3 fetches purely by id, and line 9 returns it unconditionally. The bug is what's <em>missing between them</em>: an ownership check.</p>" +
    "<h4>Vulnerability</h4><p>Insecure Direct Object Reference / Broken Object Level Authorization. Authentication is enforced; authorization for the specific object is not.</p>" +
    "<h4>Attack</h4><pre>GET /api/invoices/6631f...  (an id belonging to another tenant)\nAuthorization: Bearer &lt;attacker's valid token&gt;</pre>" +
    "<p>Any logged-in user can enumerate or guess ids and read invoices that aren't theirs. With sequential ids it's trivial; even with UUIDs, ids leak through emails, referrers, and shared links.</p>" +
    "<h4>Why it works</h4><p><code>requireAuth</code> only proves <em>who</em> you are, not <em>what</em> you may access. The lookup keys on the id alone, so object-level access control never happens.</p>" +
    "<h4>Secure fix</h4><pre>const invoice = await Invoice.findOne({\n  _id: req.params.id,\n  ownerId: req.user.id   // scope to the caller\n});\nif (!invoice) return res.status(404).json({ error: 'not found' });</pre>" +
    "<h4>Why the fix works</h4><p>Binding the query to <code>req.user.id</code> makes ownership part of the lookup itself, so another tenant's id simply returns nothing. Returning 404 (not 403) also avoids confirming that the id exists.</p>"
});
