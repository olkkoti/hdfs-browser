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
- `AUTH_MODE` — user authentication: `local` or `ldap` (default: local)
- `LDAP_URL` — LDAP server URL, e.g. `ldaps://ipa.example.com` (required when `AUTH_MODE=ldap`)
- `LDAP_USER_DN_PATTERN` — DN template with `%s` for username, e.g. `uid=%s,cn=users,cn=accounts,dc=example,dc=com`
- `LDAP_STARTTLS` — use STARTTLS on `ldap://` connections (default: false)
- `LDAP_CA_CERT` — path to CA certificate for TLS verification
- `HDFS_AUTH` — authentication mode: `simple` or `kerberos` (default: simple)
- `HDFS_PROTOCOL` — `http` or `https` (default: http)
- `KRB5_PRINCIPAL` — Kerberos service principal (e.g. `hdfs-browser/host@REALM`)
- `KRB5_KEYTAB` — path to the keytab file for the service principal

### Kerberos configuration

To connect to a Kerberos-secured HDFS cluster:

1. Set `HDFS_AUTH=kerberos` and `HDFS_PROTOCOL=https` (if HDFS uses HTTPS)
2. Provide `KRB5_PRINCIPAL` and `KRB5_KEYTAB` for the service account
3. The service account must be configured as a proxy user in HDFS (`hadoop.proxyuser.<name>.hosts/groups`)
4. The app uses `kinit` at startup and SPNEGO tokens per-request to the NameNode
5. User impersonation is done via the `doas` query parameter (instead of `user.name` in simple mode)
6. DataNode requests use delegation tokens from the NameNode redirect (no SPNEGO needed)
7. The `kerberos` npm package (native addon) must be installable on the deployment platform

### LDAP authentication (FreeIPA)

To authenticate users against a FreeIPA (or other LDAP) server instead of the local `users.json` file:

1. Set `AUTH_MODE=ldap`
2. Set `LDAP_URL` to the LDAP server (e.g. `ldaps://ipa.example.com`)
3. Set `LDAP_USER_DN_PATTERN` with `%s` as the username placeholder (e.g. `uid=%s,cn=users,cn=accounts,dc=example,dc=com`)
4. Optionally set `LDAP_STARTTLS=true` for STARTTLS on plain `ldap://` connections
5. Optionally set `LDAP_CA_CERT` to a CA certificate path for TLS verification
6. Authentication uses bind-only (no LDAP search), so no service account is needed

### Test HDFS cluster

A docker-compose setup runs a single-node HDFS cluster (`apache/hadoop:3.4.2`) with namenode + datanode. WebHDFS is exposed at `localhost:9870`. The datanode reports as `localhost` so WebHDFS redirects work from the host.

Quick start:
```
npm run hdfs:start    # start containers
npm run hdfs:seed     # create test directories and files
npm run dev           # start the app
```
