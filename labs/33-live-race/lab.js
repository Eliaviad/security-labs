registerLab({
  id: "33-live-race",
  order: 33,
  title: "Race condition in coupon redemption",
  mysteryTitle: "Single-use coupon",
  difficulty: "hard",
  category: "logic",
  env: "http",
  mode: "http",
  track: "web-logic",
  skills: ["concurrency", "atomicity", "burst-testing"],
  estimatedTime: 35,
  prerequisites: ["09-race-condition", "23-negative-quantity"],
  filename: "services/coupons.js",
  description: "A coupon is intended to add credit only once per account.",
  code: [
    "async function redeemCoupon(userId, code) {",
    "  const coupon = await Coupons.findOne({ userId, code });",
    "  if (!coupon || coupon.used) throw new Error('already used');",
    "",
    "  await Wallets.addCredit(userId, coupon.value);",
    "  coupon.used = true;",
    "  await coupon.save();",
    "  return coupon.value;",
    "}"
  ].join("\n"),
  vulnerableLines: [2, 3, 5, 6, 7],
  hints: [
    "A sequential replay happens after <code>used</code> is saved. What changes when several requests reach the check before any reaches the write?",
    "The security invariant spans a read, a wallet update and a coupon update. Is that sequence atomic?",
    "Use the burst request template. The workbench will send the same redemption request concurrently rather than clicking in a normal loop.",
    "Success requires total credit above 50 from the one coupon. Individual 200 responses are not sufficient evidence because one success is expected."
  ],
  vulnerabilityType: "Time-of-check to time-of-use race condition (CWE-367)",
  http: {
    basePath: "/lab-api/33-live-race",
    statusPath: "/__lab/status/33-live-race",
    resetPath: "/__lab/reset/33-live-race",
    goal: "Redeem the single-use SAVE50 coupon more than once by sending a concurrent burst.",
    requests: [
      {
        name: "Single request",
        method: "POST",
        path: "/lab-api/33-live-race/redeem",
        headers: "Content-Type: application/json",
        body: "{\n  \"code\": \"SAVE50\"\n}"
      },
      {
        name: "Concurrent burst ×8",
        method: "POST",
        path: "/lab-api/33-live-race/redeem",
        headers: "Content-Type: application/json",
        body: "{\n  \"code\": \"SAVE50\"\n}",
        repeat: 8
      }
    ]
  },
  explanation:
    "<h4>Root cause</h4><p>The code checks <code>used</code>, performs a separate side effect, and only then records consumption. Concurrent handlers can all observe <code>false</code> before any writes <code>true</code>, so each grants credit.</p>" +
    "<h4>Why real concurrency matters</h4><p>Eight fast sequential requests are not the same experiment: after the first commit, later checks see the updated flag. The workbench creates simultaneous in-flight requests and the training server yields between check and update to make the interleaving observable and deterministic enough for learning.</p>" +
    "<h4>Impact proof</h4><p>One successful $50 redemption is intended behavior. The grader completes only when shared session state records more than $50 from the same coupon. Reset state before comparing single and burst requests.</p>" +
    "<h4>Secure fix</h4><p>Enforce the invariant atomically in the authoritative data store: for example, conditionally update <code>used=false → true</code> and grant credit within one transaction, with a unique ledger idempotency key. Check the affected-row count before applying the credit. Application-process locks alone fail across replicas and crashes.</p>" +
    "<h4>Regression tests</h4><p>Launch a synchronized burst from independent connections and assert exactly one ledger entry, one state transition and $50 total credit. Repeat across multiple application instances and include retry/time-out behavior.</p>"
});
