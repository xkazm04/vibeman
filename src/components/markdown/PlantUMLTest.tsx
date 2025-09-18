import React from 'react';
import InteractiveContent from './InteractiveContent';

export default function PlantUMLTest() {
  const renderInlineContent = (text: string): React.ReactElement => {
    return <span>{text}</span>;
  };

  const simpleUML = `@startuml
Alice -> Bob: Hello
Bob -> Alice: Hi there
@enduml`;

  const complexUML = `@startuml\\n!theme plain\\nskinparam backgroundColor #1f2937\\nskinparam defaultTextColor #ffffff\\nskinparam componentBackgroundColor #374151\\nskinparam componentBorderColor #6b7280\\n\\nactor "User" as user\\ncomponent "App" as app\\ncomponent "Database" as db\\n\\nuser -> app : Request\\napp -> db : Query\\ndb -> app : Response\\napp -> user : Result\\n@enduml`;

  return (
    <div className="p-8 bg-gray-900 min-h-screen">
      <h1 className="text-2xl font-bold text-white mb-8">PlantUML Test Page</h1>
      
      <div className="space-y-8">
        <div>
          <h2 className="text-xl font-semibold text-white mb-4">Simple PlantUML Test</h2>
          <p className="text-gray-300 mb-4">
            This is a simple test: <InteractiveContent
              trigger="Simple Diagram"
              content={simpleUML}
              type="plantuml"
              renderInlineContent={renderInlineContent}
            />
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-white mb-4">Complex PlantUML Test</h2>
          <p className="text-gray-300 mb-4">
            This is a complex test: <InteractiveContent
              trigger="Complex Diagram"
              content={complexUML}
              type="plantuml"
              renderInlineContent={renderInlineContent}
            />
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-white mb-4">Direct URL Test</h2>
          <div className="bg-gray-800 p-4 rounded-lg">
            <p className="text-gray-300 mb-2">Direct PlantUML URL test:</p>
            <img 
              src="https://www.plantuml.com/plantuml/svg/~1@startuml%0AAlice%20-%3E%20Bob%3A%20Hello%0ABob%20-%3E%20Alice%3A%20Hi%20there%0A@enduml"
              alt="Direct PlantUML test"
              className="max-w-full h-auto"
            />
          </div>
        </div>
      </div>
    </div>
  );
}