/* lab.js — evidence-driven lab workspace.
   Mastery is split into hypothesis, identification and impact proof.
   Revealing an answer never marks the lab complete. */

function qparam(name) {
  var params = new URLSearchParams(window.location.search);
  return params.get(name);
}

var LAB = null;
var identified = false;
var revealed = false;
var hintsShown = 0;
var foundLines = {};
var challengeMode = false;
var httpRepeat = 1;

function catLabel(c) {
  return ({
    xss: "XSS", secrets: "Secrets", validation: "Input Validation",
    path: "Path/File", injection: "Injection", auth: "Auth/Access",
    logic: "Logic/Concurrency", prototype: "Prototype", ssrf: "SSRF",
    dos: "DoS", redirect: "Open Redirect", cors: "CORS",
    crypto: "Crypto", upload: "File Upload", csrf: "CSRF",
    oauth: "OAuth", api: "API", template: "Templates"
  })[c] || c;
}

function boot() {
  var id = qparam("id");
  challengeMode = qparam("mode") === "challenge" || window.LabProgress.getPreference("challengeMode") === true;
  window.loadAllLabs(function () {
    LAB = window.LABS.filter(function (lab) { return lab.id === id; })[0];
    if (!LAB) {
      document.getElementById("lab-root").innerHTML = '<div class="empty">Lab not found.</div>';
      return;
    }
    window.LabProgress.markOpened(LAB.id);
    var title = challengeMode ? LAB.mysteryTitle : LAB.title;
    document.title = "Lab " + String(LAB.order).padStart(2, "0") + " — " + title;
    renderLab();
  });
}

function renderLab() {
  var root = document.getElementById("lab-root");
  root.textContent = "";
  var record = window.LabProgress.get(LAB.id);
  identified = record.identified === true;
  revealed = false;
  hintsShown = 0;
  foundLines = {};

  var shell = el("div", "lab-shell");
  var sidebar = buildStageRail();
  var workspace = el("div", "lab-workspace");
  shell.appendChild(sidebar);
  shell.appendChild(workspace);
  root.appendChild(shell);

  workspace.appendChild(buildHeader());
  workspace.appendChild(buildBrief());

  if (LAB.build) {
    workspace.appendChild(el("div", "section-title", "0 · Build the functional slice with AI"));
    workspace.appendChild(buildProjectPanel());
  }

  workspace.appendChild(el("div", "section-title", LAB.architecture ? "1 · Review the architecture" : "1 · Review the implementation"));
  if (LAB.architecture) workspace.appendChild(buildArchitectureContext());
  workspace.appendChild(buildCodeViewer());

  var feedback = el("div", "feedback");
  feedback.id = "feedback";
  feedback.setAttribute("role", "status");
  feedback.setAttribute("aria-live", "polite");
  if (record.identified) {
    feedback.className = "feedback ok";
    feedback.textContent = "✓ You previously completed the identification stage. Continue with impact proof or remediation.";
  }
  workspace.appendChild(feedback);
  workspace.appendChild(buildReviewActions());

  var hints = el("div", "hints");
  hints.id = "hints";
  hints.setAttribute("aria-live", "polite");
  workspace.appendChild(hints);

  workspace.appendChild(el("div", "section-title", "2 · Form and save a hypothesis"));
  workspace.appendChild(buildReasoning());

  if (LAB.mode === "exploit" && LAB.exploit) {
    workspace.appendChild(el("div", "section-title", "3 · Prove impact in the payload runner"));
    workspace.appendChild(buildSandbox());
  }

  if (LAB.mode === "http" && LAB.http) {
    workspace.appendChild(el("div", "section-title", "3 · Send a real HTTP request"));
    workspace.appendChild(buildHttpWorkbench());
  }

  workspace.appendChild(el("div", "section-title", "4 · Explanation and boundaries"));
  var exp = el("div", "explanation");
  exp.id = "explanation";
  exp.innerHTML = LAB.explanation;
  workspace.appendChild(exp);

  workspace.appendChild(el("div", "section-title", "5 · Remediate and regression-test"));
  workspace.appendChild(buildRemediation());
  workspace.appendChild(buildNav());
}

