from datetime import datetime, timedelta
from src.metrics.baseline import Feeling, compute_average_post_metric, MetricResult
from src.rules.index import energy_uplift_after_strength, late_meals_lower_morning_energy


def test_compute_average_post_metric():
    now = datetime(2026, 3, 1)
    feelings = [
        Feeling(occurred_at=datetime(2026, 2, 25), when='post', valence=4, energy=4, stress=2),
        Feeling(occurred_at=datetime(2026, 2, 27), when='post', valence=5, energy=5, stress=3),
    ]

    res = compute_average_post_metric(feelings, window_days=14, field='energy', now=now)
    assert res.data_points == 2
    assert abs(res.value - 4.5) < 0.01


def test_compute_average_ignores_pre_feelings_and_window_bounds():
    now = datetime(2026, 3, 1)
    # one pre feeling (should be ignored), one post inside window, one post outside window
    feelings = [
        Feeling(occurred_at=datetime(2026, 2, 20), when='pre', valence=3, energy=2, stress=3),
        Feeling(occurred_at=datetime(2026, 2, 26), when='post', valence=4, energy=4, stress=2),
        Feeling(occurred_at=datetime(2026, 1, 1), when='post', valence=5, energy=5, stress=1),
    ]

    res = compute_average_post_metric(feelings, window_days=14, field='energy', now=now)
    # Only the 2026-02-26 post should be counted
    assert res.data_points == 1
    assert abs(res.value - 4.0) < 0.01


def test_compute_average_no_post_values_returns_none():
    now = datetime(2026, 3, 1)
    feelings = [
        Feeling(occurred_at=datetime(2026, 2, 20), when='pre', valence=3, energy=2, stress=3),
        Feeling(occurred_at=datetime(2026, 1, 1), when='pre', valence=2, energy=1, stress=4),
    ]

    res = compute_average_post_metric(feelings, window_days=30, field='energy', now=now)
    assert res.data_points == 0
    assert res.value is None


def test_energy_uplift_after_strength_fires_when_delta_exceeds_threshold():
    short = MetricResult(metric='post_energy', window_days=7, value=5.0, data_points=5)
    long = MetricResult(metric='post_energy', window_days=30, value=3.5, data_points=10)
    insight = energy_uplift_after_strength(short, long, threshold=0.8, min_points=3)
    assert isinstance(insight, dict) and insight.get('type') == 'energy_uplift_strength'
    assert round(insight['supporting_stats']['delta'], 2) == round(5.0 - 3.5, 2)


def test_energy_uplift_after_strength_does_not_fire_when_delta_too_small():
    short = MetricResult(metric='post_energy', window_days=7, value=4.0, data_points=5)
    long = MetricResult(metric='post_energy', window_days=30, value=3.5, data_points=10)
    insight = energy_uplift_after_strength(short, long, threshold=0.8, min_points=3)
    assert insight == {}


def test_energy_uplift_after_strength_does_not_fire_with_insufficient_points():
    short = MetricResult(metric='post_energy', window_days=7, value=5.0, data_points=2)
    long = MetricResult(metric='post_energy', window_days=30, value=3.0, data_points=2)
    insight = energy_uplift_after_strength(short, long, threshold=0.8, min_points=3)
    assert insight == {}


def test_late_meals_rule_fires_with_enough_data():
    # Provide mock morning energies (length >= min_points). The function uses a placeholder delta (-1.0),
    # so it should fire with default threshold -0.5.
    meal_times = [datetime(2026, 2, 22, 22, 0), datetime(2026, 2, 24, 22, 30), datetime(2026, 2, 26, 21, 15)]
    morning_energies = [4, 3, 4, 5]
    insight = late_meals_lower_morning_energy(meal_times, morning_energies, window_days=14, threshold=-0.5, min_points=3)
    assert isinstance(insight, dict) and insight.get('type') == 'late_meal_morning_energy'


def test_late_meals_rule_does_not_fire_with_insufficient_data():
    meal_times = [datetime(2026, 2, 22, 22, 0)]
    morning_energies = [4]
    insight = late_meals_lower_morning_energy(meal_times, morning_energies, window_days=14, threshold=-0.5, min_points=3)
    assert insight == {}


def test_late_meals_rule_respects_threshold():
    # Using a more-negative threshold (-1.5) the placeholder delta (-1.0) should NOT trigger the rule
    meal_times = [datetime(2026, 2, 22, 22, 0), datetime(2026, 2, 24, 22, 30), datetime(2026, 2, 26, 21, 15)]
    morning_energies = [4, 3, 4, 5]
    insight = late_meals_lower_morning_energy(meal_times, morning_energies, window_days=14, threshold=-1.5, min_points=3)
    assert insight == {}
