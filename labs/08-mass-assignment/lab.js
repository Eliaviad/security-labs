registerLab({
  id: "08-mass-assignment",
  order: 8,
  title: "Mass assignment → privilege escalation",
  difficulty: "medium",
  category: "auth",
  env: "node",
  mode: "exploit",
  description: "A profile-update endpoint copies the whole request body onto the user record.",
  code: [
    "// PATCH /account  { ...profile fields }",
    "function updateProfile(req, res) {",
    "  const user = db.users.findById(req.session.userId);",
    "  // apply the submitted fields to the user record",
    "  Object.assign(user, req.body);",
    "  db.users.save(user);",
    "  return res.json({ ok: true, user });",
    "}"
  ].join("\n"),
  vulnerableLines: [5],
  hints: [
    "The user is only supposed to edit name/email/bio. What limits which fields req.body can set?",
    "<code>Object.assign(user, req.body)</code> copies EVERY key the client sends — including ones the UI never exposes.",
    "Send <code>role</code> or <code>credits</code> in the body and they overwrite the trusted record."
  ],
  vulnerabilityType: "Mass Assignment / Over-posting (CWE-915)",
  explanation:
    "<h4>Why it's vulnerable</h4>" +
    "<p><code>Object.assign(user, req.body)</code> blindly merges client-controlled keys onto a privileged server object. " +
    "There is no allowlist of editable fields, so security-sensitive properties like <code>role</code>, <code>isAdmin</code>, or <code>credits</code> can be overwritten.</p>" +
    "<h4>Exploit</h4>" +
    "<pre>PATCH /account\n{ \"name\": \"Bob\", \"role\": \"admin\" }</pre>" +
    "<p>The UI only shows a name field, but the API accepts anything. The attacker adds <code>role: 'admin'</code> (or <code>credits: 999999</code>) and escalates.</p>" +
    "<h4 class='badge-impact'>Impact</h4>" +
    "<p>Privilege escalation, balance/credit tampering, overwriting ownership or verification flags.</p>" +
    "<h4 class='badge-fix'>Fix</h4>" +
    "<p>Explicitly allowlist the fields a user may change — never spread raw input:</p>" +
    "<pre>const { name, email, bio } = req.body;\nObject.assign(user, { name, email, bio });</pre>" +
    "<p>Or use a DTO/schema (Zod, Joi) that strips unknown keys, and keep privileged fields on a separate object.</p>",
  exploit: {
    goal: "Escalate to admin (or inflate credits) by over-posting fields the profile form doesn't expose. Only name/email/bio are meant to be editable.",
    placeholder: '{"name":"Bob","role":"admin"}',
    samples: ['{"name":"Bob","role":"admin"}', '{"credits":999999}', '{"isAdmin":true}', '{"name":"Alice","bio":"hi"}'],
    run: function (payload, log) {
      var original = { id: 7, name: "Bob", email: "bob@x.com", bio: "hi", role: "user", credits: 10, isAdmin: false };
      var user = JSON.parse(JSON.stringify(original));
      var body;
      try { body = JSON.parse(payload); } catch (e) { return { success: false, detail: "Invalid JSON body." }; }
      Object.assign(user, body); // the vulnerable line, faithfully reproduced
      log("out", "user record after update:");
      log("out", JSON.stringify(user, null, 2));
      var protectedFields = ["role", "isAdmin", "credits", "id"];
      var changed = protectedFields.filter(function (f) { return user[f] !== original[f]; });
      if (changed.length) {
        return { success: true, detail: "You modified privileged field(s): " + changed.join(", ") + " — which the form never allowed." };
      }
      return { success: false, detail: "Only benign fields changed. Add a privileged key like role, isAdmin, or credits." };
    }
  }
});
