# AI Interview Coach

AI Interview Coach is a full-stack interview-practice SaaS for technical, HR, and mixed interviews. It generates one question at a time, scores answers with structured feedback, tracks local history, and includes a streaming learning assistant.

## Features
- Responsive React/Vite interface: landing, setup, live interview, results, dashboard, and learning assistant.
- Configurable interview type, subject, difficulty, role, custom instructions, and 5/10/15 questions.
- Server-side NVIDIA NIM API integration running `nvidia/nemotron-3.5-lightning-30b-a3b` (OpenAI Responses API also supported as an alternate provider); API keys never reach the browser.
- Actual token streaming from the LLM to the browser through SSE for the learning assistant and question stream API.
- Structured JSON answer evaluations and final reports, validation, Helmet, CORS, rate limiting, health check, and safe errors.
- Browser localStorage history (no database dependency), Docker, and Amazon ECS Express Mode-ready configuration.

## Stack and architecture
React + Vite client → Express API → NVIDIA NIM API (nvidia/nemotron-3.5-lightning-30b-a3b). The Express server serves the compiled client in production and proxies streaming SSE events without buffering. Sessions are intentionally in memory for this MVP; completed reports are saved per browser in localStorage.

## Environment variables
Copy `.env.example` to `.env` and configure:

```env
AI_PROVIDER=nvidia
NVIDIA_API_KEY=your_server_only_key
NVIDIA_MODEL=nvidia/nemotron-3.5-lightning-30b-a3b
NVIDIA_BASE_URL=https://integrate.api.nvidia.com/v1
PORT=8080
NODE_ENV=production
MOCK_AI=false
```

The server uses NVIDIA's OpenAI-compatible Chat Completions endpoint and streams SSE tokens to the browser. To use OpenAI instead, set `AI_PROVIDER=openai` and supply `OPENAI_API_KEY` / `OPENAI_MODEL`.

`MOCK_AI=true` permits a fully testable local demo with no API key. Set it to `false` in production. Never commit `.env` or put an API key in `client/`.

## Local installation and running

```bash
npm install
npm --prefix client install
npm --prefix server install
npm run dev
```

Open the Vite URL (normally `http://localhost:5173`). The backend health endpoint is `http://localhost:8080/api/health`.

For production-style local running:

```bash
npm run build
npm start
```

## Docker

```bash
docker build -t ai-interview-coach .
docker run --rm -p 8080:8080 --env-file .env ai-interview-coach
```

Then visit `http://localhost:8080` and `http://localhost:8080/api/health`.

## Amazon ECS Express Mode deployment
AWS App Runner stopped accepting new customers on April 30, 2026; AWS now recommends Amazon ECS Express Mode for new containerized deployments, which offers the same operating simplicity with the full ECS feature set.

1. Create an Amazon ECR private repository.
2. Authenticate Docker: `aws ecr get-login-password --region REGION | docker login --username AWS --password-stdin ACCOUNT.dkr.ecr.REGION.amazonaws.com`.
3. Build, tag, and push: `docker build -t ai-interview-coach .`; `docker tag ai-interview-coach:latest ACCOUNT.dkr.ecr.REGION.amazonaws.com/ai-interview-coach:latest`; `docker push ACCOUNT.dkr.ecr.REGION.amazonaws.com/ai-interview-coach:latest`.
4. Ensure an ECS Task Execution Role and Infrastructure Role exist (the ECS Express Mode console can auto-create these on first use).
5. In the ECS console, open Express Mode, choose the ECR image, set container port `8080`, health check path `/api/health`, and configure `NVIDIA_API_KEY` as a secret plus `AI_PROVIDER=nvidia`, `NVIDIA_MODEL=nvidia/nemotron-3.5-lightning-30b-a3b`, `NVIDIA_BASE_URL=https://integrate.api.nvidia.com/v1`, `NODE_ENV=production`, and `MOCK_AI=false` as environment variables.
6. Deploy and verify `https://YOUR_SERVICE.ecs.REGION.on.aws/api/health`. Express Mode provisions the load balancer, HTTPS certificate, and public URL automatically.

AWS credentials were not available in this workspace, so deployment has been prepared but not performed.

## Testing checklist
- `npm run build` succeeds.
- Start the server and request `/api/health`; expected JSON is `{"status":"ok"}`.
- In mock mode, start a five-question interview, submit/skip answers, and verify the results/dashboard.
- With a valid API key and `MOCK_AI=false`, verify the learning text appears progressively and all generated AI content is real.
- Build/run the Docker commands above and repeat the health check.
- Check responsive views at 375px, tablet, and desktop widths.

## Live application URL
**https://ai-9a55e9eba5e3499098f3c97db3a07f09.ecs.ap-southeast-2.on.aws**

## Future enhancements
Authenticated accounts, durable database sessions, voice interviews, PDF reports, and analytics.


## Recovery after a transient `/api/interview/evaluate` failure

The development server and AI provider calls now include retry/error handling for transient
network resets (`ECONNRESET`), rate limits, and temporary 5xx failures. Keep your local `.env`
file with the same NVIDIA credentials/model you were already using.

Run from the project root:

```bash
npm install
npm --prefix server install
npm --prefix client install
npm run dev
```

Then open `http://localhost:5173/setup`.

If the backend is restarted, wait a few seconds and submit the answer again; the frontend now
retries transient API failures automatically.
