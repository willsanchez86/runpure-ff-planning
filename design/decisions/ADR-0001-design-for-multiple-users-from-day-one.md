# ADR-0001: Design for multiple users from day one

| Field | Value |
|---|---|
| Status | Accepted |
| Date | 2026-11-05 |
| Decision-makers | Project owner |
| Consulted | Claude (analysis) |
| Confidence | High: stated by the project owner as a firm guardrail |
| Supersedes | None |
| Revised | 2026-11-09, in place, at the owner's direction (not finalized): "endpoint" wording generalized to "API operation" after ADR-0017 (GraphQL) |
| Related | [`design/system-design.md`](../system-design.md) §0 (the guardrail's ten requirements); every later ADR |

## Context and problem statement
The app launches with one user, the project owner. It is intended to be deployed for multiple users later. Single-user shortcuts (no users table, a shared password, state held in one process) are cheap at first but expensive to undo, because they touch the data model, every query and every API operation.

## Decision drivers
- No significant rework or accumulated technical debt when more users arrive.
- A small, low-cost deployment at launch.

## Considered options
### Option 1: Design for one user now, refactor for multiple users later
- Good: fastest start.
- Bad: retrofitting ownership, login and per-user scoping touches the data model, every query and every API operation.

### Option 2: Design for multiple users now, deploy small
- Good: growth means adding resources (instances, database size, a separate worker), not redesigning.
- Bad: some work is done before it's needed: a users table, real login, ownership checks on every request.

## Decision outcome
Chosen option: **Option 2**, because it is the only option that avoids rework when more users arrive.

We will apply the multi-user guardrail in [`design/system-design.md`](../system-design.md) §0 to every design decision. We will scale the deployment, not the design. Any decision that breaks a guardrail requirement must be recorded in its own ADR, stating the rework it would cost and why it's accepted anyway.

## Consequences
- Good: adding users means adding resources, with no change to the data model, component boundaries or code structure.
- Bad: login, user scoping and stateless servers are built before a second user exists.
- Neutral: every later ADR is checked against the guardrail's ten requirements.

## Confirmation
Each new ADR states how it meets the guardrail, or records an exception. Code review checks that account-owned rows carry a `user_id` and that every API request is scoped to the signed-in user.

## More information
Revisit only if the product's direction changes away from multiple users.
