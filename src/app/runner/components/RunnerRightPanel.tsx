import { motion } from "framer-motion"
import { Plus, Settings } from "lucide-react"
import Image from 'next/image'; 

type Props = {
    disabled: boolean;
    showSettings: boolean;
    setShowSettings: (show: boolean) => void;
    showAddProject: boolean;
    setShowAddProject: (show: boolean) => void;
}

const RunnerRightPanel = ({ disabled, showSettings, setShowSettings, showAddProject, setShowAddProject }: Props) => {
    return  <div className="flex items-center space-x-2">
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 2 }}
    >
      <Image 
        src="/logo/vibeman_logo.png" alt="Logo" width={320} height={32}/>
    </motion.div>
    {!disabled && (
      <>
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={() => setShowSettings(!showSettings)}
      className={`p-2 rounded-lg transition-all ${showSettings
          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
          : 'bg-gray-800/50 text-gray-400 hover:text-gray-100 hover:bg-gray-700/50'
        }`}
      title="Project Settings"
    >
      <Settings className="w-4 h-4" />
    </motion.button>
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={() => setShowAddProject(!showAddProject)}
      className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 hover:from-cyan-500/30 hover:to-purple-500/30 border border-cyan-500/30 rounded-lg text-cyan-400 transition-all"
    >
      <Plus className="w-4 h-4" />
      <span className="text-sm font-medium">Add</span>
    </motion.button>
    </>
    )}
  </div>
}

export default RunnerRightPanel;