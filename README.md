# Team Task Manager

Full-stack app for **projects**, **team membership** with **Admin / Member** roles, **tasks** (create, assign, status, due dates), and a **dashboard** (counts, overdue, your upcoming work). Stack: **React (Vite)**, **Express REST API**, **PostgreSQL** via **Prisma**, **JWT** auth.

## Local development

1. Install [Node.js 20+](https://nodejs.org/) and PostgreSQL (or use a cloud dev database).
2. Copy `.env.example` to `server/.env` and set `DATABASE_URL` and `JWT_SECRET`.
3. From the repo root:

```bash
npm install
cd server
npx prisma migrate deploy
cd ..
npm run dev:server
```

In another terminal:

```bash
npm run dev:client
```

Open `http://localhost:5173`: the **public home** is `/` (marketing-style landing). After sign-in, the **dashboard** is at `/dashboard`. Vite proxies `/api` to the server on port 3000.

## REST API (summary)

| Method | Path | Notes |
|--------|------|--------|
| POST | `/api/auth/register` | Body: `email`, `password`, `name` |
| POST | `/api/auth/login` | Body: `email`, `password` |
| GET | `/api/auth/me` | Bearer token |
| GET | `/api/projects` | List projects you belong to |
| POST | `/api/projects` | Create project (you become Admin) |
| GET/PATCH/DELETE | `/api/projects/:projectId` | PATCH/DELETE require **Admin** |
| POST | `/api/projects/:projectId/members` | Admin: `{ email, role? }` |
| PATCH/DELETE | `/api/projects/:projectId/members/:userId` | Admin |
| GET/POST | `/api/projects/:projectId/tasks` | Members can list/create |
| PATCH/DELETE | `/api/projects/:projectId/tasks/:taskId` | RBAC (see server code) |
| GET | `/api/dashboard` | Aggregated stats for your projects |
| GET | `/api/health` | Liveness |

## Role-based rules (short)

- **Admin**: Manage project details, delete project, invite/remove members, change roles, assign tasks (create/update), full task edit/delete.
- **Member**: Create tasks (unassigned or self-assign per UI); **only Admins** assign others on create/update; edit title/description/due if **creator** or Admin; update **status** if **assignee**, **creator**, or Admin; delete if **creator** or Admin.

## Neon + GitHub + Railway (recommended)

**GitHub** stores your code. **Neon** hosts PostgreSQL. **Railway** builds and runs the app from GitHub and reads Neon via `DATABASE_URL`.

### A. Neon (database)

1. Sign up at [neon.tech](https://neon.tech) (GitHub login is fine).
2. **Create project** → pick a region close to you → create a database (default name `neondb` is OK).
3. Open **Dashboard** → your project → **Connection details** (or **Connect**).
4. Copy the **connection string** (URI). Prefer the **pooled** / **transaction** URL if Neon offers both.
5. Append or keep SSL: the URL should include **`sslmode=require`**. If you see **`channel_binding=require`** and Prisma/your app errors, remove only `&channel_binding=require` and keep `sslmode=require`.
6. Use this string as **`DATABASE_URL`** locally (`server/.env`) and on Railway (below). **Never commit** the URL with password to GitHub — use **Variables** on Railway only.

### B. GitHub (code)

1. On GitHub: **New repository** → name it (e.g. `team-task-manager`) → **Create** (no README/license needed if you already have code).
2. On your PC, open a terminal **inside this project folder** (the one that contains `package.json` and `README.md` — not `C:\`).

   **Important:** If `git status` shows random Windows folders, you are in the wrong place or a parent folder owns Git. Run **`git init` only inside this project folder** so `.git` lives next to `package.json`.

3. Push (replace URL with your repo):

   ```bash
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
   git push -u origin main
   ```

   If GitHub shows “repository is empty”, use the commands it suggests. **Do not** commit `server/.env` (secrets); it stays local and is listed in `.gitignore`.

### C. Railway (hosting from GitHub)

1. [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo** → select your repo.
2. **Do not add** Railway’s own PostgreSQL unless you want it — with Neon you only need **one** service: the **web** service from GitHub.
3. Open that service → **Variables** → **+ New Variable**:
   - **`DATABASE_URL`** — paste your **full Neon** connection string (same as in `server/.env`).
   - **`JWT_SECRET`** — long random string (e.g. run `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` and paste).
4. **Settings** → **Root directory:** empty or **`.`** (repo root). **Start command:** `npm start`.
5. **Networking** → **Generate domain** → open `https://….up.railway.app`. First deploy runs **`prisma migrate deploy`** against Neon and creates tables.

### D. After deploy

- **Updating Railway:** you do **not** change any Railway URL or service setting for the new home page. Push commits to **`main`** on GitHub; Railway redeploys from that branch. The live site serves **`/`** as the landing page and **`/dashboard`** after login (same as local).
- Test signup on the Railway URL. Data lives in **Neon** (check **Tables** in Neon SQL Editor if you like).
- Health check: `https://YOUR_DOMAIN/api/health` (if you configure a health-check path in Railway, use this path — not `/`).

---

## Deploy on Railway (step by step — beginners)

Use this if you prefer **Railway’s PostgreSQL** instead of Neon. If you use **Neon**, follow **Neon + GitHub + Railway** above and **skip** adding Postgres on Railway.

### 0. Push code to GitHub (once)

1. Create a **new empty repository** on GitHub.
2. In your project folder on your PC:

   ```bash
   git init
   git add .
   git commit -m "Initial commit: team task manager"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
   git push -u origin main
   ```

   Use your real repo URL. **Never commit `server/.env`** (it is gitignored).

### 1. Railway: new project from GitHub

1. Go to [railway.app](https://railway.app) and sign in (GitHub login is easiest).
2. **New Project** → **Deploy from GitHub repo**.
3. Allow Railway to access GitHub if asked, then **select your repository**.

### 2. Add PostgreSQL (optional if using Neon)

1. In the same Railway project, click **Create** / **+** → **Database** → **PostgreSQL**.
2. Wait until Postgres is **Active**.

### 3. Give your app `DATABASE_URL` (Railway Postgres)

You should have **two** services: **Postgres** and your **GitHub app** (Node).

1. Open the **GitHub app** service (not Postgres).
2. Go to **Variables**.
3. **+ New Variable** → use **Variable Reference** (wording may vary):
   - **Name:** `DATABASE_URL`
   - **Value / reference:** your **PostgreSQL** service → variable **`DATABASE_URL`**
4. Save.

**If you use Neon instead:** skip steps 2–3 here; add a single plain **`DATABASE_URL`** variable on the app service with your Neon URI (see **Neon + GitHub + Railway**).

### 4. Set `JWT_SECRET` (required)

1. Same service → **Variables** → **+ New Variable**.
2. Name: **`JWT_SECRET`**. Value: a **long random string** (64+ hex chars is fine). Example on your PC:

   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

3. Paste the output as the value and save.

### 5. Root directory, build, start

1. App service → **Settings**.
2. **Root directory:** leave **empty** or **`.`** (repo root — where root `package.json` is). **Do not** set only `server`.
3. **Build command:** usually leave blank; if needed: `npm run build`
4. **Start command:** `npm start` (already set in `railway.json`). This runs DB migrations and serves API + built React app.

### 6. Public URL

1. App service → **Settings** → **Networking** → **Generate domain**.
2. Open `https://….up.railway.app` in a browser.
3. Optional variable **`CLIENT_ORIGIN`:** set to that same `https://…` URL if you want strict CORS (often optional).

### 7. Verify

1. **Sign up** on the live site, create a **project** and a **task**.
2. Visit `https://YOUR_DOMAIN/api/health` — you should see JSON with `"ok":true`.

### If something fails

- **Build:** open **Deployments** → latest → **Build logs**. If Node is wrong, add variable **`NIXPACKS_NODE_VERSION`** = `20`.
- **Crash on start:** open **Deploy logs**. Often missing **`DATABASE_URL`** reference or **`JWT_SECRET`**.
- **Migrations:** `npm start` runs `prisma migrate deploy`; ensure `DATABASE_URL` is set before the container starts.

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes (prod) | Secret for signing JWTs |
| `PORT` | No | Defaults to `3000` (Railway sets `PORT` automatically) |
| `CLIENT_ORIGIN` | No | Browser origin for CORS |
