registerLab({
  id: "20-argument-injection",
  order: 20,
  title: "Git clone microservice",
  difficulty: "expert",
  category: "injection",
  env: "node",
  mode: "static",
  filename: "services/clone.js",
  description: "A service clones a user-supplied repository and lets callers pass extra clone options. It deliberately avoids the shell.",
  code: [
    "const { execFile } = require('child_process');",
    "",
    "// POST /api/repo/clone  { repo, flags }",
    "// `flags` lets callers pass extra clone options, e.g. [\"--depth\", \"1\"].",
    "function cloneRepo(req, res) {",
    "  const { repo, flags = [] } = req.body;",
    "",
    "  // execFile (not exec) means no shell is spawned, so `; rm -rf /` can't work.",
    "  execFile('git', ['clone', ...flags, repo, '/tmp/work'], (err) => {",
    "    if (err) return res.status(500).send('clone failed');",
    "    res.send('cloned');",
    "  });",
    "}"
  ].join("\n"),
  vulnerableLines: [9],
  hints: [
    "The comment is right that <code>execFile</code> avoids the shell, so <code>; rm -rf</code> won't work. Is avoiding the shell the whole story?",
    "Both <code>flags</code> and <code>repo</code> become <code>git</code>'s own argv, unfiltered. What can a git <em>option</em> do that a repository URL can't?",
    "Some git options make git run another program — an SSH command, a transport helper. Who decides whether an entry in <code>flags</code> begins with <code>-</code>?",
    "Nothing constrains <code>flags</code> to an allowlist, validates that <code>repo</code> is <code>https</code>, or adds a <code>--</code> end-of-options marker. A flag like <code>--config=core.sshCommand=…</code> runs a command when git dials an <code>ssh://</code> remote."
  ],
  vulnerabilityType: "Argument / Option Injection (CWE-88)",
  explanation:
    "<h4>Vulnerable line</h4><p>Line 9 — both <code>flags</code> and <code>repo</code> are spread into git's argv with no allowlist, no URL validation, and no <code>--</code> end-of-options guard.</p>" +
    "<h4>Vulnerability</h4><p>Argument (option) injection. Avoiding the shell stops <em>command</em> injection, but the attacker still fully controls arguments to a powerful program that runs other programs on its own.</p>" +
    "<h4>Attack</h4><pre>{\n  \"repo\": \"ssh://git@attacker.example/x\",\n  \"flags\": [\"--config=core.sshCommand=touch /tmp/pwned\"]\n}</pre>" +
    "<p>The handler builds <code>git clone --config=core.sshCommand=touch /tmp/pwned ssh://git@attacker.example/x /tmp/work</code>. The injected <code>--config</code> sets <code>core.sshCommand</code>; when git dials the <code>ssh://</code> remote it executes that command <em>locally</em> — attacker code runs, with no shell metacharacters and on a default git config.</p>" +
    "<h4>Why it works</h4><p><code>execFile</code> guarantees the OS shell isn't involved, but git does its own argument parsing and will happily run a helper program an option points it at. Untrusted data anywhere in argv can select those behaviors.</p>" +
    "<p><b>Note on the folklore payloads.</b> Older write-ups pass a single <code>repo</code> of <code>ext::sh -c '…'</code> or <code>--upload-pack=…</code>. On a modern, default git these do <em>not</em> fire: <code>ext::</code> is disabled unless <code>protocol.ext.allow</code> is set, and a lone <code>--upload-pack=</code> over https is inert (the fixed <code>/tmp/work</code> just becomes the repo operand). The reliable, default-config vector is injecting a full option such as <code>--config core.sshCommand</code> together with an <code>ssh</code> URL — which is exactly what an unfiltered <code>flags</code> passthrough allows.</p>" +
    "<h4>Secure fix</h4><pre>if (!/^https:\\/\\//.test(repo)) return res.status(400).send('https only');\n// drop the raw flags passthrough (or allowlist specific ones),\n// and stop option parsing with an end-of-options marker:\nexecFile('git', ['clone', '--depth', '1', '--', repo, '/tmp/work'], cb);</pre>" +
    "<h4>Why the fix works</h4><p>Requiring an <code>https</code> URL rejects <code>ssh://</code>, <code>ext::</code>, and option-shaped values; removing the arbitrary <code>flags</code> passthrough closes the injection at its source; and the <code>--</code> marker forces git to treat everything after it as a path/URL, never as a flag. If callers genuinely need options, accept them as a fixed allowlist (e.g. <code>--depth &lt;n&gt;</code>) rather than passing raw argv through.</p>"
});
