registerLab({
  id: "04-path-traversal",
  order: 4,
  title: "Path traversal in a file download endpoint",
  difficulty: "medium",
  category: "path",
  env: "node",
  mode: "exploit",
  description: "A download handler joins a user-supplied filename onto the upload directory and returns the file.",
  code: [
    "const path = require('path');",
    "const fs = require('fs');",
    "",
    "const UPLOAD_DIR = '/var/www/uploads';",
    "",
    "// GET /download?file=report.pdf",
    "function handleDownload(req, res) {",
    "  const file = req.query.file;",
    "  const target = path.join(UPLOAD_DIR, file);",
    "  const data = fs.readFileSync(target);",
    "  res.send(data);",
    "}"
  ].join("\n"),
  vulnerableLines: [9],
  hints: [
    "The filename comes from the user. What does <code>path.join</code> do with <code>..</code> segments?",
    "<code>path.join('/var/www/uploads', '../../etc/passwd')</code> normalizes to <code>/etc/passwd</code>.",
    "Nothing verifies the resolved path stays inside UPLOAD_DIR — that's the missing containment check."
  ],
  vulnerabilityType: "Path Traversal / Directory Traversal (CWE-22)",
  explanation:
    "<h4>Why it's vulnerable</h4>" +
    "<p><code>path.join</code> resolves <code>..</code> segments, so a user-controlled <code>file</code> can climb out of <code>UPLOAD_DIR</code>. " +
    "There is no check that the <em>final</em> path is still inside the intended directory before reading it.</p>" +
    "<h4>Exploit</h4>" +
    "<pre>GET /download?file=../../../../etc/passwd</pre>" +
    "<p><code>path.join('/var/www/uploads', '../../../../etc/passwd')</code> → <code>/etc/passwd</code>. The server happily reads and returns it.</p>" +
    "<h4 class='badge-impact'>Impact</h4>" +
    "<p>Arbitrary file read: source code, <code>.env</code> secrets, SSH keys, <code>/etc/passwd</code>. Combined with a write sink it becomes arbitrary file write (and often RCE).</p>" +
    "<h4 class='badge-fix'>Fix</h4>" +
    "<p>Resolve the path and confirm it is still inside the base directory:</p>" +
    "<pre>const target = path.resolve(UPLOAD_DIR, file);\nif (!target.startsWith(UPLOAD_DIR + path.sep)) {\n  return res.status(400).send('bad path');\n}</pre>" +
    "<p>Better still: never accept raw paths — map an opaque ID to a known filename, and use <code>path.basename()</code> to strip directory components.</p>",
  exploit: {
    goal: "Read a file OUTSIDE /var/www/uploads (e.g. /etc/passwd or a secrets file) by supplying a crafted 'file' value.",
    placeholder: "e.g. ../../../../etc/passwd",
    samples: ["../../../../etc/passwd", "../secret.env", "report.pdf"],
    run: function (payload, log) {
      var UPLOAD_DIR = "/var/www/uploads";
      var FS = {
        "/var/www/uploads/report.pdf": "%PDF-1.4 ... quarterly report ...",
        "/var/www/secret.env": "DB_PASSWORD=hunter2\nJWT_SECRET=s3cr3t",
        "/etc/passwd": "root:x:0:0:root:/root:/bin/bash\nwww-data:x:33:33:/var/www:/usr/sbin/nologin"
      };
      function resolve(base, input) {
        var parts = (base + "/" + input).split("/");
        var stack = [];
        parts.forEach(function (p) {
          if (p === "" || p === ".") return;
          if (p === "..") stack.pop();
          else stack.push(p);
        });
        return "/" + stack.join("/");
      }
      var target = resolve(UPLOAD_DIR, payload);
      log("out", "path.join(UPLOAD_DIR, file) => " + target);
      var inside = target.indexOf(UPLOAD_DIR + "/") === 0;
      if (FS[target] === undefined) {
        return { success: false, detail: "No such file at " + target + ". Try climbing with ../ to a real path." };
      }
      log("out", "--- file contents ---");
      log("out", FS[target]);
      if (!inside) {
        return { success: true, detail: "You escaped the upload directory and read " + target + "." };
      }
      return { success: false, detail: "That file is inside the intended directory — no traversal yet. Escape UPLOAD_DIR with ../" };
    }
  }
});
