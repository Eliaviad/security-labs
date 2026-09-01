registerLab({
  id: "21-zip-slip",
  order: 21,
  title: "Archive extraction",
  difficulty: "hard",
  category: "path",
  env: "node",
  mode: "static",
  filename: "services/unzip.js",
  description: "Uploaded archives are extracted into a per-user directory. `entries` come from the archive.",
  code: [
    "const path = require('path');",
    "const fs = require('fs');",
    "",
    "// entries[].name and .data come straight from the uploaded archive",
    "function extractAll(entries, destDir) {",
    "  for (const entry of entries) {",
    "    const outPath = path.join(destDir, entry.name);",
    "    if (entry.isDirectory) {",
    "      fs.mkdirSync(outPath, { recursive: true });",
    "    } else {",
    "      fs.mkdirSync(path.dirname(outPath), { recursive: true });",
    "      fs.writeFileSync(outPath, entry.data);",
    "    }",
    "  }",
    "}"
  ].join("\n"),
  vulnerableLines: [7, 12],
  hints: [
    "Where do <code>entry.name</code> and <code>entry.data</code> come from, and how much do you trust the contents of an uploaded archive?",
    "<code>path.join</code> normalizes <code>..</code> segments. What does it return if <code>entry.name</code> is <code>../../something</code>?",
    "Is there any check that <code>outPath</code> stays inside <code>destDir</code> before the write on line 12?",
    "A malicious entry named <code>../../../../etc/cron.d/pwn</code> makes <code>outPath</code> land outside the user's directory. That's Zip Slip → arbitrary file write."
  ],
  vulnerabilityType: "Zip Slip / Path Traversal on extraction (CWE-22)",
  explanation:
    "<h4>Vulnerable lines</h4><p>Line 7 builds the output path from an untrusted archive entry name, and line 12 writes to it with no containment check.</p>" +
    "<h4>Vulnerability</h4><p>Zip Slip: a directory-traversal filename inside the archive escapes the extraction root, giving arbitrary file write.</p>" +
    "<h4>Attack</h4><p>Craft an archive containing an entry whose name is:</p><pre>../../../../etc/cron.d/pwn\n../../.ssh/authorized_keys\n../../app/routes/backdoor.js</pre>" +
    "<p><code>path.join('/data/u/42', '../../../../etc/cron.d/pwn')</code> resolves outside <code>destDir</code>. Writing there can plant a cron job, overwrite app code, or drop an SSH key — frequently full RCE.</p>" +
    "<h4>Why it works</h4><p>Archive formats store arbitrary path strings, and <code>path.join</code> happily resolves <code>..</code>. Trusting the entry name means the archive author chooses where files land.</p>" +
    "<h4>Secure fix</h4><pre>const root = path.resolve(destDir);\nconst normalized = entry.name.replace(/\\\\/g, '/');\nif (path.posix.isAbsolute(normalized)) throw new Error('absolute entry');\nconst resolved = path.resolve(root, normalized);\nif (resolved !== root &amp;&amp; !resolved.startsWith(root + path.sep)) {\n  throw new Error('unsafe archive entry: ' + entry.name);\n}</pre>" +
    "<h4>Filesystem caveat</h4><p>The lexical containment check blocks <code>..</code> traversal, but it is not sufficient if an archive can create symlink/hard-link entries or if an existing parent below <code>destDir</code> is a symlink. A production extractor must reject link entries (or apply an explicit safe link policy), avoid following symlinks for every path component, and extract into a newly created directory that an attacker cannot modify concurrently. Prefer a maintained archive library with no-follow/containment guarantees.</p>" +
    "<h4>Regression tests</h4><p>Cover <code>../</code>, backslash separators, absolute archive names, symlink-then-child entries, hard links, duplicate names and a normal nested file that must still extract successfully.</p>"
});
