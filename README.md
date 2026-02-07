# Project Management Client (React + Vite)

This is the frontend for the Project Management app. It consumes the REST API from the server.

## Tech Stack
- React 18 + Vite
- Redux Toolkit
- Tailwind CSS
- React Router

## Prerequisites
- Node.js 18+ (recommended)
- npm 9+ (or pnpm/yarn)

## Environment Variables
Create a .env file in client/ with:

VITE_BASEURL=http://localhost:5000

Set this to your deployed API base URL in production (for example, https://your-api.example.com).

## Install & Run (Local)
1) Install dependencies
	npm install

2) Start the dev server
	npm run dev

The app will be available at the URL printed in the terminal (typically http://localhost:5173).

## Build
Create a production build:
	npm run build

Preview the build locally:
	npm run preview

## Notes
- Authentication tokens are stored in localStorage by the client.
- The app expects the API to be running and reachable via VITE_BASEURL.
