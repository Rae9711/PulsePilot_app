"""Utility helpers for analytics prototypes."""
from datetime import datetime
from typing import List


def parse_iso(dt_str: str) -> datetime:
    return datetime.fromisoformat(dt_str)


def mean(values: List[float]) -> float:
    return sum(values) / len(values) if values else 0.0


def compute_insight_score(delta: float, data_points: int) -> float:
    """Compute a simple confidence score in range [0,1] for an insight.

    Score increases with larger absolute `delta` and with more `data_points`.
    This is intentionally lightweight and heuristic.
    """
    # Normalize delta contribution (smooth saturating function)
    delta_mag = abs(delta)
    delta_score = delta_mag / (delta_mag + 1.0)

    # Normalize data point contribution (diminishing returns)
    dp_score = data_points / (data_points + 5.0)

    score = delta_score * dp_score
    # Bound to [0,1]
    return max(0.0, min(1.0, score))

