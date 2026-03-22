---
name: create-skill
description: 'Create a reusable SKILL.md from conversation history. Use when users ask to create, draft, refine, or iterate on a skill, especially for multi-step workflows, decision trees, and completion checks.'
argument-hint: 'Describe the workflow to capture, desired scope (workspace or personal), and checklist vs full process.'
user-invocable: true
---

# Create Skill

## Purpose
Turn a user workflow from chat history into a reusable, high-signal `SKILL.md` that can be invoked directly and discovered by the model.

## When To Use
- User asks to create a new skill.
- User has a repeatable process that should be reused.
- User wants to convert ad-hoc guidance into a structured workflow.

## Inputs To Collect
- Target outcome the skill should produce.
- Scope: workspace (`.github/skills/<name>/`) or personal (`~/.copilot/skills/<name>/`).
- Format depth: quick checklist or full multi-step workflow.
- Any required files, scripts, templates, or references.

## Workflow
1. Review conversation history.
2. Extract reusable behavior:
- Ordered steps the user follows.
- Decision points and branching logic.
- Quality criteria, validations, and done checks.
3. If no clear workflow exists, ask concise clarifying questions for outcome, scope, and depth.
4. Choose skill metadata:
- Pick a lowercase hyphenated `name` that matches folder name.
- Write a keyword-rich `description` with clear trigger phrases.
- Add `argument-hint` when slash usage benefits from structured inputs.
5. Create the skill folder and add `SKILL.md`.
6. Draft the body:
- Purpose and when-to-use triggers.
- Step-by-step procedure that is executable without extra context.
- Branch logic for common forks and edge cases.
- Completion checklist with objective checks.
7. Review for ambiguity:
- Identify weak or underspecified steps.
- Ask targeted follow-up questions about those exact gaps.
8. Finalize and summarize:
- State what the skill produces.
- Suggest example prompts to invoke it.
- Suggest the next related customization to create.

## Completion Checklist
- `name` matches folder name exactly.
- `description` includes realistic trigger keywords.
- Procedure is actionable and ordered.
- Decision points and edge cases are explicit.
- Done criteria are testable and specific.
- File path matches chosen scope.

## Quality Bar
- Prefer short, concrete steps over abstract advice.
- Keep `SKILL.md` concise; move bulky details to references when needed.
- Avoid generic descriptions that reduce discoverability.
- Ensure the skill is useful both as auto-discovered behavior and slash invocation.

## Example Invocation Prompts
- `/create-skill Build a skill from this bug triage workflow and make it workspace-scoped.`
- `/create-skill Turn my PR review checklist into a full multi-step skill with decision branches.`
- `/create-skill Create a personal skill for API debugging with completion checks.`
