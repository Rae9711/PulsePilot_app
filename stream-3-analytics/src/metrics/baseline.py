"""Baseline metric helpers for Stream 3 analytics.

This module contains lightweight, pure-Python implementations intended as
first-draft reference code for baseline metric computations used by the
insights engine. These functions are small and easy to port to the backend
(TypeScript) implementation or to expand for offline analytics notebooks.
"""
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import List, Optional


@dataclass
class Feeling:
    occurred_at: datetime
    when: str  # 'pre' or 'post'
    valence: int
    energy: int
    stress: int


@dataclass
class MetricResult:
    metric: str
    window_days: int
    value: Optional[float]
    data_points: int


def window_start(window_days: int, now: Optional[datetime] = None) -> datetime:
    now = now or datetime.utcnow()
    return now - timedelta(days=window_days)


def compute_average_post_metric(
    feelings: List[Feeling],
    window_days: int,
    field: str = "energy",
    now: Optional[datetime] = None,
) -> MetricResult:
    start = window_start(window_days, now)
    values = [getattr(f, field) for f in feelings if f.when == "post" and f.occurred_at >= start]

    if not values:
        return MetricResult(metric=f"post_{field}", window_days=window_days, value=None, data_points=0)

    value = sum(values) / len(values)
    return MetricResult(metric=f"post_{field}", window_days=window_days, value=value, data_points=len(values))


def compute_count_events(entries: List[datetime], window_days: int, now: Optional[datetime] = None) -> MetricResult:
    start = window_start(window_days, now)
    count = len([d for d in entries if d >= start])
    return MetricResult(metric="event_count", window_days=window_days, value=float(count), data_points=count)