function buildHeader() {
  var record = window.LabProgress.get(LAB.id);
  var title = challengeMode ? LAB.mysteryTitle : LAB.title;
  var head = el("header", "lab-v2-head");
  head.innerHTML =
    '<div class="lab-head-top"><a class="backlink" href="index.html">← Learning paths</a>' +
    '<span class="lab-number">LAB ' + String(LAB.order).padStart(2, "0") + '</span></div>' +
    '<div class="lab-head"><h1>' + escHtml(title) + '</h1></div>' +
    '<div class="tags">' +
      '<span class="tag diff-' + LAB.difficulty + '">' + LAB.difficulty + '</span>' +
      (challengeMode ? '' : '<span class="tag">' + escHtml(catLabel(LAB.category)) + '</span>') +
      '<span class="tag ' + (LAB.mode === "http" ? "mode-live" : (LAB.mode === "exploit" ? "mode-exploit" : "")) + '">' +
        (LAB.architecture ? (LAB.safe ? "secure design review" : "design review") : (LAB.mode === "http" ? "live HTTP" : (LAB.mode === "exploit" ? "payload runner" : (LAB.safe ? "secure review" : "code review")))) + '</span>' +
      '<span class="tag">' + LAB.estimatedTime + ' min</span>' +
    '</div>' +
    '<p class="lab-desc">' + escHtml(challengeMode ? "Investigate the implementation. Do not assume the snippet is vulnerable." : LAB.description) + '</p>' +
    '<div class="lab-skill-list">' + (LAB.skills || []).map(function (skill) {
      return '<span>' + escHtml(skill) + '</span>';
    }).join('') + '</div>' +
    (record.revealed ? '<p class="reveal-history">You have viewed the answer before; mastery still requires evidence.</p>' : '');
  return head;
}

function buildBrief() {
  var task = el("section", "instruction research-brief");
  var modeText = LAB.mode === "http"
    ? "Review the code, save your hypothesis, then use the HTTP workbench to achieve the objective against the local lab server."
    : (LAB.mode === "exploit"
      ? "Review the code, save your hypothesis, then craft a payload that produces an observable security impact."
      : (LAB.architecture
        ? "Review the design like a security architect. Identify the risky design decision(s), or justify that the reviewed property is secure."
        : "Review the code like a security researcher. Identify the vulnerable line(s), or justify that the snippet is secure."));
  task.innerHTML =
    '<div><span class="brief-label">OBJECTIVE</span><p>' + escHtml(modeText) + '</p></div>' +
    '<div><span class="brief-label">RESEARCH RULE</span><p>A pattern is not proof. State the trust boundary, prerequisites and expected observation.</p></div>';
  return task;
}

function buildArchitectureContext() {
  var architecture = LAB.architecture;
  var assets = (architecture.assets || []).map(function (item) { return "<li>" + escHtml(item) + "</li>"; }).join("");
  var constraints = (architecture.constraints || []).map(function (item) { return "<li>" + escHtml(item) + "</li>"; }).join("");
  var questions = (architecture.questions || []).map(function (item) { return "<li>" + escHtml(item) + "</li>"; }).join("");
  var box = el("section", "architecture-context");
  box.innerHTML =
    '<div class="architecture-summary"><span class="brief-label">SYSTEM CONTEXT</span><p>' + escHtml(architecture.context) + '</p></div>' +
    '<div class="architecture-columns"><div><h3>Assets</h3><ul>' + assets + '</ul></div>' +
    '<div><h3>Constraints</h3><ul>' + constraints + '</ul></div>' +
    '<div><h3>Review questions</h3><ul>' + questions + '</ul></div></div>';
  return box;
}

function buildStageRail() {
  var record = window.LabProgress.get(LAB.id);
  var proveDone = LAB.mode === "static" ? record.identified : record.exploited;
  var items = [
    ["01", "Model", record.hypothesisSubmitted],
    ["02", "Locate", record.identified],
    ["03", "Prove", proveDone],
    ["04", "Fix", record.remediated],
    ["05", "Test", record.regressionPassed]
  ];
  if (LAB.build) items.unshift(["00", "Build", record.buildCompleted]);
  var aside = el("aside", "stage-rail");
  aside.innerHTML = '<a class="rail-brand" href="index.html">SRL<span>▮</span></a>' + items.map(function (item) {
    return '<div class="rail-step ' + (item[2] ? 'done' : '') + '"><span>' + item[0] + '</span><b>' + item[1] + '</b></div>';
  }).join('');
  return aside;
}

