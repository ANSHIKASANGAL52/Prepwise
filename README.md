# Prepwise

A fresh, full-stack interview preparation app with a locally usable demo mode. The interface helps people build role-specific practice sets, submit practice answers for AI feedback, review model answers, bookmark questions, and ask for clearer explanations.

## Stack

- **Frontend:** React 19, Vite, Lucide icons, responsive CSS
- **API:** Express 5, JWT authentication, bcrypt password hashing
- **Data:** MongoDB and Mongoose
- **AI:** Gemini question and concept generation
- **Interview feedback:** Gemini scores a candidate response and returns strengths, improvements, and a concrete next step

## Run it

Requirements: Node.js 20 or newer. The frontend demo works without server credentials. Accounts and AI generation require MongoDB and Gemini.

1. In a terminal, start the frontend:

   ```powershell
   cd Frontend
   npm ci
   npm run dev
   ```

2. Open <http://localhost:5173>. It starts in demo mode with example sessions and local browser storage.
3. For the complete full-stack flow, copy `Backend/.env.example` to `Backend/.env`, add your MongoDB URI, a long random JWT secret, and Gemini API key. Then start the API in another terminal:

   ```powershell
   cd Backend
   npm ci
   npm run dev
   ```

4. To allow account registration, set `Frontend/.env` from its example or use the default API URL. The API health check is <http://localhost:5000/api/health>.

## Demo mode and full-stack mode

The interface ships with example sessions and keeps demo-created sessions in local storage. If no account is available, you can still explore the flow. With the API configured, sign up or sign in to use JWT-authenticated sessions backed by MongoDB, generate questions, get feedback on your own interview answers, and request concept explanations with Gemini. Never put the Gemini key or JWT secret in a `VITE_` environment variable.

## Deploy

The root `render.yaml` describes a Render API service and static frontend. Push this folder to a GitHub repository you control, create a Render Blueprint from it, and provide the MongoDB URI, Gemini key, and the deployed frontend URL when prompted. The API URL is configured in the blueprint; adjust it if you rename the API service. Add the deployed frontend URL to `FRONTEND_URL` for CORS.

## Code map

```text
Frontend/src/App.jsx                 App shell, demo data, dashboard and session flows
Frontend/src/styles.css              Responsive product UI and interaction states
Backend/server.js                    Express app, CORS, health endpoint, DB connection
Backend/routes/auth.js               Sign up, login, current profile
Backend/routes/sessions.js           AI creation, session list, pins, explanations, delete
Backend/middleware/auth.js           JWT verification and request user
Backend/models/                      MongoDB user and nested session/question schemas
```

See `docs/PROJECT-WALKTHROUGH.md` for the architecture and suggested interview demo.
