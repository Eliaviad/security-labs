/* app.js — curriculum catalog, mastery dashboard and challenge-mode titles. */

var STATE = {
  difficulty: "all",
  category: "all",
  track: "all",
  challenge: false
};

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

function pathById(id) {
  return (window.SECURITY_PATHS || []).filter(function (path) { return path.id === id; })[0];
}

function displayTitle(lab) {
  return STATE.challenge ? lab.mysteryTitle : lab.title;
}

function uniqueCats() {
  var seen = [];
  window.LABS.forEach(function (lab) {
    if (seen.indexOf(lab.category) === -1) seen.push(lab.category);
  });
  return seen;
}

function buildFilters() {
  var host = document.getElementById("filters");
  host.textContent = "";
  var diffs = ["all", "easy", "medium", "hard", "expert"];
  var cats = ["all"].concat(uniqueCats());

  var g1 = el("div", "group filter-group");
  g1.setAttribute("aria-label", "Filter by difficulty");
  diffs.forEach(function (difficulty) {
    var label = difficulty === "all" ? "All levels" : difficulty[0].toUpperCase() + difficulty.slice(1);
    var chip = el("button", "chip" + (difficulty === STATE.difficulty ? " active" : ""), label);
    chip.type = "button";
    chip.onclick = function () { setFilter("difficulty", difficulty); };
    g1.appendChild(chip);
  });

  var g2 = el("div", "group filter-group");
  g2.setAttribute("aria-label", "Filter by topic");
  cats.forEach(function (category) {
    var chip = el("button", "chip" + (category === STATE.category ? " active" : ""),
      category === "all" ? "All topics" : escHtml(catLabel(category)));
    chip.type = "button";
    chip.onclick = function () { setFilter("category", category); };
    g2.appendChild(chip);
  });

  host.appendChild(g1);
  host.appendChild(g2);
}

function setFilter(kind, value) {
  STATE[kind] = value;
  buildFilters();
  renderPaths();
  renderLabs();
}

function renderPaths() {
  var host = document.getElementById("path-grid");
  host.textContent = "";
  (window.SECURITY_PATHS || []).forEach(function (pathInfo) {
    var labs = window.LABS.filter(function (lab) { return lab.track === pathInfo.id; });
    if (!labs.length) return;
    var completed = labs.filter(function (lab) { return window.LabProgress.isComplete(lab.id); }).length;
    var button = el("button", "path-card path-" + pathInfo.color + (STATE.track === pathInfo.id ? " active" : ""));
    button.type = "button";
    button.setAttribute("aria-pressed", STATE.track === pathInfo.id ? "true" : "false");
    button.innerHTML =
      '<span class="path-eyebrow">' + escHtml(pathInfo.eyebrow) + '</span>' +
      '<strong>' + escHtml(pathInfo.title) + '</strong>' +
      '<span class="path-description">' + escHtml(pathInfo.description) + '</span>' +
      '<span class="path-progress"><i style="width:' + Math.round((completed / labs.length) * 100) + '%"></i></span>' +
      '<span class="path-count">' + completed + ' / ' + labs.length + ' complete</span>';
    button.onclick = function () {
      STATE.track = STATE.track === pathInfo.id ? "all" : pathInfo.id;
      renderPaths();
      renderLabs();
    };
    host.appendChild(button);
  });
}

function progressLabel(lab, record) {
  if (window.LabProgress.isComplete(lab.id)) return "MASTERED";
  if (record.exploited) return "IMPACT PROVED";
  if (record.identified) return lab.mode === "static" ? "IDENTIFIED" : "READY TO EXPLOIT";
  if (record.hypothesisSubmitted) return "HYPOTHESIS SAVED";
  if (record.opened) return "IN PROGRESS";
  return "NOT STARTED";
}