function buildProjectPanel() {
  var saved = loadReasoning();
  var build = LAB.build;
  var box = el("section", "build-panel");
  var requirements = (build.requirements || []).map(function (item) {
    return "<li>" + escHtml(item) + "</li>";
  }).join("");
  var acceptance = (build.acceptance || []).map(function (item) {
    return "<li>" + escHtml(item) + "</li>";
  }).join("");
  box.innerHTML =
    '<div class="build-grid"><div><span class="brief-label">SCENARIO</span><p>' + escHtml(build.scenario) + '</p>' +
    '<h3>Functional requirements</h3><ul>' + requirements + '</ul></div>' +
    '<div><span class="brief-label">ACCEPTANCE</span><ul>' + acceptance + '</ul></div></div>' +
    '<label class="build-notes"><span>What did the AI build, and what did you verify yourself?</span>' +
    '<textarea id="build-notes" placeholder="Record files created, request flow, tests run, and anything you changed manually."></textarea></label>';
  box.querySelector("#build-notes").value = saved.buildNotes || "";

  var actions = el("div", "actions");
  var copy = el("button", "btn", "Copy Claude Code build prompt");
  copy.type = "button";
  copy.onclick = function () {
    var note = document.getElementById("build-note");
    function ok() { note.className = "feedback ok"; note.textContent = "✓ Build prompt copied."; }
    function fail() { note.className = "feedback no"; note.textContent = "Clipboard access failed; copy the prompt from the revealed solution notes."; }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(build.prompt).then(ok, fail);
    else if (legacyCopy(build.prompt)) ok(); else fail();
  };
  var done = el("button", "btn primary", "Save build evidence");
  done.type = "button";
  done.onclick = saveBuildEvidence;
  actions.appendChild(copy);
  actions.appendChild(done);
  box.appendChild(actions);
  var note = el("div", "feedback");
  note.id = "build-note";
  note.setAttribute("role", "status");
  box.appendChild(note);
  return box;
}

function saveBuildEvidence() {
  var value = document.getElementById("build-notes").value.trim();
  var saved = loadReasoning();
  saved.buildNotes = value;
  saveReasoningData(saved);
  var note = document.getElementById("build-note");
  if (value.length < 40) {
    note.className = "feedback no";
    note.textContent = "Saved locally. Add concrete files, behavior and tests you personally verified.";
    return;
  }
  window.LabProgress.markBuilt(LAB.id);
  note.className = "feedback ok";
  note.textContent = "✓ Build evidence saved. Continue by reviewing the implementation without asking AI for the answer.";
  refreshRail();
}

function buildReviewActions() {
  var actions = el("div", "actions review-actions");
  var hintBtn = el("button", "btn ghost", "Show a hint");
  hintBtn.id = "hint-btn";
  hintBtn.type = "button";
  hintBtn.onclick = showNextHint;
  actions.appendChild(hintBtn);

  var secureBtn = el("button", "btn", "Mark as secure");
  secureBtn.id = "secure-btn";
  secureBtn.type = "button";
  secureBtn.onclick = markSecure;
  actions.appendChild(secureBtn);

  var revealBtn = el("button", "btn danger-ghost", "Reveal answer (not mastery)");
  revealBtn.type = "button";
  revealBtn.onclick = doReveal;
  actions.appendChild(revealBtn);
  return actions;
}

function buildCodeViewer() {
  var wrap = el("div", "code-wrap");
  var bar = el("div", "code-toolbar");
  var fname = LAB.filename || (LAB.env === "browser" ? "app.js (browser)" : "server.js (Node/Express)");
  bar.innerHTML = '<span>' + escHtml(fname) + '</span><span>Arrow keys move · Enter selects</span>';
  wrap.appendChild(bar);

  var code = el("div", "code");
  code.setAttribute("role", "listbox");
  code.setAttribute("aria-label", "Source code. Select every line that participates in the flaw.");
  var lines = LAB.code.replace(/\n$/, "").split("\n");
  lines.forEach(function (raw, i) {
    var n = i + 1;
    var line = el("div", "code-line");
    line.dataset.n = n;
    line.innerHTML = '<span class="ln">' + n + '</span><span class="lc">' + (highlightLine(raw) || '&nbsp;') + '</span>';
    line.setAttribute("role", "option");
    line.setAttribute("tabindex", i === 0 ? "0" : "-1");
    line.setAttribute("aria-label", "Line " + n + ": " + (raw.trim() || "blank line"));
    line.setAttribute("aria-selected", "false");
    line.onclick = function () { pickLine(n, line); };
    line.onkeydown = function (event) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        pickLine(n, line);
      } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        moveCodeFocus(line, event.key === "ArrowDown" ? 1 : -1);
      }
    };
    code.appendChild(line);
  });
  wrap.appendChild(code);
  return wrap;
}

