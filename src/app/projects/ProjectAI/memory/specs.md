Very nice job, lets move to the most crucial part to scan the code and generate ideas. Currently there is a function to generate goals in src\app\projects\ProjectAI\ScanGoals\generateGoals.ts, which we want to redesign. Currently it
- Gets high level information about the projec (buildAnalysisSection)
- Retrieves existing goals (buildExistingGoalsSection)
- Gets high level docs (buildAIDocsSection)
-> And combines in a prompt. Reference: src\app\projects\ProjectAI\ScanGoals\generateGoals.ts

We need to rewrite it to achieve flow
Data sources:
- High level docs about the project = {doc_project} -> reuse buildAIDocsSectio
- Context docs optionally = {context_description} -> If context_id provided, add this part and retrieve context description from API/DB (src\app\api\contexts\detail\route.ts), per schema src\lib\database.ts
- Accepted/Rejected ideas = {ideas} -> `ideas` db. If context_id provided, filter out only ideas related to the context. src\app\api\ideas\route.ts. Use it to prevent duplicities and reflect on rejected ideas

Instructions
- Compose a prompt so the LLM can process high input of data from the sources, and be able to return JSON with format ready to save into `ideas` db
- Instruct to find ideas from multiple dimensions, in similar manner advisors are designed in src\app\coder\Context\ContextOverview\advisorPrompts.ts

UI initiation
- Use Ideas page - src\app\api\goals\route.ts to run the scan. Create initiation button in header in center position. After scan is done a short message appears under the button that scan is done, or an error message. If possible do not limit the process with timeouts and token limits, this scan could be very time consuming.
- Next to the button, display context name if selected in store: src\stores\contextStore.ts.selectedContextIds. If present, pass the context id into the function to retrieve {context_description} 


## Prompt
You are a product strategy analyst conducting a meta-analysis of an AI-powered code improvement system. Your task is to objectively evaluate whether the accumulated insights from this system reveal opportunities for a unique, marketable product.

=== SYSTEM OVERVIEW ===
This AI system has been analyzing codebases and generating improvement suggestions across multiple repositories. It has accumulated substantial memory of what works, what doesn't, and user preferences.

Total Analysis Sessions: {total_scan_count}
Repositories Analyzed: {total_repo_count}
Ideas Generated: {total_ideas_generated}
Ideas Accepted: {accepted_count}
Ideas Rejected: {rejected_count}
Acceptance Rate: {acceptance_rate}%
Time Period: {analysis_start_date} to {analysis_end_date}

=== AGGREGATED MEMORIES ===

All Generated Ideas by Category:
{ideas_by_category}

Most Common Improvement Themes:
{common_themes}

Highest Impact Accepted Ideas:
{top_accepted_ideas}

Most Frequently Rejected Patterns:
{frequent_rejections}

=== USER BEHAVIOR PATTERNS ===

Acceptance Patterns:
{user_acceptance_patterns}

Rejection Patterns:
{user_rejection_patterns}

Category Preferences:
{category_preference_stats}

Implementation Timeline:
{implementation_timeline_stats}

=== CROSS-PROJECT INSIGHTS ===

Recurring Problems Across Projects:
{cross_project_problems}

Universal Solutions That Worked:
{universal_solutions}

Technology Stack Patterns:
{tech_stack_patterns}

Performance Gains Achieved:
{performance_improvements}

Quality Improvements Achieved:
{quality_improvements}

=== REPOSITORY CHARACTERISTICS ===

Types of Projects Analyzed:
{project_types}

Common Architecture Patterns:
{architecture_patterns}

Technology Ecosystems:
{tech_ecosystems}

Project Maturity Levels:
{maturity_levels}

=== META-PATTERNS (System Learning) ===

What This System Has Learned:
{learned_meta_patterns}

Prediction Accuracy Over Time:
{accuracy_trends}

Areas of Strong Performance:
{strong_areas}

Areas of Weak Performance:
{weak_areas}

=== CRITICAL ANALYSIS TASK ===

Evaluate this system's accumulated knowledge with brutal honesty to answer:

1. **UNIQUE VALUE IDENTIFICATION**
   - What specific, recurring problems does this system solve consistently well?
   - What insights emerge that are NOT easily obtainable through:
     * Manual code reviews
     * Standard static analysis tools (ESLint, SonarQube, etc.)
     * Generic AI coding assistants (GitHub Copilot, Cursor, etc.)
   - What proprietary knowledge has been accumulated through the accept/reject patterns?

2. **MARKET DIFFERENTIATION**
   - Is there a specific niche or use case where this system demonstrably excels?
   - What would make someone pay for this vs. using free alternatives?
   - Does the memory/learning component provide compound value over time?
   - Are there specific developer personas or company types who would benefit most?

