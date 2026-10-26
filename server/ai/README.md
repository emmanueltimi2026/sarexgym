# Ask SAREX capabilities

Ask SAREX uses two separate decisions:

1. `intent-registry.js` resolves clear, high-confidence requests deterministically. The patterns are a fast path, not the complete language model of user requests.
2. If the wording is in scope but no deterministic capability fits, `assistant.js` asks the configured provider for a constrained JSON capability choice. Unclear scope uses the same request to classify scope and capability. A genuinely combined request may select up to three registered capabilities. Only identifiers in `assistantCapabilities` are accepted, and every selected capability must fit the server-classified scope.
3. The orchestration passes the identifier to the existing grounded service. That service derives identity from the authenticated session and rechecks role/surface authorization. A model label never grants access or chooses arbitrary code, arguments, URLs, SQL, or member IDs.
4. Authoritative results are formatted by the existing grounded response path. Empty results and retrieval failures remain distinct. The model only generates a response when no authoritative capability result applies.

## Registering a capability

Add a stable identifier to `AssistantIntent` and a matching immutable descriptor in `assistantCapabilities`. Describe purpose, illustrative examples, parameters, service, personal-data status, roles, authorization, read-only/mutation behavior, result shape, and failure behavior. Keep examples representative; do not add every paraphrase to regexes.

Then add the deterministic matcher only if the request is unambiguous, map the capability to a trusted service in `grounded-tools.js` (or the appropriate deterministic handler), and enforce authorization in that service. Do not rely on the model for permissions. Add separate tests for registry/selection, service execution with trusted fixtures, authorization denial, empty results, and service failure. For personal capabilities, assert the query uses the authenticated session identity and never a user-provided identity.

Combined read-only requests are executed through the registered services; capabilities backed by the same service share a single retrieval within that request. If a combined request includes a general AI guidance capability that cannot be safely composed with retrieved results, the assistant asks which part to handle first. All current AI capabilities are read-only.
