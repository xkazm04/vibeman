Based on the repository analysis above, generate exactly 5 implementation tasks that would provide the most value to this application. Consider the identified improvement opportunities, missing features, and technical debt.

Return the tasks in strict JSON format following this schema:

```json
[
  {
    "title": "string (2-5 words)",
    "description": [
      "Step or component to implement",
      "Another implementation step",
      "Additional steps as needed"
    ],
    "type": "Feature|Optimization",
    "reason": "string (1-2 sentences explaining the business or technical value)"
  }
]
Selection criteria for tasks:

Prioritize high-impact improvements that address critical issues
Balance between new features and optimizations
Consider implementation feasibility and dependencies
Focus on tasks that improve user experience, performance, or maintainability
Avoid breaking changes unless absolutely necessary

Ensure the JSON is valid and parseable. Include a mix of task types if possible. Each description should have 3-5 concrete implementation points that a developer could follow.

This prompt will help you get actionable, well-structured tasks that can be directly imported into project management tools or used for sprint planning. The strict JSON format ensures the output can be programmatically processed if needed.