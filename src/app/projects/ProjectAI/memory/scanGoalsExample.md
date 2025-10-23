# Example data structure for filling the template

template_data = {
    # PROJECT CONTEXT
    "repo_name": "my-blog-platform",
    "repo_description": "A fast, SEO-friendly blog platform built with Next.js",
    "repo_goal": "Provide the fastest possible blog experience with excellent SEO and easy content management",
    "last_scan_date": "2025-10-15",
    
    # CURRENT TASK
    "scan_type": "performance",  # or: functionality, ui, maintenance, code_quality, user_benefit
    "scan_scope_description": "Analyzing API routes and database queries for performance bottlenecks",
    
    # DOCUMENTATION
    "doc_architecture": """
    - Next.js 14 with App Router
    - PostgreSQL database with Prisma ORM
    - Redis for caching
    - Deployed on Vercel
    - Image optimization via Cloudinary
    """,
    
    "doc_features": """
    Core Features:
    - Markdown blog post editor
    - SEO optimization with meta tags
    - Image upload and optimization
    - Comment system
    - RSS feed generation
    - Full-text search
    """,
    
    "doc_readme": """
    Fast blog platform focusing on performance and SEO.
    Tech stack: Next.js, PostgreSQL, Redis, Tailwind CSS.
    Target: Sub-2s page loads, 95+ Lighthouse score.
    """,
    
    "recent_git_changes": """
    - Added image lazy loading (3 days ago)
    - Optimized database indexes on posts table (1 week ago)
    - Implemented Redis caching for homepage (2 weeks ago)
    """,
    
    # HISTORICAL MEMORY
    "recent_scans": """
    1. [2025-10-15] Performance scan: Found 3 optimization opportunities in API routes
    2. [2025-10-10] UI scan: Identified 5 accessibility improvements needed
    3. [2025-10-05] Code quality scan: Suggested TypeScript strict mode enablement
    4. [2025-09-28] Functionality scan: Proposed draft post feature
    5. [2025-09-20] User benefit scan: Recommended social sharing buttons
    """,
    
    "accepted_ideas": """
    [Idea #47] Enable TypeScript strict mode
    - Category: code_quality
    - Status: Accepted, not yet implemented
    - Reasoning: Will catch more bugs at compile time
    
    [Idea #52] Add draft post functionality
    - Category: functionality
    - Status: Accepted, partially implemented
    - Reasoning: User requested feature for content workflow
    
    [Idea #58] Implement optimistic UI for comments
    - Category: ui
    - Status: Accepted, not yet implemented
    - Reasoning: Improves perceived performance
    """,
    
    "rejected_ideas": """
    [Idea #23] Migrate from PostgreSQL to MongoDB
    - Category: performance
    - Reason: Too much migration effort, current DB performs well
    - Date: 2025-09-15
    
    [Idea #31] Implement real-time collaborative editing
    - Category: functionality
    - Reason: Not aligned with project goals, adds complexity
    - Date: 2025-09-22
    
    [Idea #44] Add GraphQL API layer
    - Category: performance
    - Reason: REST API is sufficient, GraphQL overhead not justified
    - Date: 2025-10-08
    
    [Idea #49] Use Server-Sent Events for live updates
    - Category: functionality
    - Reason: Polling is sufficient for current use case
    - Date: 2025-10-12
    """,
    
    # USER PREFERENCES
    "user_preference_patterns": """
    Based on 15 evaluations across 3 projects:
    - Strongly prefers simple solutions over complex architectures (12/15 times)
    - Values performance improvements with <2 day implementation (10/15 times)
    - Rejects suggestions requiring major refactoring (8/10 times)
    - Accepts accessibility improvements consistently (5/5 times)
    - Prefers built-in solutions over adding new dependencies (7/9 times)
    """,
    
    # CROSS-PROJECT INSIGHTS
    "cross_project_patterns": """
    Insights from 3 analyzed projects:
    - Database query optimization yielded 40% performance gains (project: api-service)
    - Image lazy loading improved Lighthouse score by 15 points (project: e-commerce-site)
    - Implementing proper error boundaries reduced crash reports by 60% (project: dashboard-app)
    """,
    
    # CODE TO ANALYZE
    "code_files_content": """
    === FILE: app/api/posts/route.ts ===
    import { prisma } from '@/lib/db';
    
    export async function GET() {
      const posts = await prisma.post.findMany({
        include: {
          author: true,
          comments: true,
          tags: true
        },
        orderBy: { createdAt: 'desc' }
      });
      
      return Response.json(posts);
    }
    
    === FILE: app/api/posts/[id]/route.ts ===
    import { prisma } from '@/lib/db';
    
    export async function GET(req: Request, { params }: { params: { id: string } }) {
      const post = await prisma.post.findUnique({
        where: { id: params.id },
        include: {
          author: true,
          comments: {
            include: {
              author: true
            }
          },
          tags: true
        }
      });
      
      if (!post) {
        return Response.json({ error: 'Not found' }, { status: 404 });
      }
      
      return Response.json(post);
    }
    
    === FILE: components/PostList.tsx ===
    'use client';
    
    export function PostList({ posts }) {
      return (
        <div>
          {posts.map(post => (
            <article key={post.id}>
              <img src={post.coverImage} alt={post.title} />
              <h2>{post.title}</h2>
              <p>{post.excerpt}</p>
              <span>{post.author.name}</span>
              <span>{post.comments.length} comments</span>
            </article>
          ))}
        </div>
      );
    }
    """
}
```

---

## Simplified Template (If Token Budget is Tight)

If you need a more compact version:
```
ANALYZE: {repo_name} - {scan_type}
GOAL: {repo_goal}

AVOID (Rejected):
{rejected_ideas}

BUILD ON (Accepted):
{accepted_ideas}

USER PREFERS:
{user_preference_patterns}

CODE:
{code_files_content}

OUTPUT: JSON array with title, category, description, reasoning, priority (1-5), effort (low/medium/high)
Provide 3-5 suggestions.