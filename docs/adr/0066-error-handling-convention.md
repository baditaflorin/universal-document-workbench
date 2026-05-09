# 0066 Error-Handling Convention

- Status: accepted
- Context: Browser-side limitations such as clipboard permissions and CORS need domain-language feedback.
- Decision: Surface a short what/why/next-step notice for client-side workflow failures, while keeping API errors in the structured backend format introduced in Phase 2.
- Consequences: Users get honest recovery guidance instead of silent failure.
- Alternatives considered: Generic toast strings; rejected because they hide the reason a workflow failed.
