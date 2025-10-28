import React, { useState, useEffect } from 'react';
import { getPlantUMLEncodingMethods, testPlantUMLUrl } from '@/utils/plantumlEncoder';

interface PlantUMLDebugProps {
  content: string;
}

export default function PlantUMLDebug({ content }: PlantUMLDebugProps) {
  const [results, setResults] = useState<Array<{
    method: string;
    url: string;
    success: boolean | null;
    testing: boolean;
  }>>([]);

  useEffect(() => {
    const testAllMethods = async () => {
      const methods = getPlantUMLEncodingMethods(content);
      const initialResults = methods.map(method => ({
        method: method.method,
        url: method.url,
        success: null,
        testing: true
      }));
      
      setResults(initialResults);

      // Test each method
      for (let i = 0; i < methods.length; i++) {
        const success = await testPlantUMLUrl(methods[i].url);
        setResults(prev => prev.map((result, index) => 
          index === i 
            ? { ...result, success, testing: false }
            : result
        ));
      }
    };

    if (content.trim()) {
      testAllMethods();
    }
  }, [content]);

  return (
    <div className="bg-gray-800 rounded-lg p-4 space-y-4">
      <h3 className="text-lg font-semibold text-white">PlantUML Encoding Debug</h3>
      
      <div className="space-y-3">
        {results.map((result, index) => (
          <div key={index} className="bg-gray-700 rounded p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-300">
                {result.method}
              </span>
              <span className={`text-sm px-2 py-1 rounded ${
                result.testing 
                  ? 'bg-yellow-500/20 text-yellow-400' 
                  : result.success 
                    ? 'bg-green-500/20 text-green-400' 
                    : 'bg-red-500/20 text-red-400'
              }`}>
                {result.testing ? 'Testing...' : result.success ? 'Success' : 'Failed'}
              </span>
            </div>
            
            <div className="text-sm text-gray-400 break-all mb-2">
              {result.url}
            </div>
            
            {result.success && !result.testing && (
              <img 
                src={result.url} 
                alt="PlantUML Test" 
                className="max-w-full h-auto border border-gray-600 rounded"
              />
            )}
          </div>
        ))}
      </div>
      
      <details className="mt-4">
        <summary className="cursor-pointer text-sm text-gray-400 hover:text-gray-300">
          View Raw Content
        </summary>
        <pre className="mt-2 text-sm text-gray-300 bg-gray-900 p-3 rounded overflow-x-auto">
          {content}
        </pre>
      </details>
    </div>
  );
}