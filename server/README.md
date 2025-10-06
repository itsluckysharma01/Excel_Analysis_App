## Server setup

1. Install dependencies

   npm install

2. Copy `.env.example` to `.env` and set `MONGO_URI` and `JWT_SECRET`.

3. Start the server

   npm start

## API endpoints

- POST /api/auth/register { name, email, password }
- POST /api/auth/login { email, password }
- GET /api/auth/profile (Authorization: Bearer <token>)

The frontend in `index.html` can call these endpoints at http://localhost:3000 by default.
