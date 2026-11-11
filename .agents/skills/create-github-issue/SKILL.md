---
name: create-github-issue
description: Draft or publish GitHub issues for Skyseed Island from feature ideas or bug reports, grounding scope, labels, and acceptance criteria in repository context. Use when asked to turn an idea into an issue or publish backlog items; does not implement the issue.
---

# Create a GitHub issue

Create an issue an implementing agent can execute without the original conversation.
Default repository: `scottsr00/skyseed-island`. Respect an explicitly requested destination.

## Ground the issue

- Read [the issue-writing guide](../../../docs/github-issues.md) for the template,
  label conventions, and readiness checklist. Resolve this path from the skill directory;
  the guide is `docs/github-issues.md` at the repository root. Keep that document as the
  source of truth rather than duplicating its template here.
- Follow the repository's `AGENTS.md` and README documentation routing. Inspect only the
  relevant area docs, functions, and test names. Describe current behavior as verified or
  unverified; distinguish the user's requirements from implementation suggestions.
- Search GitHub issues, including closed issues, for duplicates and related work before
  publishing. If a matching issue already covers the request, return its link and explain
  the overlap instead of creating another. Do not edit it without authorization.
- Resolve material gaps in intent or success criteria with the user while continuing
  independent research. Minor choices can use explicit, reasonable assumptions. An exploratory
  issue may retain open questions, but must not be described or labeled as ready to implement.

## Prepare and publish

- Discover and prefer the connected GitHub tools for searches and issue creation. If a
  required operation is unavailable, use an authenticated `gh` CLI where available.
- Verify available labels before applying them. With `gh`, use `gh label list --repo
  scottsr00/skyseed-island --limit 100` and paginate if needed. If labels cannot be verified,
  omit them and report suggested labels. Do not create labels, invent an assignee, set a
  milestone, or change Project fields unless requested.
- Fill the guide's template with a specific title, player intent, bounded scope, relevant
  code/doc/test references, observable acceptance criteria, and applicable validation.
  Remove placeholders and irrelevant sections. Use repository-relative file paths and
  function names so the context remains useful on a later checkout.
- For multiple issues, separate independent outcomes and make dependencies explicit. When
  dependencies require new issue numbers, create prerequisites first and use their returned
  links in dependent issue bodies.
- A request to create or publish an issue authorizes publication once its content is ready;
  do not add a confirmation step. A draft-only request produces text without publishing.
  Asking to create this skill does not authorize publishing any issues.
- Publish through GitHub's create-issue tool with structured title, body, and verified
  labels. If using `gh issue create`, write the exact Markdown body to a temporary file
  and pass it with `--body-file`; avoid shell interpolation of issue content.
- If creation times out or returns an ambiguous failure, search for the exact title and
  inspect matching issues before retrying. If the outcome remains uncertain, report it
  and stop rather than risking duplicates. On a clear permission or authentication failure,
  retain the completed draft and explain the blocker.

## Return the result

Return each created issue's number, title, and link, with applied labels and any material
open questions or omitted metadata. For drafts, return the title, body, and suggested labels.
Do not claim implementation or validation has occurred, or start implementing the issue,
unless that work was separately requested.
