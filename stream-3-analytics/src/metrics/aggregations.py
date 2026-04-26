"""Aggregation helpers for metrics (rolling stats)."""
from typing import List, Tuple
from datetime import datetime, timedelta


def rolling_average(points: List[Tuple[datetime, float]], window_days: int, now: datetime = None) -> List[Tuple[datetime, float]]:
    """Compute simple rolling average over the provided (datetime, value) points.

    Returns a list of (datetime, avg) aligned to each input point considering a trailing window.
    """
    if not points:
        return []

    now = now or datetime.utcnow()
    result = []
    for i, (ts, _) in enumerate(points):
        window_start = ts - timedelta(days=window_days)
        window_vals = [v for (t, v) in points if t >= window_start and t <= ts]
        avg = sum(window_vals) / len(window_vals) if window_vals else 0.0
        result.append((ts, avg))

    return result


def variance(values: List[float]) -> float:
    """Population variance (simple implementation)."""
    n = len(values)
    if n == 0:
        return 0.0
    mean = sum(values) / n
    return sum((x - mean) ** 2 for x in values) / n