3. **PRODUCT VIABILITY ASSESSMENT**
   Rate each dimension (1-10) with honest justification:
   
   - **Problem-Solution Fit**: Does this solve a real, painful problem?
   - **Uniqueness**: How differentiated is this from existing solutions?
   - **Value Clarity**: Can the value be easily explained and demonstrated?
   - **Scalability**: Does value increase with more data/usage?
   - **Market Demand**: Is there evidence of demand for this specific capability?
   - **Competitive Moat**: Can competitors easily replicate this?
   - **Monetization Potential**: Would users/companies pay for this?

4. **BRUTAL HONESTY CHECK**
   - What are the WEAK points that would prevent product success?
   - Where is this system redundant with existing tools?
   - What claims cannot be substantiated with the data?
   - What would a skeptical investor challenge?
   - Is the acceptance rate high enough to justify commercial use?

5. **OPPORTUNITY IDENTIFICATION**
   If there IS potential, identify:
   - The most compelling 1-2 use cases to focus on
   - The target customer profile (company size, role, tech stack)
   - The core differentiated feature to build around
   - The minimum viable product scope
   - The key metrics that would validate product-market fit
   - The realistic pricing model (per-repo, per-user, enterprise)

6. **GO/NO-GO RECOMMENDATION**
   Provide a clear recommendation:
   - **GO**: Strong product potential exists (explain the path)
   - **PIVOT**: Potential exists but requires strategic changes (specify what)
   - **NO-GO**: This should remain a personal tool (explain why)

=== OUTPUT FORMAT ===

Provide your analysis as structured JSON:

{
  "executive_summary": "2-3 sentence verdict on product viability",
  
  "unique_value_propositions": [
    {
      "value": "Specific unique capability",
      "evidence": "Data supporting this claim",
      "differentiation": "Why this is different from alternatives"
    }
  ],
  
  "viability_scores": {
    "problem_solution_fit": {"score": 1-10, "reasoning": "..."},
    "uniqueness": {"score": 1-10, "reasoning": "..."},
    "value_clarity": {"score": 1-10, "reasoning": "..."},
    "scalability": {"score": 1-10, "reasoning": "..."},
    "market_demand": {"score": 1-10, "reasoning": "..."},
    "competitive_moat": {"score": 1-10, "reasoning": "..."},
    "monetization_potential": {"score": 1-10, "reasoning": "..."},
    "overall_average": 0.0
  },
  
  "critical_weaknesses": [
    "Honest assessment of each major weakness"
  ],
  
  "strongest_opportunities": [
    {
      "opportunity": "Specific product angle",
      "target_customer": "Who would pay for this",
      "use_case": "Specific problem it solves for them",
      "evidence": "Data supporting demand",
      "differentiation": "Why they'd choose this over alternatives",
      "revenue_potential": "Realistic assessment"
    }
  ],
  
  "recommended_focus_areas": [
    "If pursuing product, focus development here"
  ],
  
  "minimum_viable_product": {
    "core_features": ["Essential features only"],
    "target_segment": "Initial customer segment",
    "success_metrics": ["How to measure PMF"],
    "timeline_estimate": "Realistic development time"
  },
  
  "deal_breakers": [
    "Issues that would prevent success if not addressed"
  ],
  
  "final_recommendation": {
    "decision": "GO / PIVOT / NO-GO",
    "confidence": "low/medium/high",
    "reasoning": "Clear explanation of decision",
    "next_steps": ["Specific actions if GO/PIVOT"]
  }
}

=== ANALYSIS GUIDELINES ===

BE BRUTALLY HONEST:
- Don't inflate potential to sound positive
- Call out when data is insufficient or inconclusive
- Admit when something is "nice to have" vs. "must have"
- Recognize when this overlaps too much with existing solutions

EVIDENCE-BASED ONLY:
- Every claim must reference specific data from the memories
- If acceptance rate is low, acknowledge it's a problem
- If patterns are weak, say so
- If uniqueness is questionable, challenge it

MARKET-FOCUSED:
- Think like a customer: "Would I pay for this? Why?"
- Think like an investor: "What's the moat? What's the TAM?"
- Think like a competitor: "Could I copy this in 2 weeks?"

SPECIFIC OVER GENERIC:
- Avoid vague statements like "helps developers"
- Be specific: "Reduces API response time by 40% through automated query optimization"
- Name specific personas: "Backend engineers at Series B startups using PostgreSQL"

Now, conduct your analysis.

