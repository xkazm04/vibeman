![Vibeman](public\logo\vibeman_logo.png)

> **Transform your development workflow with intelligent automation, real-time monitoring, and AI-driven insights**

## 🎯 Business Overview

**Vibeman** is a revolutionary AI-powered development management platform that bridges the gap between project planning and execution. It transforms how development teams manage multiple projects, track progress, and collaborate with AI agents to accelerate development cycles.

---
**DISCLAIMER: LOCALHOST ONLY**
- frontend is desgined to directly interact with local code repositories for the maximum efficiency and security
- agentic analytics layer is handled by **n8n** workflows and can be deployed with n8n workflows via [Vultr](\docs\vultr.md)
---

### 🔥 What Makes Vibe Special

- **🤖 AI Agent Orchestration**: Specialized AI agents (Developer, Analyst, Tester, Artist) powered by Groq, that analyze your codebase and generate actionable insights
- **📊 Multi-Project Management**: Run and monitor multiple development servers simultaneously with intelligent resource allocation
- **🔄 Real-time Synchronization**: Live updates across all project components with WebSocket-powered real-time monitoring
- **🎯 Goal-Driven Development**: Visual timeline management that keeps teams focused on deliverables
- **📈 Intelligent Backlog**: AI-generated proposals and custom task management with impact analysis
- **🌐 GitHub Copilot Integration**: Seamless task creation and workflow automation through n8n webhooks
- **🔍 Code Structure Visualization**: Interactive file tree exploration with intelligent filtering and search


### 🌐 Integration Ecosystem
![architecture](public\archi.png)
- **Local management**: All files and servers are accessible locally for direct manipulation via NextJS management UI
- **n8n Workflow Automation**: Extensible webhook system for custom integrations to Groq LLM models, Gitub automations and embedding mechanism

## 🏆 Competitive Advantages

1. **🎯 Unified Workspace**: Single platform for project management, code analysis, and AI collaboration
2. **⚡ Real-time Everything**: Live updates, instant feedback, and immediate synchronization
3. **🤖 AI-First Approach**: Built from the ground up with AI agents as first-class citizens
4. **🔄 Workflow Automation**: Seamless integration with existing development tools and processes
5. **📈 Scalable Architecture**: Designed to handle multiple projects and teams simultaneously

## 🛠️ Technology Stack

### Frontend
- **Next.js 15.3.5** - React framework with App Router
- **TypeScript 5.0** - Type-safe development
- **Tailwind CSS 4.0** - Utility-first styling
- **Framer Motion 12.23** - Smooth animations and transitions

### Backend & Database
- **Supabase** - Real-time PostgreSQL database
- **TanStack Query 5.81** - Powerful data synchronization
- **Zustand 5.0** - Lightweight state management
- **Node.js Process Management** - Server lifecycle control

## 📦 Dependencies & Installation

### Prerequisites
- **Node.js 18+** (LTS recommended)
- **npm or yarn** package manager
- **Git** for version control
- **Supabase account** for database services

### Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd vibe
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment setup**
   ```bash
   cp .env.example .env.local
   ```
   
   Configure your environment variables:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

4. **Database setup**
   ```bash
   # Run the SQL scripts in your Supabase dashboard
   # 1. Execute vibe/database/schema.sql
   # 2. Execute vibe/database/flow_events.sql
   # 3. Enable realtime: ALTER PUBLICATION supabase_realtime ADD TABLE flow_events;
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   ```
   http://localhost:3000
   ```

### Production Deployment

```bash
# Build for production
npm run build

# Start production server
npm start
```