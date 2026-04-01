<!-- 
For preview in VSCode:
1. get extension "Markdown Preview Mermaid Support"
2. right click -> "Open Preview" or Ctrl + Shift + V
-->

<!-- Might add later:
- one task shared among multiple users (that is why Assignment already exists)
- group events
- pomodoro timer
- TODO: discuss subtasks
-->

```mermaid
---
title: Study Manager
config:
    layout: elk
---
erDiagram
    User {
        int id PK
        string email "unique"
        string login "unique"
        string pwd_hash
        bool active_session "true if user has at least one active session at the moment"
    }

    UserProfile {
        int user_id PK, FK
        string name "nullable"
        string title "nullable"
        string avatar "nullable"
        string organization "nullable"
        string bio "nullable"
    }

    UserSettings {
        int user_id PK, FK
        bool notifications_enabled "global configuration for all types of notifications"
        bool light_theme
    }

    %% RBAC
    Role {
        int id PK
        string name "enum = ['USER', 'MENTOR', 'ADMIN']"
    }

    UserRole {
        int user_id FK
        int role_id FK
    }

    Permission {
        int id PK
        string name "e.g. 'CREATE_TASK', 'ADD_TO_GROUP', 'VIEW_LOGS'"
    }

    RolePermission {
        int role_id FK
        int permission_id FK
    }

    Task {
        int id PK
        int user_id FK
        int assignment_id FK "nullable"
        string title
        string description "nullable"
        datetime due_date
        string status "enum = ['TODO', 'IN PROGRESS', 'DONE']"
    }

    Eval {
        int id PK
        int task_id FK
        string feedback
        int score
        datetime evaluated_at
    }

    %% right now event is exclusive for user, there is no such thing as group event (however, might add later)
    Event {
        int id PK
        int user_id FK
        string title
        string description "nullable"
        datetime start_date
        datetime end_date
        string place "nullable"
    }

    Note {
        int id PK
        int user_id FK
        string title
        string description
    }

    Group {
        int id PK
        int mentor_id FK
        string name
    }

    GroupMember {
        int user_id FK
        int group_id FK
    }

    Assignment {
        int id PK
        int group_id FK
        string title
        string description "nullable"
        datetime due_date
    }

    Email {
        int id PK
        int recipient_id FK
        datetime sent_at
        string status
    }

    EmailTemplate {
        int id PK
        string type "unique"
        string subject
        string body
    }

    AuditLog {
        int id PK
        int actor_id FK
        datetime happened_at
        string description
    }

    %% Relationships
    User ||--|| UserProfile : "has"
    User ||--|| UserSettings : "has"

    User ||--|{ UserRole : "assigned to"
    UserRole }o--|| Role : "is"
    Role ||--o{ RolePermission : "can"
    RolePermission }o--|| Permission : "can"

    User ||--o{ Task : "has"
    Task }|--o| Assignment : "is"
    Task ||--o| Eval : "has"
    User ||--o{ Event : "attends"
    User ||--o{ Note : "has"

    User ||--o{ GroupMember : "is in"
    GroupMember }|--|| Group : "has members"

    User ||--o{ Email : "receive"
    Email }o--|| EmailTemplate : "has content"
```
    