registerLab({
  id: "31-oauth-linking",
  order: 31,
  title: "OAuth account-linking CSRF",
  mysteryTitle: "Connect an external identity",
  difficulty: "expert",
  category: "oauth",
  env: "http",
  mode: "http",
  track: "web-advanced",
  skills: ["oauth", "state-binding", "account-linking"],
  estimatedTime: 45,
  prerequisites: ["19-middleware-ordering"],
  filename: "routes/oauth-link.js",
  description: "A logged-in user can attach an identity-provider account to the current application account.",
  code: [
    "app.get('/oauth/link/start', requireUser, (req, res) => {",
    "  const url = oauth.authorizationUrl({ redirect_uri: CALLBACK_URL });",
    "  res.redirect(url);",
    "});",
    "",
    "app.get('/oauth/link/callback', requireUser, async (req, res) => {",
    "  const tokens = await oauth.exchange(req.query.code, CALLBACK_URL);",
    "  const identity = await oauth.userInfo(tokens.access_token);",
    "  await Users.linkOAuth(req.user.id, identity.sub);",
    "  res.json({ linked: true });",
    "});"
  ].join("\n"),
  vulnerableLines: [2, 6, 7, 9],
  hints: [
    "Which value connects the callback to the browser session that intentionally started the linking flow?",
    "An authorization code is bound to the OAuth client and redirect URI, but that alone does not bind it to Alice's application session.",
    "Compare linking with <code>alice-code</code> to presenting an authorization code issued for a different identity while the application user remains Alice.",
    "Call the callback as <code>X-Lab-User: alice</code> with <code>attacker-code</code>. The absent one-time <code>state</code> and transaction record allow the attacker's IdP identity to be attached to Alice."
  ],
  vulnerabilityType: "OAuth account-linking CSRF / authorization response injection (CWE-352)",
  http: {
    basePath: "/lab-api/31-oauth-linking",
    statusPath: "/__lab/status/31-oauth-linking",
    resetPath: "/__lab/reset/31-oauth-linking",
    goal: "While the application user remains Alice, link the attacker's OAuth identity using an unbound callback.",
    requests: [
      {
        name: "Start linking",
        method: "GET",
        path: "/lab-api/31-oauth-linking/link/start",
        headers: "X-Lab-User: alice",
        body: ""
      },
      {
        name: "Callback",
        method: "GET",
        path: "/lab-api/31-oauth-linking/link/callback?code=alice-code",
        headers: "X-Lab-User: alice",
        body: ""
      }
    ]
  },
  explanation:
    "<h4>Root cause</h4><p>The linking transaction has no unpredictable, single-use value bound to the initiating application session. The callback accepts any valid code for the client and immediately attaches its identity to the currently logged-in user.</p>" +
    "<h4>Attack</h4><p>The attacker starts OAuth with their own identity and obtains an authorization response for the legitimate client, then causes Alice's authenticated browser to visit the callback containing that response. The application links the attacker's external identity to Alice's account. If that identity can later be used to sign in, the attacker gains persistent account access.</p>" +
    "<h4>Protocol boundaries</h4><p><code>redirect_uri</code> validation prevents a different class of code theft; it does not establish who initiated an account-link operation. PKCE binds a code to a verifier and is valuable, but the linking transaction still needs browser-session and intent binding. Exact requirements depend on the OAuth/OIDC profile.</p>" +
    "<h4>Secure fix</h4><p>Generate a cryptographically random <code>state</code>, store only its hash with the initiating user/session, purpose (“link”), provider and expiration, and consume it once on callback. Use PKCE, exact redirect URI registration, issuer/client validation, and require recent re-authentication or confirmation before attaching a login method.</p>" +
    "<h4>Regression tests</h4><p>Reject missing, wrong, expired, replayed and cross-session state; reject a state created for login when used for linking; confirm a valid same-session flow succeeds once; and notify the account owner when a new identity is attached.</p>"
});
