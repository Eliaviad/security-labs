registerLab({
  id: "51-multitenant-rag",
  order: 51,
  title: "Cross-tenant retrieval in a shared RAG assistant",
  mysteryTitle: "Internal knowledge assistant",
  difficulty: "hard",
  category: "auth",
  env: "node",
  mode: "static",
  track: "architecture-review",
  architecture: {
    context: "A single internal assistant serves several studios and external partners. Documents share object storage, an embedding pipeline and a vector database.",
    assets: ["Source code and incidents", "Partner documents", "Tenant membership", "Prompt and retrieval logs"],
    constraints: ["Shared model and index for cost", "Near-real-time ingestion", "Documents can be shared explicitly", "Support operators troubleshoot all tenants"],
    questions: ["At what layer is tenant authorization enforced?", "Can the model select or override tenant scope?", "How are deletion and access revocation propagated to embeddings and caches?"]
  },
  filename: "design/multitenant-rag.txt",
  description: "A shared RAG service retrieves globally and lets the model select tenant context before authorization filtering.",
  code: [
    "User -> AssistantAPI: JWT(userId, tenantMemberships)",
    "AssistantAPI -> Agent: question plus tenantId from request body",
    "Agent -> VectorDB: similaritySearch(question, topK=20) across global index",
    "Agent prompt: include retrieved chunk text and metadata",
    "After generation: remove citations whose tenantId is not in JWT memberships",
    "Agent tool: fetchFullDocument({ documentId, tenantId: modelSelectedTenant })",
    "Prompt logs -> SharedAnalytics: question, chunks, answer"
  ].join("\n"),
  vulnerableLines: [2, 3, 4, 5, 6],
  hints: [
    "Filtering citations after generation cannot remove facts already incorporated into the answer.",
    "Tenant scope must constrain candidate retrieval before similarity ranking and model exposure.",
    "A model-selected tenant argument is untrusted input, not authorization context.",
    "Include caches, logs, embeddings, deleted documents and explicitly shared resources in the isolation model."
  ],
  vulnerabilityType: "Cross-tenant data exposure through post-retrieval filtering and model-controlled scope",
  explanation:
    "<h4>Design failure</h4><p>The request supplies tenant scope, retrieval searches globally, and unauthorized chunks reach the model before a cosmetic citation filter. The document tool also allows probabilistic output to choose authorization scope.</p>" +
    "<h4>Proposed design</h4><p>Derive an allowed resource set from verified identity and sharing policy before retrieval. Enforce it in the vector query and again at document fetch, using server-created tenant context that tools cannot override. Separate indexes or encryption domains where risk justifies the operational cost.</p>" +
    "<h4>Lifecycle</h4><p>Propagate document deletion, membership revocation and sharing changes to chunks, embeddings, result caches and conversational memory. Minimize and tenant-scope observability data; support access needs its own audited workforce policy.</p>" +
    "<h4>Validation</h4><p>Seed unique canary facts per tenant, test ambiguous prompts and adversarial metadata, revoke access during a conversation, delete a document, exercise caches and verify that unauthorized text never enters the model context or logs.</p>"
});
