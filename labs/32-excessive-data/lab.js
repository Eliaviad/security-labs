registerLab({
  id: "32-excessive-data",
  order: 32,
  title: "Excessive data exposure in an API",
  mysteryTitle: "Profile bootstrap API",
  difficulty: "easy",
  category: "api",
  env: "http",
  mode: "http",
  track: "web-foundations",
  skills: ["api-response", "data-minimization", "schema-review"],
  estimatedTime: 15,
  prerequisites: ["02-client-secret"],
  filename: "routes/profile.js",
  description: "A frontend requests the current user's public profile fields from an API.",
  code: [
    "app.get('/api/profile', requireUser, async (req, res) => {",
    "  const user = await Users.findById(req.user.id);",
    "  return res.json(user);",
    "});"
  ].join("\n"),
  vulnerableLines: [2, 3],
  hints: [
    "Do not limit review to what the visual page displays. Inspect the complete HTTP response body.",
    "What fields exist on the persistence model that a profile screen does not need?",
    "Authentication does not justify returning every field about the authenticated user, especially reusable recovery material or internal authorization data.",
    "Send the profile request and identify <code>passwordHash</code>, <code>resetToken</code> and <code>internalRole</code>. Their presence—not a particular status code—is the proof."
  ],
  vulnerabilityType: "Exposure of sensitive information through an API response (CWE-200)",
  http: {
    basePath: "/lab-api/32-excessive-data",
    statusPath: "/__lab/status/32-excessive-data",
    resetPath: "/__lab/reset/32-excessive-data",
    goal: "Observe sensitive persistence-only fields that are unnecessary for the profile client.",
    requests: [
      {
        name: "Load profile",
        method: "GET",
        path: "/lab-api/32-excessive-data/profile",
        headers: "X-Lab-User: alice",
        body: ""
      }
    ]
  },
  explanation:
    "<h4>Root cause</h4><p>The route serializes the database model directly. Persistence schemas accumulate internal and sensitive fields, while the API contract should expose only the minimum data needed by this client and operation.</p>" +
    "<h4>Research method</h4><p>Inspect raw network responses rather than the rendered UI. Classify each field by consumer need, secrecy, lifetime and whether it enables another action. In this lab the recovery token is immediately reusable material, the password hash supports offline guessing if leaked, and the internal role reveals authorization metadata.</p>" +
    "<h4>Context</h4><p>Returning an email address to its owner may be intentional; returning a password hash is not. Risk depends on caller, endpoint purpose and field semantics, so “large JSON” alone is not a finding. The evidence must name unnecessary sensitive fields.</p>" +
    "<h4>Secure fix</h4><pre>const user = await Users.findById(req.user.id)\n  .select(['id', 'name', 'email']);\nreturn res.json({ id: user.id, name: user.name, email: user.email });</pre><p>Use explicit response DTOs/schemas, mark secrets non-selectable by default, and keep recovery tokens hashed, short-lived and one-time.</p>" +
    "<h4>Regression tests</h4><p>Assert the exact allowed response keys, not only expected values. Add contract tests that fail when a persistence field is accidentally serialized, and test every role/expansion option that can alter the response.</p>"
});
