# Stream 4 LLM Integration

This folder now supports two complementary paths:

1. Rule-based parsing in `src/parser.ts`
2. Optional Jac-powered insight rewriting in `jac_service/`

## What the Jac Service Does

The Jac service is an optional microservice that rewrites already-deterministic FitForecast insights into cleaner end-user copy. It does not decide whether an insight should exist. The backend remains the source of truth for baselines, rule firing, and supporting statistics.

That split is intentional:
- deterministic backend rules keep insights explainable
- Jac byLLM improves wording and presentation
- the product still works if the Jac service is offline

## Backend Configuration

Set these environment variables in the backend when you want to use Jac for insight copy:

```bash
INSIGHTS_LLM_PROVIDER=jac
JAC_LLM_URL=http://127.0.0.1:8787
JAC_LLM_API_KEY=change-me-if-exposed
```

If `INSIGHTS_LLM_PROVIDER=off`, the backend uses only deterministic copy.
If `INSIGHTS_LLM_PROVIDER=openai`, the backend talks directly to an OpenAI-compatible API.
If `INSIGHTS_LLM_PROVIDER=ollama`, the backend talks directly to Ollama.
If `INSIGHTS_LLM_PROVIDER=jac`, the backend calls this Jac service.

## Jac Service Setup

```bash
cd stream-4-integration/llm/jac_service
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### Remote API Model

```bash
export OPENAI_API_KEY="your-key"
python server.py
```

### Local Model via Ollama

Edit `jac.toml` and set the default model to an Ollama model name supported by byLLM, for example:

```toml
[plugins.byllm.model]
default_model = "ollama/llama3.1:latest"
```

Then start Ollama and run:

```bash
python server.py
```

## Service Endpoints

- `GET /health`
- `POST /rewrite-insight`

Example request:

```json
{
  "narrative": {
    "title": "Morning momentum is working",
    "summary": "Your morning workouts are associated with stronger post-session energy.",
    "priority": "medium",
    "category": "workout timing",
    "bullets": [
      "Morning sessions trend above your baseline.",
      "Late sessions are less consistent.",
      "Protect the routine on busy weekdays."
    ]
  },
  "supporting_stats": {
    "baseline": 3.8,
    "recent": 4.4,
    "delta": 0.6
  }
}
```

Example response:

```json
{
  "result": {
    "title": "Morning sessions keep paying off",
    "summary": "Your recent morning workouts are landing above your usual post-workout energy, which makes that schedule worth protecting.",
    "priority": "medium",
    "category": "workout timing",
    "bullets": [
      "Morning sessions are currently outperforming your baseline.",
      "The gap is large enough to matter in your weekly pattern.",
      "Keep those sessions anchored on your busiest days."
    ]
  }
}
```