function moveCodeFocus(current, delta) {
  var lines = Array.prototype.slice.call(document.querySelectorAll(".code-line"));
  var index = lines.indexOf(current);
  var next = lines[Math.max(0, Math.min(lines.length - 1, index + delta))];
  if (!next || next === current) return;
  current.setAttribute("tabindex", "-1");
  next.setAttribute("tabindex", "0");
  next.focus();
}

function isSafeLab() {
  return LAB.safe === true || !LAB.vulnerableLines || LAB.vulnerableLines.length === 0;
}

function pickLine(n, lineEl) {
  if (identified || revealed) return;
  window.LabProgress.recordAttempt(LAB.id);
  var fb = document.getElementById("feedback");
  if (isSafeLab()) {
    lineEl.classList.add("picked-wrong");
    fb.className = "feedback no";
    fb.textContent = "You flagged line " + n + ". Describe a concrete security impact. If no input reaches a dangerous sink, the snippet may be secure.";
    return;
  }

  if (LAB.vulnerableLines.indexOf(n) !== -1) {
    if (foundLines[n]) return;
    foundLines[n] = true;
    lineEl.classList.add("reveal-vuln");
    lineEl.setAttribute("aria-selected", "true");
    var total = LAB.vulnerableLines.length;
    var got = Object.keys(foundLines).length;
    fb.className = "feedback ok";
    if (got < total) {
      fb.textContent = "✓ This line participates in the flaw — " + got + " of " + total + " located. Keep tracing the interaction.";
    } else {
      identified = true;
      window.LabProgress.markIdentified(LAB.id);
      fb.textContent = LAB.mode === "static"
        ? "✓ Identification complete. Save your reasoning, then draft a fix and regression test."
        : "✓ Identification complete. Now prove the impact in the runner — locating code alone is not mastery.";
      refreshRail();
    }
  } else {
    lineEl.classList.add("picked-wrong");
    fb.className = "feedback no";
    fb.textContent = "✗ Not part of the answer key. Recheck the source, trust boundary, transformation and security-sensitive sink.";
  }
}

function markSecure() {
  if (identified || revealed) return;
  window.LabProgress.recordAttempt(LAB.id);
  var fb = document.getElementById("feedback");
  if (isSafeLab()) {
    identified = true;
    window.LabProgress.markIdentified(LAB.id);
    fb.className = "feedback ok";
    fb.textContent = "✓ Correct. You avoided a false positive. Save the concrete reason no exploit works.";
    refreshRail();
  } else {
    fb.className = "feedback no";
    fb.textContent = "Not secure. Test your conclusion against the data flow, authorization boundary, parser behavior and missing invariants.";
  }
}

function showNextHint() {
  if (hintsShown >= LAB.hints.length) return;
  window.LabProgress.recordHint(LAB.id);
  var hint = LAB.hints[hintsShown];
  var host = document.getElementById("hints");
  var item = el("div", "hint");
  item.innerHTML = '<span class="hlabel">HINT ' + (hintsShown + 1) + '/' + LAB.hints.length + '</span> ' + hint;
  host.appendChild(item);
  hintsShown++;
  if (hintsShown >= LAB.hints.length) {
    var button = document.getElementById("hint-btn");
    button.disabled = true;
    button.textContent = "No more hints";
  }
}

/* ---------- structured reasoning ---------- */
var REASONING_FIELDS = [
  ["source", "Attacker-controlled source", "What exact value can the attacker control?"],
  ["boundary", "Trust boundary / transformation", "Where is the value decoded, parsed, normalized or trusted?"],
  ["sink", "Security-sensitive sink", "What operation consumes the value? If secure, explain why no dangerous sink is reachable."],
  ["missing", "Missing control or invariant", "What check, binding, authorization rule or invariant is absent?"],
  ["preconditions", "Exploit prerequisites", "What else must be true for real impact?"],
  ["impact", "Expected observation and impact", "What non-destructive evidence would prove the hypothesis?"],
  ["fix", "Proposed remediation", "How would you close the whole vulnerability class?"],
  ["notes", "Assumptions and failed ideas", "Which attempts should not work, and why?"]
];

function notesKey() { return "seclabs.reasoning.v2." + LAB.id; }

