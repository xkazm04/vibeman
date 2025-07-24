'use client';
import React, { useState } from 'react';
import { CursorReqCreator } from './CursorReqCreator';
import { CursorProjectMonitor } from './CursorProjectMonitor';
import { CursorTaskStatus } from './CursorTaskStatus';
import { DevelopmentRequirement } from '@/types/development';
import CodeAnalyzer from './CodeAnalyzer';
import RepositorySync from './RepoSync';

// Configure your monitored projects here
const MONITORED_PROJECTS = [
    '/mnt/c/Users/kazda/mk/simple',
    '/mnt/c/Users/kazda/mk/vibe'
  ];
  
export default function Dashboard() {
  const [requirements, setRequirements] = useState<DevelopmentRequirement[]>([]);

  const handleRequirementCreated = (requirement: DevelopmentRequirement) => {
    setRequirements(prev => [requirement, ...prev]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(120,119,198,0.1),transparent_50%)]" />
      
        <RepositorySync />
        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Requirement Creator - Takes up 2/3 on large screens */}
          <div className="xl:col-span-2">
            <CursorReqCreator
              onRequirementCreated={handleRequirementCreated}
              monitoredProjects={MONITORED_PROJECTS}
            />
          </div>
          
          {/* Recent Requirements Sidebar */}
          <div className="xl:col-span-1">
            {requirements.length > 0 && (
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-6 h-fit sticky top-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  <h2 className="text-xl font-semibold text-white">Recent Requirements</h2>
                </div>
                
                <div className="space-y-4">
                  {requirements.slice(0, 5).map((req, index) => (
                    <div 
                      key={req.id} 
                      className="group relative bg-gray-700/30 rounded-xl p-4 border border-gray-600/30 hover:border-purple-500/50 transition-all duration-300 hover:bg-gray-700/50"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      {/* Priority Indicator */}
                      <div className={`absolute top-3 right-3 w-2 h-2 rounded-full ${
                        req.priority === 'high' ? 'bg-red-400' : 
                        req.priority === 'medium' ? 'bg-yellow-400' : 'bg-green-400'
                      }`} />
                      
                      <h3 className="font-medium text-white mb-2 pr-6 group-hover:text-purple-300 transition-colors">
                        {req.title}
                      </h3>
                      
                      <p className="text-sm text-gray-400 mb-2 font-mono">
                        {req.projectPath.split('/').pop()}
                      </p>
                      
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>{req.createdAt.toLocaleString()}</span>
                        <span className="px-2 py-1 bg-gray-600/50 rounded-full">
                          {req.priority}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                
                {requirements.length > 5 && (
                  <div className="mt-4 pt-4 border-t border-gray-600/30">
                    <p className="text-sm text-gray-400 text-center">
                      +{requirements.length - 5} more requirements
                    </p>
                  </div>
                )}
              </div>
            )}
            
            {requirements.length === 0 && (
              <div className="bg-gray-800/30 backdrop-blur-sm rounded-2xl border border-gray-700/30 p-8 text-center">
                <div className="w-12 h-12 bg-gray-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-300 mb-2">No Requirements Yet</h3>
                <p className="text-gray-500 text-sm">
                  Create your first development requirement to get started
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
  );
}