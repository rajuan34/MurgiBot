# 10. Production Deployment & Operations Runbook

This runbook guides engineers through preparing, configuring, deploying, and maintaining **Bohurupi Core** in production cloud environments (Render, Railway, Docker, AWS, or Google Cloud Run).

---

## 1. Environment Variables Reference

Create a `.env` file in the root directory (or configure via your cloud platform dashboard):

| Variable | Required? | Default | Description |
| :--- | :---: | :--- | :--- |
| `PORT` | Optional | `3000` | Port for the Express server and React dashboard. |
| `NODE_ENV` | Optional | `production` | Environment mode (`production` or `development`). |
| `ADMIN_PASSWORD` | **Recommended** | `password123` | Password for Admin Dashboard and `/api/*` endpoints. |
| `DISCORD_TOKEN` | **Required** | `""` | Bot token from the Discord Developer Portal. |
| `DATABASE_URL` | Optional | `""` | PostgreSQL connection string (e.g., Supabase / Neon / RDS). |
| `PROGGA_KEY` | Optional | `""` | API Key for Progga AI (DeepSeek v4 Flash endpoint). |
| `PROGGA_BASE_URL` | Optional | `https://api.progga.app/v1` | Base URL for Progga API. |
| `GEMINI_API_KEY` | Optional | `""` | Google AI Studio Gemini API Key. |
| `GEMINI_MODELS` | Optional | *(Cascading)* | Comma-separated list of Gemini model tiers to cascade. |
| `OPENROUTER_API_KEY`| Optional | `""` | OpenRouter API Key for free and micro-cost failovers. |
| `TIMEZONE` | Optional | `Asia/Dhaka` | Timezone for the scheduled auto-reply cron job. |
| `SCHEDULE_1` | Optional | `15:30` | 24-hr time for first daily scheduled auto-reply. |
| `SCHEDULE_2` | Optional | `22:30` | 24-hr time for second daily scheduled auto-reply. |
| `ALLOWED_CHANNEL_IDS`| Optional | *(Standard 3)*| Additional comma-separated channel IDs permitted for bot replies. |
| `SCHEDULED_SERVER_ID`| Optional | `1522520842163060809` | Designated server ID for scheduled cron messages. |
| `APP_URL` / `RENDER_EXTERNAL_URL` | Optional | `""` | Public URL used by the 14-minute keep-alive pinger. |
| `DISABLE_DISCORD` | Optional | `false` | Set to `true` to run only the dashboard without connecting to Discord. |

---

## 2. Discord Developer Portal Setup

1. Open [Discord Developer Portal](https://discord.com/developers/applications).
2. Select or create your Application.
3. Under **Bot**:
   - Reset and copy the **Bot Token** -> Set as `DISCORD_TOKEN`.
   - **CRITICAL STEP:** Scroll down to **Privileged Gateway Intents**:
     - ✅ **MESSAGE CONTENT INTENT** -> **MUST BE TOGGLED ON**.
     - ✅ **SERVER MEMBERS INTENT** -> Recommended.
4. Under **OAuth2 -> URL Generator**:
   - Scopes: `bot`, `applications.commands`.
   - Bot Permissions:
     - `View Channels`
     - `Send Messages`
     - `Send Messages in Threads`
     - `Embed Links`
     - `Attach Files`
     - `Read Message History`
     - `Use External Emojis`
     - `Add Reactions`
5. Copy the generated URL and authorize the bot to your Discord server.

---

## 3. Build & Packaging Pipeline

Bohurupi uses a hybrid dual-target build system:
1. **Frontend:** Built via Vite (`vite build`) into `dist/` (static HTML/CSS/JS).
2. **Backend:** Bundled into a standalone CommonJS binary (`dist/server.cjs`) via `esbuild`:
   ```bash
   npm run build
   # Executes: vite build && esbuild src/backend/serverApp.ts --bundle --platform=node --format=cjs --packages=external --sourcemap --outfile=dist/server.cjs
   ```

### Execution Strategy (`server.ts`):
- **Development:** `npm run dev` boots `tsx server.ts`, dynamically compiling TypeScript and mounting Vite middlewares for HMR.
- **Production:** `npm start` (or `node server.ts`) checks if `dist/server.cjs` exists. If found, it requires the pre-compiled bundle, serving static assets from `dist/` without any compiler overhead.

---

## 4. Deploying to Render (Recommended Free-Tier)

Render provides an easy free-tier deployment for Node.js web services:

1. Create a new **Web Service** on Render connected to your Git repository.
2. Configure Settings:
   - **Runtime:** `Node`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
3. Add Environment Variables (from section 1).
4. **Keep-Alive Configuration:**
   - Render free tier puts services to sleep after 15 minutes of inactivity.
   - Bohurupi includes an autonomous keep-alive timer in `serverApp.ts` that pings `/api/health` every 14 minutes.
   - Ensure `RENDER_EXTERNAL_URL` or `APP_URL` is set to your Render URL (e.g. `https://bohurupi.onrender.com`).

---

## 5. Docker Deployment

Create a `Dockerfile` in the project root:

```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/behavior.md ./behavior.md

EXPOSE 3000
CMD ["node", "server.ts"]
```

---

## 6. Pre-Flight Production Verification Checklist

Before announcing the bot to your server:
- [ ] Run `npm run build` and ensure compilation succeeds with zero errors.
- [ ] Run `npm run lint` (`tsc --noEmit`) and ensure 0 TypeScript errors.
- [ ] Verify `DISCORD_TOKEN` is set and `Message Content` intent is enabled in Developer Portal.
- [ ] Ensure at least one AI provider key is set (`PROGGA_KEY`, `GEMINI_API_KEY`, or `OPENROUTER_API_KEY`).
- [ ] Check that `#bot-tasting-general` (`705092446366728236`) exists and the bot has `ViewChannel` and `SendMessages` permissions.
- [ ] Test the Admin Dashboard by navigating to `http://localhost:3000` (or your live domain) and logging in with `ADMIN_PASSWORD`.
- [ ] Perform an Uncal test: Mention or test ID `872356590991331360` with `!roast` to verify dynamic respectful defense triggers.

---

## 7. Troubleshooting Runbook

| Symptom | Probable Cause | Corrective Action |
| :--- | :--- | :--- |
| Bot logs mentions but never responds in Discord | Bot lacks `SendMessages` permission in channel | Open channel settings in Discord -> Permissions -> Grant `Send Messages` to Bohurupi's role. |
| `Missing Access` warning in logs | Bot is not added to channel or channel is private | Add bot to channel or ensure `@everyone` permissions allow bot to view channel. |
| Bot does not reply to text messages | `Message Content Intent` disabled | Go to Discord Developer Portal -> Bot -> Toggle ON **Message Content Intent**. |
| AI generation times out (18,000ms) | Provider API outage or network lag | Verify API key validity; `ProviderManager` will automatically cascade to next provider. |
| `DATABASE_URL is missing` warning | No PostgreSQL database configured | Normal behavior; Bohurupi automatically falls back to in-memory and local disk persistence. |
| Scheduled auto-reply doesn't fire | Timezone mismatch or bot paused | Verify `TIMEZONE` in `.env` (default `Asia/Dhaka`); check `/api/state` to verify `isPaused` is false. |
