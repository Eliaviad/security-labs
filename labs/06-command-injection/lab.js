registerLab({
  id: "06-command-injection",
  order: 6,
  title: "Command injection via child_process.exec",
  difficulty: "medium",
  category: "injection",
  env: "node",
  mode: "exploit",
  description: "A diagnostics endpoint shells out to `ping` using a hostname from the request body.",
  code: [
    "const { exec } = require('child_process');",
    "",
    "// POST /ping  { host }  -> runs a diagnostic ping",
    "function pingHost(req, res) {",
    "  const host = req.body.host;",
    "  exec('ping -c 1 ' + host, (err, stdout) => {",
    "    res.send(stdout);",
    "  });",
    "}"
  ].join("\n"),
  vulnerableLines: [6],
  hints: [
    "<code>exec</code> runs its argument through a shell (/bin/sh -c). What characters does a shell treat specially?",
    "The host string is concatenated into a shell command. Think <code>;</code>, <code>|</code>, <code>&amp;&amp;</code>, <code>$(...)</code>, backticks.",
    "<code>exec('ping -c 1 ' + host)</code> with host = <code>; cat /etc/passwd</code> runs two commands."
  ],
  vulnerabilityType: "OS Command Injection (CWE-78)",
  explanation:
    "<h4>Why it's vulnerable</h4>" +
    "<p><code>child_process.exec</code> passes the whole string to a shell, which interprets metacharacters. Concatenating user input into that string lets the attacker append or substitute commands.</p>" +
    "<h4>Exploit</h4>" +
    "<pre>{ \"host\": \"127.0.0.1; cat /etc/passwd\" }\n{ \"host\": \"localhost && id\" }\n{ \"host\": \"$(cat secret.env)\" }</pre>" +
    "<p>The shell runs <code>ping -c 1 127.0.0.1</code>, then the injected command. Output is returned in the response.</p>" +
    "<h4 class='badge-impact'>Impact</h4>" +
    "<p>Remote Code Execution with the privileges of the app process — read secrets, pivot, install a reverse shell.</p>" +
    "<h4 class='badge-fix'>Fix</h4>" +
    "<p>Don't invoke a shell, and pass arguments as an array so they can't be reinterpreted:</p>" +
    "<pre>const { execFile } = require('child_process');\nexecFile('ping', ['-c', '1', host], cb); // no shell</pre>" +
    "<p>Additionally validate <code>host</code> against a strict hostname/IP allowlist. Prefer a native library over shelling out entirely.</p>",
  exploit: {
    goal: "Break out of the ping command and execute your own command (e.g. read /etc/passwd or secret.env) via shell metacharacters.",
    placeholder: "e.g. 127.0.0.1; cat /etc/passwd",
    samples: ["127.0.0.1; cat /etc/passwd", "localhost && whoami", "$(cat secret.env)", "127.0.0.1"],
    run: function (payload, log) {
      var cmd = "ping -c 1 " + payload;
      log("out", "$ " + cmd);
      var SEP = /[;&|\n`]|\$\(/;
      if (!SEP.test(payload)) {
        return { success: false, detail: "No shell metacharacter detected — the whole input was treated as a hostname." };
      }
      // crude split: take everything after the first metacharacter group
      var rest = payload.replace(/^[^;&|\n`$]*/, "").replace(/^([;&|`\n]+|\$\(|\))+/, "").replace(/\)+$/, "").trim();
      function fakeShell(c) {
        if (/cat\s+\/etc\/passwd/.test(c)) return "root:x:0:0:root:/root:/bin/bash\nwww-data:x:33:33:/var/www:/usr/sbin/nologin";
        if (/cat\s+.*secret\.env/.test(c)) return "DB_PASSWORD=hunter2\nJWT_SECRET=s3cr3t";
        if (/\bwhoami\b/.test(c)) return "www-data";
        if (/\bid\b/.test(c)) return "uid=33(www-data) gid=33(www-data) groups=33(www-data)";
        if (/\bls\b/.test(c)) return "app.js  node_modules  secret.env";
        return "(executed: " + c + ")";
      }
      var out = fakeShell(rest || payload);
      log("out", "PING 127.0.0.1: 56 data bytes ... 1 packets transmitted");
      log("out", "--- injected command output ---");
      log("out", out);
      return { success: true, detail: "You escaped the ping command and executed: " + (rest || "(injected)") };
    }
  }
});
