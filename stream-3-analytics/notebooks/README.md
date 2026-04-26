# Notebooks

Place Jupyter notebooks used for validation and exploration here. Suggested notebooks:

- `01_baseline_definitions.ipynb` — Define and test metric computations using synthetic feelings.
- `02_insight_rule_validation.ipynb` — Validate rules across sample users and thresholds.
- `03_edge_case_testing.ipynb` — Sparse data, noisy inputs, and new-user behavior.
- `04_scenario_validation.ipynb` — Run scenarios provided by Stream 4 to ensure rules are stable.

Start Jupyter Lab from the `stream-3-analytics` directory after installing requirements:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
jupyter lab notebooks
```
