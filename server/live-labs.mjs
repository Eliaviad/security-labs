const INTERNAL_SECRET = "LAB-IAM-CREDENTIAL-7F31";

function route(method, subpath, expectedMethod, pattern) {
  if (method !== expectedMethod) return null;
  return subpath.match(pattern);
}
function activeHtml(value) {
  if (typeof value !== "string") return false;
  return /<(?:img|svg|body|input|details|video|audio)\b[^>]*\bon(?:error|load|toggle|focus)\s*=/i.test(value) ||
    /<a\b[^>]*href\s*=\s*["']?javascript:/i.test(value);
}

function safeFilename(name) {
  return typeof name === "string" && /^[A-Za-z0-9._-]{1,80}$/.test(name) && name !== "." && name !== "..";
}

export const liveLabs = {
  "25-stored-xss": {
    createState() { return { comments: [], success: false, evidence: "" }; },
    async handle(ctx) {
      if (route(ctx.method, ctx.subpath, "POST", /^\/comments$/)) {
        const input = await ctx.readJson();
        if (typeof input.content !== "string" || input.content.length < 1 || input.content.length > 2000) {
          return ctx.json(400, { error: "content must be a string between 1 and 2000 characters" });
        }
        ctx.state.comments.push({ id: ctx.state.comments.length + 1, author: "student", content: input.content });
        return ctx.json(201, { stored: true, id: ctx.state.comments.length });
      }
      if (route(ctx.method, ctx.subpath, "GET", /^\/comments$/)) {
        return ctx.json(200, { comments: ctx.state.comments });
      }
      if (route(ctx.method, ctx.subpath, "POST", /^\/victim\/visit$/)) {
        const executable = ctx.state.comments.find((comment) => activeHtml(comment.content));
        if (executable) {
          ctx.state.success = true;
          ctx.state.evidence = `victim renderer encountered an executable event-handler payload in comment ${executable.id}`;
          return ctx.json(200, { visited: true, securityEvent: "script-capable markup reached innerHTML" });
        }
        return ctx.json(200, { visited: true, securityEvent: null, note: "No browser-executable event handler was present. Script tags inserted through innerHTML do not execute by themselves." });
      }
      return ctx.json(404, { error: "unknown stored-XSS lab route" });
    }
  },

  "26-reset-poisoning": {
    createState() { return { outbox: [], success: false, evidence: "" }; },
    async handle(ctx) {
      if (route(ctx.method, ctx.subpath, "POST", /^\/request$/)) {
        const input = await ctx.readJson();
        if (typeof input.email !== "string" || !/^[^@\s]+@[^@\s]+$/.test(input.email)) {
          return ctx.json(400, { error: "valid email required" });
        }
        const forwarded = String(ctx.headers["x-forwarded-host"] || "").trim();
        const host = forwarded || "lab.local";
        if (!/^[A-Za-z0-9.-]+(?::\d{1,5})?$/.test(host)) return ctx.json(400, { error: "invalid forwarded host" });
        const token = `reset-${ctx.state.outbox.length + 1}-mock`;
        const link = `https://${host}/reset?token=${token}`;
        ctx.state.outbox.push({ email: input.email, link });
        if (input.email === "alice@lab.local" && host !== "lab.local") {
          ctx.state.success = true;
          ctx.state.evidence = `reset link for alice was generated on attacker-controlled host ${host}`;
        }
        return ctx.json(202, { message: "If the account exists, a reset email was sent." });
      }
      if (route(ctx.method, ctx.subpath, "GET", /^\/outbox$/)) {
        const email = ctx.url.searchParams.get("email");
        return ctx.json(200, { messages: ctx.state.outbox.filter((message) => !email || message.email === email) });
      }
      return ctx.json(404, { error: "unknown password-reset lab route" });
    }
  },

  "27-live-bola": {
    createState() {
      return {
        invoices: [
          { id: "inv-100", ownerId: "alice", total: 120, memo: "Alice consulting" },
          { id: "inv-200", ownerId: "bob", total: 980, memo: "Bob private project" }
        ],
        success: false,
        evidence: ""
      };
    },
    async handle(ctx) {
      const match = route(ctx.method, ctx.subpath, "GET", /^\/invoices\/([A-Za-z0-9-]+)$/);
      if (!match) return ctx.json(404, { error: "unknown invoice route" });
      const user = String(ctx.headers["x-lab-user"] || "");
      if (!user) return ctx.json(401, { error: "X-Lab-User is required in this training environment" });
      const invoice = ctx.state.invoices.find((item) => item.id === match[1]);
      if (!invoice) return ctx.json(404, { error: "not found" });
      if (user === "alice" && invoice.ownerId === "bob") {
        ctx.state.success = true;
        ctx.state.evidence = "alice retrieved bob's invoice because the lookup used only the object id";
      }
      return ctx.json(200, invoice);
    }
  },

  "28-mime-upload": {
    createState() { return { files: new Map(), success: false, evidence: "" }; },
    async handle(ctx) {
      if (route(ctx.method, ctx.subpath, "POST", /^\/upload$/)) {
        const filename = ctx.url.searchParams.get("filename") || "";
        if (!safeFilename(filename)) return ctx.json(400, { error: "filename must use letters, digits, dot, underscore or dash" });
        const contentType = String(ctx.headers["content-type"] || "application/octet-stream").split(";")[0].trim().toLowerCase();
        if (!contentType.startsWith("image/")) return ctx.json(415, { error: "images only" });
        const content = await ctx.readText();
        ctx.state.files.set(filename, { content, declaredType: contentType });
        return ctx.json(201, { stored: `/lab-api/28-mime-upload/files/${filename}` });
      }
      const match = route(ctx.method, ctx.subpath, "GET", /^\/files\/([A-Za-z0-9._-]+)$/);
      if (match) {
        const file = ctx.state.files.get(match[1]);
        if (!file) return ctx.json(404, { error: "file not found" });
        const extension = match[1].split(".").pop().toLowerCase();
        const servedType = extension === "html" || extension === "htm" ? "text/html" : file.declaredType;
        if (servedType === "text/html" && activeHtml(file.content)) {
          ctx.state.success = true;
          ctx.state.evidence = `file ${match[1]} passed an image MIME check but was served as active HTML`;
        }
        return ctx.raw(200, file.content, {
          "Content-Type": `${servedType}; charset=utf-8`,
          "Content-Security-Policy": "default-src 'none'; sandbox",
          "X-Content-Type-Options": "nosniff"
        });
      }
      return ctx.json(404, { error: "unknown upload lab route" });
    }
  },

  "29-live-ssrf": {
    createState() { return { success: false, evidence: "" }; },
    async handle(ctx) {
      if (!route(ctx.method, ctx.subpath, "POST", /^\/preview$/)) return ctx.json(404, { error: "unknown preview route" });
      const input = await ctx.readJson();
      let target;
      try { target = new URL(input.url); }
      catch { return ctx.json(400, { error: "invalid URL" }); }
      if (target.protocol !== "http:" && target.protocol !== "https:") return ctx.json(400, { error: "http/https only" });
      const blocked = ["127.0.0.1", "localhost", "169.254.169.254"];
      if (blocked.includes(target.hostname)) return ctx.json(403, { error: "blocked host" });

      const internalHosts = new Set(["0.0.0.0", "[::1]", "metadata.internal"]);
      if (internalHosts.has(target.hostname)) {
        ctx.state.success = true;
        ctx.state.evidence = `server fetched the internal metadata mock through hostname ${target.hostname}`;
        return ctx.json(200, { title: "instance metadata", credential: INTERNAL_SECRET });
      }
      return ctx.json(200, { title: "public preview", host: target.hostname });
    }
  },

  "30-live-ssti": {
    createState() { return { success: false, evidence: "" }; },
    async handle(ctx) {
      if (!route(ctx.method, ctx.subpath, "POST", /^\/preview$/)) return ctx.json(404, { error: "unknown template route" });
      const input = await ctx.readJson();
      if (typeof input.template !== "string" || input.template.length > 2000) return ctx.json(400, { error: "template string required" });
      let rendered = input.template.replace(/\{\{\s*name\s*\}\}/g, "Researcher");
      rendered = rendered.replace(/\{\{\s*7\s*\*\s*7\s*\}\}/g, "49");
      if (/\{\{\s*env\.LAB_SECRET\s*\}\}/.test(rendered)) {
        rendered = rendered.replace(/\{\{\s*env\.LAB_SECRET\s*\}\}/g, "SSTI-SERVER-SECRET-92A");
        ctx.state.success = true;
        ctx.state.evidence = "attacker-controlled template expression read a server-only environment value";
      }
      return ctx.json(200, { rendered });
    }
  },

  "31-oauth-linking": {
    createState() { return { links: { alice: null }, success: false, evidence: "" }; },
    async handle(ctx) {
      if (route(ctx.method, ctx.subpath, "GET", /^\/link\/start$/)) {
        const user = String(ctx.headers["x-lab-user"] || "");
        if (user !== "alice") return ctx.json(401, { error: "use X-Lab-User: alice" });
        return ctx.json(200, { authorizationUrl: "/mock-idp/authorize?client_id=shop&redirect_uri=/lab-api/31-oauth-linking/link/callback" });
      }
      if (route(ctx.method, ctx.subpath, "GET", /^\/link\/callback$/)) {
        const user = String(ctx.headers["x-lab-user"] || "");
        const code = ctx.url.searchParams.get("code");
        if (user !== "alice") return ctx.json(401, { error: "use X-Lab-User: alice" });
        const identities = { "alice-code": "alice@example.test", "attacker-code": "attacker@example.test" };
        if (!identities[code]) return ctx.json(400, { error: "invalid mock authorization code" });
        ctx.state.links.alice = identities[code];
        if (code === "attacker-code") {
          ctx.state.success = true;
          ctx.state.evidence = "an authorization code not initiated by alice linked the attacker's identity to alice's account";
        }
        return ctx.json(200, { linkedUser: "alice", oauthIdentity: identities[code] });
      }
      return ctx.json(404, { error: "unknown OAuth lab route" });
    }
  },

  "32-excessive-data": {
    createState() { return { success: false, evidence: "" }; },
    async handle(ctx) {
      if (!route(ctx.method, ctx.subpath, "GET", /^\/profile$/)) return ctx.json(404, { error: "unknown profile route" });
      const user = String(ctx.headers["x-lab-user"] || "");
      if (user !== "alice") return ctx.json(401, { error: "use X-Lab-User: alice" });
      const record = {
        id: "usr-100", name: "Alice", email: "alice@lab.local",
        passwordHash: "$2b$12$training-only-hash", resetToken: "reset-live-8842", internalRole: "billing-reviewer"
      };
      ctx.state.success = true;
      ctx.state.evidence = "profile API returned passwordHash, resetToken and internalRole fields that the UI does not need";
      return ctx.json(200, record);
    }
  },

  "33-live-race": {
    createState() { return { used: false, credits: 0, success: false, evidence: "" }; },
    async handle(ctx) {
      if (!route(ctx.method, ctx.subpath, "POST", /^\/redeem$/)) return ctx.json(404, { error: "unknown redeem route" });
      const input = await ctx.readJson();
      if (input.code !== "SAVE50") return ctx.json(400, { error: "invalid coupon" });
      if (ctx.state.used) return ctx.json(409, { error: "already used", credits: ctx.state.credits });
      await ctx.delay(45);
      ctx.state.credits += 50;
      ctx.state.used = true;
      if (ctx.state.credits > 50) {
        ctx.state.success = true;
        ctx.state.evidence = `concurrent requests credited $${ctx.state.credits} from one single-use coupon`;
      }
      return ctx.json(200, { credited: 50, totalCredits: ctx.state.credits });
    }
  },

  "34-safe-ownership": {
    createState() {
      return {
        invoices: [
          { id: "inv-100", ownerId: "alice", total: 120 },
          { id: "inv-200", ownerId: "bob", total: 980 }
        ],
        allowedOwn: false,
        deniedOther: false,
        success: false,
        evidence: ""
      };
    },
    async handle(ctx) {
      const match = route(ctx.method, ctx.subpath, "GET", /^\/invoices\/([A-Za-z0-9-]+)$/);
      if (!match) return ctx.json(404, { error: "unknown invoice route" });
      const user = String(ctx.headers["x-lab-user"] || "");
      if (!user) return ctx.json(401, { error: "X-Lab-User required" });
      const invoice = ctx.state.invoices.find((item) => item.id === match[1] && item.ownerId === user);
      if (!invoice) {
        if (user === "alice" && match[1] === "inv-200") ctx.state.deniedOther = true;
        if (ctx.state.allowedOwn && ctx.state.deniedOther) {
          ctx.state.success = true;
          ctx.state.evidence = "alice could fetch her own invoice while bob's invoice remained indistinguishable from a missing object";
        }
        return ctx.json(404, { error: "not found" });
      }
      if (user === "alice" && invoice.id === "inv-100") ctx.state.allowedOwn = true;
      if (ctx.state.allowedOwn && ctx.state.deniedOther) {
        ctx.state.success = true;
        ctx.state.evidence = "alice could fetch her own invoice while bob's invoice remained indistinguishable from a missing object";
      }
      return ctx.json(200, invoice);
    }
  },

  "36-live-reward-replay": {
    createState() {
      return {
        rewards: { "daily-2026-09-05": 100 },
        balances: { alice: 0, bob: 0 },
        claims: [],
        success: false,
        evidence: ""
      };
    },
    async handle(ctx) {
      if (!route(ctx.method, ctx.subpath, "POST", /^\/claim$/)) {
        return ctx.json(404, { error: "unknown reward route" });
      }
      const user = String(ctx.headers["x-lab-user"] || "");
      if (!Object.hasOwn(ctx.state.balances, user)) {
        return ctx.json(401, { error: "use a valid X-Lab-User" });
      }
      const input = await ctx.readJson();
      const amount = ctx.state.rewards[input.rewardId];
      if (!amount) return ctx.json(404, { error: "unknown reward" });
      ctx.state.balances[user] += amount;
      ctx.state.claims.push({ playerId: user, rewardId: input.rewardId });
      const duplicates = ctx.state.claims.filter((claim) => claim.playerId === user && claim.rewardId === input.rewardId).length;
      if (duplicates > 1) {
        ctx.state.success = true;
        ctx.state.evidence = `${user} claimed ${input.rewardId} ${duplicates} times and reached ${ctx.state.balances[user]} credits`;
      }
      return ctx.json(200, { credited: amount, balance: ctx.state.balances[user], claimCount: duplicates });
    }
  },

  "37-live-wallet-race": {
    createState() {
      return { balances: { alice: 100, bob: 0 }, transfers: [], success: false, evidence: "" };
    },
    async handle(ctx) {
      if (!route(ctx.method, ctx.subpath, "POST", /^\/transfer$/)) {
        return ctx.json(404, { error: "unknown wallet route" });
      }
      const from = String(ctx.headers["x-lab-user"] || "");
      const input = await ctx.readJson();
      const to = String(input.to || "");
      const amount = input.amount;
      if (!Object.hasOwn(ctx.state.balances, from)) return ctx.json(401, { error: "valid X-Lab-User required" });
      if (!Object.hasOwn(ctx.state.balances, to) || to === from) return ctx.json(400, { error: "invalid destination" });
      if (!Number.isInteger(amount) || amount < 1 || amount > 100) return ctx.json(400, { error: "amount must be 1..100" });
      const observedBalance = ctx.state.balances[from];
      if (observedBalance < amount) return ctx.json(409, { error: "insufficient", balances: ctx.state.balances });
      await ctx.delay(45);
      ctx.state.balances[from] = observedBalance - amount;
      ctx.state.balances[to] += amount;
      ctx.state.transfers.push({ from, to, amount });
      const total = Object.values(ctx.state.balances).reduce((sum, value) => sum + value, 0);
      if (total > 100) {
        ctx.state.success = true;
        ctx.state.evidence = `concurrent stale writes created ${total - 100} credits; balances total ${total}`;
      }
      return ctx.json(200, { transferred: amount, balances: ctx.state.balances, total });
    }
  }
};

export function createLabState(id) {
  const lab = liveLabs[id];
  if (!lab) return null;
  return lab.createState();
}

export function labStatus(id, state) {
  if (!liveLabs[id] || !state) return null;
  return { success: state.success === true, evidence: state.success ? state.evidence : "" };
}