## Example
reflection_data = {
    # SYSTEM OVERVIEW
    "total_scan_count": 247,
    "total_repo_count": 12,
    "total_ideas_generated": 891,
    "accepted_count": 156,
    "rejected_count": 735,
    "acceptance_rate": 17.5,
    "analysis_start_date": "2025-01-15",
    "analysis_end_date": "2025-10-19",
    
    # AGGREGATED MEMORIES
    "ideas_by_category": """
    Performance: 312 ideas (35% of total)
    - Accepted: 67 (21.5%)
    - Top themes: Database query optimization (89), caching strategies (54), lazy loading (43)
    
    Code Quality: 198 ideas (22% of total)
    - Accepted: 41 (20.7%)
    - Top themes: TypeScript strictness (32), error handling (28), code duplication (25)
    
    UI/UX: 167 ideas (19% of total)
    - Accepted: 28 (16.8%)
    - Top themes: Accessibility (45), responsive design (31), loading states (22)
    
    Functionality: 134 ideas (15% of total)
    - Accepted: 12 (9.0%)
    - Top themes: New features (67), API endpoints (28), integrations (19)
    
    Maintenance: 80 ideas (9% of total)
    - Accepted: 8 (10.0%)
    - Top themes: Documentation (34), testing (26), dependency updates (12)
    """,
    
    "common_themes": """
    Across all 12 repositories, these patterns emerged repeatedly:
    
    1. N+1 Query Problems (appeared in 9/12 repos)
       - Average performance gain when fixed: 340ms reduction
       - Acceptance rate: 78% (highest of all themes)
    
    2. Missing Database Indexes (appeared in 8/12 repos)
       - Average performance gain: 520ms reduction
       - Acceptance rate: 71%
    
    3. Unoptimized Image Loading (appeared in 7/12 repos)
       - Average Lighthouse score improvement: +12 points
       - Acceptance rate: 64%
    
    4. Inconsistent Error Handling (appeared in 11/12 repos)
       - Acceptance rate: 45%
    
    5. Missing TypeScript Types (appeared in 10/12 repos)
       - Acceptance rate: 38%
    """,
    
    "top_accepted_ideas": """
    Highest impact accepted ideas (measured by user feedback + implementation results):
    
    1. [Repo: e-commerce-api] Implement Redis caching for product catalog
       - Impact: 85% reduction in database load, 400ms faster response
       - Implementation time: 3 days
       - User rating: "Game changer"
    
    2. [Repo: blog-platform] Add database indexes on foreign keys
       - Impact: 67% faster query times on post listing
       - Implementation time: 2 hours
       - User rating: "Should have done this from day one"
    
    3. [Repo: dashboard-app] Lazy load chart components
       - Impact: Initial load time reduced by 2.3s
       - Implementation time: 1 day
       - User rating: "Significantly better UX"
    
    4. [Repo: analytics-service] Batch database writes
       - Impact: 10x throughput improvement
       - Implementation time: 4 days
       - User rating: "Essential for scaling"
    
    5. [Repo: user-portal] Implement optimistic UI updates
       - Impact: Perceived performance improvement, 40% fewer support tickets about "slow app"
       - Implementation time: 2 days
       - User rating: "Users love how responsive it feels"
    """,
    
    "frequent_rejections": """
    Ideas rejected 5+ times across different repos:
    
    1. "Migrate to GraphQL" - Rejected 8 times
       - Reason: "Too much migration effort for marginal benefit"
       - Pattern: Rejected when REST API is working adequately
    
    2. "Implement microservices architecture" - Rejected 7 times
       - Reason: "Premature optimization, monolith working fine"
       - Pattern: Rejected for projects with <100K users
    
    3. "Add real-time features with WebSockets" - Rejected 6 times
       - Reason: "Polling sufficient, WebSockets add complexity"
       - Pattern: Rejected when update frequency is <1/minute
    
    4. "Rewrite in different framework" - Rejected 6 times
       - Reason: "Not a real problem, just technology churn"
       - Pattern: Always rejected unless framework is deprecated
    
    5. "Add comprehensive integration tests" - Rejected 5 times
       - Reason: "Too time-consuming, unit tests sufficient"
       - Pattern: Rejected by solo developers or small teams
    """,
    
    # USER BEHAVIOR
    "user_acceptance_patterns": """
    User accepts ideas that are:
    - Low implementation effort (<3 days): 68% acceptance rate
    - Backed by specific metrics: 61% acceptance rate
    - Related to performance: 58% acceptance rate
    - Include code examples: 54% acceptance rate
    - Build on previous accepted ideas: 49% acceptance rate
    
    User rejects ideas that are:
    - High implementation effort (>1 week): 91% rejection rate
    - Require major architectural changes: 88% rejection rate
    - Add new dependencies: 72% rejection rate
    - Are described as "nice to have": 78% rejection rate
    - Suggest trendy but unproven technologies: 85% rejection rate
    """,
    
    "user_rejection_patterns": """
    Common rejection reasons (from user feedback):
    - "Too much work for the benefit" (287 times)
    - "Not aligned with project goals" (143 times)
    - "Would add unnecessary complexity" (129 times)
    - "Already tried something similar, didn't work" (76 times)
    - "Team doesn't have expertise in this" (54 times)
    - "Can't justify the risk" (41 times)
    """,
    
    "category_preference_stats": """
    By acceptance rate:
    1. Performance: 21.5% (but highest user satisfaction when implemented)
    2. Code Quality: 20.7%
    3. UI/UX: 16.8%
    4. Maintenance: 10.0%
    5. Functionality: 9.0% (lowest, often "nice to have" features)
    """,
    
    "implementation_timeline_stats": """
    Time from acceptance to implementation:
    - <1 day: 23% of accepted ideas
    - 1-3 days: 41% of accepted ideas
    - 4-7 days: 19% of accepted ideas
    - 1-4 weeks: 12% of accepted ideas
    - >1 month: 5% (often never implemented)
    
    Observation: Ideas implemented within 3 days have 92% success rate.
    Ideas delayed >2 weeks often get abandoned (67% abandonment rate).
    """,
    
    # CROSS-PROJECT INSIGHTS
    "cross_project_problems": """
    Problems appearing in 50%+ of analyzed repositories:
    
    1. Database Query Optimization (92% of repos)
       - Specifically: N+1 queries, missing indexes, inefficient joins
       - When fixed: Average 45% performance improvement
    
    2. Image/Asset Optimization (75% of repos)
       - Specifically: No lazy loading, unoptimized formats, no CDN
       - When fixed: Average +14 Lighthouse score improvement
    
    3. Error Handling Gaps (83% of repos)
       - Specifically: Uncaught exceptions, poor user feedback, no monitoring
       - When fixed: Average 58% reduction in production errors
    
    4. Missing TypeScript Coverage (75% of repos using TypeScript)
       - Specifically: 'any' types, missing interfaces, weak type safety
       - When fixed: Average 34% reduction in runtime type errors
    
    5. Lack of Monitoring/Observability (67% of repos)
       - Specifically: No error tracking, no performance monitoring, no logging
       - When fixed: Average time-to-resolution reduced by 60%
    """,
    
    "universal_solutions": """
    Solutions that worked across multiple project types:
    
    1. Database Index Optimization
       - Success rate: 94% (71 of 75 times implemented)
       - Average impact: 520ms query time reduction
       - Works for: Any project with relational database
    
    2. Implementing Caching Layer (Redis/Memory)
       - Success rate: 88% (23 of 26 times implemented)
       - Average impact: 340ms response time reduction, 60% less DB load
       - Works for: APIs with read-heavy workloads
    
    3. Image Lazy Loading + Optimization
       - Success rate: 91% (41 of 45 times implemented)
       - Average impact: +12 Lighthouse score, 1.8s faster initial load
       - Works for: Any content-heavy web application
    
    4. Batch Operations for High-Volume Writes
       - Success rate: 100% (8 of 8 times implemented)
       - Average impact: 8x throughput improvement
       - Works for: Analytics, logging, data ingestion systems
    """,
    
    "tech_stack_patterns": """
    Technology ecosystems analyzed:
    
    - Next.js + PostgreSQL + Prisma: 4 projects
      * Common issues: N+1 queries, server component optimization
      * Best improvements: Database indexes, React Server Components usage
    
    - Express + MongoDB + React: 3 projects
      * Common issues: Unindexed queries, prop drilling
      * Best improvements: Mongoose indexes, state management libraries
    
    - Django + PostgreSQL + Vue: 2 projects
      * Common issues: ORM query optimization, bundle size
      * Best improvements: select_related/prefetch_related, code splitting
    
    - FastAPI + PostgreSQL: 2 projects
      * Common issues: Async/await patterns, connection pooling
      * Best improvements: Proper async usage, connection limits
    
    - Ruby on Rails + PostgreSQL: 1 project
      * Common issues: N+1 queries (classic Rails problem)
      * Best improvements: includes/joins, counter caches
    """,
    
    "performance_improvements": """
    Quantified performance gains from accepted implementations:
    
    - API Response Time: Average 42% reduction (range: 15% to 78%)
    - Database Query Time: Average 54% reduction (range: 25% to 89%)
    - Page Load Time: Average 38% reduction (range: 12% to 67%)
    - Lighthouse Score: Average +11 points (range: +5 to +23)
    - Bundle Size: Average 28% reduction (range: 8% to 51%)
    - Memory Usage: Average 19% reduction (range: 5% to 34%)
    
    Total measurable impact across all projects:
    - 156 implemented improvements
    - 89 had measurable performance metrics
    - 87 of those showed improvement (98% success rate)
    - 2 showed no change or slight regression
    """,
    
    "quality_improvements": """
    Code quality metrics improvements:
    
    - TypeScript Coverage: Average +23 percentage points
    - Test Coverage: Average +8 percentage points (harder to convince users)
    - Code Duplication: Average -15% duplicated code
    - Cyclomatic Complexity: Average -12% reduction
    - ESLint Errors: Average -67% reduction
    - Production Bugs (30-day window): Average -41% reduction after implementation
    """,
    
    # REPOSITORY CHARACTERISTICS
    "project_types": """
    - SaaS Web Applications: 5 projects (42%)
    - Internal APIs/Microservices: 3 projects (25%)
    - E-commerce Platforms: 2 projects (17%)
    - Content Management: 1 project (8%)
    - Data Analytics: 1 project (8%)
    """,
    
    "architecture_patterns": """
    - Monolithic full-stack: 7 projects
    - API + separate frontend: 4 projects
    - Serverless/JAMstack: 1 project
    
    Common architecture issues found:
    - Tight coupling between layers: 8/12 projects
    - Missing separation of concerns: 9/12 projects
    - Inadequate error boundaries: 11/12 projects
    """,
    
    "tech_ecosystems": """
    - JavaScript/TypeScript: 10 projects (83%)
    - Python: 2 projects (17%)
    - Ruby: 1 project (8%)
    
    - React/Next.js: 6 projects
    - Vue: 2 projects
    - Vanilla JS: 2 projects
    
    - PostgreSQL: 9 projects (75%)
    - MongoDB: 2 projects (17%)
    - MySQL: 1 project (8%)
    """,
    
    "maturity_levels": """
    Based on code quality, testing, documentation:
    
    - Early Stage (MVP): 4 projects
      * Acceptance rate for ideas: 12%
      * Most accepted: Performance quick wins
      * Most rejected: Infrastructure improvements
    
    - Growth Stage: 6 projects
      * Acceptance rate for ideas: 19%
      * Most accepted: Scalability improvements
      * Most rejected: Risky refactoring
    
    - Mature: 2 projects
      * Acceptance rate for ideas: 24%
      * Most accepted: Code quality, maintainability
      * Most rejected: New features
    """,
    
    # META-PATTERNS
    "learned_meta_patterns": """
    What the system has learned over time:
    
    1. Timing Matters
       - Suggestions about performance are 2.3x more likely to be accepted for projects in "growth stage"
       - Code quality suggestions are 3.1x more likely to be accepted for "mature" projects
       - Feature suggestions rarely accepted unless user explicitly mentioned the need
    
    2. Specificity Wins
       - Suggestions with specific metrics ("reduce query time by ~500ms") have 2.1x acceptance rate
       - Suggestions with code examples have 1.8x acceptance rate
       - Generic suggestions ("improve performance") have <5% acceptance rate
    
    3. Quick Wins Build Trust
       - After 3 accepted low-effort ideas, acceptance rate for complex ideas increases 2.7x
       - Users who reject first 5 suggestions tend to reject 85% of subsequent suggestions
    
    4. Context Is Everything
       - Suggestions aligned with recent git commits have 3.2x acceptance rate
       - Suggestions contradicting previous rejections have 1% acceptance rate
       - Suggestions that reference user's stated goals have 2.4x acceptance rate
    
    5. The "Too Much Work" Threshold
       - Ideas requiring >5 days of work: 9% acceptance rate
       - Ideas requiring 3-5 days: 24% acceptance rate
       - Ideas requiring 1-2 days: 54% acceptance rate
       - Ideas requiring <1 day: 68% acceptance rate
    """,
    
    "accuracy_trends": """
    System's ability to predict which ideas will be accepted:
    
    - Month 1-2: 23% prediction accuracy (baseline)
    - Month 3-4: 31% prediction accuracy (learning user patterns)
    - Month 5-6: 47% prediction accuracy (understanding project context)
    - Month 7-9: 58% prediction accuracy (meta-patterns emerging)
    
    Current prediction model uses:
    - User acceptance history: 35% weight
    - Effort estimation: 25% weight
    - Project maturity stage: 20% weight
    - Category preferences: 15% weight
    - Recent rejections similarity: 5% weight
    """,
    
    "strong_areas": """
    Where this system demonstrably excels:
    
    1. Database Performance Optimization
       - 94% success rate when implemented
       - Average 45% performance improvement
       - Often finds issues developers miss in manual review
    
    2. Low-Hanging Fruit Identification
       - Excellent at finding <1 day improvements
       - 68% acceptance rate in this category
       - High user satisfaction ("why didn't I see this?")
    
    3. Pattern Recognition Across Codebases
       - Identifies recurring anti-patterns
       - Cross-project learning improves suggestions
       - "Remembers" what worked before
    
    4. Context-Aware Prioritization
       - Gets better at ranking ideas by actual user preference
       - 58% accuracy in predicting acceptance (vs. random 17.5%)
       - Learns what each user/project cares about
    """,
    
    "weak_areas": """
    Where this system struggles or adds little value:
    
    1. Architectural Decision-Making
       - 88% rejection rate for architecture suggestions
       - Often suggests "best practices" that don't fit context
       - Lacks business context for technical trade-offs
    
    2. Feature Prioritization
       - 9% acceptance rate for new feature ideas
       - Usually suggests features user doesn't want/need
       - Can't understand product roadmap or user research
    
    3. Novel/Creative Solutions
       - Tends to suggest conventional approaches
       - Rarely suggests truly innovative solutions
       - Pattern-matching limits creativity
    
    4. Risk Assessment
       - Doesn't understand deployment risk, team expertise, or political factors
       - Can't judge "is this worth the migration pain?"
       - Lacks real-world implementation experience
    
    5. Business Context
       - Can't evaluate ROI beyond technical metrics
       - Doesn't understand customer impact
       - Misses opportunity cost considerations
    """,
}
```

---

## Condensed "Quick Reflection" Version

If you want a faster, lighter reflection for more frequent checks:
```
QUICK REFLECTION PROMPT

