'use client';
import { motion } from 'framer-motion';
import TreeLayout from './CodeTree/TreeLayout';
import Backlog from './Backlog/Backlog';

export default function CoderLayout() {
  return (
    <div className="min-h-[500px] bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4">
      <div className="max-w-7xl mx-auto h-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="flex flex-col lg:flex-row gap-6"
        >
          {/* Tree Layout Section */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="flex-1 lg:max-w-md xl:max-w-lg"
          >
            <TreeLayout />
          </motion.div>

          {/* Backlog Section */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="flex-1 lg:flex-2"
          >
            <Backlog />
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}