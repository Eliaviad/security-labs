/* ============================================================
   core.js — shared lab registry, loader, code highlighter,
   and progress tracking. Works over file:// (no fetch()).
   ============================================================ */

window.LABS = window.LABS || [];

var DEFAULT_TRACK_BY_CATEGORY = {
  xss: "web-browser", cors: "web-browser", redirect: "web-browser",
  injection: "web-injection", validation: "web-foundations", secrets: "web-foundations",
  auth: "web-auth", path: "web-server", ssrf: "web-server", prototype: "web-server",
  logic: "web-logic", dos: "web-logic"
};

function difficultyLevel(difficulty) {
  return ({ easy: 1, medium: 2, hard: 3, expert: 4 })[difficulty] || 1;
}

/* Each lab file calls registerLab({...}) */
window.registerLab = function (lab) {
  var curriculum = (window.LAB_CURRICULUM || {})[lab.id] || {};
  lab.track = lab.track || curriculum.track || DEFAULT_TRACK_BY_CATEGORY[lab.category] || "web-foundations";
  lab.mysteryTitle = lab.mysteryTitle || curriculum.mysteryTitle || "Code review challenge";
  lab.skills = lab.skills || curriculum.skills || [lab.category];
  lab.estimatedTime = lab.estimatedTime || curriculum.estimatedTime || (difficultyLevel(lab.difficulty) * 10);
  lab.level = lab.level || difficultyLevel(lab.difficulty);
  window.LABS.push(lab);
};

/* Dynamically injects every lab script listed in labs/manifest.js
   (window.LAB_FILES). Script injection works on file://, fetch does not. */
window.loadAllLabs = function (done) {
  var files = window.LAB_FILES || [];
  if (!files.length) { done(); return; }
  var remaining = files.length;
  files.forEach(function (src) {
    var s = document.createElement("script");
    s.src = src;
    s.onload = s.onerror = function () {
      remaining--;
      if (remaining === 0) {
        window.LABS.sort(function (a, b) { return a.order - b.order; });
        done();
      }
    };
    document.head.appendChild(s);
  });
};