Analyze {total_scan_count} scans across {total_repo_count} repositories.

Acceptance rate: {acceptance_rate}%
Top category: {top_category}
Most common improvement: {most_common_theme}

Top 3 Accepted Ideas:
{top_3_accepted}

Top 3 Rejection Patterns:
{top_3_rejected}

QUICK ASSESSMENT:
1. Is acceptance rate trending up or down?
2. Are there 2-3 consistently valuable patterns?
3. Is this solving real problems or suggesting busywork?
4. One-sentence product viability: 

GO / PIVOT / NO-GO?
Reasoning in 2 sentences:

### Analysis
=== TIME-SAVING ANALYSIS ===

Quantified Time Savings from Implemented Ideas:
{time_savings_data}

Developer Time Investment vs. Ongoing Savings:
{roi_time_analysis}

Comparative Time Analysis (Manual vs. System):
{manual_vs_system_comparison}

=== COMPARATIVE WORLD ANALYSIS ===

For Each Major Pattern, Compare Against Existing Solutions:
{comparative_solutions_analysis}

Reinventing the Wheel Assessment:
{wheel_reinvention_check}

Unique Approaches vs. Standard Practices:
{unique_vs_standard}

=== CRITICAL EVALUATION ADDITIONS ===

In addition to the previous analysis, now evaluate:

