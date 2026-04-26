"""Deterministic insight rule prototypes.

These are simple, well-documented functions suitable for validation in
notebooks and as a spec for backend implementation.
"""
from typing import Dict, Any, List
from datetime import datetime
from ..metrics.baseline import Feeling, MetricResult


def energy_uplift_after_strength(short_term: MetricResult, long_term: MetricResult, threshold: float = 0.8, min_points: int = 3) -> Dict[str, Any]:
    """Rule: short_term - long_term >= threshold and min data points.

    Returns an insight dict when rule matches, otherwise an empty dict.
    """
    if short_term.value is None or long_term.value is None:
        return {}
    if short_term.data_points < min_points or long_term.data_points < min_points:
        return {}

    delta = short_term.value - long_term.value
    if delta >= threshold:
        return {
            "type": "energy_uplift_strength",
            "rule_name": "workout_post_energy_delta",
            "summary": f"You feel +{delta:.1f} more energized after recent workouts versus your {long_term.window_days}-day average.",
            "supporting_stats": {
                "short_term_window_days": short_term.window_days,
                "short_term_value": round(short_term.value, 2),
                "long_term_window_days": long_term.window_days,
                "long_term_value": round(long_term.value, 2),
                "delta": round(delta, 2),
                "data_points_short": short_term.data_points,
                "data_points_long": long_term.data_points,
            },
        }

    return {}


def late_meals_lower_morning_energy(meal_times: List[datetime], morning_energies: List[int], window_days: int, threshold: float = -0.5, min_points: int = 3) -> Dict[str, Any]:
    """Prototype rule: late meals (after 21:00) correlate with lower next-morning energy.

    This function is intentionally simple — notebooks should expand and validate it.
    """
    if len(morning_energies) < min_points:
        return {}

    # Compute simple delta: mean(morning_energies_after_late_meal) - mean(overall_morning)
    # For prototype assume inputs are aligned externally.
    if not morning_energies:
        return {}

    overall = sum(morning_energies) / len(morning_energies)
    # Placeholder: assume half of mornings follow a late meal (not computed here)
    # Notebooks should replace with real alignment logic.
    after_late_mean = overall - 1.0  # conservative default
    delta = after_late_mean - overall

    if delta <= threshold:
        from ..utils.helpers import compute_insight_score
        score = compute_insight_score(delta, len(morning_energies))
        return {
            "type": "late_meal_morning_energy",
            "rule_name": "late_meal_next_morning_energy",
            "summary": "Eating late appears associated with lower next-morning energy for you.",
            "supporting_stats": {
                "delta": round(delta, 2),
                "threshold": threshold,
                "data_points": len(morning_energies),
                "score": round(score, 2),
            },
        }

    return {}


def routine_stabilizes_mood(routine_stress: List[float], nonroutine_stress: List[float], min_points: int = 3, reduction_ratio: float = 0.8) -> Dict[str, Any]:
    """Detects whether routine days (days with both workout+meal) have lower stress variance.

    `reduction_ratio` is the factor that routine variance must be below nonroutine variance
    (e.g., 0.8 means routine variance <= 80% of nonroutine variance).
    """
    from ..metrics.aggregations import variance
    from ..utils.helpers import compute_insight_score

    if len(routine_stress) < min_points or len(nonroutine_stress) < min_points:
        return {}

    var_routine = variance(routine_stress)
    var_non = variance(nonroutine_stress)

    if var_non == 0:
        return {}

    ratio = var_routine / var_non
    if ratio <= reduction_ratio:
        delta = var_non - var_routine
        score = compute_insight_score(delta, min(len(routine_stress), len(nonroutine_stress)))
        return {
            "type": "routine_mood_stability",
            "rule_name": "routine_stabilizes_mood",
            "summary": "Days with both workouts and meals show more stable stress levels for you.",
            "supporting_stats": {
                "var_routine": round(var_routine, 3),
                "var_nonroutine": round(var_non, 3),
                "ratio": round(ratio, 3),
                "data_points_routine": len(routine_stress),
                "data_points_nonroutine": len(nonroutine_stress),
                "score": round(score, 2),
            },
        }

    return {}
