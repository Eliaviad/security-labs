registerLab({
  id: "25-stored-xss",
  order: 25,
  title: "Stored XSS in a comment feed",
  mysteryTitle: "Community comments",
  difficulty: "medium",
  category: "xss",
  env: "http",
  mode: "http",
  track: "web-browser",
  skills: ["stored-xss", "browser-sinks", "impact-proof"],
  estimatedTime: 25,
  prerequisites: ["01-reflected-xss"],
  filename: "public/comments.js",
  description: "Comments are stored by the API and later rendered in another user's browser.",
  code: [
    "async function loadComments(postId) {",
    "  const response = await fetch(`/api/posts/${postId}/comments`);",
    "  const { comments } = await response.json();",
    "",
    "  const feed = document.querySelector('#comment-feed');",
    "  feed.innerHTML = comments.map(comment =>",
    "    `<article><b>${comment.author}</b><p>${comment.content}</p></article>`",
    "  ).join('');",
    "}"
  ].join("\n"),
  vulnerableLines: [6, 7],
  hints: [
    "Trace <code>comment.content</code> from storage into the DOM. Which browser API decides whether it is text or markup?",
    "A stored-XSS proof needs two phases: persist attacker input, then make a separate victim rendering consume it.",
    "A bare <code>&lt;script&gt;</code> inserted through <code>innerHTML</code> normally does not execute. Which HTML features can execute when an element is parsed or an event fires?",
    "Store markup containing an element event handler, then call the victim-visit endpoint. The grader looks for script-capable markup reaching the vulnerable sink, not merely for a 2xx response."
  ],
  vulnerabilityType: "Stored Cross-Site Scripting (CWE-79)",
  http: {
    basePath: "/lab-api/25-stored-xss",
    statusPath: "/__lab/status/25-stored-xss",
    resetPath: "/__lab/reset/25-stored-xss",
    goal: "Persist browser-executable markup and make the simulated victim render it.",
    requests: [
      {
        name: "Store comment",
        method: "POST",
        path: "/lab-api/25-stored-xss/comments",
        headers: "Content-Type: application/json",
        body: "{\n  \"content\": \"<strong>hello</strong>\"\n}"
      },
      {
        name: "Read comments",
        method: "GET",
        path: "/lab-api/25-stored-xss/comments",
        headers: "",
        body: ""
      },
      {
        name: "Victim visit",
        method: "POST",
        path: "/lab-api/25-stored-xss/victim/visit",
        headers: "Content-Type: application/json",
        body: "{}"
      }
    ]
  },
  explanation:
    "<h4>Root cause</h4><p>Lines 6–7 interpolate database content into an HTML string and assign it to <code>innerHTML</code>. Storage does not make data trusted: the original commenter still controls the value when another browser consumes it.</p>" +
    "<h4>Research path</h4><p>First store benign text and observe it through <code>GET /comments</code>. Then change only the content, trigger the separate victim visit, and look for the server-issued impact receipt. This separates persistence from execution context.</p>" +
    "<h4>Important boundary</h4><p><code>&lt;script&gt;</code> elements created by assigning <code>innerHTML</code> do not normally execute. An event-bearing element such as an image error handler is a more accurate proof for this sink. The lab intentionally rejects the script-tag-only shortcut to teach browser semantics rather than string matching.</p>" +
    "<h4>Impact and prerequisites</h4><p>Execution occurs in the victim origin and can perform actions available to that user. Whether a cookie can be read depends on <code>HttpOnly</code>; XSS can still issue same-origin requests even when cookies are unreadable. A real exploit also requires a victim to load the affected view and no effective sanitizer or CSP to stop the chosen vector.</p>" +
    "<h4>Secure fix</h4><pre>const article = document.createElement('article');\nconst body = document.createElement('p');\nbody.textContent = comment.content;\narticle.append(body);</pre><p>If limited rich text is a product requirement, sanitize it with a maintained allowlist sanitizer and deploy a restrictive CSP as defense in depth.</p>" +
    "<h4>Regression tests</h4><p>Verify ordinary Unicode text renders unchanged, event attributes are removed or displayed as text, dangerous URL schemes are rejected, and stored content remains safe when viewed by a second account.</p>"
});