function loadReasoning() {
  try { return JSON.parse(window.localStorage.getItem(notesKey()) || "{}"); }
  catch (e) { return {}; }
}

function saveReasoningData(data) {
  try { window.localStorage.setItem(notesKey(), JSON.stringify(data)); }
  catch (e) { /* file mode may not persist */ }
}

function buildReasoning() {
  var saved = loadReasoning();
  var box = el("section", "reasoning-grid");
  var intro = el("div", "reasoning-intro");
  intro.innerHTML = '<h3>Research worksheet</h3><p>Write evidence, not a vulnerability label. Your notes stay in this browser.</p>';
  box.appendChild(intro);

  REASONING_FIELDS.forEach(function (field) {
    var label = el("label", "reasoning-field");
    var title = el("span", "reasoning-label", field[1]);
    var textarea = document.createElement("textarea");
    textarea.id = "reasoning-" + field[0];
    textarea.placeholder = field[2];
    textarea.value = saved[field[0]] || "";
    label.appendChild(title);
    label.appendChild(textarea);
    box.appendChild(label);
  });

  var actions = el("div", "actions reasoning-actions");
  var save = el("button", "btn primary", "Save hypothesis");
  save.type = "button";
  save.onclick = submitReasoning;
  var copy = el("button", "btn", "Copy review prompt");
  copy.type = "button";
  copy.onclick = copyReasoningPrompt;
  actions.appendChild(save);
  actions.appendChild(copy);
  box.appendChild(actions);

  var note = el("div", "feedback");
  note.id = "reasoning-note";
  note.setAttribute("role", "status");
  note.setAttribute("aria-live", "polite");
  box.appendChild(note);
  return box;
}

function collectReasoning() {
  var data = {};
  REASONING_FIELDS.forEach(function (field) {
    data[field[0]] = (document.getElementById("reasoning-" + field[0]).value || "").trim();
  });
  return data;
}

function submitReasoning() {
  var data = collectReasoning();
  var substantive = [data.source, data.sink, data.missing, data.preconditions, data.impact].filter(function (value) {
    return value.length >= 12;
  });
  var note = document.getElementById("reasoning-note");
  saveReasoningData(data);
  if (substantive.length < 3) {
    note.className = "feedback no";
    note.textContent = "Saved locally, but the hypothesis is not complete yet. Add evidence in at least three core fields.";
    return;
  }
  window.LabProgress.markHypothesis(LAB.id);
  note.className = "feedback ok";
  note.textContent = "✓ Hypothesis saved. Now test it instead of refining it in the abstract.";
  refreshRail();
}

function buildReasoningPrompt() {
  var data = collectReasoning();
  return [
    "Act as a senior web-security interviewer. Critique the reasoning below without revealing the lab answer.",
    "Challenge assumptions, separate root cause from prerequisites, and ask the smallest useful guiding question.",
    "The snippet may be secure. Do not invent a vulnerability without a concrete data flow and impact.",
    "",
    "LAB: " + (challengeMode ? LAB.mysteryTitle : LAB.title) + " (" + LAB.difficulty + ")",
    "",
    "--- CODE ---",
    LAB.code,
    "",
    "--- REASONING ---",
    REASONING_FIELDS.map(function (field) { return field[1] + ": " + (data[field[0]] || "(not answered)"); }).join("\n")
  ].join("\n");
}

function copyReasoningPrompt() {
  var text = buildReasoningPrompt();
  var note = document.getElementById("reasoning-note");
  function ok() { note.className = "feedback ok"; note.textContent = "✓ Review prompt copied."; }
  function fail() { note.className = "feedback no"; note.textContent = "Clipboard access failed. Select the reasoning fields and copy them manually."; }
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(ok, fail);
  else if (legacyCopy(text)) ok(); else fail();
}

function legacyCopy(text) {
  try {
    var textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    var copied = document.execCommand("copy");
    document.body.removeChild(textarea);
    return copied;
  } catch (e) { return false; }
}

/* ---------- reveal: learning aid, never mastery ---------- */
function doReveal() {
  if (revealed) return;
  revealed = true;
  window.LabProgress.markRevealed(LAB.id);
  Array.prototype.forEach.call(document.querySelectorAll(".code-line"), function (line) {
    line.classList.add("non-selectable");
    line.classList.remove("picked-wrong");
    if (!isSafeLab() && LAB.vulnerableLines.indexOf(parseInt(line.dataset.n, 10)) !== -1) {
      line.classList.add("reveal-vuln");
    }
  });
  document.getElementById("explanation").classList.add("show");
  var feedback = document.getElementById("feedback");
  feedback.className = "feedback warn";
  feedback.textContent = "Answer revealed. This does not complete identification or impact proof; you can still finish the remediation stages.";
  refreshRail();
}

