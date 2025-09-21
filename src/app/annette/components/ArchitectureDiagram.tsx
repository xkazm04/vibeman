'use client';

import { ArrowRight, MessageSquare, Cog, Database, Mic, Volume2 } from 'lucide-react';

export default function ArchitectureDiagram() {
  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-6">System Architecture</h2>
      
      <div className="space-y-6">
        {/* Current Flow */}
        <div>
          <h3 className="text-lg font-medium mb-4 text-green-400">Current Implementation</h3>
          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center space-x-2 bg-blue-900/30 px-3 py-2 rounded-lg">
              <MessageSquare className="w-4 h-4" />
              <span>Hardcoded Message</span>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400" />
            <div className="flex items-center space-x-2 bg-purple-900/30 px-3 py-2 rounded-lg">
              <Cog className="w-4 h-4" />
              <span>LangGraph</span>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400" />
            <div className="flex items-center space-x-2 bg-orange-900/30 px-3 py-2 rounded-lg">
              <Database className="w-4 h-4" />
              <span>Goals API</span>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400" />
            <div className="flex items-center space-x-2 bg-green-900/30 px-3 py-2 rounded-lg">
              <MessageSquare className="w-4 h-4" />
              <span>Ollama Response</span>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400" />
            <div className="flex items-center space-x-2 bg-cyan-900/30 px-3 py-2 rounded-lg">
              <Volume2 className="w-4 h-4" />
              <span>Text-to-Speech</span>
            </div>
          </div>
        </div>

        {/* Future Flow */}
        <div>
          <h3 className="text-lg font-medium mb-4 text-yellow-400">Future Implementation</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <div className="flex items-center space-x-2 bg-gray-700/50 px-3 py-2 rounded-lg">
                <Mic className="w-4 h-4" />
                <span>Voice Input (ElevenLabs STT)</span>
              </div>
              <div className="flex items-center space-x-2 bg-gray-700/50 px-3 py-2 rounded-lg">
                <Cog className="w-4 h-4" />
                <span>Multi-step Reasoning</span>
              </div>
              <div className="flex items-center space-x-2 bg-gray-700/50 px-3 py-2 rounded-lg">
                <Database className="w-4 h-4" />
                <span>Multiple Tools</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center space-x-2 bg-gray-700/50 px-3 py-2 rounded-lg">
                <MessageSquare className="w-4 h-4" />
                <span>Conversation State</span>
              </div>
              <div className="flex items-center space-x-2 bg-gray-700/50 px-3 py-2 rounded-lg">
                <Cog className="w-4 h-4" />
                <span>Human-in-the-loop</span>
              </div>
              <div className="flex items-center space-x-2 bg-gray-700/50 px-3 py-2 rounded-lg">
                <Mic className="w-4 h-4" />
                <span>Voice Output (ElevenLabs TTS)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Components */}
        <div>
          <h3 className="text-lg font-medium mb-4 text-blue-400">Key Components</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium text-gray-300 mb-2">LangGraph Orchestrator</h4>
              <ul className="space-y-1 text-gray-400">
                <li>• Message analysis</li>
                <li>• Dynamic tool selection</li>
                <li>• Response generation</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-300 mb-2">Available Tools</h4>
              <ul className="space-y-1 text-gray-400">
                <li>• get_project_goals</li>
                <li>• (More tools coming)</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-300 mb-2">Ollama Integration</h4>
              <ul className="space-y-1 text-gray-400">
                <li>• Model: gpt-oss:20b</li>
                <li>• Local inference</li>
                <li>• Same config as existing</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-300 mb-2">UI Components</h4>
              <ul className="space-y-1 text-gray-400">
                <li>• Test interface</li>
                <li>• System status</li>
                <li>• Pipeline logs</li>
                <li>• Audio playback controls</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}