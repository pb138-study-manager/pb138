<!-- 
For preview in VSCode:
1. get extension "Markdown Preview Mermaid Support"
2. right click -> "Open Preview" or Ctrl + Shift + V
-->

```mermaid
erDiagram
    USER {
        int id PK
        string email
        string login
        string name
        string title
        string organization
        string pwdhash
        bool active
    }

    GROUP {
        int id PK
        int mentor_id FK
        set_int student_id
    }

    TASK {
        int id PK
        string title
        string description
        date due_date
        string place
        string status
        int user_id FK
    }

    EVAL {
        int id PK
        int task_id FK
        int student_id FK
        string eval
    }

    EVENT {
        int id PK
        string title
        string description
        date date
        string place
        int user_id FK
    }

    NOTE {
        int id PK
        string title
        string description
    }

    MESSAGE {
        int id PK
        int recipient_id FK
        date datetime
        string subject
        string body
    }

    ROLE {
        int id PK
        string name
    }

    LOG {
        int id PK
        date date
        string description
    }

    %% Relationships
    USER ||--o{ TASK : "has"
    USER ||--o{ EVAL : "has"
    USER ||--o{ EVENT : "attends"
    USER ||--o{ NOTE : "has"
    USER ||--o{ GROUP : "is in"
    USER ||--o{ MESSAGE : "has"
    USER }|..|{ ROLE : "assigned to"
```
    