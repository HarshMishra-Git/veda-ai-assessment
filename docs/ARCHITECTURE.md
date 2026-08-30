# Architecture & Design Decisions

## Monorepo Architecture Overview

This project is structured as an npm workspaces monorepo separating the frontend, backend, and shared libraries:

- `apps/web`: Next.js with TypeScript and Tailwind CSS.
- `apps/api`: Python FastAPI service for backend logic, AI extraction, and ingestion pipelines.
- `packages/shared`: Shared interfaces and schema types between services.

## Local Development Flow
- Both services are completely decoupled and independently runnable.
- `NEXT_PUBLIC_API_URL` environment variable controls API routing from the browser client.
- CORS middleware in FastAPI allows secure cross-origin requests during local development.
