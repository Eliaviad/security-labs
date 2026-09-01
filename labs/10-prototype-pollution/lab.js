registerLab({
  id: "10-prototype-pollution",
  order: 10,
  title: "Prototype pollution via recursive merge",
  difficulty: "hard",
  category: "prototype",
  env: "node",
  mode: "exploit",
  description: "A config loader deep-merges user-supplied JSON into a defaults object.",
  code: [
    "// merges user-supplied JSON options into defaults",
    "function merge(target, source) {",
    "  for (const key in source) {",
    "    if (typeof source[key] === 'object' && source[key] !== null) {",
    "      if (!target[key]) target[key] = {};",
    "      merge(target[key], source[key]);",
    "    } else {",
    "      target[key] = source[key];",
    "    }",
    "  }",
    "  return target;",
    "}",
    "",
    "function loadConfig(userJson) {",
    "  const config = {};",
    "  merge(config, JSON.parse(userJson));",
    "  return config;",
    "}"
  ].join("\n"),
  vulnerableLines: [3, 6, 8],
  hints: [
    "The merge copies every key from attacker JSON. Are there any key names that are 'magic' in JavaScript?",
    "<code>for (key in source)</code> will iterate a <code>__proto__</code> key that JSON.parse created as an own property.",
    "Recursing into <code>target['__proto__']</code> writes onto Object.prototype — every object in the program inherits it."
  ],
  vulnerabilityType: "Prototype Pollution (CWE-1321)",
  explanation:
    "<h4>Why it's vulnerable</h4>" +
    "<p>The merge never filters dangerous keys (<code>__proto__</code>, <code>constructor</code>, <code>prototype</code>). " +
    "<code>JSON.parse('{\"__proto__\": ...}')</code> creates an own property named <code>__proto__</code>. When the recursive merge walks into <code>target['__proto__']</code>, it writes onto the shared <code>Object.prototype</code> — so <em>every</em> object in the process suddenly inherits attacker-controlled properties.</p>" +
    "<h4>Exploit</h4>" +
    "<pre>{ \"__proto__\": { \"isAdmin\": true } }</pre>" +
    "<p>After merge, <code>({}).isAdmin === true</code> everywhere. Depending on downstream code this becomes auth bypass, DoS, or a gadget chain to RCE (e.g. polluting template options, <code>child_process</code> env, or a sink that later evaluates a polluted property).</p>" +
    "<h4 class='badge-impact'>Impact</h4>" +
    "<p>Application-wide logic corruption; a well-known stepping stone to RCE in real Node apps (lodash, jQuery.extend, many config mergers had this).</p>" +
    "<h4 class='badge-fix'>Fix</h4>" +
    "<p>Reject dangerous keys and use safe iteration:</p>" +
    "<pre>for (const key of Object.keys(source)) {\n  if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;\n  // ...merge...\n}</pre>" +
    "<p>Also consider <code>Object.create(null)</code> for maps, <code>Map</code> instead of plain objects, and <code>Object.freeze(Object.prototype)</code> as defense in depth.</p>",
  exploit: {
    goal: "Pollute the object prototype so a BRAND-NEW empty object inherits a property you never set on it (e.g. isAdmin=true). Send JSON.",
    placeholder: '{"__proto__":{"isAdmin":true}}',
    samples: ['{"__proto__":{"isAdmin":true}}', '{"theme":{"color":"red"}}', '{"__proto__":{"polluted":"yes"}}'],
    run: function (payload, log) {
      var parsed;
      try { parsed = JSON.parse(payload); } catch (e) { return { success: false, detail: "Invalid JSON." }; }
      // We reproduce the bug in an ISOLATED prototype so we never touch this page's real Object.prototype.
      var sandboxProto = {};
      var victim = Object.create(sandboxProto);
      (function vulnMerge(target, source, proto) {
        for (var key in source) {
          if (!Object.prototype.hasOwnProperty.call(source, key)) continue;
          var val = source[key];
          if (key === "__proto__" || key === "constructor" || key === "prototype") {
            // the missing guard: writes flow into the object's prototype
            if (val && typeof val === "object") {
              for (var pk in val) { if (Object.prototype.hasOwnProperty.call(val, pk)) proto[pk] = val[pk]; }
            }
            continue;
          }
          if (val && typeof val === "object") {
            if (!target[key]) target[key] = {};
            vulnMerge(target[key], val, proto);
          } else {
            target[key] = val;
          }
        }
      })(victim, parsed, sandboxProto);

      var fresh = Object.create(sandboxProto); // a totally new, empty object
      var leaked = [];
      for (var k in sandboxProto) { leaked.push(k + " = " + JSON.stringify(sandboxProto[k])); }
      log("out", "merged config: " + JSON.stringify(victim));
      log("out", "properties a NEW empty object now inherits: " + (leaked.length ? leaked.join(", ") : "(none)"));
      if (leaked.length) {
        return { success: true, detail: "Prototype polluted — every object now inherits: " + leaked.join(", ") + ". (Isolated sandbox; your browser is unaffected.)" };
      }
      return { success: false, detail: "No prototype pollution. Target the __proto__ (or constructor.prototype) key." };
    }
  }
});
