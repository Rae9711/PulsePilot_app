#!/usr/bin/env python3
"""Simple CLI to run the Stream-3 evaluator against fixture users and emit JSON insights.

Usage example:
  source /Users/amums/umich-classes/eecs449/myenv/bin/activate
  cd stream-3-analytics
  PYTHONPATH=$(pwd) python run/run_evaluator.py -i test_data/sample_users.json -o run/output/insights.json
"""
import argparse
import json
import sys
from pathlib import Path


def main():
    repo_root = Path(__file__).resolve().parents[1]
    # Ensure imports use local package
    sys.path.insert(0, str(repo_root))

    parser = argparse.ArgumentParser(description="Run rule evaluator on fixture users and emit insights JSON")
    parser.add_argument("-i", "--input", default="test_data/sample_users.json", help="Input JSON with users list")
    parser.add_argument("-o", "--output", default="run/output/insights.json", help="Output JSON path")
    args = parser.parse_args()

    input_path = repo_root / args.input
    if not input_path.exists():
        print(f"Input not found: {input_path}")
        raise SystemExit(2)

    with open(input_path, "r") as fh:
        users = json.load(fh)

    try:
        from src.rules.evaluators import evaluate_rules_for_user
    except Exception as e:
        print("Could not import evaluator from src.rules.evaluators:", e)
        raise

    results = []
    for u in users:
        user_id = u.get("id")
        insights = evaluate_rules_for_user(user_id, metrics={}, extra_inputs={})
        results.append({"user_id": user_id, "insights": insights})

    out_path = repo_root / args.output
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w") as fh:
        json.dump(results, fh, indent=2)

    print(f"Wrote insights for {len(results)} users to {out_path}")


if __name__ == "__main__":
    main()
