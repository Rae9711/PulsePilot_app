# FitForecast Final Presentation - Presenter Notes

## Slide 1 - FitForecast
- Introduce project and team.
- One-line pitch: FitForecast helps users discover personal fitness patterns through explainable insights.

## Slide 2 - The Problem (Relatable)
- Generic advice does not work for everyone.
- Many users do not know why some workouts help while others hurt their energy or mood.
- This uncertainty leads to inconsistency and frustration.

## Slide 3 - Our Solution
- Users log workouts/meals in natural language.
- Users add pre/post feelings for valence, energy, and stress.
- FitForecast builds personal baselines and provides explainable insights and predictions.

## Slide 4 - Why It Matters
- Focuses on personal trends instead of population averages.
- Supports sustainable habit building.
- Provides useful feedback for different user types.

## Slide 5 - What We Built
- Full-stack app with auth, dashboard, history, trends, and predictions.
- Per-user data isolation via JWT auth and protected routes.
- Demo personas with realistic six-month histories for repeatable demos.

## Slide 6 - Landing Page Walkthrough
- Open login page and explain value proposition.
- Show demo persona quick-login options.
- Show navigation and where users can explore trends and predictions.
- Replace screenshot placeholder with your actual landing page image before presenting.

## Slide 7 - Live Demo Flow
- Login as Athena.
- Show dashboard insights and prediction panel.
- Open history and trends to validate learned patterns.
- Log a new entry and explain expected refresh behavior.
- Optional: switch to Boris to contrast recommendations.

## Slide 8 - Architecture Snapshot
- Stream 1: backend + DB + insight rules.
- Stream 2: frontend workflows.
- Stream 3: analytics notebook validation.
- Stream 4: integration scenarios + optional LLM rewriting.

## Slide 9 - Reflection: Goal vs Outcome
- Original goal: understand links between habits and how users feel.
- Outcome: complete MVP with personalized baselines, insights, trends, and forecasting.
- Key lesson: explainable personalization increases trust and adoption.

## Slide 10 - Challenges and Wins
- Challenge: balancing personalization with explainability.
- Win: deterministic rule pipeline and user-specific baselines.
- Challenge: delivering full scope in one semester.
- Win: complete demo-ready product with realistic data.

## Slide 11 - Video Checklist
- Include landing page walkthrough.
- Include end-to-end app demo.
- Recommended total runtime: 3 to 6 minutes.

## Slide 12 - Thank You
- Close with product impact and invite questions.

## Video Recording Checklist (Submission)
- Start with 20-30s context and problem.
- Show landing/login page.
- Show live app flow: login -> dashboard -> history -> trends -> log new entry.
- End with semester reflection (goal vs actual build).
- Confirm final exported video includes both required parts:
  1. Landing page walkthrough
  2. Application demo