7. **TIME-SAVING REALITY CHECK**
   
   For each major improvement theme, calculate:
   
   a) Time to Implement the Suggestion
      - How long does it take to implement this idea?
      - What's the learning curve if developer is unfamiliar?
   
   b) Time Saved Over Next 12 Months
      - Developer time saved (faster development)
      - Debugging time saved (fewer bugs)
      - Maintenance time saved (easier to maintain)
      - User time saved (better performance/UX)
   
   c) ROI Calculation
      - Time saved ÷ Time invested = ROI ratio
      - Break-even point (when does this pay for itself?)
      - Net time saved over 1 year, 2 years, 5 years
   
   d) Compound Effects
      - Does this enable future improvements more easily?
      - Does this prevent future technical debt?
      - Does this create reusable patterns?

8. **REINVENTING THE WHEEL CHECK**
   
   For each accepted idea category, honestly assess:
   
   a) Existing Solutions
      - What tools/libraries/services already solve this?
      - How mature and widely adopted are they?
      - What's the typical implementation time?
   
   b) Build vs. Buy Analysis
      - Would using an existing solution be faster?
      - What's the total cost of ownership comparison?
      - What's lost by not building custom?
   
   c) Overcomplication Assessment
      - Is the suggested solution simpler or more complex than alternatives?
      - Are we adding complexity for marginal gains?
      - Is there a 20% solution that gets 80% of the benefit?
   
   d) Standard Practice vs. Innovation
      - Is this a well-known best practice? (If yes, why wasn't it done already?)
      - Is this a novel approach? (If yes, what's the risk?)
      - Is this solving a problem that shouldn't exist? (Architecture issue?)

9. **ALTERNATIVE APPROACHES COMPARISON**
   
   For top 5 most common improvement themes, compare:
   
   | Theme | Our Approach | Alternative 1 | Alternative 2 | Alternative 3 | Why Ours Might Be Better/Worse |
   |-------|--------------|---------------|---------------|---------------|-------------------------------|
   
   Be specific about:
   - Implementation time for each approach
   - Maintenance burden of each approach
   - Learning curve for team
   - Long-term flexibility
   - Industry adoption of each approach
   - Risk profile of each approach

10. **"ARE WE BUILDING SOMETHING SPECIAL?" TEST**
    
    Answer these critical questions with brutal honesty:
    
    a) The "So What?" Test
       - User says: "I could just use [existing tool X]"
       - Your response: ___________
       - Is that response compelling? YES/NO
    
    b) The "Developer's Perspective" Test
       - Would a senior developer say "I could have thought of that in 5 minutes"?
       - What percentage of suggestions are truly non-obvious?
       - What percentage require deep domain knowledge to generate?
    
    c) The "Time Travel" Test
       - If you could go back 6 months, would having this system have saved significant time?
       - Estimate total hours saved across all projects
       - Compare to hours spent building/maintaining this system
    
    d) The "Unique Insight" Test
       - What does this system know that a developer with:
         * 5 years experience wouldn't know?
         * Static analysis tools can't detect?
         * ChatGPT/Claude without context couldn't suggest?
       - Be specific with examples
    
    e) The "Compound Value" Test
       - Does the system get smarter with more data? (Evidence?)
       - Is the 1000th suggestion better than the 10th? (How?)
       - What proprietary knowledge accumulates that can't be replicated?

