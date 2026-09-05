registerLab({
  id: "39-leaderboard-trust",
  order: 39,
  title: "Authoritative leaderboard failure",
  mysteryTitle: "Score submission",
  difficulty: "medium",
  category: "logic",
  env: "node",
  mode: "static",
  track: "our-next-job",
  filename: "routes/leaderboard.ts",
  description: "A leaderboard accepts a final score and duration directly from an authenticated mobile client.",
  build: {
    scenario: "Build score submission as a product feature, then decide which facts a modified mobile client can truthfully attest to.",
    requirements: ["Submit a completed match", "Update the player's best score", "Return the current rank", "Reject malformed numeric values"],
    acceptance: ["A higher score replaces the previous best", "A lower score does not", "Rank is returned", "Basic input validation is tested"],
    prompt: "Build a minimal Express/TypeScript leaderboard endpoint with an authenticated player, matchId, score and durationMs. Store each player's best score and return rank. Add functional tests and explain the data flow. Do not perform an abuse or anti-cheat review yet."
  },
  code: [
    "app.post('/leaderboard/submit', requirePlayer, async (req, res) => {",
    "  const { matchId, score, durationMs } = req.body;",
    "  if (!Number.isInteger(score) || score < 0) return res.status(400).end();",
    "  if (!Number.isInteger(durationMs) || durationMs < 1) return res.status(400).end();",
    "  await leaderboard.recordBest(req.player.id, matchId, score, durationMs);",
    "  return res.json({ rank: await leaderboard.rank(req.player.id) });",
    "});"
  ].join("\n"),
  vulnerableLines: [2, 5],
  hints: [
    "Input validation answers whether a value has the right shape, not whether the claimed event really occurred.",
    "Assume the attacker controls the mobile process and can call this endpoint without playing a match.",
    "What server-issued match state or event evidence could bind score submission to a real session?",
    "Detection can complement prevention, but anomaly thresholds alone do not make the client authoritative."
  ],
  vulnerabilityType: "Client-side enforcement / forged game outcome (CWE-602)",
  explanation:
    "<h4>Root cause</h4><p>The endpoint validates numeric shape but accepts the client as the authority for score and duration. Authentication only identifies who is making the false claim; it does not prove that a legitimate match produced it.</p>" +
    "<h4>Impact</h4><p>A modified client can forge rankings, rewards or competitive progression. A maximum-score check may block absurd values but still permits profitable values just below the threshold.</p>" +
    "<h4>Secure design</h4><p>Prefer server-authoritative game state. Where that is impractical, issue a short-lived match session, bind submissions to server-observed events, prevent replay, validate state-machine transitions and use risk-based detection for residual cheating. Keep reward issuance behind a separately validated server decision.</p>" +
    "<h4>Regression tests</h4><p>Cover missing/expired match sessions, duplicate match ids, impossible event order, score inconsistent with events, cross-player session reuse, delayed delivery and a valid offline/reconnect flow if supported.</p>"
});