function renderLabs() {
  var grid = document.getElementById("grid");
  grid.textContent = "";
  var list = window.LABS.filter(function (lab) {
    return (STATE.difficulty === "all" || lab.difficulty === STATE.difficulty) &&
      (STATE.category === "all" || lab.category === STATE.category) &&
      (STATE.track === "all" || lab.track === STATE.track);
  });

  if (!list.length) grid.appendChild(el("div", "empty", "No labs match these filters."));

  list.forEach(function (lab) {
    var record = window.LabProgress.get(lab.id);
    var complete = window.LabProgress.isComplete(lab.id);
    var a = el("a", "card" + (complete ? " solved" : "") + (record.opened ? " started" : ""));
    a.href = "lab.html?id=" + encodeURIComponent(lab.id) + (STATE.challenge ? "&mode=challenge" : "");
    var pathInfo = pathById(lab.track);
    var modeLabel = lab.mode === "http" ? "live HTTP" : (lab.mode === "exploit" ? "payload" : (lab.safe ? "secure review" : "code review"));
    a.innerHTML =
      '<div class="card-topline"><span class="num">LAB ' + String(lab.order).padStart(2, "0") + '</span>' +
      '<span class="card-state ' + (complete ? "complete" : "") + '">' + progressLabel(lab, record) + '</span></div>' +
      '<h3>' + escHtml(displayTitle(lab)) + '</h3>' +
      '<p>' + escHtml(STATE.challenge ? "Investigate the implementation and prove your conclusion." : lab.description) + '</p>' +
      '<div class="skill-row">' + (lab.skills || []).slice(0, 3).map(function (skill) {
        return '<span>' + escHtml(skill) + '</span>';
      }).join("") + '</div>' +
      '<div class="card-meta"><span>' + escHtml(pathInfo ? pathInfo.title : lab.track) + '</span><span>' + lab.estimatedTime + ' min</span></div>' +
      '<div class="tags">' +
        '<span class="tag diff-' + lab.difficulty + '">' + lab.difficulty + '</span>' +
        (STATE.challenge ? "" : '<span class="tag">' + escHtml(catLabel(lab.category)) + '</span>') +
        '<span class="tag ' + (lab.mode === "http" ? "mode-live" : (lab.mode === "exploit" ? "mode-exploit" : "")) + '">' + modeLabel + '</span>' +
      '</div>';
    grid.appendChild(a);
  });

  renderSummary();
  renderContinue();
}

function renderSummary() {
  var summary = window.LabProgress.summary();
  var host = document.getElementById("mastery-summary");
  host.innerHTML =
    '<span><b>' + summary.complete + '</b> mastered</span>' +
    '<span><b>' + summary.exploited + '</b> impacts proved</span>' +
    '<span><b>' + summary.withoutHints + '</b> without hints</span>';
}

function renderContinue() {
  var host = document.getElementById("continue-panel");
  var next = window.LABS.filter(function (lab) { return !window.LabProgress.isComplete(lab.id); })[0];
  if (!next) {
    host.innerHTML = '<div><span class="section-eyebrow">CURRICULUM COMPLETE</span><h2>Every current lab is mastered</h2><p>Revisit a lab in Challenge mode or wait for the next research track.</p></div>';
    return;
  }
  var record = window.LabProgress.get(next.id);
  var pathInfo = pathById(next.track);
  host.innerHTML =
    '<div><span class="section-eyebrow">' + (record.opened ? "CONTINUE RESEARCH" : "RECOMMENDED NEXT") + '</span>' +
    '<h2>' + escHtml(displayTitle(next)) + '</h2>' +
    '<p>' + escHtml(pathInfo ? pathInfo.title : next.track) + ' · ' + next.estimatedTime + ' min · ' + progressLabel(next, record).toLowerCase() + '</p></div>' +
    '<a class="btn primary" href="lab.html?id=' + encodeURIComponent(next.id) + (STATE.challenge ? '&mode=challenge' : '') + '">' +
      (record.opened ? "Continue lab →" : "Start lab →") + '</a>';
}

window.addEventListener("DOMContentLoaded", function () {
  window.loadAllLabs(function () {
    STATE.challenge = window.LabProgress.getPreference("challengeMode") === true;
    var toggle = document.getElementById("challenge-mode");
    toggle.checked = STATE.challenge;
    toggle.onchange = function () {
      STATE.challenge = toggle.checked;
      window.LabProgress.setPreference("challengeMode", STATE.challenge);
      renderPaths();
      renderLabs();
    };
    buildFilters();
    renderPaths();
    renderLabs();
  });
});
