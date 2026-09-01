registerLab({
  id: "05-nosql-injection",
  order: 5,
  title: "NoSQL operator injection in login",
  difficulty: "medium",
  category: "injection",
  env: "node",
  mode: "exploit",
  description: "A login handler builds a MongoDB query directly from the request body.",
  code: [
    "// POST /login  { username, password }",
    "async function login(req, res) {",
    "  const { username, password } = req.body;",
    "  const user = await db.collection('users').findOne({",
    "    username: username,",
    "    password: password",
    "  });",
    "  if (user) return res.json({ token: issueToken(user) });",
    "  return res.status(401).json({ error: 'bad credentials' });",
    "}"
  ].join("\n"),
  vulnerableLines: [5, 6],
  hints: [
    "The body is JSON. What if <code>password</code> isn't a string but an object?",
    "MongoDB treats <code>{ $ne: null }</code> as an operator meaning 'not equal'. It's placed straight into the query.",
    "Because req.body values are used as query values unmodified, an attacker controls the query's SHAPE, not just its data."
  ],
  vulnerabilityType: "NoSQL Injection (query operator injection)",
  explanation:
    "<h4>Why it's vulnerable</h4>" +
    "<p>The handler drops <code>username</code> and <code>password</code> from the parsed JSON body straight into the Mongo query object. " +
    "JSON bodies can contain objects, so an attacker sends <code>{ \"$ne\": null }</code> instead of a string. Mongo interprets it as the <em>not-equal</em> operator.</p>" +
    "<h4>Exploit</h4>" +
    "<pre>POST /login\n{ \"username\": \"admin\", \"password\": { \"$ne\": null } }</pre>" +
    "<p>The query becomes 'username = admin AND password ≠ null' — which is true for the admin record. Login succeeds with no password. " +
    "<code>{ \"$gt\": \"\" }</code> on both fields logs in as the first user in the collection.</p>" +
    "<h4 class='badge-impact'>Impact</h4>" +
    "<p>Authentication bypass, data exfiltration via boolean/blind operators, and account takeover.</p>" +
    "<h4 class='badge-fix'>Fix</h4>" +
    "<p>Coerce and validate types before querying — reject anything that isn't a string:</p>" +
    "<pre>if (typeof username !== 'string' || typeof password !== 'string')\n  return res.status(400).send('invalid');</pre>" +
    "<p>Never store plaintext passwords: look the user up by username, then verify a hash with <code>bcrypt.compare()</code>. Enable a schema validator (e.g. Mongoose with <code>{ type: String }</code>).</p>",
  exploit: {
    goal: "Log in as 'admin' WITHOUT knowing the password. The body is parsed as JSON, so you can send Mongo operators like {\"$ne\": null}.",
    placeholder: '{"username":"admin","password":{"$ne":null}}',
    samples: ['{"username":"admin","password":{"$ne":null}}', '{"username":{"$gt":""},"password":{"$gt":""}}', '{"username":"admin","password":"guess"}'],
    run: function (payload, log) {
      var users = [{ username: "admin", password: "S3cretP@ss!" }, { username: "bob", password: "hunter2" }];
      var q;
      try { q = JSON.parse(payload); } catch (e) { return { success: false, detail: "Invalid JSON body." }; }
      if (!q || typeof q !== "object" || Array.isArray(q)) {
        return { success: false, detail: "Send a JSON object, e.g. {\"username\":\"admin\",\"password\":{\"$ne\":null}}." };
      }
      function isObj(v) { return v && typeof v === "object"; }
      function match(val, cond) {
        if (isObj(cond)) {
          if ("$ne" in cond) return val !== cond.$ne;
          if ("$gt" in cond) return val > cond.$gt;
          if ("$gte" in cond) return val >= cond.$gte;
          if ("$regex" in cond) return new RegExp(cond.$regex).test(val);
          return false;
        }
        return val === cond;
      }
      var found = users.filter(function (u) {
        return match(u.username, q.username) && match(u.password, q.password);
      })[0];
      log("out", "findOne(" + JSON.stringify(q) + ")");
      if (!found) return { success: false, detail: "No user matched. Try an operator like {\"$ne\": null} on password." };
      log("out", "matched user: " + found.username);
      var injected = isObj(q.username) || isObj(q.password);
      if (found.username === "admin" && injected) {
        return { success: true, detail: "Logged in as admin via operator injection — no real password needed. Token issued." };
      }
      if (!injected) {
        return { success: false, detail: "You matched by supplying the literal correct password — that's not injection. Use an operator object." };
      }
      return { success: false, detail: "You matched " + found.username + ", but the goal is admin." };
    }
  }
});
