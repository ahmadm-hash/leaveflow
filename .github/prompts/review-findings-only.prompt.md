---
description: "Review code and return findings only: bugs, regressions, risks, and missing tests"
name: "Review Findings Only"
agent: "agent"
---
Perform a code review of the relevant workspace changes and output findings only.

Rules:
- Prioritize real defects and behavior regressions over style preferences.
- Focus on correctness, security, performance, and maintainability risks.
- Include missing or weak test coverage when it increases regression risk.
- Use concise, evidence-based findings with severity ordering.
- If no issues are found, explicitly say: "No findings." and list residual testing gaps.

Output format:
1. High severity findings (if any)
2. Medium severity findings (if any)
3. Low severity findings (if any)
4. Open questions / assumptions

For each finding, include:
- Title
- Why it matters
- Exact file reference with line link
- Suggested fix (short)

Do not include praise, long summaries, or unrelated refactor suggestions.
