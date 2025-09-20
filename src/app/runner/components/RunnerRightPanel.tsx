import { useEffect, useState } from "react";
import { Book, Code, Github, Tv, ChevronDown, ChevronUp } from "lucide-react";

interface ProjectOverviewItem {
    id: string;
    name: string;
    path: string;
    port: number;
    type: string;
    git?: {
        repository: string;
        branch: string;
    };
}

const RunnerRightPanel = () => {
    const [projects, setProjects] = useState<ProjectOverviewItem[]>([]);
    const [loading, setLoading] = useState(true);

    // Fetch projects from API
    useEffect(() => {
        const fetchProjects = async () => {
            try {
                const response = await fetch('/api/projects');
                if (response.ok) {
                    const data = await response.json();
                    setProjects(data.projects || []);
                }
            } catch (error) {
                console.error('Failed to fetch projects:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchProjects();
    }, []);

    const truncateName = (name: string, maxLength: number = 10) => {
        return name.length > maxLength ? name.substring(0, maxLength) + '...' : name;
    };

    return (
        <div className="bg-gray-900/50 border border-gray-700 rounded-lg min-w-[300px] max-w-[400px]">
            {/* Header */}
            <div
                className="flex items-center justify-between h-10  cursor-pointer hover:bg-gray-800/30 transition-colors"
            >
            </div>

            {/* Project List */}
                <div className="max-h-[400px] overflow-y-auto">
                    {loading ? (
                        <div className="p-4 text-center text-gray-400 text-sm">
                            Loading projects...
                        </div>
                    ) : projects.length === 0 ? (
                        <div className="p-4 text-center text-gray-400 text-sm">
                            No projects found
                        </div>
                    ) : (
                        <div className="space-y-1 p-2">
                            {projects.map((project) => (
                                <div
                                    key={project.id}
                                    className="flex items-center space-x-3 px-2 py-1.5 hover:bg-gray-800/40 rounded text-sm group transition-colors"
                                >
                                    {/* Project Name */}
                                    <div className="flex-1 min-w-0">
                                        <span className="text-gray-200 font-medium">
                                            {truncateName(project.name)}
                                        </span>
                                        <span className="text-gray-400 ml-1 text-xs">
                                            {project.type === 'nextjs' ? 'Next' : project.type === 'fastapi' ? 'API' : 'Git'}
                                        </span>
                                    </div>

                                    {/* Action Icons */}
                                    <div className="flex items-center space-x-1 opacity-70 group-hover:opacity-100 transition-opacity">
                                        {/* Book Icon */}
                                        <button
                                            className="p-1 hover:bg-gray-700 rounded transition-colors"
                                            title="Documentation"
                                        >
                                            <Book className="w-3.5 h-3.5 text-gray-400 hover:text-blue-400" />
                                        </button>

                                        {/* Code Icon */}
                                        <button
                                            className="p-1 hover:bg-gray-700 rounded transition-colors"
                                            title="Open in Editor"
                                        >
                                            <Code className="w-3.5 h-3.5 text-gray-400 hover:text-green-400" />
                                        </button>

                                        {/* GitHub Icon */}
                                        <button
                                            className="p-1 hover:bg-gray-700 rounded transition-colors"
                                            title="View Repository"
                                        >
                                            <Github className="w-3.5 h-3.5 text-gray-400 hover:text-purple-400" />
                                        </button>

                                        {/* TV/Monitor Icon */}
                                        <button
                                            className="p-1 hover:bg-gray-700 rounded transition-colors"
                                            title="Preview"
                                        >
                                            <Tv className="w-3.5 h-3.5 text-gray-400 hover:text-orange-400" />
                                        </button>

                                        {/* Status indicators */}
                                        <div className="flex items-center space-x-1 ml-2">
                                            {/* Git status indicator */}
                                            {project.git && (
                                                <div className="w-2 h-2 bg-yellow-500 rounded-full" title="Git changes" />
                                            )}

                                            {/* Running status indicator */}
                                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" title="Running" />

                                            {/* Dropdown arrow */}
                                            <ChevronDown className="w-3 h-3 text-gray-500" />

                                            {/* Refresh indicator */}
                                            <div className="w-3 h-3 border border-gray-500 rounded-full" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
        </div>
    );
}

export default RunnerRightPanel;
