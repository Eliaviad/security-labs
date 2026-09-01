registerLab({
  id: "13-sql-injection",
  order: 13,
  title: "User search endpoint",
  difficulty: "easy",
  category: "injection",
  env: "node",
  mode: "static",
  filename: "routes/users.js",
  description: "An Express endpoint looks up users by email against a MySQL database.",
  code: [
    "const express = require('express');",
    "const db = require('./db'); // mysql2 connection pool",
    "const router = express.Router();",
    "",
    "// GET /api/users/search?email=foo@bar.com",
    "router.get('/api/users/search', async (req, res) => {",
    "  const email = req.query.email;",
    "  const sql = \"SELECT id, name, email FROM users WHERE email = '\" + email + \"'\";",
    "  const [rows] = await db.query(sql);",
    "  res.json(rows);",
    "});",
    "",
    "module.exports = router;"
  ].join("\n"),
  vulnerableLines: [8],
  hints: [
    "Which values in this handler are fully controlled by the caller?",
    "Follow <code>email</code> from the request to where it is used. What is it combined with?",
    "The query text is built by string concatenation. What happens if the value itself contains a single quote?",
    "Consider <code>email = x' OR '1'='1</code>. How does the final SQL text change, and what does it now return?"
  ],
  vulnerabilityType: "SQL Injection (CWE-89)",
  explanation:
    "<h4>Vulnerable line</h4><p>Line 8 — the query is assembled by concatenating <code>email</code> directly into the SQL string.</p>" +
    "<h4>Vulnerability</h4><p>Classic SQL injection: attacker-controlled input becomes part of the query <em>structure</em>, not just its data.</p>" +
    "<h4>Attack</h4><pre>GET /api/users/search?email=' OR '1'='1</pre>" +
    "<p>The query becomes <code>... WHERE email = '' OR '1'='1'</code>, returning every user. A <code>UNION SELECT</code> payload can exfiltrate other tables; stacked queries or subqueries can read or modify arbitrary data.</p>" +
    "<h4>Why it works</h4><p>The database receives one finished string and cannot tell which parts were meant to be data. The injected quote closes the literal and the rest is parsed as SQL.</p>" +
    "<h4>Secure fix</h4><pre>const sql = 'SELECT id, name, email FROM users WHERE email = ?';\nconst [rows] = await db.query(sql, [email]);</pre>" +
    "<h4>Why the fix works</h4><p>Parameterized queries send the SQL text and the values over separate channels. The driver binds <code>email</code> as a typed value, so it can never change the query's structure — quotes and keywords in the input are treated as literal characters.</p>"
});