/* ---------- in-browser payload runners ---------- */
function buildSandbox() {
  var box = el("section", "sandbox exploit-panel");
  var goal = el("div", "instruction");
  goal.innerHTML = '<b>Impact objective:</b> ' + escHtml(LAB.exploit.goal);
  box.appendChild(goal);

  var textarea = el("textarea");
  textarea.id = "payload";
  textarea.placeholder = LAB.exploit.placeholder || "Enter a payload…";
  if (LAB.exploit.prefill) textarea.value = LAB.exploit.prefill;
  box.appendChild(textarea);

  var actions = el("div", "actions");
  var run = el("button", "btn primary", "▶ Run payload");
  run.type = "button";
  run.onclick = runExploit;
  var reset = el("button", "btn", "Reset console");
  reset.type = "button";
  reset.onclick = function () {
    document.getElementById("payload").value = "";
    document.getElementById("console").textContent = "Runner ready. Form a hypothesis before trying random payloads.";
  };
  actions.appendChild(run);
  actions.appendChild(reset);
  box.appendChild(actions);

  if (LAB.exploit.samples && LAB.exploit.samples.length) {
    var details = document.createElement("details");
    details.className = "payload-samples gated-samples";
    var summary = document.createElement("summary");
    summary.textContent = "Advanced hint: show payload starting points";
    details.appendChild(summary);
    LAB.exploit.samples.forEach(function (payload) {
      var code = el("code");
      code.textContent = payload;
      code.title = "Insert this starting point";
      code.onclick = function () {
        document.getElementById("payload").value = payload;
        window.LabProgress.recordHint(LAB.id);
      };
      details.appendChild(code);
    });
    box.appendChild(details);
  }

  var consoleBox = el("div", "console", '<span class="c-info">Runner ready. Form a hypothesis before trying random payloads.</span>');
  consoleBox.id = "console";
  consoleBox.setAttribute("role", "status");
  consoleBox.setAttribute("aria-live", "polite");
  box.appendChild(consoleBox);
  return box;
}

function runExploit() {
  var payload = document.getElementById("payload").value;
  var consoleBox = document.getElementById("console");
  var log = [];
  window.LabProgress.recordAttempt(LAB.id);

  function push(type, message) {
    log.push('<span class="c-' + type + '">' + escHtml(message) + '</span>');
  }
  function render() { consoleBox.innerHTML = log.join("\n"); }
  function finish(result) {
    if (result && result.success) {
      push("ok", "");
      push("ok", "✓ IMPACT PROVED — " + (result.detail || "objective achieved"));
      window.LabProgress.markExploited(LAB.id);
      refreshRail();
    } else {
      push("info", "");
      push("info", "✗ Objective not reached — " + (result && result.detail ? result.detail : "revise the hypothesis"));
    }
    render();
  }

  var result;
  try { result = LAB.exploit.run(payload, push); }
  catch (error) { push("bad", "Runner error: " + error.message); render(); return; }
  if (result && typeof result.then === "function") {
    consoleBox.textContent = "Running in an isolated worker…";
    result.then(finish, function (error) { push("bad", "Runner error: " + (error && error.message || error)); render(); });
  } else finish(result);
}

