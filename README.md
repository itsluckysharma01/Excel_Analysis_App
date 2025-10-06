# Excel Analytics Platform — Interactive Guide

This repository contains a lightweight, browser-first analytics UI for exploring Excel (.xls/.xlsx) files plus a Node/Express backend that provides user authentication and persistence for upload metadata and analyses using MongoDB.

This README is interactive — follow the numbered steps below to get the app running, register a user, persist upload metadata and analyses to MongoDB, and manage users via the admin panel.

---

## What you get

- Modern single-file HTML UI with separated CSS (`styles.css`) and JS (`script.js`) files
- Client-side Excel parsing (SheetJS), 2D charts (Chart.js) and 3D plots (Plotly)
- Node/Express backend for authentication, upload metadata, and analyses persistence (MongoDB + Mongoose)
- JWT-based auth, register/login, profile endpoint
- Admin endpoints to list users and promote a user to admin
- LocalStorage fallback so the UI works even without the backend

---

## Quick architecture map

- Frontend: `index.html`, `styles.css`, `script.js` (open in browser)
- Backend: `server/` (Express app)
  - `server/app.js` — main
  - `server/routes/auth.js` — register/login/profile
  - `server/routes/uploads.js` — persist upload metadata and analyses
  - `server/routes/admin.js` — admin user management
  - `server/models/User.js`, `server/models/Upload.js`

---

## 1) Backend — setup and run (Windows cmd.exe)

1. Open a command prompt in the server folder:

```cmd
cd "f:\PROGRAMMING\MY PROJECTS\ALL_PROJECTS\Excel_Analysis_Platform\New\server"
```

2. Install dependencies and create a `.env` file:

```cmd
npm install
copy .env.example .env
```

3. Edit `.env` and set your MongoDB connection and a strong JWT secret. Example `.env`:

```
MONGO_URI=mongodb://127.0.0.1:27017/excel_analytics
JWT_SECRET=some_long_random_secret_here
PORT=3000
```

4. Start the server:

```cmd
npm start
```

You should see `Connected to MongoDB` and `Server listening on port 3000` in the terminal.

Development mode (auto-restart) if you have nodemon:

```cmd
npm run dev
```

---

## 2) Frontend — open the UI

Option A — Quick (open file directly):

- Double-click `index.html` in the `New` folder or run:

```cmd
start "" "f:\PROGRAMMING\MY PROJECTS\ALL_PROJECTS\Excel_Analysis_Platform\New\index.html"
```

Option B — Serve files from a tiny static server (recommended for fetch/api behavior):

```cmd
cd "f:\PROGRAMMING\MY PROJECTS\ALL_PROJECTS\Excel_Analysis_Platform\New"
npx serve .
```

Open the URL the tool prints (usually `http://localhost:5000` or similar).

---

## 3) Interactive walkthrough — try the main flows

This step-by-step will guide you through registering, uploading (or loading sample data), generating a chart, saving an analysis (persisting to DB), and using the admin panel.

1. Register a user

   - Click `Register` (top-right), fill Name / Email / Password, and Create Account.
   - On success the UI stores a JWT in localStorage and will show your name.

2. Sign In

   - If you navigated away, click `Sign In` and provide credentials. JWT is stored as `auth_token` in localStorage.

3. Load data (fast)

   - You can click `Load Sample Data` (in the Upload area) to load built-in sample rows.
   - Or click `Choose Files` and pick `.xls` / `.xlsx` files.

4. Generate a chart

   - Once data is loaded, pick X/Y columns and Chart Type, then `Generate Chart`.
   - For 3D charts Plotly renders the view; for 2D Chart.js is used.

5. Save analysis (persist)

   - After generating a chart, click `Save Analysis`.
   - If you are signed in and the upload metadata was persisted, the analysis will be POSTed to the server and saved under that upload in MongoDB.
   - If not signed in, the analysis is saved locally in localStorage; sign in to persist to the server in future.

6. View history

   - Open the `History` tab to see upload entries and the saved analyses (local and server-synced ones).

7. Admin actions (promote user)
   - With an admin user (role = `admin`) open the `Admin` tab. The UI lists users and `Promote` buttons for non-admins.
   - Clicking Promote will call the server endpoint to set the user's `role` to `admin`.

Note: If you need a quick admin account and none exist yet, create a user and promote it directly in the DB (instructions below).

---

## 4) API reference (examples)

Base path: `http://localhost:3000/api`

Auth

- POST `/auth/register` — body: { name, email, password } — returns { token, user }
- POST `/auth/login` — body: { email, password } — returns { token, user }
- GET `/auth/profile` — header Authorization: Bearer <token>

Uploads / analyses

- POST `/uploads` — (auth) create upload metadata
  - body: { fileName, uploadDate, rowCount, columns }
- POST `/uploads/:id/analysis` — (auth owner or admin) add analysis
  - body: { xAxis, yAxis, chartType, dataPoints, timestamp }
- GET `/uploads` — (auth) get uploads (all for admin, user-only otherwise)

Admin

- GET `/admin/users` — (auth admin) list users
- POST `/admin/users/:id/promote` — (auth admin) promote user to admin

Example curl (register):

```cmd
curl -X POST http://localhost:3000/api/auth/register -H "Content-Type: application/json" -d "{\"name\":\"Alice\",\"email\":\"a@a.com\",\"password\":\"pass123\"}"
```

Example fetch (save analysis from client):

```js
fetch("http://localhost:3000/api/uploads/<uploadId>/analysis", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: "Bearer " + token,
  },
  body: JSON.stringify({
    xAxis: "Month",
    yAxis: "Sales",
    chartType: "line",
    dataPoints: 12,
  }),
})
  .then((r) => r.json())
  .then(console.log);
```

---

## 5) Data model summary

- User: { name, email, passwordHash, role }
- Upload: { user, fileName, uploadDate, rowCount, columns[], analyses[] }
- Analysis (embedded in upload): { user, xAxis, yAxis, chartType, dataPoints, timestamp }

---

## 6) Making the first admin (if needed)

If you have no admin user yet, the easiest bootstrap approach is to set a user's role directly in the database.

Using the Mongo shell (adjust connection string):

```cmd
mongo "mongodb://127.0.0.1:27017/excel_analytics"
use excel_analytics
db.users.updateOne({ email: 'your-email@example.com' }, { $set: { role: 'admin' } })
```

Alternatively, create a user in the UI and then run the same update using your Mongo client (Compass, Atlas UI, etc.).

---

## 7) Troubleshooting

- Backend can't connect to MongoDB: confirm `MONGO_URI` in `.env` and that Mongo is reachable. Check server logs.
- API calls failing from frontend: ensure the server is running on `http://localhost:3000` or update the API base URL in `script.js` constants.
- CORS issues: the backend uses `cors()` with default settings; if you host the frontend elsewhere set appropriate CORS options in `server/app.js`.

Logs: watch the server console for errors. The frontend prints errors to the browser console as well.

---

## 8) Security & production notes

- Use a secure, long `JWT_SECRET` and keep it out of version control.
- For production, enable HTTPS and stricter CORS rules.
- Add rate limiting and account lockout to prevent brute-force attacks.
- Consider storing files (Excel bytes) in a storage service (S3/Blob/GridFS) and reference them from the upload metadata.

---

If you want, I can next:

- Add server-side file uploads (GridFS or S3).
- Synchronize server-side uploads to the Dashboard view and allow loading files back into the UI.
- Add email verification and password reset flows.

Tell me which of the above you'd like next and I will implement it.
