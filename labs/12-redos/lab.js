registerLab({
  id: "12-redos",
  order: 12,
  title: "ReDoS — catastrophic regex backtracking",
  difficulty: "hard",
  category: "dos",
  env: "node",
  mode: "exploit",
  description: "A validator checks that input is a comma-separated tag list using a regular expression.",
  code: [
    "// Validates a comma-separated tag list like 'red,green,blue'",
    "function validateTags(input) {",
    "  const pattern = /^(\\w+,?)+$/;",
    "  return pattern.test(input);",
    "}"
  ].join("\n"),
  vulnerableLines: [3],
  hints: [
    "The regex looks innocent, but think about how the engine backtracks when the string ALMOST matches.",
    "<code>(\\w+,?)+</code> has nested/overlapping quantifiers — many ways to split the same characters.",
    "An input of many word-chars ending in one non-matching char forces exponential backtracking: ReDoS."
  ],
  vulnerabilityType: "Regular Expression Denial of Service (ReDoS, CWE-1333)",
  explanation:
    "<h4>Why it's vulnerable</h4>" +
    "<p><code>/^(\\w+,?)+$/</code> is 'evil': the inner <code>\\w+</code> inside an outer <code>+</code> means the same run of word characters can be partitioned in exponentially many ways. " +
    "When the string almost matches but fails at the end (e.g. a trailing <code>!</code>), the backtracking engine tries all those partitions before giving up — time grows like <code>2^n</code> in the input length.</p>" +
    "<h4>Exploit</h4>" +
    "<p>Send a long run of word characters followed by a non-word character:</p>" +
    "<pre>\"aaaaaaaaaaaaaaaaaaaaaaaaaaaaa!\"</pre>" +
    "<p>A single request can pin a CPU core for seconds to minutes. Node is single-threaded, so the whole event loop stalls — one request DoSes every user.</p>" +
    "<h4 class='badge-impact'>Impact</h4>" +
    "<p>Denial of service from a tiny payload, no auth required. Common in input validators, log parsers, and user-agent/URL matching.</p>" +
    "<h4 class='badge-fix'>Fix</h4>" +
    "<p>Rewrite without nested quantifiers, e.g. a linear pattern:</p>" +
    "<pre>const pattern = /^\\w+(,\\w+)*$/;   // no overlapping quantifiers</pre>" +
    "<p>Also cap input length, use a non-backtracking engine (RE2), and lint patterns with a ReDoS checker. Validate structure by <code>split(',')</code> + per-item check instead of one clever regex.</p>",
  exploit: {
    goal: "Cause catastrophic backtracking: make validateTags() take a long time (>50ms) with a short input.",
    placeholder: "e.g. aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa!",
    samples: ["aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa!", "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa!", "red,green,blue"],
    // The real evil regex is run in an ISOLATED Web Worker with a hard budget,
    // so a catastrophic input can never freeze the learner's tab and the verdict
    // is deterministic: "did the worker finish within the budget?" — not a
    // main-thread stopwatch. Returns a Promise; the engine awaits it.
    run: function (payload, log) {
      var BUDGET_MS = 750;   // worker time budget: exceed it => catastrophic
      var LEN_CAP = 80;      // generous; the point is the worker never blocks the UI
      if (payload.length > LEN_CAP) {
        return { success: false, detail: "Keep it to " + LEN_CAP + " chars or fewer for this demo. ~28–34 chars is plenty to blow the budget." };
      }

      function workerAttempt() {
        return new Promise(function (resolve, reject) {
          var src =
            "onmessage=function(e){" +
            "var re=/^(\\w+,?)+$/;" +          // the actual vulnerable pattern, run off the UI thread
            "var t0=Date.now();var m=false;try{m=re.test(e.data)}catch(_){}" +
            "postMessage({ms:Date.now()-t0,matched:m});}";
          var url, w;
          try {
            url = URL.createObjectURL(new Blob([src], { type: "application/javascript" }));
            w = new Worker(url);
          } catch (err) { reject(err); return; }
          var done = false;
          var timer = setTimeout(function () {
            if (done) return; done = true;
            try { w.terminate(); } catch (_) {}
            log("out", "input length: " + payload.length + " chars");
            log("out", "the isolated worker did not finish within " + BUDGET_MS + " ms — terminated (UI stayed responsive)");
            resolve({ success: true, detail: "Catastrophic backtracking: the regex blew the " + BUDGET_MS + " ms budget in an isolated thread. Add one more 'a' and the work roughly doubles." });
          }, BUDGET_MS);
          w.onmessage = function (e) {
            if (done) return; done = true;
            clearTimeout(timer); try { w.terminate(); } catch (_) {}
            log("out", "input length: " + payload.length + " chars, matched: " + e.data.matched);
            log("out", "regex finished in " + e.data.ms + " ms (well under the " + BUDGET_MS + " ms budget)");
            resolve({ success: false, detail: "Completed in " + e.data.ms + " ms — not catastrophic yet. Use a longer run of word chars ending in a non-word char (many a's, then '!')." });
          };
          w.onerror = function (err) { if (done) return; done = true; clearTimeout(timer); reject(err); };
          w.postMessage(payload);   // hand the input to the isolated thread
        });
      }

      // Fallback for environments where Workers are unavailable: run bounded on
      // the main thread with a tight length cap so it still can't hang for long.
      function fallback() {
        var CAP = 26, now = (typeof performance !== "undefined" ? performance : Date);
        if (payload.length > CAP) {
          return { success: true, detail: "Workers are unavailable here, so grading falls back to a bounded check; a " + payload.length + "-char pathological input would backtrack catastrophically." };
        }
        var t0 = now.now(); /^(\w+,?)+$/.test(payload); var dt = now.now() - t0;
        log("out", "(fallback, no worker) pattern.test ran in " + dt.toFixed(1) + " ms");
        return dt > 50
          ? { success: true, detail: "Catastrophic backtracking (" + dt.toFixed(0) + " ms)." }
          : { success: false, detail: "Still fast (" + dt.toFixed(1) + " ms). Longer run of word chars then a non-word char." };
      }

      return workerAttempt().catch(function () { return fallback(); });
    }
  }
});
