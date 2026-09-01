registerLab({
  id: "34-safe-ownership",
  order: 34,
  title: "Ownership-scoped invoice lookup",
  mysteryTitle: "Invoice API review II",
  difficulty: "medium",
  category: "auth",
  env: "http",
  mode: "http",
  track: "web-auth",
  skills: ["secure-review", "authorization-tests", "anti-false-positive"],
  estimatedTime: 20,
  prerequisites: ["27-live-bola"],
  safe: true,
  filename: "routes/invoices-secure.js",
  description: "A revised endpoint scopes object lookup to the authenticated owner and returns a uniform absence response.",
  code: [
    "app.get('/api/invoices/:invoiceId', requireUser, async (req, res) => {",
    "  const invoice = await Invoice.findOne({",
    "    id: req.params.invoiceId,",
    "    ownerId: req.user.id",
    "  });",
    "  if (!invoice) return res.status(404).json({ error: 'not found' });",
    "  return res.json(invoice);",
    "});"
  ].join("\n"),
  vulnerableLines: [],
  hints: [
    "Do not infer safety from the presence of authentication middleware. Inspect the complete object-selection predicate.",
    "A useful authorization review needs both a positive control and a negative control: can Alice access her own real object, and what happens for Bob's real object?",
    "The owner id comes from the verified server-side user context, not a request parameter, and the unauthorized object uses the same response as a missing object.",
    "Mark the snippet secure, then request <code>inv-100</code> and <code>inv-200</code> as Alice. The grader requires own=200 and other=404 before accepting the live proof."
  ],
  vulnerabilityType: "Secure implementation — ownership enforced in the data query",
  http: {
    basePath: "/lab-api/34-safe-ownership",
    statusPath: "/__lab/status/34-safe-ownership",
    resetPath: "/__lab/reset/34-safe-ownership",
    goal: "Demonstrate that Alice can retrieve her own invoice while Bob's real invoice remains inaccessible and indistinguishable from missing data.",
    requests: [
      {
        name: "Alice's invoice",
        method: "GET",
        path: "/lab-api/34-safe-ownership/invoices/inv-100",
        headers: "X-Lab-User: alice",
        body: ""
      },
      {
        name: "Bob's invoice",
        method: "GET",
        path: "/lab-api/34-safe-ownership/invoices/inv-200",
        headers: "X-Lab-User: alice",
        body: ""
      }
    ]
  },
  explanation:
    "<h4>Verdict: secure for the reviewed property</h4><p>The query combines the requested id with <code>ownerId: req.user.id</code>. Alice's identity is supplied by authentication state, not by a client-selected owner parameter, so Bob's record cannot match.</p>" +
    "<h4>Why the negative test is not enough</h4><p>A 404 for Bob could also be caused by a broken endpoint, nonexistent seed data or wrong authentication. The own-object 200 positive control proves the route works; the cross-owner 404 then supplies meaningful authorization evidence. The lab requires both observations.</p>" +
    "<h4>Information boundary</h4><p>Returning the same 404 shape for missing and unauthorized objects reduces identifier enumeration. This is defense in depth; the ownership predicate is the actual access control.</p>" +
    "<h4>Review scope</h4><p>This verdict covers object ownership in the shown read handler. It does not automatically prove that invoice fields are minimized, that support/admin exceptions are correct, or that update/delete endpoints enforce the same policy.</p>" +
    "<h4>Regression tests</h4><p>Retain the two controls from the live exercise, then add missing ids, unauthenticated access, tenant boundaries and every mutation route. Tests should assert both status and absence of another user's sensitive fields.</p>"
});
