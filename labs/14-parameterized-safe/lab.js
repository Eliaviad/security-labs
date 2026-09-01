registerLab({
  id: "14-parameterized-safe",
  order: 14,
  title: "Product lookup by SKU",
  difficulty: "easy",
  category: "injection",
  env: "node",
  mode: "static",
  safe: true,
  filename: "routes/products.js",
  description: "An Express endpoint fetches a product by SKU from a MySQL database.",
  code: [
    "const express = require('express');",
    "const db = require('./db'); // mysql2 connection pool",
    "const router = express.Router();",
    "",
    "// GET /api/products?sku=ABC-123",
    "router.get('/api/products', async (req, res) => {",
    "  const sku = req.query.sku;",
    "  const sql = 'SELECT id, name, price FROM products WHERE sku = ?';",
    "  const [rows] = await db.query(sql, [sku]);",
    "  res.json(rows);",
    "});",
    "",
    "module.exports = router;"
  ].join("\n"),
  vulnerableLines: [],
  hints: [
    "The <code>sku</code> is user-controlled — trace where it goes. Is it concatenated into the query text, or passed separately?",
    "The <code>?</code> placeholder with <code>[sku]</code> sends the value as a bound parameter. Can a bound parameter change the SQL structure?",
    "Is there any other sink here — dangerous output, missing auth, an eval? Before flagging a bug, can you describe one concrete attack that works?"
  ],
  vulnerabilityType: "None — parameterized query (secure)",
  explanation:
    "<h4>Verdict: secure</h4><p>This snippet has no real, exploitable vulnerability. The right answer is <b>Mark as secure</b>.</p>" +
    "<h4>Why it's safe</h4><p>The SQL text is a fixed string with a <code>?</code> placeholder, and <code>sku</code> is passed in the parameter array. The mysql2 driver binds it as a typed value over a separate channel, so input like <code>' OR '1'='1</code> is matched literally against the <code>sku</code> column and simply returns no rows.</p>" +
    "<h4>What you might have wrongly flagged</h4><p>It <em>looks</em> like the SQLi lab, and the reflex is to shout \"injection.\" But the shape that matters is concatenation (<code>\"... = '\" + x + \"'\"</code>) versus parameterization (<code>?, [x]</code>). Only the former is vulnerable.</p>" +
    "<h4>How to be sure</h4><p>Trace the trust boundary: does user input ever reach the query as <em>text</em>? Here it never does. Training yourself to say \"secure, and here's why\" is as important as finding bugs — real reviews contain plenty of safe code, and false positives cost credibility.</p>"
});