/* ---------- mastery progress (versioned + localStorage fallback) ---------- */
var Progress = (function () {
  var KEY = "seclabs.progress.v2";
  var LEGACY_KEY = "seclabs.solved";
  var mem = { version: 2, labs: {}, preferences: { challengeMode: false } };

  function freshRecord() {
    return {
      opened: false,
      buildCompleted: false,
      hypothesisSubmitted: false,
      identified: false,
      exploited: false,
      remediated: false,
      regressionPassed: false,
      reportSubmitted: false,
      revealed: false,
      hintsUsed: 0,
      attempts: 0,
      updatedAt: null
    };
  }

  function normalize(raw) {
    if (!raw || raw.version !== 2 || !raw.labs) return null;
    raw.preferences = raw.preferences || { challengeMode: false };
    return raw;
  }

  function load() {
    try {
      var raw = window.localStorage.getItem(KEY);
      var parsed = raw ? normalize(JSON.parse(raw)) : null;
      if (parsed) { mem = parsed; return; }

      var legacyRaw = window.localStorage.getItem(LEGACY_KEY);
      var legacy = legacyRaw ? JSON.parse(legacyRaw) : {};
      Object.keys(legacy).forEach(function (id) {
        if (!legacy[id]) return;
        var record = freshRecord();
        record.opened = true;
        record.identified = true;
        record.updatedAt = new Date().toISOString();
        mem.labs[id] = record;
      });
    } catch (e) { /* file:// may block storage; fall back to memory */ }
  }
  function save() {
    try { window.localStorage.setItem(KEY, JSON.stringify(mem)); } catch (e) {}
  }
  load();
  function get(id) {
    if (!mem.labs[id]) mem.labs[id] = freshRecord();
    return mem.labs[id];
  }

  function update(id, patch) {
    var record = get(id);
    Object.keys(patch).forEach(function (key) { record[key] = patch[key]; });
    record.updatedAt = new Date().toISOString();
    save();
    return record;
  }

  function labFor(id) {
    return (window.LABS || []).filter(function (lab) { return lab.id === id; })[0];
  }

  function isComplete(id) {
    var record = get(id);
    var lab = labFor(id);
    if (!lab) return !!record.identified;
    if (lab.mode === "exploit" || lab.mode === "http") return !!(record.identified && record.exploited);
    return !!record.identified;
  }

  return {
    get: function (id) { return Object.assign({}, get(id)); },
    update: update,
    markOpened: function (id) { return update(id, { opened: true }); },
    markBuilt: function (id) { return update(id, { buildCompleted: true }); },
    markHypothesis: function (id) { return update(id, { hypothesisSubmitted: true }); },
    markIdentified: function (id) { return update(id, { identified: true }); },
    markExploited: function (id) { return update(id, { exploited: true }); },
    markRemediated: function (id) { return update(id, { remediated: true }); },
    markRegression: function (id) { return update(id, { regressionPassed: true }); },
    markReport: function (id) { return update(id, { reportSubmitted: true }); },
    markRevealed: function (id) { return update(id, { revealed: true }); },
    recordHint: function (id) { var r = get(id); return update(id, { hintsUsed: r.hintsUsed + 1 }); },
    recordAttempt: function (id) { var r = get(id); return update(id, { attempts: r.attempts + 1 }); },
    isSolved: isComplete,
    isComplete: isComplete,
    markSolved: function (id) { return update(id, { identified: true }); },
    count: function () {
      return (window.LABS || []).filter(function (lab) { return isComplete(lab.id); }).length;
    },
    summary: function () {
      var labs = window.LABS || [];
      return {
        total: labs.length,
        complete: labs.filter(function (lab) { return isComplete(lab.id); }).length,
        opened: labs.filter(function (lab) { return get(lab.id).opened; }).length,
        exploited: labs.filter(function (lab) { return get(lab.id).exploited; }).length,
        withoutHints: labs.filter(function (lab) { var r = get(lab.id); return isComplete(lab.id) && r.hintsUsed === 0; }).length
      };
    },
    getPreference: function (key) { return mem.preferences[key]; },
    setPreference: function (key, value) { mem.preferences[key] = value; save(); }
  };
})();
window.LabProgress = Progress;

/* ---------- helpers ---------- */
function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
window.escHtml = esc;

/* ------------------------------------------------------------------
   Syntax highlighter.

   IMPORTANT: this is a SINGLE-PASS tokenizer, not a chain of regex
   replacements. An earlier version escaped the line and then ran
   successive .replace() passes for comments, strings and keywords.
   Each pass re-scanned the markup produced by the previous one, so
   the `class` attribute of an injected <span class="tok-str"> was
   itself matched by the keyword pass (`class` is a JS keyword) and
   rewritten into <span class="tok-kw">class</span> — leaking raw
   markup like `class="tok-str">` into the rendered code. Likewise a
   URL inside a string ('https://cdn...') was turned into a comment
   because the comment pass ran before the string pass.

   Tokenizing once and escaping each token's text independently makes
   both bugs structurally impossible: the tokens exactly partition the
   source line, so the rendered text is always byte-identical to the
   original source.
   ------------------------------------------------------------------ */
var KEYWORDS = ("const|let|var|function|return|if|else|for|while|do|switch|case|" +
  "default|break|continue|new|await|async|yield|try|catch|finally|throw|typeof|" +
  "instanceof|require|module|exports|class|extends|super|this|import|from|export|" +
  "null|undefined|true|false|of|in|delete|void").split("|");

/* Contexts after which a `/` starts a regex literal rather than division. */
var REGEX_OK_PUNCT = "(,=:[!&|?{};+-*%~^<>".split("");
var REGEX_OK_WORDS = ["return", "typeof", "instanceof", "case", "in", "of", "new",
  "delete", "void", "do", "else", "yield", "await"];

