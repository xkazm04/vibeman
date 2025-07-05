import { AnimatePresence, motion } from "framer-motion";
import { Plus } from "lucide-react";
import { Project } from "@/types";
import { useState } from "react";

type Props = {
    showAddProject: boolean;
    setShowAddProject: (showAddProject: boolean) => void;
    newProject: any;
    setNewProject: (newProject: Partial<Project>) => void;
    addProject: (project: Project) => void;
    projects: Project[];
}

const RunnerAdd = ({ showAddProject, setShowAddProject, newProject, setNewProject, addProject, projects }: Props) => {
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleAddProject = async () => {
        if (newProject.name && newProject.path && newProject.port) {
            // Check for duplicate paths
            const existingProject = projects.find(p => p.path === newProject.path);
            if (existingProject) {
                alert(`A project with the same path already exists: ${existingProject.name}`);
                return;
            }
            
            // Check for duplicate ports
            const existingPort = projects.find(p => p.port === newProject.port);
            if (existingPort) {
                alert(`Port ${newProject.port} is already in use by: ${existingPort.name}`);
                return;
            }
            
            setIsSubmitting(true);
            try {
                const id = `project-${Date.now()}`;
                await addProject({
                    id,
                    name: newProject.name,
                    path: newProject.path,
                    port: newProject.port,
                    description: newProject.description || ''
                } as Project);
                setNewProject({ name: '', path: '', port: 3000, description: '' });
                setShowAddProject(false);
            } catch (error) {
                alert(error instanceof Error ? error.message : 'Failed to add project');
            } finally {
                setIsSubmitting(false);
            }
        }
    };

    return <>
        <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowAddProject(!showAddProject)}
            className="w-full p-3 bg-gray-800/50 border border-gray-700 border-dashed rounded-lg flex items-center justify-center gap-2 text-gray-400 hover:text-gray-100 hover:border-gray-600 transition-all"
        >
            <Plus size={16} />
            <span className="text-sm">Add Project</span>
        </motion.button>

        {/* Add Project Form */}
        <AnimatePresence>
            {showAddProject && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-gray-800/50 rounded-lg p-3 space-y-2"
                >
                    <input
                        type="text"
                        placeholder="Project Name"
                        value={newProject.name}
                        onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                        className="w-full px-2 py-1 text-xs bg-gray-900 border border-gray-700 rounded text-gray-100 placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                    />
                    <input
                        type="text"
                        placeholder="Project Path"
                        value={newProject.path}
                        onChange={(e) => setNewProject({ ...newProject, path: e.target.value })}
                        className="w-full px-2 py-1 text-xs bg-gray-900 border border-gray-700 rounded text-gray-100 placeholder-gray-500 focus:border-blue-500 focus:outline-none font-mono"
                    />
                    <input
                        type="number"
                        placeholder="Port"
                        value={newProject.port}
                        onChange={(e) => setNewProject({ ...newProject, port: parseInt(e.target.value) })}
                        className="w-full px-2 py-1 text-xs bg-gray-900 border border-gray-700 rounded text-gray-100 placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                    />
                    <div className="flex gap-1">
                        <button
                            onClick={handleAddProject}
                            disabled={isSubmitting}
                            className="flex-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? 'Adding...' : 'Add'}
                        </button>
                        <button
                            onClick={() => setShowAddProject(false)}
                            disabled={isSubmitting}
                            className="flex-1 px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Cancel
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    </>
}

export default RunnerAdd;