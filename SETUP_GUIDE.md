# TimeWise AI - Setup & Configuration Guide

This guide will help you generate the necessary API keys and secrets for `.env.local`.

## 1. NEXTAUTH_SECRET
This works as a security key for your login sessions.
- **How to get it**: You can just type any long, random string.
- **Command line method**: Run this in your terminal:
  ```bash
  openssl rand -base64 32
  ```
- **Example**: `Jd83/dk38D...` (Paste the result into .env.local)

---

## 2. Google OAuth (Client ID & Secret)
This allows users to log in with their Gmail accounts.

1. Go to the **[Google Cloud Console](https://console.cloud.google.com/)**.
2. **Create a Project**: Click the dropdown at the top → "New Project" → Name it "TimeWise AI" → Create.
3. **Configure Consent Screen**:
   - Go to **APIs & Services** > **OAuth consent screen**.
   - Select **External** (or Internal if you have a Google Workspace) → Create.
   - Fill in "App Name" (TimeWise AI), "User Support Email", and "Developer Email".
   - Click **Save and Continue** (skip scopes/test users for now).
4. **Create Credentials**:
   - Go to **APIs & Services** > **Credentials**.
   - Click **+ CREATE CREDENTIALS** → **OAuth client ID**.
   - **Application type**: Web application.
   - **Name**: TimeWise Web Client.
   - **Authorized JavaScript origins**: `http://localhost:3000`
   - **Authorized redirect URIs**: `http://localhost:3000/api/auth/callback/google`
   - Click **Create**.
5. **Copy Keys**:
   - Copy **Client ID** → paste to `GOOGLE_CLIENT_ID`
   - Copy **Client Secret** → paste to `GOOGLE_CLIENT_SECRET`

---

## 3. Gemini API Key
This powers the Timetable Parsing and Chatbot.

1. Go to **[Google AI Studio](https://aistudio.google.com/app/apikey)**.
2. Click **Create API key**.
3. Select the Google Cloud project you created in Step 2 (or create a new one).
4. Click **Create**.
5. Copy the key starting with `AIza...` → paste to `NEXT_PUBLIC_GEMINI_API_KEY`.

---

### Final Step
Save your `.env.local` file and restart your server:
```bash
npm run dev
```