function regexAllowed(prev) {
  if (prev === null) return true;                       // start of line
  if (REGEX_OK_PUNCT.indexOf(prev) !== -1) return true; // after an operator
  return REGEX_OK_WORDS.indexOf(prev) !== -1;           // after a keyword
}

/* Reads a complete regex literal starting at src[i] === "/".
   Returns the literal (incl. flags) or null if it doesn't terminate. */
function readRegexLiteral(src, i) {
  var j = i + 1, inClass = false;
  while (j < src.length) {
    var c = src[j];
    if (c === "\\") { j += 2; continue; }
    if (c === "[") inClass = true;
    else if (c === "]") inClass = false;
    else if (c === "/" && !inClass) {
      j++;
      while (j < src.length && /[gimsuyd]/.test(src[j])) j++;
      return src.slice(i, j);
    }
    j++;
  }
  return null; // unterminated on this line -> treat as an operator
}

/* Splits one line into {text, cls} tokens covering every character. */
function tokenizeLine(src) {
  var toks = [], i = 0, n = src.length, prev = null;
  function push(text, cls) { if (text) toks.push({ text: text, cls: cls || null }); }

  while (i < n) {
    var ch = src.charAt(i);

    // whitespace (does not change the `prev` context)
    if (ch === " " || ch === "\t") {
      var w = i;
      while (w < n && (src.charAt(w) === " " || src.charAt(w) === "\t")) w++;
      push(src.slice(i, w)); i = w; continue;
    }

    // line comment -> rest of the line
    if (ch === "/" && src.charAt(i + 1) === "/") {
      push(src.slice(i), "tok-com"); i = n; continue;
    }

    // block comment (single line)
    if (ch === "/" && src.charAt(i + 1) === "*") {
      var end = src.indexOf("*/", i + 2);
      var stop = end === -1 ? n : end + 2;
      push(src.slice(i, stop), "tok-com"); i = stop; continue;
    }

    // string literal: '...', "...", `...`
    if (ch === "'" || ch === '"' || ch === "`") {
      var j = i + 1;
      while (j < n) {
        if (src.charAt(j) === "\\") { j += 2; continue; }
        if (src.charAt(j) === ch) { j++; break; }
        j++;
      }
      if (j > n) j = n;
      push(src.slice(i, j), "tok-str"); i = j; prev = "value"; continue;
    }

    // regex literal
    if (ch === "/" && regexAllowed(prev)) {
      var re = readRegexLiteral(src, i);
      if (re) { push(re, "tok-str"); i += re.length; prev = "value"; continue; }
    }

    // number
    if (/[0-9]/.test(ch) || (ch === "." && /[0-9]/.test(src.charAt(i + 1)))) {
      var num = /^(?:0[xXbBoO][0-9a-fA-F_]+|\.?\d[\d_]*(?:\.\d+)?(?:[eE][+-]?\d+)?)/
        .exec(src.slice(i))[0];
      push(num, "tok-num"); i += num.length; prev = "value"; continue;
    }

    // identifier / keyword
    if (/[A-Za-z_$]/.test(ch)) {
      var word = /^[A-Za-z0-9_$]+/.exec(src.slice(i))[0];
      if (KEYWORDS.indexOf(word) !== -1) {
        push(word, "tok-kw"); prev = word;
      } else {
        push(word, /^\s*\(/.test(src.slice(i + word.length)) ? "tok-fn" : null);
        prev = "value";
      }
      i += word.length; continue;
    }

    // punctuation / operator
    push(ch); prev = ch; i++;
  }
  return toks;
}

function highlightLine(raw) {
  var toks = tokenizeLine(String(raw));
  var out = "";
  for (var i = 0; i < toks.length; i++) {
    var t = toks[i];
    out += t.cls ? '<span class="' + t.cls + '">' + esc(t.text) + "</span>" : esc(t.text);
  }
  return out;
}
window.highlightLine = highlightLine;
window.tokenizeLine = tokenizeLine;

function el(tag, cls, html) {
  var e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
}
window.el = el;
