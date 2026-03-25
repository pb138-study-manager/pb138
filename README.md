# PB138
Project for PB138: Webdev principles - Study Manager.

# Setup (WIP)
<!-- TODO -->

# Commit Conventions (WIP)
<!-- TODO -->

# Team Members
<!-- Insert your name and uco -->
- Valéria Kvaššayová (550435)
- 
- 
- 

# Description
<!-- >I created this description for PB175, feel free to change it. -->

Study Manager is a web application that allows users to manage various tasks and events that they create themselves or are assigned to them. They can view these in the form of a to-do list, schedule, timetable, calendar, and filter them. The application includes a notification system and a pomodoro timer with a history of launches.

The functional interface is only accessible to logged in users, who can also manage their profile.

The application is primarily created and adapted for university students, but it is universally usable outside of the academic environment.

# Tech stack
<!-- Also previously created for PB175 - feel free to change. -->
- Frontend: React + TypeScript + Tailwind CSS + TanStack Start
- Backend: Bun + ElysiaJS + TypeScript
- Database: PostgreSQL
- ORM: Drizzle
- Testing: Playwright
- CI/CD: GitHub Actions
- Other: Docker, ESLint, Prettier, Mermaid, PlantUML, Jira

# Copilot Setup Prompt
Create a monorepo structure for a web application using:
- frontend: React + TypeScript + Tailwind + TanStack Start
- backend: ElysiaJS
- database: PostgreSQL
- ORM: Drizzle
- containerization: Docker

Set it up with apps/frontend and apps/backend folders.
Include basic package.json files and scripts.

Create a docker-compose.yml for:
- PostgreSQL
- backend (ElysiaJS)
- frontend (React)

Include environment variables and volumes.

Initialize a basic ElysiaJS server with:
- TypeScript
- Drizzle ORM connected to PostgreSQL
- example route /health
- environment variable config

Create a React app using TypeScript and Tailwind CSS.
Include TanStack Router or TanStack Start setup.
Add a simple homepage.

Set up ESLint and Prettier for a monorepo with React and Node.js.
Ensure consistent formatting and linting rules.

Create a GitHub Actions pipeline that:
- installs dependencies
- runs lint
- runs tests
- builds frontend and backend

Set up Playwright for end-to-end testing in a React app.
Include a basic test for the homepage.

# Setup Structure
```
pb138/  
├── apps/  
│   ├── backend/          # ElysiaJS + TypeScript + Drizzle ORM  
│   │   ├── src/  
│   │   │   ├── index.ts          # Main server with /health route  
│   │   │   ├── index.test.ts     # Bun unit tests  
│   │   │   └── db/               # Drizzle ORM (schema + client)  
│   │   ├── drizzle.config.ts  
│   │   ├── Dockerfile  
│   │   └── .env.example  
│   └── frontend/         # React 18 + TypeScript + Tailwind + TanStack Router  
│       ├── src/  
│       │   ├── main.tsx          # App entry with RouterProvider  
│       │   ├── routes/           # File-based routing  
│       │   └── routeTree.gen.ts  # TanStack Router generated tree  
│       ├── e2e/                  # Playwright E2E tests (3 tests for homepage)  
│       ├── playwright.config.ts  
│       ├── vite.config.ts        # Vite + vitest (jsdom environment)  
│       ├── tailwind.config.js  
│       ├── Dockerfile  
│       └── nginx.conf  
├── .github/workflows/ci.yml      # CI: lint → test → build → e2e  
├── docker-compose.yml            # PostgreSQL + backend + frontend  
├── .eslintrc.json                # ESLint (react/jsx-runtime for modern React)  
├── .prettierrc  
└── package.json                  # npm workspaces root  
```
