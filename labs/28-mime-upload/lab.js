registerLab({
  id: "28-mime-upload",
  order: 28,
  title: "Active content through an image upload",
  mysteryTitle: "Profile image upload",
  difficulty: "hard",
  category: "upload",
  env: "http",
  mode: "http",
  track: "web-server",
  skills: ["file-upload", "content-type", "active-content"],
  estimatedTime: 30,
  prerequisites: ["21-zip-slip"],
  filename: "routes/uploads.js",
  description: "An upload endpoint accepts images and later serves files from a public route.",
  code: [
    "app.post('/upload', rawBody, async (req, res) => {",
    "  if (!req.get('content-type').startsWith('image/')) {",
    "    return res.status(415).json({ error: 'images only' });",
    "  }",
    "  const filename = req.query.filename;",
    "  await fs.writeFile(path.join(UPLOAD_DIR, filename), req.body);",
    "  res.status(201).json({ stored: `/files/${filename}` });",
    "});",
    "",
    "app.use('/files', express.static(UPLOAD_DIR));"
  ].join("\n"),
  vulnerableLines: [2, 5, 6, 10],
  hints: [
    "The request declares its own MIME type. Does that establish what the bytes actually contain or how the response will later be interpreted?",
    "There are two decisions to compare: what the upload filter accepts and what the static server sends based on the filename extension.",
    "Try a benign image declaration with a filename whose extension browsers treat as an HTML document, then retrieve the stored file.",
    "The proof needs active HTML plus an <code>image/*</code> upload header and an <code>.html</code> filename. The training response is CSP-sandboxed so the platform itself remains isolated."
  ],
  vulnerabilityType: "Unrestricted upload of active content (CWE-434)",
  http: {
    basePath: "/lab-api/28-mime-upload",
    statusPath: "/__lab/status/28-mime-upload",
    resetPath: "/__lab/reset/28-mime-upload",
    goal: "Pass the image-only check, then retrieve the same bytes as active HTML.",
    requests: [
      {
        name: "Upload candidate",
        method: "POST",
        path: "/lab-api/28-mime-upload/upload?filename=avatar.png",
        headers: "Content-Type: image/png",
        body: "not-a-real-png"
      },
      {
        name: "Retrieve file",
        method: "GET",
        path: "/lab-api/28-mime-upload/files/avatar.png",
        headers: "",
        body: ""
      }
    ]
  },
  explanation:
    "<h4>Root cause</h4><p>The filter trusts a client-declared MIME type while the serving layer derives behavior from the filename. Those parsers disagree, allowing bytes accepted as an image to be returned as HTML.</p>" +
    "<h4>Research path</h4><p>First observe that arbitrary bytes pass with <code>Content-Type: image/png</code>. Next control the extension and retrieve the file. The exploit is the composition of an upload validation weakness and an active-content serving context.</p>" +
    "<h4>Impact and environment</h4><p>If served from the application's authenticated origin, active HTML can become stored XSS or phishing content. This lab returns the uploaded document with <code>Content-Security-Policy: sandbox</code> and <code>nosniff</code>; the grader records that active content would have crossed the boundary without executing attacker JavaScript in the learning platform.</p>" +
    "<h4>Secure fix</h4><p>Decode and re-encode allowed image formats, generate server-side names with fixed extensions, store files outside the web root, and serve them from a separate cookieless origin with <code>Content-Disposition: attachment</code> where inline display is unnecessary. Size and pixel limits are also required against decompression bombs.</p>" +
    "<h4>Regression tests</h4><p>Reject mismatched magic bytes, double extensions, SVG when not explicitly supported, HTML disguised as an image, oversized/decompression-bomb candidates and traversal names. Confirm a valid PNG still uploads and is served with the expected immutable type.</p>"
});
