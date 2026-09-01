registerLab({
  id: "03-regex-validation-bypass",
  order: 3,
  title: "Input validation bypass — unanchored regex",
  difficulty: "easy",
  category: "validation",
  env: "node",
  mode: "exploit",
  description: "A username validator is supposed to accept only 3–16 plain alphanumeric characters.",
  code: [
    "// Only plain alphanumeric usernames (3-16 chars) should pass.",
    "function isValidUsername(username) {",
    "  const pattern = /[a-zA-Z0-9]{3,16}/;",
    "  return pattern.test(username);",
    "}",
    "",
    "function registerUser(username) {",
    "  if (!isValidUsername(username)) {",
    "    throw new Error('Invalid username');",
    "  }",
    "  db.users.insert({ username });",
    "  return 'created: ' + username;",
    "}"
  ].join("\n"),
  vulnerableLines: [3],
  hints: [
    "What does <code>RegExp.test()</code> return — does the pattern have to match the WHOLE string?",
    "There are no anchors on the pattern. It matches if the string CONTAINS a valid run anywhere.",
    "Missing <code>^</code> and <code>$</code> means <code>'evil stuff abc more'</code> passes because <code>abc</code> matches somewhere."
  ],
  vulnerabilityType: "Improper Input Validation (unanchored regex)",
  explanation:
    "<h4>Why it's vulnerable</h4>" +
    "<p><code>/[a-zA-Z0-9]{3,16}/</code> is not anchored. <code>test()</code> returns true if a match exists <em>anywhere</em> in the string, " +
    "so any input that merely <em>contains</em> 3–16 alphanumerics passes — including newlines, spaces, HTML, or SQL metacharacters around it.</p>" +
    "<h4>Exploit</h4>" +
    "<p>These all pass validation despite violating the intended policy:</p>" +
    "<pre>\"valid&lt;script&gt;alert(1)&lt;/script&gt;\"\n\"admin\\n--\"\n\"abc'; DROP TABLE users;--\"</pre>" +
    "<p>The bad characters now flow into whatever consumes the username downstream (DB, HTML, logs), enabling stored XSS, injection, or log forgery.</p>" +
    "<h4 class='badge-impact'>Impact</h4>" +
    "<p>Validation gives a false sense of safety while letting arbitrary payloads through — a common root cause behind second-order injection bugs.</p>" +
    "<h4 class='badge-fix'>Fix</h4>" +
    "<p>Enforce length and reject every non-alphanumeric character. This avoids JavaScript's <code>$</code> behavior before a final line terminator:</p>" +
    "<pre>if (typeof username !== 'string' ||\n    username.length &lt; 3 || username.length &gt; 16 ||\n    /[^A-Za-z0-9]/.test(username)) {\n  return false;\n}\nreturn true;</pre>" +
    "<p>An anchored regex can also work when final-line-terminator behavior is handled explicitly. JavaScript does not provide the <code>\\A</code>/<code>\\z</code> anchors found in some other regex engines.</p>",
  exploit: {
    goal: "Get isValidUsername() to ACCEPT a username that breaks the 'only 3–16 alphanumerics' policy (e.g. contains a space, <, quote, or newline).",
    placeholder: "e.g. valid<script>alert(1)</script>",
    samples: ["valid<script>alert(1)</script>", "hi there admin", "abc'; DROP TABLE users;--", "alice99"],
    run: function (payload, log) {
      var loose = /[a-zA-Z0-9]{3,16}/;          // the vulnerable pattern
      var strict = payload.length >= 3 && payload.length <= 16 && !/[^A-Za-z0-9]/.test(payload);
      var accepted = loose.test(payload);
      var compliant = strict;
      log("out", "isValidUsername(" + JSON.stringify(payload) + ") => " + accepted);
      if (accepted && !compliant) {
        return { success: true, detail: "The validator accepted a value that violates the intended policy. Anchored regex would have rejected it." };
      }
      if (accepted && compliant) {
        return { success: false, detail: "That's actually a legitimate username. Include a character that SHOULD be rejected (space, <, quote, newline)." };
      }
      return { success: false, detail: "Rejected. You need input the validator ACCEPTS but that breaks the policy." };
    }
  }
});