11. **ALTERNATIVE SOLUTION LANDSCAPE**
    
    Map where this system sits in the existing solution space:
    
    **Existing Solutions Analysis:**
    
    | Solution Type | Examples | Time to Value | Cost | What They Do Well | What They Miss | Our Differentiation |
    |---------------|----------|---------------|------|-------------------|----------------|---------------------|
    | Static Analysis | ESLint, SonarQube, CodeClimate | Immediate | Free-$$ | Code quality, security | Context-blind, no learning | ? |
    | AI Code Assistants | GitHub Copilot, Cursor, Cody | Immediate | $$-$$$ | Code generation, autocomplete | No project memory, no learning | ? |
    | Code Review Tools | Reviewable, Codacy, Pull Panda | Per PR | $-$$ | Human-style review | Manual, no automation | ? |
    | Performance Monitoring | New Relic, DataDog, Sentry | Ongoing | $$$-$$$$ | Production insights | Reactive, not preventive | ? |
    | Architecture Analysis | Structure101, Lattix | Per analysis | $$$ | Deep arch insights | Not actionable, complex | ? |
    | Custom Scripts | Roll your own | High upfront | Time | Exactly what you need | Maintenance burden | ? |
    | Manual Code Review | Senior devs | Per review | $$$$ | Human judgment, context | Expensive, inconsistent | ? |
    
    **Critical Questions:**
    - Which quadrant are we in? (High value + differentiated? Or crowded commodity?)
    - What combination of existing tools could replace this system?
    - What would that combination cost in $ and time?
    - What would be lost by using that combination instead?

