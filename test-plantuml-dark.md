# PlantUML Dark Mode Test

This document tests the improved PlantUML component with dark mode styling.

## Class Diagram

```plantuml
@startuml
class User {
  -id: String
  -name: String
  -email: String
  +login()
  +logout()
  +updateProfile()
}

class Order {
  -orderId: String
  -amount: Double
  -status: OrderStatus
  +create()
  +cancel()
  +process()
}

class Product {
  -productId: String
  -name: String
  -price: Double
  +getDetails()
  +updatePrice()
}

User ||--o{ Order : places
Order ||--o{ Product : contains

note right of User : Users can place\nmultiple orders
note left of Product : Products can be\nin multiple orders
@enduml
```

## Sequence Diagram

```plantuml
@startuml
actor User
participant "Web App" as Web
participant "API Gateway" as API
participant "Auth Service" as Auth
participant "Database" as DB

User -> Web: Login Request
Web -> API: POST /auth/login
API -> Auth: Validate Credentials
Auth -> DB: Query User
DB --> Auth: User Data
Auth --> API: JWT Token
API --> Web: Authentication Response
Web --> User: Login Success
@enduml
```

## Activity Diagram

```plantuml
@startuml
start
:User opens app;
if (User logged in?) then (yes)
  :Show dashboard;
else (no)
  :Show login screen;
  :User enters credentials;
  if (Credentials valid?) then (yes)
    :Generate JWT token;
    :Show dashboard;
  else (no)
    :Show error message;
    stop
  endif
endif
:User interacts with app;
stop
@enduml
```

## Component Diagram

```plantuml
@startuml
package "Frontend" {
  [React App] as React
  [Redux Store] as Redux
  [API Client] as Client
}

package "Backend" {
  [API Gateway] as Gateway
  [Auth Service] as Auth
  [User Service] as UserSvc
  [Order Service] as OrderSvc
}

package "Data Layer" {
  database "PostgreSQL" as DB
  database "Redis Cache" as Cache
}

React --> Redux
React --> Client
Client --> Gateway
Gateway --> Auth
Gateway --> UserSvc
Gateway --> OrderSvc
UserSvc --> DB
OrderSvc --> DB
Auth --> Cache
@enduml
```

## State Diagram

```plantuml
@startuml
[*] --> Idle
Idle --> Loading : start_request
Loading --> Success : request_complete
Loading --> Error : request_failed
Success --> Idle : reset
Error --> Idle : reset
Error --> Loading : retry
@enduml
```