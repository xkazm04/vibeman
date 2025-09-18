# PlantUML Test Document

This document tests PlantUML rendering with interactive content.

## Simple Test

Here is a simple diagram: {{Simple Diagram|@startuml\nAlice -> Bob: Hello\nBob -> Alice: Hi\n@enduml|plantuml}}

## Complex Test

Here is a complex diagram: {{System Architecture|@startuml\n!theme plain\nskinparam backgroundColor #1f2937\nskinparam defaultTextColor #ffffff\nskinparam componentBackgroundColor #374151\nskinparam componentBorderColor #6b7280\n\nactor "User" as user\ncomponent "App" as app\ncomponent "Database" as db\n\nuser -> app : Request\napp -> db : Query\ndb -> app : Response\napp -> user : Result\n@enduml|plantuml}}

## Text Test

Here is some text content: {{Text Example|This is a text example with multiple lines.\n\nIt should display as formatted text in the modal.|text}}

End of test document.