12. **THE "SPECIAL SAUCE" IDENTIFICATION**
    
    If this system IS special, identify the specific mechanism:
    
    **Is the value in:**
    
    □ Learning from accept/reject patterns (personalization)
       - Evidence: {acceptance_prediction_accuracy}
       - Competitive moat strength: LOW/MEDIUM/HIGH
       - Why: ___________
    
    □ Cross-project pattern recognition
       - Evidence: {cross_project_insights}
       - Competitive moat strength: LOW/MEDIUM/HIGH
       - Why: ___________
    
    □ Context-aware suggestions (understands project goals)
       - Evidence: {context_awareness_examples}
       - Competitive moat strength: LOW/MEDIUM/HIGH
       - Why: ___________
    
    □ Compound knowledge over time
       - Evidence: {knowledge_accumulation_metrics}
       - Competitive moat strength: LOW/MEDIUM/HIGH
       - Why: ___________
    
    □ Low-effort, high-impact identification
       - Evidence: {quick_wins_success_rate}
       - Competitive moat strength: LOW/MEDIUM/HIGH
       - Why: ___________
    
    □ Something else: ___________
       - Evidence: ___________
       - Competitive moat strength: LOW/MEDIUM/HIGH
       - Why: ___________
    
    **Or is the value primarily:**
    □ Convenience (existing solutions exist but are fragmented)
    □ Cost (free alternative to expensive tools)
    □ Integration (works with specific workflow)
    □ Personal preference (no fundamental advantage)

