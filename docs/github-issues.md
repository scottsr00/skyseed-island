# Writing implementation-ready GitHub issues

Use this guide when turning a feature idea or bug report into a GitHub issue for Skyseed
Island. GitHub Issues holds the backlog; this document holds the authoring process and template.
An issue should explain the intended player experience and give an implementing agent enough
context to locate the work, make bounded decisions, and verify the result.

## Prepare the issue

1. Search existing issues for duplicates, related work, and dependencies. Link them rather
   than repeating their requirements.
2. Establish the intent: who benefits, what currently happens, and what should happen instead.
   Identify relevant age levels, input methods, and profile/save behavior.
3. Use the [README documentation table](../README.md#documentation) to select the owning
   area document. Follow [AGENTS.md](../AGENTS.md) when investigating code. Use `rg` to find
   relevant functions and tests; include only context that helps this specific issue.
4. Separate confirmed requirements from proposed implementation and unresolved decisions.
   Do not invent product decisions, technical findings, priorities, or test results. Mark
   unverified code references as leads. Resolve questions that materially change scope or
   success criteria before marking the issue ready.
5. Write observable acceptance criteria and a validation plan. Split independent outcomes
   into separate issues; link prerequisite work explicitly.
6. Select labels and fill in the template below. When asked to create the issue, publish
   it in `scottsr00/skyseed-island` and return its link. A request to draft an issue only
   produces a draft. Creating an issue does not authorize implementing it.

## Labels and metadata

These are suggested conventions, not a list of labels verified to exist in the repository.
Check available repository labels before applying them. Use existing equivalents where
possible; record proposed labels in the draft if they are unavailable.

| Dimension | Suggested values | Guidance |
| --- | --- | --- |
| Type | `enhancement`, `bug`, `documentation` | Choose one primary type. |
| Area | `area:learning`, `area:world`, `area:boats-fishing`, `area:activities`, `area:surfing`, `area:rendering`, `area:profiles`, `area:architecture` | Choose the primary area; add another only when useful. |
| Readiness | `needs-design`, `ready-for-agent`, `blocked` | Use `ready-for-agent` only after the checklist below passes. |
| Priority | `priority:high`, `priority:medium`, `priority:low` | Apply only when agreed; otherwise leave unset. |

Use issue links for dependencies, a milestone for an agreed release, and an assignee only
when ownership is established. If a GitHub Project already tracks status or priority, use
its fields instead of duplicating that information in labels.

## Copyable issue template

Use a specific, outcome-oriented title, such as “Show the remaining fuel before starting a
boat trip.” Replace placeholders and remove irrelevant sections before publishing.

```markdown
## Intent

[Who needs this, what problem it solves, and why it matters.]

## Current behavior

[Describe the observed behavior and where it occurs. For bugs, include reproduction steps,
expected versus actual results, and relevant browser/device details.]

## Desired behavior

[Describe the player flow from entry through completion or cancellation. Specify relevant
age levels, keyboard/touch behavior, and feedback. Link visual references if needed.]

## Scope

- Included: [Required outcomes.]
- Out of scope: [Related work intentionally deferred.]
- Preserve: [Existing behavior or compatibility this change must retain.]

## Relevant context

- Owning documentation: [Repository-relative path or link.]
- Code entry points: [Verified file paths and function names; explain their relevance.]
- Existing tests: [Relevant test names or search terms.]
- Saves/profiles: [Whether state persists, its intended owner, and reload/reset behavior;
  or explain that no persisted state changes are expected.]
- Related issues/dependencies: [Links and any required ordering, or none.]

## Acceptance criteria

- [ ] Given [starting state], when [action], then [observable result].
- [ ] [Relevant boundary, invalid action, or recovery behavior.]
- [ ] [Relevant entry/exit, keyboard/touch, or narrow-layout behavior.]
- [ ] [Relevant reload, profile/age isolation, or reset behavior.]

## Implementation notes

[Optional: evidence-backed suggestions, likely integration points, and tradeoffs.
Distinguish required constraints from suggestions; leave room for a better implementation.]

## Validation

- Automated: [Applicable checks and focused tests, following docs/testing.md.]
- Browser: [Specific flow and expected appearance/input behavior to verify, when applicable.]
- Documentation: [Owning area document to update if behavior or code boundaries change.]

## Decisions and open questions

[Record agreed decisions. List unresolved questions, who must decide, and whether they
block implementation. Write “None” if there are no open questions.]
```

## Ready for an agent

- The intent and desired behavior are understandable without the original conversation.
- The scope fits one cohesive change, and acceptance criteria can be verified individually.
- Relevant docs, code references, and current behavior have been checked; uncertainty is explicit.
- Material product decisions are resolved and prerequisite issues are linked.
- Applicable input, activity lifecycle, and persistence behavior is covered, following
  [AGENTS.md](../AGENTS.md) and the owning area document.
- Validation follows [Testing and publication](testing.md), including browser verification
  for visual/input changes. Do not claim checks have passed before implementation.

When executing an issue, read the current repository instructions and referenced docs first.
Treat code pointers as starting points that may have moved. Report what changed, validation
results, and remaining gaps against the acceptance criteria when handing back the work.
