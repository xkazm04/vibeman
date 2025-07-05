import { Project } from '@/types';
import { getAllProjects as getDefaultProjects } from '@/lib/config';
import fs from 'fs';
import path from 'path';

// Server-side project configuration service
class ProjectService {
  private static instance: ProjectService;
  private projectsFilePath: string;
  private initialized = false;
  
  private constructor() {
    // Store projects in a JSON file for server-side persistence
    this.projectsFilePath = path.join(process.cwd(), 'projects.json');
  }
  
  static getInstance(): ProjectService {
    if (!ProjectService.instance) {
      ProjectService.instance = new ProjectService();
    }
    return ProjectService.instance;
  }
  
  private async initialize(): Promise<void> {
    if (this.initialized) return;
    
    try {
      // If file doesn't exist, create it with default projects
      if (!fs.existsSync(this.projectsFilePath)) {
        console.log('ProjectService: Creating projects.json with default projects');
        const defaultProjects = getDefaultProjects();
        this.saveProjects(defaultProjects);
      }
      this.initialized = true;
    } catch (error) {
      console.error('ProjectService initialization error:', error);
    }
  }
  
  private loadProjects(): Project[] {
    try {
      if (fs.existsSync(this.projectsFilePath)) {
        const data = fs.readFileSync(this.projectsFilePath, 'utf8');
        const projects = JSON.parse(data);
        console.log('ProjectService: Loaded projects from file:', projects.map((p: Project) => ({ id: p.id, name: p.name, port: p.port })));
        return projects;
      }
    } catch (error) {
      console.error('Error loading projects from file:', error);
    }
    
    // Return default projects if file doesn't exist or can't be read
    const defaultProjects = getDefaultProjects();
    console.log('ProjectService: Using default projects:', defaultProjects.map(p => ({ id: p.id, name: p.name, port: p.port })));
    return defaultProjects;
  }
  
  private saveProjects(projects: Project[]): void {
    try {
      console.log('ProjectService: Saving projects to file:', projects.map(p => ({ id: p.id, name: p.name, port: p.port })));
      fs.writeFileSync(this.projectsFilePath, JSON.stringify(projects, null, 2));
    } catch (error) {
      console.error('Error saving projects to file:', error);
    }
  }
  
  async getAllProjects(): Promise<Project[]> {
    await this.initialize();
    return this.loadProjects();
  }
  
  async getProject(projectId: string): Promise<Project | undefined> {
    await this.initialize();
    const projects = this.loadProjects();
    const project = projects.find(p => p.id === projectId);
    console.log(`ProjectService: Looking for project ${projectId}, found:`, project ? { id: project.id, name: project.name, port: project.port } : null);
    return project;
  }
  
  async addProject(project: Project): Promise<void> {
    await this.initialize();
    const projects = this.loadProjects();
    
    // Check for duplicate paths
    const existingProject = projects.find(p => p.path === project.path);
    if (existingProject) {
      throw new Error(`A project with the same path already exists: ${existingProject.name}`);
    }
    
    // Check for duplicate ports
    const existingPort = projects.find(p => p.port === project.port);
    if (existingPort) {
      throw new Error(`Port ${project.port} is already in use by: ${existingPort.name}`);
    }
    
    projects.push(project);
    this.saveProjects(projects);
  }
  
  async updateProject(projectId: string, updates: Partial<Project>): Promise<void> {
    await this.initialize();
    const projects = this.loadProjects();
    const index = projects.findIndex(p => p.id === projectId);
    
    if (index === -1) {
      throw new Error('Project not found');
    }
    
    projects[index] = { ...projects[index], ...updates };
    this.saveProjects(projects);
  }
  
  async removeProject(projectId: string): Promise<void> {
    await this.initialize();
    const projects = this.loadProjects();
    const filteredProjects = projects.filter(p => p.id !== projectId);
    
    if (filteredProjects.length === projects.length) {
      throw new Error('Project not found');
    }
    
    this.saveProjects(filteredProjects);
  }
  
  async resetToDefaults(): Promise<void> {
    const defaultProjects = getDefaultProjects();
    this.saveProjects(defaultProjects);
  }
}

export const projectService = ProjectService.getInstance(); 