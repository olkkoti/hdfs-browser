# HDFS Browser

Web-based HDFS file browser with React frontend and Express backend.

## Commands

- `npm install` — install all dependencies (from root)
- `npm run dev` — start both client (Vite, port 5173) and server (Express, port 3001) in dev mode
- `npm run build` — build both server and client for production
- `npm run start` — start the production server
- `npm run hdfs:start` — start the test HDFS cluster (docker compose)
- `npm run hdfs:stop` — stop the HDFS cluster
- `npm run hdfs:seed` — populate HDFS with test data
- `npm run hdfs:reset` — destroy volumes and restart fresh

## Architecture

Monorepo with npm workspaces: `client/` (React + Vite + TypeScript) and `server/` (Express + TypeScript).

The Express server proxies WebHDFS REST API calls. In development, the Vite dev server proxies `/api` requests to Express.

### Backend API routes

All routes are under `/api/files`:
- `GET /api/files/list?path=` — list directory contents
- `GET /api/files/status?path=` — file/directory metadata
- `GET /api/files/download?path=` — stream file download
- `POST /api/files/upload?path=` — upload file (multipart)
- `PUT /api/files/mkdir?path=` — create directory
- `DELETE /api/files?path=` — delete file/directory
- `PUT /api/files/rename?from=&to=` — rename/move

### Environment variables

Copy `.env.example` to `.env` and configure:
- `HDFS_NAMENODE_HOST` — namenode hostname (default: localhost)
- `HDFS_NAMENODE_PORT` — WebHDFS port (default: 9870)
- `HDFS_USER` — HDFS user (default: hdfs)
- `PORT` — Express server port (default: 3001)

### Test HDFS cluster

A docker-compose setup runs a single-node HDFS cluster (`apache/hadoop:3.4.2`) with namenode + datanode. WebHDFS is exposed at `localhost:9870`. The datanode reports as `localhost` so WebHDFS redirects work from the host.

Quick start:
```
npm run hdfs:start    # start containers
npm run hdfs:seed     # create test directories and files
npm run dev           # start the app
```
