registerLab({
  id: "44-pipeline-fail-open",
  order: 44,
  title: "AI security pipeline fails open",
  mysteryTitle: "Security review workflow",
  difficulty: "medium",
  category: "validation",
  env: "node",
  mode: "static",
  track: "our-next-job",
  filename: "ci/ai-security-gate.ts",
  description: "A CI security gate converts model, schema and timeout failures into an empty finding list and a successful build.",
  build: {
    scenario: "Build an AI-assisted diff reviewer as advisory automation, then define trustworthy failure semantics before using it as a merge gate.",
    requirements: ["Read the bounded diff", "Request structured findings", "Validate the response schema", "Publish a review artifact"],
    acceptance: ["Valid output is deterministic to parse", "Timeouts are tested", "Artifacts distinguish no findings from no result", "Exit policy is documented"],
    prompt: "Build a TypeScript CLI that reads a bounded git diff, calls a mocked AI reviewer, validates structured findings and writes a Markdown artifact. Add tests for valid output, invalid JSON and timeout. Do not decide the CI exit policy until you have listed the possible failure states."
  },
  code: [
    "async function securityGate(diff) {",
    "  let findings = [];",
    "  try {",
    "    findings = FindingSchema.array().parse(await reviewer.review(diff));",
    "  } catch (error) {",
    "    console.warn('AI review unavailable:', error.message);",
    "    findings = [];",
    "  }",
    "  await publishReport(findings);",
    "  process.exit(0);",
    "}"
  ].join("\n"),
  vulnerableLines: [5, 7, 10],
  hints: [
    "An empty result and an unavailable reviewer are different security states.",
    "What happens when the model times out, returns invalid JSON or is blocked by a quota?",
    "The catch block erases failure provenance, and the final exit code never reflects policy.",
    "Use explicit outcomes such as passed, findings, inconclusive and infrastructure-error; choose fail-open or fail-closed deliberately by risk tier."
  ],
  vulnerabilityType: "Fail-open security control / improper exceptional-condition handling (CWE-636 / CWE-754)",
  explanation:
    "<h4>Root cause</h4><p>All reviewer and validation errors are collapsed into an empty finding set, then the process always exits successfully. CI, developers and audit data cannot distinguish a clean review from one that never happened.</p>" +
    "<h4>Impact</h4><p>An attacker may intentionally trigger oversized input, parser failure or tool outage to bypass a required check. Even accidental outages silently remove coverage. Treating an AI reviewer as perfectly authoritative would create the opposite problem: unstable false positives blocking all delivery.</p>" +
    "<h4>Fix</h4><p>Model explicit outcomes: <code>passed</code>, <code>findings</code>, <code>inconclusive</code> and <code>infrastructure-error</code>. Validate schemas, preserve evidence, retry only safe transient failures and apply a documented risk-tier policy. High-risk changes can require human review when AI is unavailable; lower-risk flows may remain advisory with a visible warning.</p>" +
    "<h4>Regression tests</h4><p>Test clean output, blocking findings, malformed output, timeout, quota error, oversized diff, partial report publication and policy differences between advisory and mandatory modes.</p>"
});
