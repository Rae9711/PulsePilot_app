import json
import os
from http.server import BaseHTTPRequestHandler, HTTPServer
from typing import Any


def load_rewriter():
    from rewrite_insight import rewrite_fitness_insight

    return rewrite_fitness_insight


def load_forecast_rewriter():
    from rewrite_insight import personalize_fitness_forecast

    return personalize_fitness_forecast


def build_payload(result: Any) -> dict[str, Any]:
    return {
        "title": getattr(result, "title", ""),
        "summary": getattr(result, "summary", ""),
        "priority": getattr(result, "priority", "medium"),
        "category": getattr(result, "category", "general"),
        "bullets": list(getattr(result, "bullets", []) or []),
    }


def build_forecast_payload(result: Any) -> dict[str, Any]:
    return {
        "headline": getattr(result, "headline", ""),
        "coachSummary": getattr(result, "coachSummary", ""),
        "priorities": list(getattr(result, "priorities", []) or []),
        "nextActions": list(getattr(result, "nextActions", []) or []),
        "checkInQuestions": list(getattr(result, "checkInQuestions", []) or []),
    }


class Handler(BaseHTTPRequestHandler):
    server_version = "FitForecastJac/0.1"

    def _send(self, status: int, payload: dict[str, Any]) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _authorized(self) -> bool:
        expected = os.getenv("JAC_LLM_API_KEY", "").strip()
        if not expected:
            return True
        header = self.headers.get("Authorization", "")
        return header == f"Bearer {expected}"

    def do_GET(self) -> None:
        if self.path == "/health":
            self._send(
                200,
                {
                    "status": "ok",
                    "service": "fitforecast-jac-llm",
                    "jac_entry": "rewrite_insight.jac",
                },
            )
            return
        self._send(404, {"error": "not_found"})

    def do_POST(self) -> None:
        if self.path not in {"/rewrite-insight", "/personalize-forecast"}:
            self._send(404, {"error": "not_found"})
            return

        if not self._authorized():
            self._send(401, {"error": "unauthorized"})
            return

        try:
            length = int(self.headers.get("Content-Length", "0"))
            raw = self.rfile.read(length)
            payload = json.loads(raw.decode("utf-8") or "{}")
        except Exception:
            self._send(400, {"error": "invalid_json"})
            return

        narrative = payload.get("narrative") or {}
        supporting_stats = payload.get("supporting_stats") or {}

        if self.path == "/rewrite-insight":
            try:
                rewrite = load_rewriter()(
                    title=str(narrative.get("title", "")),
                    summary=str(narrative.get("summary", "")),
                    priority=str(narrative.get("priority", "medium")),
                    category=str(narrative.get("category", "general")),
                    bullets_json=json.dumps(narrative.get("bullets", [])),
                    supporting_stats_json=json.dumps(supporting_stats),
                )
            except Exception as exc:
                self._send(
                    502,
                    {
                        "error": "jac_rewrite_failed",
                        "message": str(exc),
                    },
                )
                return

            self._send(200, {"result": build_payload(rewrite)})
            return

        try:
            rewrite = load_forecast_rewriter()(
                headline=str(narrative.get("headline", "")),
                coachSummary=str(narrative.get("coachSummary", "")),
                priorities_json=json.dumps(narrative.get("priorities", [])),
                next_actions_json=json.dumps(narrative.get("nextActions", [])),
                questions_json=json.dumps(narrative.get("checkInQuestions", [])),
                supporting_stats_json=json.dumps(supporting_stats),
            )
        except Exception as exc:
            self._send(
                502,
                {
                    "error": "jac_forecast_failed",
                    "message": str(exc),
                },
            )
            return

        self._send(200, {"result": build_forecast_payload(rewrite)})


if __name__ == "__main__":
    host = os.getenv("FITFORECAST_JAC_HOST", "127.0.0.1")
    port = int(os.getenv("FITFORECAST_JAC_PORT", "8787"))
    server = HTTPServer((host, port), Handler)
    print(f"FitForecast Jac LLM service listening on http://{host}:{port}")
    server.serve_forever()
