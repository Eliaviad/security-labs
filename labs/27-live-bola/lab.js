registerLab({
  id: "27-live-bola",
  order: 27,
  title: "BOLA in invoice retrieval",
  mysteryTitle: "Invoice API",
  difficulty: "medium",
  category: "auth",
  env: "http",
  mode: "http",
  track: "web-auth",
  skills: ["object-authorization", "id-enumeration", "negative-testing"],
  estimatedTime: 20,
  prerequisites: ["17-idor-ownership"],
  filename: "routes/invoices.js",
  description: "An authenticated API retrieves invoices by a client-supplied object identifier.",
  code: [
    "app.get('/api/invoices/:invoiceId', requireUser, async (req, res) => {",
    "  const invoice = await Invoice.findOne({",
    "    id: req.params.invoiceId",
    "  });",
    "  if (!invoice) return res.status(404).json({ error: 'not found' });",
    "  return res.json(invoice);",
    "});"
  ].join("\n"),
  vulnerableLines: [2, 3],
  hints: [
    "Authentication answers who the caller is. Where does this query decide which records that identity may access?",
    "Establish a baseline using Alice's own invoice <code>inv-100</code>, then change only the object identifier.",
    "A random 404 is not useful evidence. Look for a second valid identifier belonging to a different owner and compare the response shape.",
    "Keep <code>X-Lab-User: alice</code> fixed and request <code>inv-200</code>. A returned Bob invoice proves missing object-level authorization."
  ],
  vulnerabilityType: "Broken Object Level Authorization / IDOR (CWE-639)",
  http: {
    basePath: "/lab-api/27-live-bola",
    statusPath: "/__lab/status/27-live-bola",
    resetPath: "/__lab/reset/27-live-bola",
    goal: "As Alice, retrieve an invoice owned by another user without changing identity.",
    requests: [
      {
        name: "Own invoice",
        method: "GET",
        path: "/lab-api/27-live-bola/invoices/inv-100",
        headers: "X-Lab-User: alice",
        body: ""
      }
    ]
  },
  explanation:
    "<h4>Root cause</h4><p>The handler is authenticated but the database predicate contains only the attacker-controlled object id. There is no ownership or tenant constraint, so possession or discovery of another id becomes authorization.</p>" +
    "<h4>Method</h4><p>Use a positive control first: Alice must be able to fetch her own invoice. Then keep the identity header unchanged and alter only the identifier. This produces a clean differential and avoids confusing an authentication change with an authorization flaw.</p>" +
    "<h4>Impact and limits</h4><p>A cross-owner 200 response exposes private invoice data. Sequential ids make discovery easier, but unpredictability is not an authorization control; leaked UUIDs are still exploitable. A 404 for an invented id does not prove the endpoint is secure.</p>" +
    "<h4>Secure fix</h4><pre>const invoice = await Invoice.findOne({\n  id: req.params.invoiceId,\n  ownerId: req.user.id\n});\nif (!invoice) return res.status(404).json({ error: 'not found' });</pre><p>For privileged roles, make the policy explicit and audited rather than omitting the owner predicate.</p>" +
    "<h4>Regression tests</h4><p>Test own existing id → 200, another user's existing id → 404, missing id → the same 404 shape, unauthenticated request → 401, and authorized support access only when the intended policy grants it.</p>"
});
