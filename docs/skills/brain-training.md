# Brain Training Procedure

> Manual training sessions to learn from past direction decisions.
> Trigger: `/brain train` or user request

---

## Overview

Training is a **conversation** where the AI reviews past direction decisions chronologically and asks the user questions to understand their reasoning.

**Goal**: Build the "Learning From Decisions" section of brain-guide.md with specific examples and the thinking behind them.

**Not the goal**: Extract patterns like "prefers small over large" - these vary too much. Focus on understanding the **quality** of ideas, not their scope.

---

## Training Flow

### Step 1: Query Recent Directions

```sql
SELECT
  d.id,
  d.context_map_title,
  d.summary,
  d.direction,
  d.status,
  d.created_at
FROM directions d
WHERE d.project_id = ?
  AND d.status IN ('accepted', 'rejected')
ORDER BY d.created_at ASC
LIMIT 20;
```

Start from oldest unreviewed, work forward chronologically.

### Step 2: Present Each Decision

For each direction, present it to the user and ask:

```markdown
## Direction Review

**Context**: [context_map_title]
**Summary**: [summary]
**Status**: [ACCEPTED / REJECTED]
**Date**: [created_at]

<details>
<summary>Full direction content</summary>

[direction content]

</details>

---

**Question**: Why did you [accept/reject] this direction?

What was your thinking? What made it [compelling / concerning]?
```

### Step 3: Record the Reasoning

User's answer becomes a learning example:

```markdown
### [Date] - [Context]: "[Summary]"

**Decision**: [Accepted/Rejected]

**User's reasoning**:
[User's explanation]

**What this teaches**:
[AI's understanding of what made this good/bad]
```

### Step 4: Update brain-guide.md

Add the new examples to the "Learning From Decisions" section.

---

## Question Types

### For Accepted Directions

- "What made this idea compelling to you?"
- "Was there something specific about the approach that worked?"
- "Would you accept similar ideas in the future? Why?"

### For Rejected Directions

- "What concern did this raise for you?"
- "Was the idea itself flawed, or just the timing/approach?"
- "What would have made this more acceptable?"

### For Interesting Contrasts

When you notice two similar-seeming directions with different outcomes:

- "You accepted X but rejected Y - they seem similar. What's the difference?"
- "This is similar to [other direction] but you decided differently. What changed?"

---

## What NOT to Do

**Don't extract scope-based patterns:**
- ❌ "User prefers small improvements over large features"
- ❌ "User accepts refactoring but rejects new features"

These vary based on idea quality, not scope.

**Don't create filtering rules:**
- ❌ "Automatically reject ideas with X words"
- ❌ "Only accept ideas that match Y pattern"

The goal is understanding, not filtering.

**Don't validate patterns:**
- ❌ "You seem to prefer X - is that correct?"
- ❌ "I noticed you always reject Y - confirm?"

Just ask about specific decisions and learn from answers.

---

## Session Structure

```
/brain train

AI: "I'll review your recent direction decisions and ask about your reasoning.
     This helps me understand what makes ideas resonate with you.

     Let's start with the oldest unreviewed decision..."

[Present first direction]

User: [Explains reasoning]

AI: [Records learning, moves to next]

... repeat ...

AI: "That's [N] decisions reviewed. Here's what I learned:

     [Summary of new learnings]

     I've updated brain-guide.md with these examples."
```

---

## Updating brain-guide.md

After training, append to the "Learning From Decisions" section:

```markdown
### Direction Examples

#### Session: 2026-01-17

**Accepted: "Add filter persistence to Ideas table"** (Ideas context)
> User: "This solved an immediate annoyance I had. Every time I refreshed,
> I lost my filter state. Small but real value."

**Rejected: "Build intelligent batch prioritization"** (TaskRunner context)
> User: "The word 'intelligent' made me skeptical, but more importantly,
> I don't trust it to understand my actual priorities. I'd rather
> control this myself through the CLI."

**Accepted: "Implement real-time collaboration"** (Large feature)
> User: "This was big, but the design was solid and it solved a real
> problem - I needed to share sessions with others."
```

---

## Frequency

- **Manual only** - User triggers with `/brain train`
- No automatic triggers
- Suggested: After accumulating 10+ new decisions
- No minimum - can train anytime

---

## Evolution

The brain-guide.md evolves through:
1. Initial creation (from BRAIN_DISCOVERY.md if available)
2. Training sessions (adding specific decision examples)
3. User corrections ("That's not quite right, let me clarify...")

The guide becomes more useful over time as more examples accumulate, giving the AI a richer understanding of the user's taste and values.
