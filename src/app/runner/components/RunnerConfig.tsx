import { Project } from "@/types";
import { motion } from "framer-motion";
import { Folder, Save, X } from "lucide-react";

type Props = {
    project: Project;
    editedProject: Project;
    handleConfigChange: (field: keyof Project, value: string | number) => void;
    hasChanges: boolean;
    saveConfig: () => void;
    setEditedProject: (project: Project) => void;
    setHasChanges: (hasChanges: boolean) => void;
}

const RunnerConfig = ({project, editedProject, handleConfigChange, hasChanges, saveConfig, setEditedProject, setHasChanges}: Props) => {
    return <>
        <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-gray-700 bg-gray-900/50"
        >
            <div className="p-3 space-y-2">
                <div>
                    <label className="text-sm text-gray-400">Name</label>
                    <input
                        type="text"
                        value={editedProject.name}
                        onChange={(e) => handleConfigChange('name', e.target.value)}
                        className="w-full px-2 py-1 text-sm bg-gray-800 border border-gray-700 rounded text-gray-100 focus:border-blue-500 focus:outline-none"
                    />
                </div>
                <div>
                    <label className="text-sm text-gray-400 flex items-center gap-1">
                        <Folder size={10} />
                        Path
                    </label>
                    <input
                        type="text"
                        value={editedProject.path}
                        onChange={(e) => handleConfigChange('path', e.target.value)}
                        className="w-full px-2 py-1 text-sm bg-gray-800 border border-gray-700 rounded text-gray-100 font-mono focus:border-blue-500 focus:outline-none"
                    />
                </div>
                <div>
                    <label className="text-sm text-gray-400">Port</label>
                    <input
                        type="number"
                        value={editedProject.port}
                        onChange={(e) => handleConfigChange('port', parseInt(e.target.value))}
                        className="w-full px-2 py-1 text-sm bg-gray-800 border border-gray-700 rounded text-gray-100 font-mono focus:border-blue-500 focus:outline-none"
                    />
                </div>
                {hasChanges && (
                    <div className="flex gap-1 pt-1">
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={saveConfig}
                            className="flex-1 px-2 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center justify-center gap-1"
                        >
                            <Save size={10} />
                            Save
                        </motion.button>
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => {
                                setEditedProject(project);
                                setHasChanges(false);
                            }}
                            className="flex-1 px-2 py-1 text-sm bg-gray-700 text-gray-300 rounded hover:bg-gray-600 flex items-center justify-center gap-1"
                        >
                            <X size={10} />
                            Cancel
                        </motion.button>
                    </div>
                )}
            </div>
        </motion.div>
    </>
}

export default RunnerConfig;