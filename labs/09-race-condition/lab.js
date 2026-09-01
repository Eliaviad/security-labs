registerLab({
  id: "09-race-condition",
  order: 9,
  title: "Race condition (TOCTOU) in coupon redemption",
  difficulty: "hard",
  category: "logic",
  env: "node",
  mode: "exploit",
  description: "Each coupon is meant to be single-use. The handler checks `used`, credits the account, then marks it used.",
  code: [
    "// POST /redeem  { code }  — each coupon is single-use",
    "async function redeemCoupon(req, res) {",
    "  const code = req.body.code;",
    "  const coupon = await db.coupons.findOne({ code });",
    "  if (!coupon || coupon.used) {",
    "    return res.status(400).send('invalid or already used');",
    "  }",
    "  await creditAccount(req.session.userId, coupon.amount);",
    "  coupon.used = true;",
    "  await db.coupons.save(coupon);",
    "}"
  ].join("\n"),
  vulnerableLines: [5, 9],
  hints: [
    "The check (is it used?) and the update (mark it used) are two separate steps. What happens between them?",
    "There's an <code>await</code> in the middle. Many requests can pass the check before ANY of them writes <code>used = true</code>.",
    "This is TOCTOU: Time-Of-Check to Time-Of-Use. The read and the write aren't atomic, so concurrent requests all win."
  ],
  vulnerabilityType: "Race Condition / TOCTOU (CWE-367)",
  explanation:
    "<h4>Why it's vulnerable</h4>" +
    "<p>The logic is <em>check-then-act</em>: read <code>coupon.used</code>, then later set it to <code>true</code>. " +
    "Between those two steps the code <code>await</code>s (yielding to the event loop / other requests). If several redeem requests arrive together, they all read <code>used === false</code> before any of them writes <code>used = true</code> — so all of them credit the account.</p>" +
    "<h4>Exploit</h4>" +
    "<p>Fire many concurrent requests for the same coupon:</p>" +
    "<pre>Promise.all(Array.from({length: 20}, () =>\n  fetch('/redeem', { method:'POST',\n    body: JSON.stringify({ code: 'SAVE50' }) })\n));</pre>" +
    "<p>A single-use coupon gets credited 20 times.</p>" +
    "<h4 class='badge-impact'>Impact</h4>" +
    "<p>Financial loss: coupons, gift cards, withdrawals, and 'one per user' limits all bypassed. Same class of bug drains balances via double-spend.</p>" +
    "<h4 class='badge-fix'>Fix</h4>" +
    "<p>Make the check-and-set atomic so only one request can transition the state:</p>" +
    "<pre>const r = await db.coupons.updateOne(\n  { code, used: false },\n  { $set: { used: true } });\nif (r.modifiedCount === 0) return res.status(400).send('used');\nawait creditAccount(userId, amount);</pre>" +
    "<p>Use a conditional/atomic update, a DB transaction with row locking (<code>SELECT ... FOR UPDATE</code>), a unique constraint, or an idempotency key.</p>",
  exploit: {
    goal: "Redeem a single-use coupon MORE THAN ONCE by firing several requests in parallel (enter how many).",
    placeholder: "number of parallel requests, e.g. 10",
    samples: ["1", "2", "10"],
    run: function (payload, log) {
      var n = parseInt(payload, 10);
      if (!n || n < 1) return { success: false, detail: "Enter a number of parallel requests (try 2 or more)." };
      var coupon = { code: "SAVE50", used: false, amount: 50 };
      var credited = 0, successes = 0;
      // Model concurrency: with no atomic guard, all N requests read `used`
      // BEFORE any of them writes it back. So they all observe `used === false`.
      var observed = [];
      for (var i = 0; i < n; i++) observed.push(coupon.used); // check phase (all concurrent)
      observed.forEach(function (used) {
        if (!used) { credited += coupon.amount; successes++; }  // act phase
      });
      coupon.used = true;
      log("out", "fired " + n + " concurrent redeem requests for coupon SAVE50 ($50, single-use)");
      log("out", successes + " requests passed the 'used' check before it was written back");
      log("out", "total credited: $" + credited);
      if (credited > coupon.amount) {
        return { success: true, detail: "Double-spend! A single-use coupon credited $" + credited + " instead of $50." };
      }
      return { success: false, detail: "Only one redemption went through. Increase the parallelism (2+) to win the race." };
    }
  }
});
