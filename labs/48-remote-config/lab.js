registerLab({
  id: "48-remote-config",
  order: 48,
  title: "Remote configuration becomes a security authority",
  mysteryTitle: "Live configuration",
  difficulty: "hard",
  category: "secrets",
  env: "node",
  mode: "static",
  track: "architecture-review",
  architecture: {
    context: "Product teams use remote configuration to change events without an app release. The mobile client fetches JSON from a CDN and caches it for offline play.",
    assets: ["Economy rules", "Backend endpoints", "Feature eligibility", "Minimum client version"],
    constraints: ["Global CDN", "Offline startup", "Fast emergency rollback", "Multiple teams publish configuration"],
    questions: ["Who can publish and approve configuration?", "Which fields may the client treat as authoritative?", "How are authenticity, freshness and rollback controlled?"]
  },
  filename: "design/remote-config.txt",
  description: "Unsigned CDN configuration controls economic and security-sensitive client behavior with a stale fallback.",
  code: [
    "ProductConsole -> ObjectStorage: PUT /config/current.json using team-wide API key",
    "ObjectStorage -> CDN: public cache, TTL 24h",
    "MobileClient -> CDN: fetch current.json over TLS",
    "MobileClient: apply economy.rewardMultiplier, apiBaseUrl, certificatePins, minVersion",
    "MobileClient: on fetch or parse failure, use last cached config indefinitely",
    "GameAPI: accept reward amount calculated by the mobile configuration",
    "Rollback: overwrite current.json with a previous file"
  ].join("\n"),
  vulnerableLines: [1, 4, 5, 6],
  hints: [
    "TLS protects one transport connection; it does not constrain who can publish to origin storage.",
    "Separate presentation/tuning configuration from values that authorize server-side economic effects.",
    "A valid signature without version or expiry still permits replay of an old signed configuration.",
    "Even perfectly signed mobile configuration cannot make a modified client authoritative to the server."
  ],
  vulnerabilityType: "Remote-config supply-chain exposure and misplaced client authority",
  explanation:
    "<h4>Design failure</h4><p>A broad shared publishing key lacks individual accountability and approval. One unsigned document controls sensitive network settings and can remain cached forever. Most critically, the backend accepts an economic value computed by a client that an attacker controls.</p>" +
    "<h4>Proposed design</h4><p>Use workforce identity, least-privilege publishing roles, review/approval, immutable versions and rapid revocation. Sign a canonical manifest containing version, environment, expiry and content hash; pin trusted keys in the app and prevent rollback below a stored minimum. Separate security configuration from product tuning.</p>" +
    "<h4>Authority boundary</h4><p>The server must calculate rewards and eligibility from server-side versioned rules. Client configuration may shape presentation but cannot authorize currency or entitlement changes.</p>" +
    "<h4>Validation</h4><p>Test compromised publisher credentials, CDN/origin modification, old signed config replay, key rotation, clock skew, offline expiry, partial rollout and emergency rollback with audit evidence.</p>"
});
