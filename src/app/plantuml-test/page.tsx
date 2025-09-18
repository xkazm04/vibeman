'use client';

import PlantUMLTest from '@/components/markdown/PlantUMLTest';
import MarkdownViewer from '@/components/markdown/MarkdownViewer';
import PlantUMLDebug from '@/components/markdown/PlantUMLDebug';

const testContent = `# PlantUML Test Document

This document tests PlantUML rendering with interactive content.

## Simple Test

Here is a simple diagram: {{Simple Diagram|@startuml\\nAlice -> Bob: Hello\\nBob -> Alice: Hi\\n@enduml|plantuml}}

## Complex Test

Here is a complex diagram: {{System Architecture|@startuml\\n!theme plain\\nskinparam backgroundColor #1f2937\\nskinparam defaultTextColor #ffffff\\nskinparam componentBackgroundColor #374151\\nskinparam componentBorderColor #6b7280\\n\\nactor "User" as user\\ncomponent "App" as app\\ncomponent "Database" as db\\n\\nuser -> app : Request\\napp -> db : Query\\ndb -> app : Response\\napp -> user : Result\\n@enduml|plantuml}}

## Text Test

Here is some text content: {{Text Example|This is a text example with multiple lines.\\n\\nIt should display as formatted text in the modal.|text}}

End of test document.`;

export default function PlantUMLTestPage() {
  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">PlantUML Test Page</h1>
        
        <div className="mb-12">
          <h2 className="text-2xl font-semibold text-white mb-4">Markdown Viewer Test</h2>
          <div className="bg-gray-800 rounded-lg p-6">
            <MarkdownViewer content={testContent} />
          </div>
        </div>
        
        <div className="mb-12">
          <h2 className="text-2xl font-semibold text-white mb-4">PlantUML Debug Test</h2>
          <PlantUMLDebug content="@startuml\n!theme plain\nskinparam backgroundColor #1f2937\nskinparam defaultTextColor #ffffff\nskinparam componentBackgroundColor #374151\nskinparam componentBorderColor #6b7280\n\nactor \"User\" as user\ncomponent \"App\" as app\ncomponent \"Database\" as db\n\nuser -> app : Request\napp -> db : Query\ndb -> app : Response\napp -> user : Result\n@enduml" />
        </div>
        
        <div>
          <h2 className="text-2xl font-semibold text-white mb-4">Component Test</h2>
          <PlantUMLTest />
        </div>
      </div>
    </div>
  );
}