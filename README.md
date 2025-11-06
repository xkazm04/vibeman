# Vibeman

![Vibeman](public/logo/vibeman_logo.png)

> *Transform your development workflow with intelligent automation, real-time monitoring, and AI-driven insights*

## Goal
To boost personal productivity in SW development 100x - 1000x by using AI for operations throughout whole lifecycle
- **Planning** -> Idea brainstorming and task refinement
- **Code analysis** -> Static analysis technique + LLM evaluation
- **Implementation** -> Multistream batch code pipelines powered by **Claude Code** 
- **Tests** -> Automated tests in package, so we can focus on pure development

### Challenges
1. **How to generate valuable and creative ideas** 
- By proper feature separation into **Contexts** with defined structure and solid documentation. 
- By multidimensional analysis, using AI agents in 10 different roles (prompts) looking at the feature's opportunities from different perspectives
2. **How to produce 1000x code then myself in reasonable quality**
- Let **Claude Code** cook, it can do it if each requirement file is well generated and skills defined to follow codebase's best practices. **PRECONDITION:** Claude Code MAX plan needed for power usage = autonomous running whole day in one or multiple threads to develop more codebases at once.
3. **How to mentally manage such rapid development**
- UI to wrap complex scans into simple experience, provide valuable development metrics and easy options to overview and handle multiple projects at once
- AI assistant to periodically scan and plan next steps on behalf of user -> User has to become "high level manager" in this environment = decisions based on results, not on the solution detail -> we need to be able to rely on AI mass development won't go sideways








## 🏗️ Architecture

### **Frontend Stack**
- **Next.js 16** for all round client and server operations relying on interactions with local files. Unsafe to run outside the localhost but simple and efficient architecture for static analysis and direct manipulation with the codebase. 
- **TypeScript** for type-safe development
- **Tailwind CSS** for responsive, utility-first styling
- **Framer Motion** for smooth animations and transitions
- **Zustand** for lightweight state management

### **Backend & Data**
- **SQLite** with Better-SQLite3 for local data persistence
- **LLM Integration** multi-LLM provider for less complex operations in terms of iterations (one-shot prompts, AI assistant). Supported: Gemini Flash latest, Claude Haiku 4.5, GPT 5, **Ollama with gpt-oss:20** (go to solution for )
- **Model Context Protocol** for extensible AI integrations

### **Development Tools**
- **Monaco Editor** for in-browser code editing
- **React Syntax Highlighter** for code display
- **Markdown Rendering** with GitHub Flavored Markdown support
- **Resizable Panels** for flexible UI layouts

## 🎯 Core Workflows

### **Project Onboarding**
1. **Project Discovery**: Automatically scan and analyze project structure
2. **AI Analysis**: Generate comprehensive project insights and recommendations
3. **Goal Setting**: Define development objectives and milestones
4. **Context Creation**: Organize files into logical groups for better understanding

### **Development Process**
1. **Code Editing**: Use the integrated Monaco editor for file modifications
2. **Real-Time Monitoring**: Track server status and development progress
3. **AI Assistance**: Get intelligent suggestions for code improvements
4. **Review & Collaboration**: Use the built-in review system for code quality

### **Task Management**
1. **Background Processing**: Queue AI-powered tasks for efficient execution
2. **Progress Tracking**: Monitor task status with real-time updates
3. **Error Handling**: Automatic retry logic with detailed error reporting
4. **Result Integration**: Seamlessly integrate AI-generated content into projects

## 🛠️ Getting Started

### **Prerequisites**
- Node.js 18+ 
- npm or yarn package manager
- Git for repository management

### **Installation**
```bash
# Clone the repository
git clone <repository-url>
cd vibeman

# Install dependencies
npm install

# Start development server
npm run dev
```

### **Configuration**
1. **Environment Setup**: Configure API keys for AI services (OpenAI, etc.)
2. **Project Paths**: Set up base paths for project discovery
3. **Database**: SQLite databases are created automatically on first run
4. **Port Configuration**: Configure default ports for development servers

## 📊 System Components

### **Core Modules**
- **Project Service**: Multi-project configuration and management
- **Process Manager**: Development server lifecycle management
- **Background Tasks**: Queued AI processing system
- **Context Engine**: File organization and relationship mapping
- **Git Manager**: Repository operations and synchronization

### **AI Integration**
- **Content Generation**: Automated documentation and task creation
- **Code Analysis**: Project structure analysis and optimization
- **Review System**: AI-powered code review and suggestions
- **Context Understanding**: Intelligent file relationship detection

### **User Interface**
- **Unified Dashboard**: Central hub for all development activities
- **Combined Panels**: Integrated events and task monitoring
- **Responsive Design**: Optimized for various screen sizes
- **Real-Time Updates**: Live status updates without page refresh

## 🔧 Advanced Features

### **Background Task System**
- **Queue Management**: Efficient task processing with priority support
- **Retry Logic**: Automatic retry for failed operations
- **Progress Monitoring**: Real-time task status updates
- **Resource Management**: Intelligent resource allocation and cleanup

### **Context Management**
- **File Grouping**: Organize related files into logical contexts
- **AI-Generated Contexts**: Automatically create context files from project analysis
- **Metadata Extraction**: Intelligent parsing of file relationships
- **Database Integration**: Persistent storage of context information

### **Development Server Management**
- **Multi-Instance Support**: Run multiple instances of the same project
- **Port Management**: Automatic port allocation and conflict resolution
- **Process Monitoring**: Real-time server status and log monitoring
- **Auto-Recovery**: Automatic restart on failure with configurable retry

## 🚦 Status & Roadmap

### **Current Status: In Progress**
- ✅ Core project management functionality
- ✅ AI-powered content generation
- ✅ Background task processing system
- ✅ Real-time monitoring and updates
- ✅ Integrated development environment

*Vibeman - Elevating development workflows through intelligent automation and seamless integration.*