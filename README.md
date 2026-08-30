# VedaAI — AI Assessment Extraction & Answer Mapping Platform

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat&logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688?style=flat&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Google Gemini](https://img.shields.io/badge/Google%20Gemini-3.6%20Flash-4285F4?style=flat&logo=google)](https://deepmind.google/technologies/gemini/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat&logo=docker)](https://www.docker.com/)

A production-grade, full-stack AI evaluation platform that automates **examination question paper extraction**, **student handwritten answer sheet transcription**, **intelligent Question ↔ Answer mapping**, **precision bounding-box highlighting**, and **AI pedagogical grading**.

---

## 🌟 Key Features

1. **Document Ingestion & Processing**:
   - Supports multi-page PDF documents and high-resolution images (PNG, JPG, WEBP).
   - High-fidelity PDF rendering via `pypdfium2` and `Pillow` preserving original coordinate geometry.
   - 10MB per-file validation and secure stream delivery.

2. **Gemini Vision Question Extraction**:
   - Extracts printed questions strictly in reading order with exact numbering.
   - Automatically identifies and isolates subparts (e.g. `11(a)`, `11(b)`).
   - Extracts marks allocations (`[2 Marks]`, `[3m]`) and computes normalized bounding box coordinates.

3. **Handwritten Answer Transcription**:
   - Multimodal handwriting OCR with **Google Gemini Vision (`gemini-3.6-flash`)**.
   - Preserves complex chemical equations, biological definitions, and mathematical notation.
   - Automatically links and stitches multi-page continuation answers (e.g. `Ans 4` across Page 1 and Page 2).
   - Flags non-answer scratchpad calculations as `unmatched`.

4. **Hybrid Question ↔ Answer Mapping**:
   - **Deterministic Stage**: Matches explicit student labels (`Q1.`, `Ans 2`, `11(a)`).
   - **Semantic Fallback**: Employs Gemini semantic reasoning for unlabelled answers (confidence threshold `>= 0.70`).
   - **Strict 1-to-1 Guarantee**: Prevents duplicate assignment of answers across questions.
   - Flags unattempted questions as `unanswered` and extra student writing as `unmatched`.

5. **Precision Answer Highlighting**:
   - Multi-location coordinate clamping (`[0%, 95%]`) ensuring zero canvas overflow.
   - Synchronized zoom (`50%` to `200%`) and automated page navigation.
   - Distinct badges for mapped answers, multi-page continuations (`(Cont.)`), and unmatched notes.
   - Zero false highlights for unanswered questions.

6. **Automated AI Grading & Feedback Engine**:
   - Strict score boundary enforcement: `0.0 <= obtained_marks <= max_marks`.
   - Clear verdicts: `correct`, `partial`, `incorrect`, and `unanswered` (0 marks).
   - Pedagogical constructive feedback and assessment aggregate statistics.

7. **Exact Figma User Interface**:
   - Pixel-accurate implementation of the VedaAI Figma design system in Next.js 16 (TypeScript).

---

## 🏗️ Architecture & Monorepo Structure

```
.
├── apps/
│   ├── web/                     # Next.js 16 App Router (TypeScript, Tailwind, Lucide)
│   │   ├── src/
│   │   │   ├── app/             # Main page, layout, styles
│   │   │   ├── components/      # Sidebar, Header, UploadView, QuestionList, AnswerSheetViewer
│   │   │   ├── types/           # Pydantic-aligned TypeScript interfaces
│   │   │   └── data/            # Fallback mock data
│   │   ├── Dockerfile           # Multi-stage production container
│   │   └── package.json
│   │
│   └── api/                     # FastAPI Backend (Python 3.11)
│       ├── app/
│       │   ├── api/v1/          # Endpoints: health, documents, questions, answers, mapping, grading
│       │   ├── core/            # App settings, dynamic CORS & Railway ports
│       │   ├── schemas/         # Pydantic schemas (document, question, answer, mapping, grading)
│       │   └── services/        # Gemini vision service, document engine, mapping & grading services
│       ├── Dockerfile           # Lightweight production container
│       └── requirements.txt
│
├── packages/
│   └── shared/                  # Shared TypeScript interfaces and utility types
│
├── docker-compose.yml           # Local multi-service orchestration
├── railway.json                 # Railway production deployment blueprint
├── .env.example                 # Root environment template
└── README.md                    # Project documentation
```

---

## 🚀 Local Development Setup

### 1. Prerequisites
- **Node.js**: `>= 18.0.0`
- **Python**: `>= 3.11.0`
- **Docker & Docker Compose**

### 2. Configure Environment Variables
```bash
# Copy root and service env files
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```
Add your Gemini API Key in `.env` and `apps/api/.env`:
```env
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-3.6-flash
```

### 3. Run with Docker Compose (Recommended)
```bash
docker compose build
docker compose up -d
```

#### Dedicated Service Ports:
- **Web Frontend**: [http://localhost:3100](http://localhost:3100)
- **FastAPI API**: [http://localhost:8100](http://localhost:8100)
  - Interactive Swagger Docs: [http://localhost:8100/api/docs](http://localhost:8100/api/docs)
  - API Health Check: [http://localhost:8100/api/health](http://localhost:8100/api/health)
- **PostgreSQL**: `localhost:5445` (mapped to internal `5432`)

---

## ☁️ Production Deployment on Railway

The monorepo is fully Dockerized and pre-configured for deployment on **Railway**.

### Step 1: Create a Railway Project
1. Log in to [Railway.app](https://railway.app).
2. Click **New Project** → **Deploy from GitHub repo** and select your repository.

### Step 2: Provision PostgreSQL (Optional / Ready for Persistence)
1. In your Railway project canvas, click **+ New** → **Database** → **Add PostgreSQL**.
2. Railway will provision the instance and generate a `DATABASE_URL`.

### Step 3: Deploy the FastAPI Backend (`vedaai-api`)
1. In the project canvas, click **+ New** → **GitHub Repo** → select this repo.
2. In service **Settings**:
   - **Root Directory**: `apps/api` (or specify Dockerfile path `/apps/api/Dockerfile`).
3. Under **Variables**, add:
   - `PORT`: `8000`
   - `CORS_ORIGINS`: `*` (or your frontend domain, e.g. `https://vedaai-web.up.railway.app`)
   - `GEMINI_API_KEY`: `<YOUR_GEMINI_API_KEY>`
   - `GEMINI_MODEL`: `gemini-3.6-flash`
   - `DATABASE_URL`: `${{Postgres.DATABASE_URL}}`
4. Under **Networking**, click **Generate Domain** (e.g. `https://vedaai-api.up.railway.app`).

### Step 4: Deploy the Next.js Frontend (`vedaai-web`)
1. In the project canvas, click **+ New** → **GitHub Repo** → select this repo.
2. In service **Settings**:
   - **Root Directory**: `apps/web` (or specify Dockerfile path `/apps/web/Dockerfile`).
3. Under **Variables / Build Arguments**, add:
   - `NEXT_PUBLIC_API_URL`: `https://<YOUR_RAILWAY_API_DOMAIN>` (e.g. `https://vedaai-api.up.railway.app`)
   - `PORT`: `3000`
4. Under **Networking**, click **Generate Domain** (e.g. `https://vedaai-web.up.railway.app`).

---

## 📡 API Reference

| HTTP Method | Route | Description |
|---|---|---|
| `GET` | `/api/health` | Service health status and timestamp |
| `POST` | `/api/documents/upload` | Multipart upload for question paper and answer sheet |
| `GET` | `/api/documents/{job_id}/pages/{doc_type}/{page}` | Stream rendered high-resolution PNG page image |
| `POST` | `/api/documents/{job_id}/extract-questions` | Multimodal Gemini extraction of printed questions |
| `POST` | `/api/documents/{job_id}/extract-answers` | Gemini Vision transcription of student handwriting |
| `POST` | `/api/documents/{job_id}/map-qa` | Hybrid deterministic + semantic Question ↔ Answer mapping |
| `GET` | `/api/documents/{job_id}/mapping` | Retrieve cached QA mappings |
| `POST` | `/api/documents/{job_id}/grade` | Automated rubric-based AI grading and feedback |
| `GET` | `/api/documents/{job_id}/grades` | Retrieve cached AI evaluation and grades |

---

## 🛡️ Security & Environment Safety
- No API keys, tokens, credentials, or `.env` files are tracked in version control.
- All secrets are injected dynamically via environment variables (`.env`, Docker, or Railway).
