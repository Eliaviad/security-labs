registerLab({
  id: "49-admin-control-plane",
  order: 49,
  title: "Support console with production-wide blast radius",
  mysteryTitle: "Player support console",
  difficulty: "hard",
  category: "auth",
  env: "node",
  mode: "static",
  track: "architecture-review",
  architecture: {
    context: "A global support team restores purchases, changes player currency and investigates fraud through a browser-based console connected to production.",
    assets: ["All player accounts", "Currency and entitlements", "Workforce identities", "Investigation evidence"],
    constraints: ["24/7 support", "Fast recovery for legitimate players", "Contractor access", "Some actions affect high-value accounts"],
    questions: ["What is the maximum impact of one compromised session?", "Which actions need separation of duties?", "Can audit evidence survive compromise of the operational database?"]
  },
  filename: "design/support-control-plane.txt",
  description: "A support browser receives a reusable privileged token and calls production mutation APIs directly with no scoped approval.",
  code: [
    "SupportEmployee -> SSO: authenticate with MFA once per shift",
    "SupportBrowser <- AdminBackend: reusable production service token",
    "SupportBrowser -> EconomyService: credit(anyPlayerId, anyAmount, serviceToken)",
    "Support role: read and modify every player in every region",
    "Dangerous action UX: one click; optional free-text reason",
    "EconomyService -> OperationalDB: mutate wallet and append audit row",
    "Session policy: valid for 12 hours; no device or risk re-check"
  ].join("\n"),
  vulnerableLines: [2, 3, 4, 5],
  hints: [
    "MFA at login reduces account takeover probability but does not reduce post-compromise capability.",
    "A browser should not hold a reusable credential representing the backend service itself.",
    "Scope access by case, player, action, amount, time and region instead of one global role.",
    "Audit stored beside mutable operational data may not be trustworthy after privileged compromise."
  ],
  vulnerabilityType: "Over-privileged control plane with bearer-token exposure and insufficient separation of duties",
  explanation:
    "<h4>Design failure</h4><p>The browser receives a reusable service identity and can perform arbitrary production mutations. One compromised employee session, extension or workstation inherits global economic authority. Optional reasons and same-database audit do not provide strong accountability.</p>" +
    "<h4>Proposed design</h4><p>Keep service credentials server-side. Exchange workforce identity for short-lived, case-scoped capabilities bound to player, permitted operation and maximum amount. Require step-up authentication or a second approver for high-impact actions, enforce velocity limits, and provide a kill switch.</p>" +
    "<h4>Detection and evidence</h4><p>Stream immutable audit events to a separately controlled security account. Detect unusual target regions, amount patterns, rapid account traversal and activity outside assigned cases. Preserve request, actor, approver, ticket and resulting ledger entry.</p>" +
    "<h4>Validation</h4><p>Simulate stolen browser tokens, revoked contractors, session replay, cross-region actions, approval-service failure, bulk abuse just below thresholds and attempted audit tampering.</p>"
});
