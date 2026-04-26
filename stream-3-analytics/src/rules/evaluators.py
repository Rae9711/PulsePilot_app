"""Simple evaluator to run all rules for a user given inputs.

This module ties together metric results and rule functions so notebooks or
the backend can call a single entrypoint to obtain insights.
"""
from typing import List, Dict, Any
from .index import energy_uplift_after_strength, late_meals_lower_morning_energy
from ..metrics.baseline import MetricResult
from datetime import datetime


def evaluate_rules_for_user(user_id: str, metrics: Dict[str, MetricResult], extra_inputs: Dict[str, Any] = None) -> List[Dict[str, Any]]:
    """Run the known rules and return insight dicts.

    - `metrics` is a mapping like { 'post_energy_short': MetricResult, 'post_energy_long': MetricResult }
    - `extra_inputs` may include aligned lists such as meal_times and morning_energies
    """
    insights = []
    extra_inputs = extra_inputs or {}

    # Energy uplift rule expects short and long term metrics
    short = metrics.get('post_energy_short')
    long = metrics.get('post_energy_long')
    if isinstance(short, MetricResult) and isinstance(long, MetricResult):
        res = energy_uplift_after_strength(short, long)
        if res:
            insights.append(res)

    # Late meals rule expects meal_times and morning_energies lists
    meal_times = extra_inputs.get('meal_times', [])
    morning_energies = extra_inputs.get('morning_energies', [])
    if meal_times and morning_energies:
        res = late_meals_lower_morning_energy(meal_times, morning_energies, window_days=14)
        if res:
            insights.append(res)

    return insights
