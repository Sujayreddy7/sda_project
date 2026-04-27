# 🚀 The Ultimate Full-Stack Todo App Guide: Zero to Production

This is the end-to-end plan to deploy your application: React (Frontend) + Django (Backend) + MySQL/SQLite + Redis + Google OAuth.

---

## 🧠 PHASE 0: WHAT YOU ARE BUILDING (Overview)
Your app has 2 main parts:
- **Backend (Django)**: Handles login, database, API.
- **Frontend (React)**: UI (what the user sees).

**👉 Architecture Flow:**
`User → React → Django API → Database → Response → UI`

**Core Integrations:**
- 🔑 **Google Login (OAuth):** For seamless authentication.
- 🔴 **Redis:** For fast caching operations.
- 🐳 **Docker:** To containerize and run everything easily.
- ☁️ **Cloud Deployment:** Vercel (Frontend) & Render (Backend).

---

## 💻 PHASE 1: INSTALL REQUIRED SOFTWARE
Ensure your core dependencies are installed.
1. **Python (3.10+)**: `python --version`
2. **Node.js (18+)**: `node -v` & `npm -v`
3. **Git**: `git --version`
4. **Docker**: `docker --version` & `docker-compose --version`

---

## 📁 PHASE 2: GET YOUR PROJECT
```bash
git clone <your-repo>
cd your-project
```

---

## 🔑 PHASE 3: GOOGLE LOGIN SETUP & CREDENTIALS
**Step 1: Go to Google Cloud**
👉 https://console.cloud.google.com

**Step 2: Create Project**
Click *New Project* -> Name it `Todo App` -> Click Create.

**Step 3: OAuth Consent Screen**
Go to: `APIs & Services → OAuth consent screen`.
Choose: `External`
Fill: `App name` and `Email` -> Click Continue/Finish.

**Step 4: Create Client ID**
Go to: `Credentials → Create Credentials → OAuth Client ID`.
Choose Application Type: `Web Application`.
Configure URLs:
- Authorized origins: `http://localhost:5173`
- Redirect URI: `http://localhost:5173`

**Step 5: Copy Client ID**
*Example:* `abc12345.apps.googleusercontent.com`
*(Keep this ready for Phase 4 and 5!)*

---

## ⚙️ PHASE 4: BACKEND SETUP (Django)
**Step 1: Enter backend directory**
```bash
cd backend
```
**Step 2: Create virtual environment & activate**
```bash
python -m venv venv
venv\Scripts\activate  # Windows
```
**Step 3: Install dependencies**
```bash
pip install -r requirements.txt
```
**Step 4: Create `.env` file**
Create `backend/.env` and add:
```env
SECRET_KEY=your-secure-secret-key
DEBUG=True
DATABASE_URL=sqlite:///db.sqlite3
REDIS_URL=redis://127.0.0.1:6379/1
GOOGLE_CLIENT_ID=your-client-id-here
```
**Step 5: Run DB Migrations**
```bash
python manage.py makemigrations accounts todos
python manage.py migrate
```
**Step 6: Create admin superuser**
```bash
python manage.py createsuperuser
```
**Step 7: Run backend server**
```bash
python manage.py runserver
```
👉 Accessible at `http://127.0.0.1:8000`

---

## ⚛️ PHASE 5: FRONTEND SETUP (React + Vite)
**Step 1: Enter frontend directory**
```bash
cd frontend
```
**Step 2: Install node modules**
```bash
npm install
```
**Step 3: Create `.env` file**
Create `frontend/.env` and add:
```env
VITE_API_URL=http://127.0.0.1:8000
VITE_GOOGLE_CLIENT_ID=your-client-id-here
```
> **⚠️ Critical Gotcha:** React Vite environments MUST begin with `VITE_`.
**Step 4: Run frontend**
```bash
npm run dev
```
👉 Accessible at `http://localhost:5173`

---

## ✅ PHASE 6: TEST LOCALLY
Ensure both servers are running in separate terminals.
- [ ] Login (Normal Username/Password).
- [ ] Google Login integration.
- [ ] Add Todo task successfully.
- [ ] Delete Todo task.

---

## 🔴 PHASE 7: REDIS SETUP
Your caching and session layer. It connects via `CACHES` inside `settings.py`.
*(Note: Recommended natively through Docker so you don't install it manually on Windows!)*

---

## 🐳 PHASE 8: DOCKER SETUP (Recommended)
This runs Phase 4 to 7 combined in one command.
**Command:**
```bash
docker-compose up --build -d
```
Docker handles MySQL, Redis, Django, and React inside isolated containers mapping ports seamlessly. Be sure you stop local scripts (`npm run dev` / `manage.py runserver`) before executing to free the ports!
👉 Open: `http://localhost:3000`

---

## ☁️ PHASE 9: DEPLOY BACKEND (Render)
**Setup:**
- Provider: Render (`New Web Service`).
- Root Directory: `backend`
**Commands:**
- Build: `pip install -r requirements.txt && python manage.py collectstatic --noinput && python manage.py migrate`
- Start: `gunicorn core.wsgi:application`
**Environment Variables (Render UI):**
```env
SECRET_KEY=...
DEBUG=False
DATABASE_URL=Your-Render-MySQL-or-Postgres-URL
REDIS_URL=Your-Render-Internal-Redis-URL
GOOGLE_CLIENT_ID=...
ALLOWED_HOSTS=*
```

---

## 🌐 PHASE 10: DEPLOY FRONTEND (Vercel)
**Setup:**
- Provider: Vercel (Connect GitHub).
- Root Directory: `frontend`
**Environment Variables (Vercel Build settings):**
```env
VITE_API_URL=https://your-backend-app.onrender.com
VITE_GOOGLE_CLIENT_ID=your-client-id-here
```

---

## 🔁 PHASE 11: UPDATE GOOGLE API (CRITICAL GOTOCHA)
Once deployed on Vercel, the Domain changes from Localhost to Vercel!
Go to the **Google Cloud Console** (credentials page) and update:
**Authorized origins:**
- `http://localhost:5173`
- `https://your-app-name.vercel.app`
**Redirect URIs:**
- `http://localhost:5173`
- `https://your-app-name.vercel.app`

---

## ⚠️ PHASE 12: FIX CORS IN DJANGO
By default, development allows `CORS_ALLOW_ALL_ORIGINS = True`.
For production, update `backend/core/settings.py`:
```python
CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "https://your-app-name.vercel.app"
]
```

## 🔄 PHASE 13: REDEPLOY
Commit and push changes to GitHub. Vercel and Render will watch the branches and auto-deploy the updates. You are live! 🚀