/* ---------- real HTTP workbench ---------- */
function buildHttpWorkbench() {
  var box = el("section", "http-workbench");
  var goal = el("div", "instruction");
  goal.innerHTML = '<b>Impact objective:</b> ' + escHtml(LAB.http.goal);
  box.appendChild(goal);

  var templateRow = el("div", "request-templates");
  LAB.http.requests.forEach(function (template, index) {
    var button = el("button", "chip" + (index === 0 ? " active" : ""), template.name);
    button.type = "button";
    button.onclick = function () {
      Array.prototype.forEach.call(templateRow.children, function (child) { child.classList.remove("active"); });
      button.classList.add("active");
      applyRequestTemplate(template);
    };
    templateRow.appendChild(button);
  });
  box.appendChild(templateRow);

  var requestLine = el("div", "request-line");
  var method = document.createElement("select");
  method.id = "http-method";
  ["GET", "POST", "PUT", "PATCH", "DELETE"].forEach(function (value) {
    var option = document.createElement("option");
    option.value = value; option.textContent = value; method.appendChild(option);
  });
  var target = document.createElement("input");
  target.id = "http-path";
  target.type = "text";
  target.setAttribute("aria-label", "Request path");
  requestLine.appendChild(method);
  requestLine.appendChild(target);
  box.appendChild(requestLine);

  var labels = el("div", "http-editors");
  labels.innerHTML =
    '<label><span>Headers</span><textarea id="http-headers" spellcheck="false"></textarea></label>' +
    '<label><span>Body</span><textarea id="http-body" spellcheck="false"></textarea></label>';
  box.appendChild(labels);

  var actions = el("div", "actions");
  var send = el("button", "btn primary", "Send request →");
  send.id = "http-send";
  send.type = "button";
  send.onclick = sendHttpRequest;
  var reset = el("button", "btn", "Reset lab state");
  reset.type = "button";
  reset.onclick = resetHttpLab;
  actions.appendChild(send);
  actions.appendChild(reset);
  box.appendChild(actions);

  var response = el("div", "http-response");
  response.id = "http-response";
  response.setAttribute("role", "status");
  response.setAttribute("aria-live", "polite");
  response.innerHTML = '<div class="response-status">No request sent</div><pre>Start from a benign request, observe the response, then change one assumption at a time.</pre>';
  box.appendChild(response);
  applyRequestTemplate(LAB.http.requests[0]);
  return box;
}

function applyRequestTemplate(template) {
  var method = document.getElementById("http-method");
  if (!method) {
    window.setTimeout(function () { applyRequestTemplate(template); }, 0);
    return;
  }
  method.value = template.method || "GET";
  document.getElementById("http-path").value = template.path;
  document.getElementById("http-headers").value = template.headers || "";
  document.getElementById("http-body").value = template.body || "";
  httpRepeat = Math.min(12, Math.max(1, Number(template.repeat) || 1));
  var send = document.getElementById("http-send");
  if (send) send.textContent = httpRepeat > 1 ? "Send concurrent burst ×" + httpRepeat + " →" : "Send request →";
}

function parseHeaderLines(raw) {
  var headers = {};
  raw.split(/\r?\n/).forEach(function (line) {
    if (!line.trim()) return;
    var split = line.indexOf(":");
    if (split <= 0) throw new Error("Invalid header line: " + line);
    var name = line.slice(0, split).trim();
    var value = line.slice(split + 1).trim();
    if (!/^[A-Za-z0-9-]+$/.test(name)) throw new Error("Invalid header name: " + name);
    headers[name] = value;
  });
  return headers;
}

async function sendHttpRequest() {
  var output = document.getElementById("http-response");
  var send = document.getElementById("http-send");
  var pathValue = document.getElementById("http-path").value.trim();
  var method = document.getElementById("http-method").value;
  var bodyValue = document.getElementById("http-body").value;
  var url;
  try {
    url = new URL(pathValue, window.location.origin);
    if (url.origin !== window.location.origin || !url.pathname.startsWith(LAB.http.basePath + "/")) {
      throw new Error("Requests must stay inside this lab's isolated base path: " + LAB.http.basePath + "/");
    }
    var headers = parseHeaderLines(document.getElementById("http-headers").value);
    window.LabProgress.recordAttempt(LAB.id);
    output.innerHTML = '<div class="response-status pending">Sending' + (httpRepeat > 1 ? ' concurrent burst…' : '…') + '</div><pre></pre>';
    if (send) send.disabled = true;

    // Establish the session before a burst. Otherwise concurrent first requests
    // could each receive a new cookie and race against different state objects.
    await fetch(LAB.http.statusPath, { credentials: "same-origin", cache: "no-store" });

    function requestOnce() {
      var options = { method: method, headers: headers, credentials: "same-origin", cache: "no-store" };
      if (method !== "GET" && method !== "DELETE") options.body = bodyValue;
      return fetch(url.pathname + url.search, options).then(async function (response) {
        return { status: response.status, statusText: response.statusText, text: await response.text() };
      });
    }

    var results = await Promise.all(Array.from({ length: httpRepeat }, requestOnce));
    if (results.length === 1) {
      renderHttpResponse(results[0].status, results[0].statusText, results[0].text);
    } else {
      var transcript = results.map(function (result, index) {
        return "#" + (index + 1) + "  " + result.status + " " + result.statusText + "\n" + result.text;
      }).join("\n\n");
      renderHttpResponse("BURST", results.length + " concurrent responses", transcript);
    }
    await checkHttpObjective();
  } catch (error) {
    renderHttpResponse("CLIENT", "ERROR", error.message);
  } finally {
    if (send) send.disabled = false;
  }
}

