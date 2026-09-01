registerLab({
  id: "01-reflected-xss",
  order: 1,
  title: "Reflected XSS in a URL parameter",
  difficulty: "easy",
  category: "xss",
  env: "browser",
  mode: "static",
  description: "A greeting widget reads a name from the query string and writes it to the page.",
  code: [
    "function renderGreeting() {",
    "  const params = new URLSearchParams(window.location.search);",
    "  const name = params.get('name') || 'guest';",
    "  const box = document.getElementById('welcome');",
    "  // show a personalized welcome message",
    "  box.innerHTML = 'Welcome back, ' + name + '!';",
    "}",
    "renderGreeting();"
  ].join("\n"),
  vulnerableLines: [6],
  hints: [
    "Where does untrusted input (the URL) end up being written back into the page?",
    "Look for a DOM sink. Which property parses its input as HTML rather than text?",
    "<code>innerHTML</code> turns a string into live DOM — including &lt;script&gt; and event handlers."
  ],
  vulnerabilityType: "Reflected Cross-Site Scripting (XSS)",
  explanation:
    "<h4>Why it's vulnerable</h4>" +
    "<p>The <code>name</code> value comes straight from the URL and is concatenated into <code>innerHTML</code>. " +
    "<code>innerHTML</code> is an HTML sink: the browser parses whatever you give it as markup, so any HTML or script in <code>name</code> becomes part of the page.</p>" +
    "<h4>Exploit</h4>" +
    "<p>An attacker sends a victim a crafted link:</p>" +
    "<pre>https://app.example/?name=&lt;img src=x onerror=alert(document.cookie)&gt;</pre>" +
    "<p>The image fails to load, the <code>onerror</code> handler fires, and attacker JavaScript runs in the victim's session. " +
    "It's <em>reflected</em> because the payload travels in the request and is echoed straight back in the response.</p>" +
    "<h4 class='badge-impact'>Impact</h4>" +
    "<p>Session/cookie theft, account takeover, keylogging, or forcing actions as the victim.</p>" +
    "<h4 class='badge-fix'>Fix</h4>" +
    "<p>Write untrusted text with <code>textContent</code> (never <code>innerHTML</code>):</p>" +
    "<pre>box.textContent = 'Welcome back, ' + name + '!';</pre>" +
    "<p>If HTML really is required, sanitize with a vetted library (DOMPurify) and encode context-appropriately.</p>"
});
