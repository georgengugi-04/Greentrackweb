# GreenTrack backend

Powers the chat widget on the GreenTrack site:

- **Chat** — visitor messages are saved to a database and forwarded to your WhatsApp. No signup or login required — visitors just leave a name (email optional), remembered on their device only.

Stack: Node.js, Express, Prisma, MySQL — same stack as your other projects, deployable on Railway the way you already deploy Ikonex SMS.

## 1. Install

```bash
cd greentrack-backend
npm install
cp .env.example .env
```

## 2. Database

Add a MySQL database (Railway → New → Database → MySQL works well), copy its connection string into `DATABASE_URL` in `.env`, then run:

```bash
npx prisma migrate dev --name init
```

This creates the `ChatMessage` table.

## 3. WhatsApp Cloud API

1. Create a Meta developer account at developers.facebook.com and add the **WhatsApp** product to an app.
2. Meta gives you a test phone number, a **Phone Number ID**, and a temporary access token — put these in `WHATSAPP_PHONE_NUMBER_ID` and `WHATSAPP_TOKEN`.
3. Set `WHATSAPP_TO_NUMBER` to your own WhatsApp number, in international format with no `+` or spaces (e.g. `2547XXXXXXXX`).
4. Meta only lets you free-text a number that has messaged your business number in the last 24 hours. Send a WhatsApp message to the test number once to open that window while you're testing. For production, look into approved message templates so the first message always goes through — check Meta's current docs, as these policies do shift.

## 4. Run locally

```bash
npm run dev
```

Server starts on `http://localhost:4000`. Check `http://localhost:4000/health`.

## 5. Deploy (Railway)

1. Push this folder to its own GitHub repo (or a `/backend` folder in your existing one).
2. Railway → New Project → Deploy from GitHub → pick the repo.
3. Add all the variables from `.env` in Railway's Variables tab (use the real MySQL plugin's `DATABASE_URL` if you provisioned MySQL through Railway).
4. Railway will run `npm install` and `npm start` automatically. Run `npx prisma migrate deploy` once from Railway's shell (or add it as a pre-deploy step) to create the tables in production.
5. Copy the Railway-issued URL (e.g. `https://greentrack-backend.up.railway.app`) — you'll paste it into the frontend's `widget.js`.

## API reference

| Method | Path                     | Purpose                                    |
|--------|--------------------------|---------------------------------------------|
| POST   | `/api/chat/messages`     | Save a chat message, forward it to WhatsApp |
| GET    | `/api/chat/messages`     | Fetch a session's chat history              |
| GET    | `/health`                | Health check                                |