function renderHttpResponse(status, statusText, bodyText) {
  var output = document.getElementById("http-response");
  output.textContent = "";
  var statusLine = el("div", "response-status " + (status === "BURST" || (Number(status) >= 200 && Number(status) < 400) ? "ok" : "bad"));
  statusLine.textContent = String(status) + " " + statusText;
  var pre = document.createElement("pre");
  pre.textContent = bodyText;
  output.appendChild(statusLine);
  output.appendChild(pre);
}

async function checkHttpObjective() {
  var response = await fetch(LAB.http.statusPath, { credentials: "same-origin", cache: "no-store" });
  if (!response.ok) return;
  var status = await response.json();
  if (status.success) {
    window.LabProgress.markExploited(LAB.id);
    var output = document.getElementById("http-response");
    var banner = el("div", "objective-receipt");
    banner.textContent = "✓ IMPACT PROVED — " + status.evidence;
    output.insertBefore(banner, output.firstChild);
    refreshRail();
  }
}

async function resetHttpLab() {
  var output = document.getElementById("http-response");
  try {
    var response = await fetch(LAB.http.resetPath, { method: "POST", credentials: "same-origin" });
    if (!response.ok) throw new Error("Reset failed with status " + response.status);
    output.innerHTML = '<div class="response-status ok">State reset</div><pre>The isolated lab state is clean.</pre>';
  } catch (error) {
    renderHttpResponse("CLIENT", "ERROR", error.message);
  }
}

/* ---------- remediation ---------- */
function buildRemediation() {
  var saved = loadReasoning();
  var box = el("section", "remediation-panel");
  box.innerHTML =
    '<p>After reviewing the evidence, propose a class-level fix and a regression test. These fields are self-assessed; live patch labs use a deterministic grader.</p>' +
    '<label><span>Patch rationale</span><textarea id="remediation-patch" placeholder="What changes, and which invariant does it enforce?"></textarea></label>' +
    '<label><span>Regression test</span><textarea id="remediation-test" placeholder="Include one blocked attack and one valid behavior that must still work."></textarea></label>';
  box.querySelector("#remediation-patch").value = saved.remediationPatch || saved.fix || "";
  box.querySelector("#remediation-test").value = saved.regressionTest || "";
  var button = el("button", "btn primary", "Save remediation evidence");
  button.type = "button";
  button.onclick = saveRemediation;
  box.appendChild(button);
  var note = el("div", "feedback");
  note.id = "remediation-note";
  note.setAttribute("role", "status");
  box.appendChild(note);
  return box;
}

function saveRemediation() {
  var patch = document.getElementById("remediation-patch").value.trim();
  var test = document.getElementById("remediation-test").value.trim();
  var note = document.getElementById("remediation-note");
  var saved = loadReasoning();
  saved.remediationPatch = patch;
  saved.regressionTest = test;
  saveReasoningData(saved);
  if (patch.length < 30 || test.length < 30) {
    note.className = "feedback no";
    note.textContent = "Saved locally. Add enough detail to explain the enforced invariant and both positive and negative test behavior.";
    return;
  }
  window.LabProgress.markRemediated(LAB.id);
  window.LabProgress.markRegression(LAB.id);
  note.className = "feedback ok";
  note.textContent = "✓ Remediation evidence saved. For live patch labs, the server-side test suite remains the source of truth.";
  refreshRail();
}

function buildNav() {
  var nav = el("nav", "nav-labs");
  var index = window.LABS.indexOf(LAB);
  var previous = window.LABS[index - 1];
  var next = window.LABS[index + 1];
  nav.innerHTML =
    (previous ? '<a href="lab.html?id=' + encodeURIComponent(previous.id) + (challengeMode ? '&mode=challenge' : '') + '">← Previous lab</a>' : '<span></span>') +
    (next ? '<a href="lab.html?id=' + encodeURIComponent(next.id) + (challengeMode ? '&mode=challenge' : '') + '">Next lab →</a>' : '<span></span>');
  return nav;
}

function refreshRail() {
  var old = document.querySelector(".stage-rail");
  if (!old) return;
  old.parentNode.replaceChild(buildStageRail(), old);
}

window.addEventListener("DOMContentLoaded", boot);