13. **TIME-SAVING CREDIBILITY CHECK**
    
    Validate time-saving claims against reality:
    
    **For claimed time savings, verify:**
    
    a) Is the "before" time accurate?
       - Are we measuring actual developer time or guessing?
       - Does it account for context switching, debugging, deployment?
    
    b) Is the "after" time realistic?
       - Are we accounting for implementation time?
       - Are we accounting for maintenance overhead?
       - Are we accounting for learning curve?
    
    c) Are we measuring the right thing?
       - Developer time saved vs. just shifted
       - One-time savings vs. recurring savings
       - Individual savings vs. team savings
    
    d) Baseline comparison
       - Time saved vs. not doing it at all (sometimes that's OK)
       - Time saved vs. using an existing tool
       - Time saved vs. a simpler approach
    
    **Realistic Time-Saving Score:**
    - Claimed annual time saved: {claimed_hours}
    - Realistic annual time saved (after adjustments): {realistic_hours}
    - Credibility ratio: {realistic/claimed}%

=== ENHANCED OUTPUT FORMAT ===

Add these sections to the JSON output:

{
  ... (previous sections) ...,
  
  "time_saving_analysis": {
    "total_claimed_hours_saved": 0,
    "total_realistic_hours_saved": 0,
    "credibility_score": 0.0,
    "roi_by_category": [
      {
        "category": "Performance optimization",
        "avg_implementation_hours": 0,
        "avg_ongoing_savings_per_year": 0,
        "roi_ratio": 0.0,
        "break_even_months": 0,
        "confidence": "low/medium/high"
      }
    ],
    "compound_effects": [
      "Specific examples of how improvements enable future work"
    ]
  },
  
  "reinventing_wheel_assessment": {
    "categories_reinventing_wheel": [
      {
        "category": "Category name",
        "existing_solutions": ["Tool 1", "Tool 2"],
        "our_approach_comparison": "Honest assessment",
        "verdict": "REINVENTING / JUSTIFIED / UNIQUE",
        "reasoning": "Why this verdict"
      }
    ],
    "overcomplication_score": 1-10,
    "overcomplication_examples": ["Specific examples"]
  },
  
  "alternative_approaches": [
    {
      "improvement_theme": "Theme name",
      "our_approach": {
        "description": "What we suggest",
        "implementation_time": "X hours/days",
        "maintenance_burden": "low/medium/high",
        "learning_curve": "low/medium/high"
      },
      "alternative_1": {
        "description": "Alternative approach",
        "implementation_time": "X hours/days",
        "pros": ["..."],
        "cons": ["..."]
      },
      "alternative_2": { /* same structure */ },
      "recommendation": "OURS / ALTERNATIVE_1 / ALTERNATIVE_2",
      "reasoning": "Why this is the best choice"
    }
  ],
  
  "special_sauce_evaluation": {
    "is_this_special": true/false,
    "confidence": "low/medium/high",
    "unique_mechanisms": [
      {
        "mechanism": "What makes this unique",
        "evidence": "Data supporting this",
        "competitive_moat": "low/medium/high",
        "replicability": "How easily could competitors copy this?"
      }
    ],
    "primary_value_driver": "personalization / pattern_recognition / context_awareness / compound_learning / convenience / cost / other",
    "honest_assessment": "Is this genuinely special or just a nice personal tool?"
  },
  
  "existing_solution_comparison": {
    "closest_alternatives": [
      {
        "solution": "Tool name",
        "type": "Static analysis / AI assistant / etc.",
        "cost": "$X/month",
        "time_to_value": "X hours",
        "strengths": ["..."],
        "weaknesses": ["..."],
        "why_users_might_choose_us": "Honest assessment or 'They wouldn't'",
        "why_users_might_choose_them": "Honest assessment"
      }
    ],
    "combination_that_replaces_us": {
      "tools": ["Tool 1", "Tool 2"],
      "total_cost": "$X/month",
      "setup_time": "X hours",
      "what_this_combination_misses": "Honest assessment or 'Nothing significant'"
    }
  },
  
  "so_what_test_results": {
    "developer_objection": "I could just use [tool X]",
    "our_response": "Your compelling response",
    "is_response_compelling": true/false,
    "why_or_why_not": "Honest assessment"
  },
  
  "time_travel_test": {
    "would_past_self_want_this": true/false,
    "estimated_total_hours_saved": 0,
    "hours_invested_building": 0,
    "net_time_saved": 0,
    "verdict": "Worth it / Break even / Time sink"
  },
  
  "non_obvious_insights_percentage": {
    "senior_dev_would_know": 0.0,
    "requires_deep_analysis": 0.0,
    "truly_novel_suggestions": 0.0,
    "assessment": "Honest evaluation of insight quality"
  },
  
  "final_verdict_on_specialness": {
    "is_this_building_something_special": true/false,
    "confidence_level": "low/medium/high",
    "key_differentiator": "The ONE thing that makes this special, if anything",
    "biggest_risk": "What could make this not special",
    "evidence_quality": "How strong is the evidence for specialness?",
    "recommendation": "PURSUE / PIVOT / PERSONAL_TOOL_ONLY"
  }
}

=== REFLECTION PRINCIPLES ===

BRUTAL COMPARISON:
- For every suggestion type, identify if existing tools do this already
- Don't claim uniqueness without specific evidence
- Acknowledge when we're just repackaging known solutions
- Recognize when simple alternatives exist

TIME-SAVING REALISM:
- Developer time is expensive, but not all suggestions save time
- Implementation time is often underestimated
- Maintenance costs compound over time
- Context switching and learning curves are real costs

AVOID FALSE SPECIALNESS:
- "It learns from you" - so does every personalized tool
- "It understands your codebase" - so do many analysis tools
- "It saves time" - measure it honestly against alternatives
- "It's AI-powered" - that's not a differentiator anymore

EVIDENCE OVER ENTHUSIASM:
- Every claim needs data from the memories
- If acceptance rate is low, that's a red flag
- If existing tools do this better, admit it
- If this is just convenient, say so (convenience has value!)

THE ULTIMATE QUESTION:
Would a rational developer choose this over spending 30 minutes researching and using existing tools?
If yes: What's the specific reason? (This is your product)
If no: This should stay a personal productivity tool