# Multi-Model Collaboration

Claude làm **orchestrator** (main brain), GPT-4 làm **subagent** (coder). Giao tiếp real-time qua WebSocket, quản lý nhiều project trên web UI.

## Architecture

```
User → Web UI (React)
         ↓  WebSocket
       Backend (FastAPI)
         ↓
    Claude Orchestrator  ←── Main brain: plans, reviews, coordinates
         ↓ tool_use
    OpenAI GPT-4 Agent   ←── Coding subagent: implements, generates code
```

**Flow:**
1. User gửi task qua chat
2. Claude nhận task → tự quyết định:
   - Handle trực tiếp (planning, analysis, architecture)
   - Delegate sang GPT-4 qua `delegate_to_openai` tool (code generation)
   - Break down thành subtasks nếu phức tạp
3. Real-time stream events về UI: thinking → delegation → coding → done
4. Task được lưu vào DB với status tracking

## Cấu trúc project

```
multi-model-Collaboration/
├── backend/
│   └── app/
│       ├── agents/
│       │   ├── orchestrator.py   ← Claude + tool_use logic
│       │   └── openai_agent.py   ← GPT-4 subagent
│       ├── models/               ← SQLAlchemy + Pydantic
│       ├── routers/
│       │   ├── projects.py       ← REST API
│       │   └── chat.py           ← WebSocket endpoint
│       └── main.py
├── frontend/
│   └── src/
│       ├── components/           ← UI components
│       ├── hooks/useWebSocket.ts ← Real-time connection
│       └── stores/appStore.ts    ← Zustand state
├── setup.sh
└── start.sh
```

## Quick Start

### 1. API Keys

```bash
cp .env.example .env
# Edit .env — add your keys:
# ANTHROPIC_API_KEY=sk-ant-...
# OPENAI_API_KEY=sk-...
```

### 2. Setup & Run

```bash
./setup.sh   # install dependencies
./start.sh   # start backend + frontend
```

Mở http://localhost:5173

### 3. Dùng

1. **Create project** — click "+ New project" ở sidebar
2. **Chat** — gửi task cho Claude
3. **Watch** — xem Claude delegate tasks sang GPT-4 real-time
4. **Tasks panel** — tracking status của từng task

## Example prompts

```
Build a FastAPI endpoint for user authentication with JWT
```
→ Claude plans the architecture, delegates implementation to GPT-4

```
What's the best database schema for a multi-tenant SaaS?
```
→ Claude handles directly (architecture/analysis)

```
Create a React hook for infinite scroll with TypeScript
```
→ Claude delegates to GPT-4 for code generation

## Tech Stack

| Layer | Tech |
|-------|------|
| Backend | FastAPI + Python 3.12 |
| Orchestration | Anthropic SDK (native tool_use) |
| Subagent | OpenAI SDK (gpt-4o) |
| Database | SQLite + SQLAlchemy async |
| Real-time | WebSocket |
| Frontend | React 18 + Vite + TypeScript |
| State | Zustand |

## Mở rộng

Thêm model mới (Gemini, Mistral...):
1. Tạo `backend/app/agents/gemini_agent.py`
2. Thêm tool `delegate_to_gemini` trong `orchestrator.py`
3. Claude tự quyết định khi nào dùng model nào
