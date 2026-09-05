# Security Research Labs

An evidence-driven web security learning platform for practicing the full research loop:

1. model the trust boundary and form a hypothesis;
2. locate the vulnerable code—or justify that it is secure;
3. craft a payload and prove a specific impact;
4. propose a class-level remediation;
5. define positive and negative regression tests.

The project contains **53 labs** across nine learning paths. It mixes AI-assisted build briefs, code and architecture review, deterministic in-browser payload runners, and isolated live HTTP targets. Revealing an answer never grants mastery, and a successful HTTP status alone never counts as an exploit.

## Quick start

Requirements: Node.js 22 or newer. There are no third-party runtime dependencies.

```bash
cd security-labs
npm start
```

Open [http://127.0.0.1:8000](http://127.0.0.1:8000).

The original static and in-browser runner labs can still load from `index.html`, but the ten live HTTP labs require `npm start`.

Run the complete QA suite:

```bash
npm run qa
```

The suite validates lab schemas and answer lines, mastery semantics, browser-engine security invariants, curriculum/markup integrity, and all live attack/control flows through real local HTTP sessions.

## Learning paths

- **Web Foundations** — trust boundaries, validation, response schemas and secret handling.
- **Injection & Data Flow** — SQL/NoSQL, shell/argument injection, paths and server-side templates.
- **Identity, Sessions & Access** — JWT, BOLA/IDOR, mass assignment, middleware and OAuth linking.
- **Server-side Boundaries** — SSRF, uploads, archive extraction, URL/IP parsing and prototype pollution.
- **Browser Exploitation** — reflected/stored XSS, CORS and redirects.
- **Business Logic & Concurrency** — economic invariants, ReDoS and atomicity.
- **Advanced Web Research** — preconditions, parser behavior, chained impact and secure-review challenges.
- **Our Next Job** — AI-assisted AppSec ownership for mobile-game economy, architecture, agent security and delivery workflows.
- **Architecture & Design Review** — distributed systems, trust boundaries, control planes, multi-tenancy and secure failure design.

The ten career-track labs add a Build stage before the normal research loop. Each supplies a bounded functional brief, acceptance criteria and a Claude Code prompt. The learner records what the AI produced and what they personally verified before moving to vulnerability analysis.

Challenge mode hides vulnerability labels and uses neutral titles, so the catalog does not reveal the answer before the investigation begins.

## Lab modes

| Mode | Count | Completion evidence |
|---|---:|---|
| Static code/design review | 32 | Correct risky decisions, or a justified secure verdict |
| Payload runner | 9 | Correct identification plus deterministic impact proof |
| Live HTTP | 12 | Correct identification plus a server-issued evidence receipt |

### Live HTTP labs

| # | Topic | Required proof |
|---:|---|---|
| 25 | Stored XSS | Persist executable markup and trigger a separate victim render |
| 26 | Password reset poisoning | Generate Alice's reset link on an attacker-controlled authority |
| 27 | BOLA / IDOR | Retrieve Bob's real invoice while remaining Alice |
| 28 | MIME-confused upload | Pass the image filter and retrieve the bytes as active HTML |
| 29 | SSRF denylist bypass | Reach a deterministic internal metadata mock and obtain its marker |
| 30 | Server-side template injection | Progress from expression evaluation to a server-only value |
| 31 | OAuth account-linking CSRF | Attach an attacker's IdP identity to Alice's application account |
| 32 | Excessive data exposure | Observe unnecessary sensitive fields in the raw API response |
| 33 | Coupon race condition | Use a real concurrent burst to redeem one coupon more than once |
| 34 | Secure ownership lookup | Prove own access works while another owner's real object stays denied |
| 36 | Daily reward replay | Credit one player's wallet twice with the same reward claim |
| 37 | Wallet double-spend | Violate currency conservation using concurrent transfers |

### Our Next Job career track

| # | Lab | Interview signal |
|---:|---|---|
| 35 | Store checkout | Server-authoritative price and economic invariants |
| 36 | Daily reward | Replay resistance and idempotency |
| 37 | Wallet transfer | Concurrency, atomicity and double-entry thinking |
| 38 | Purchase verification | Receipt replay and account binding |
| 39 | Score submission | Mobile-client trust and anti-abuse design |
| 40 | Economy architecture | Trust boundaries, blast radius and event consistency |
| 41 | RAG reviewer | Indirect prompt injection and data provenance |
| 42 | Support automation | Agent tool authorization and confused-deputy risk |
| 43 | Tool gateway | Secure-review judgment and scoped capabilities |
| 44 | Security workflow | Reliable automation and fail-open behavior |

### Architecture & Design Review track

These labs present system context, protected assets, real product constraints and review questions before the numbered design. The goal is to identify the smallest set of architectural decisions that violate a business invariant, propose practical controls, and define failure-injection or abuse-case tests.

| # | Design | Core decision |
|---:|---|---|
| 45 | Season rewards | Exactly-once effect over at-least-once delivery |
| 46 | Guild treasury | Tenant scope through policy, cache and storage |
| 47 | Payment webhooks | Authenticity, replay and event ordering |
| 48 | Remote configuration | Publishing trust, signing and server authority |
| 49 | Support control plane | Scoped privilege, approvals and blast radius |
| 50 | Multi-region wallet | Consistency versus partition-time availability |
| 51 | Multi-tenant RAG | Pre-retrieval authorization and data lifecycle |
| 52 | Agentic incident response | Bounded autonomy and human control |
| 53 | Secure economy ledger | Evidence-based secure-design review |

Each live workspace includes editable method, path, headers and body fields; request templates provide benign controls rather than grading based on a copied magic answer.

## Safety model

The intentionally vulnerable targets are training simulations bound to `127.0.0.1`:

- lab state is isolated per browser session and resettable;
- bodies are limited to 64 KiB and concurrent bursts are bounded;
- the SSRF lab performs no outbound network requests;
- template and command exercises do not evaluate arbitrary learner code or invoke a shell;
- attacker-controlled responses are rendered as text;
- active upload output is protected by a restrictive CSP sandbox and `nosniff`;
- all users, credentials, tokens and secrets are training-only values held in memory.

Use the labs only in this local environment or in infrastructure you are explicitly authorized to test.

## Project structure

```text
index.html                  learning paths, progress and lab catalog
lab.html                    evidence-driven lab workspace
assets/core.js              registry, loader, highlighter and progress model
assets/app.js               path/catalog interactions
assets/lab.js               review, reasoning, payload and HTTP workbenches
assets/curriculum.js        tracks, neutral titles, skills and time estimates
assets/styles.css           desktop/mobile interface
labs/manifest.js            single list of lab modules
labs/NN-slug/lab.js         one self-contained lab definition
server.mjs                  loopback-only static and lab HTTP server
server/live-labs.mjs        isolated deterministic live targets
qa/                         schema, engine, curriculum, markup and HTTP tests
```

## Adding a lab

Create `labs/NN-slug/lab.js`, call `registerLab({...})`, add the path to `labs/manifest.js`, and add curriculum metadata when needed.

Every lab should include:

- a realistic multiline code sample and exact 1-based answer lines;
- a neutral mystery title, difficulty, path, skills, time estimate and prerequisites;
- three to five progressive hints;
- root cause, prerequisites, non-working approaches or limits, impact, remediation and regression tests;
- a negative control that must not complete the objective;
- for `http` mode, same-origin base/status/reset paths and editable request templates;
- `safe: true` with no vulnerable lines when the correct verdict is secure.
- career-track labs should include a structured `build` brief with a scenario, requirements, acceptance criteria and a bounded AI prompt.

After each coherent change, run the relevant targeted check and then `npm run qa` before publishing.

## Progress data

Learning progress and reasoning notes are stored locally in the browser. Opening the answer is tracked separately from identification, impact proof, remediation and regression-test evidence.
