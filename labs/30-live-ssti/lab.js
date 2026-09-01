registerLab({
  id: "30-live-ssti",
  order: 30,
  title: "Server-side template injection",
  mysteryTitle: "Email template preview",
  difficulty: "hard",
  category: "template",
  env: "http",
  mode: "http",
  track: "web-injection",
  skills: ["ssti", "fingerprinting", "impact-escalation"],
  estimatedTime: 35,
  prerequisites: ["13-sql-injection"],
  filename: "services/template-preview.js",
  description: "A staff tool previews an email by rendering a user-editable template on the server.",
  code: [
    "app.post('/preview', requireEditor, async (req, res) => {",
    "  const context = { name: req.user.name, env: process.env };",
    "  const rendered = nunjucks.renderString(req.body.template, context);",
    "  res.json({ rendered });",
    "});"
  ].join("\n"),
  vulnerableLines: [2, 3],
  hints: [
    "Is the request value inserted as template data, or is it itself parsed as template source code?",
    "Start with a harmless expression whose result is distinguishable from plain reflection. Arithmetic is a common engine fingerprint.",
    "Getting <code>49</code> proves evaluation, but not yet meaningful impact. Inspect the objects deliberately exposed in the render context.",
    "The context includes <code>env</code>. Read the training-only <code>LAB_SECRET</code> value to turn detection into a server-side confidentiality proof."
  ],
  vulnerabilityType: "Server-Side Template Injection (CWE-1336)",
  http: {
    basePath: "/lab-api/30-live-ssti",
    statusPath: "/__lab/status/30-live-ssti",
    resetPath: "/__lab/reset/30-live-ssti",
    goal: "Prove template evaluation can read the training server's LAB_SECRET value.",
    requests: [
      {
        name: "Benign preview",
        method: "POST",
        path: "/lab-api/30-live-ssti/preview",
        headers: "Content-Type: application/json",
        body: "{\n  \"template\": \"Hello {{name}}\"\n}"
      },
      {
        name: "Expression probe",
        method: "POST",
        path: "/lab-api/30-live-ssti/preview",
        headers: "Content-Type: application/json",
        body: "{\n  \"template\": \"{{7*7}}\"\n}"
      }
    ]
  },
  explanation:
    "<h4>Root cause</h4><p>The request controls the template program passed to <code>renderString</code>, not a value safely placed into a fixed template. The render context also exposes all environment variables, increasing the reachable impact.</p>" +
    "<h4>Research progression</h4><p>Separate three claims: reflection, expression evaluation, and sensitive-object access. A changed arithmetic result is a low-risk fingerprint; reading the lab secret demonstrates a trust-boundary violation. In a real assessment, stop at the least invasive proof authorized by scope.</p>" +
    "<h4>Engine accuracy</h4><p>Template syntax and reachable primitives are engine- and configuration-specific. Payloads for Jinja2, Nunjucks, Twig, Freemarker and Handlebars are not interchangeable. This lab uses a deterministic subset and never evaluates arbitrary JavaScript or operating-system commands.</p>" +
    "<h4>Secure fix</h4><pre>const rendered = nunjucks.render('approved-email.njk', {\n  name: req.user.name,\n  message: req.body.message\n});</pre><p>Let users control data fields, not template source. If template editing is a requirement, use a deliberately restricted language, a minimal context, resource limits, isolation and an explicit capability model; a denylist of expressions is not sufficient.</p>" +
    "<h4>Regression tests</h4><p>Verify expression markers remain literal in user data, server objects are absent from the context, valid placeholders still work, malformed input fails safely, and rendering has time/memory limits.</p>"
});
