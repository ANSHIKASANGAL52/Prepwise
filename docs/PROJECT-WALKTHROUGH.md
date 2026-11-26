# Prepwise: project walkthrough

## Short pitch

“Prepwise is a full-stack interview practice app. A candidate chooses a role and topics; the server uses Gemini to generate a targeted question set. Questions can be reviewed, bookmarked, and explained in more detail. The React app also has a local demo mode so the core flow can be shown without service credentials.”

## Request flow

```text
React UI → fetch API + bearer JWT → Express route → auth middleware
                                      ├─ Gemini for question/explanation generation
                                      └─ Mongoose → MongoDB for users and sessions
```

The React app owns view state and local demo persistence. In signed-in mode, API requests include a JWT in the `Authorization` header. The Express auth middleware verifies the token and loads the user before a private session handler runs.

When a user creates a set, the API validates the role and focus topics, asks Gemini for a JSON array, saves a session with embedded questions in MongoDB, and returns a UI-shaped session object. Embedding each question is a good fit for this app because questions are read and pinned as part of their parent session. The route still checks ownership before any session mutation.

## Data model

- **User:** display name, unique email, bcrypt-hashed password.
- **Session:** owner, role, company, experience, focus topics, progress, and embedded questions.
- **Question:** question and answer text, bookmark state, timestamps.

## What to demo

1. Open the dashboard and point out the example sessions and saved progress.
2. Choose **New practice set**, enter a target role and focus topics, and create a session. Without credentials, the app creates a local demo session; with MongoDB and Gemini configured, the API generates and saves the set.
3. Expand a question, type a practice response, and choose **Get AI feedback**. Gemini returns a score, strengths, improvement areas, and one concrete suggestion. The response and review progress are saved with the session.
4. Expand **View sample answer** to compare against a strong response structure.
5. Bookmark a useful question and open **Bookmarks**.
6. Use **Explain this concept** to show the concept panel. With a Gemini key configured, it displays the generated explanation.
7. Mention that demo sessions persist in local storage, while signed-in sessions and feedback are stored in MongoDB.

## Engineering choices to discuss

- **JWT and bcrypt:** passwords are never stored as plaintext; bearer tokens protect private operations.
- **Ownership checks:** every update and delete scopes the document lookup to the signed-in user.
- **Structured AI output:** the generation prompt asks for JSON and the server validates the array before persistence.
- **Demo-first UX:** local sessions make the experience presentable without exposing or hardcoding secrets.
- **Next improvements:** schema validation library, rate limits and quotas for AI calls, stronger error/observability strategy, automated API and UI tests, refresh-token strategy, and a dedicated account recovery flow.
