# Vibeman

![Vibeman](public/logo/vibeman_logo.png)

> *Transform your development workflow with intelligent automation, real-time monitoring, and AI-driven insights*

## Goal
To boost personal productivity in SW development 100x - 1000x by using AI for operations throughout whole lifecycle
- Planning
- Code analysis
- Implementation 
- Tests

## Overview

Vibeman is an intelligent development workflow platform that combines AI-powered automation, real-time project monitoring, and collaborative development tools. Built with Next.js and TypeScript, it provides developers with a comprehensive suite of tools to streamline project management, code review, and development processes.

## 🚀 Key Features

### **AI-Powered Development Assistant**
- **Intelligent Code Analysis**: Automated project structure analysis and optimization recommendations
- **Context-Aware Documentation**: AI-generated project documentation, goals, and task recommendations
- **Smart Code Review**: Automated code review with AI-powered suggestions and improvements
- **Background Task Processing**: Queued AI operations that run efficiently without blocking the UI

### **Project Management & Monitoring**
- **Multi-Project Support**: Manage multiple development projects with individual configurations
- **Real-Time Server Monitoring**: Live status tracking for development servers with port management
- **Git Integration**: Automated repository cloning, branch management, and sync capabilities
- **Process Management**: Start, stop, and monitor development servers with detailed logging

### **Collaborative Development Tools**
- **Interactive File Explorer**: Visual project structure with intelligent file categorization
- **Context Management**: Organize and group related files for better project understanding
- **Goal Tracking**: Set, track, and manage development objectives with status monitoring
- **Event Logging**: Comprehensive activity tracking with real-time updates

### **Advanced Code Editor**
- **Monaco Editor Integration**: Full-featured code editing with syntax highlighting
- **Multi-File Editing**: Side-by-side file comparison and editing capabilities
- **Diff Viewer**: Visual code differences with merge capabilities
- **File Management**: Create, edit, and organize project files directly in the interface

## 🏗️ Architecture

### **Frontend Stack**
- **Next.js 15** with React 19 for modern web application framework
- **TypeScript** for type-safe development
- **Tailwind CSS** for responsive, utility-first styling
- **Framer Motion** for smooth animations and transitions
- **Zustand** for lightweight state management
- **React Query** for efficient data fetching and caching

### **Backend & Data**
- **SQLite** with Better-SQLite3 for local data persistence
- **Vector Databases** (Pinecone, Qdrant, ChromaDB) for AI-powered search
- **OpenAI Integration** for AI-powered features
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