"""Simple anomaly detection helpers for Stream 3 analytics."""
from typing import List, Tuple
import math


def detect_zscore_outliers(values: List[float], threshold: float = 2.5) -> List[int]:
    """Return list of indices in `values` that are outliers by z-score.

    Uses population standard deviation. Simple, deterministic method suitable
    for prototyping; replace with robust methods in production.
    """
    n = len(values)
    if n == 0:
        return []
    mean = sum(values) / n
    var = sum((x - mean) ** 2 for x in values) / n
    std = math.sqrt(var) if var > 0 else 0.0
    if std == 0:
        return []

    outliers = []
    for i, v in enumerate(values):
        z = (v - mean) / std
        if abs(z) >= threshold:
            outliers.append(i)
    return outliers
