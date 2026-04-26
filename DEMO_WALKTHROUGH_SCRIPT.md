# FitForecast Complete Demo Walkthrough Script

Use this as a read-aloud script during your final demo and video recording.

## Demo Length Options

- Full walkthrough (all features): 10 to 12 minutes
- Submission-ready walkthrough: 6 to 8 minutes

## Pre-Demo Setup Checklist (before recording)

- Backend running on http://localhost:3000
- Frontend running on http://localhost:5174
- Use seeded demo accounts:
  - athena@example.com / password123
  - boris@example.com / password123
  - cora@example.com / password123
- Keep one browser tab on the app and one tab ready for API docs at http://localhost:3000/docs (optional)

## Script Start (0:00 - 0:45)

Say:

Hi everyone, this is FitForecast. The core problem we wanted to solve is that most fitness advice is generic, but people respond differently to workouts, meals, timing, and stress. We built a personalization-first app that helps users discover what works for their own body and routine. Today I will walk through the landing page, the full product flow, and show how insights change across different users.

## 1) Landing Page Walkthrough (0:45 - 1:30)

Do:

- Open http://localhost:5174/login
- Slowly scroll through the left panel and login card

Say:

This is our landing and login experience. The messaging explains the value clearly: users log workouts and meals in natural language, track how they feel before and after, and then get explainable insights based on their personal baseline. The primary call to action is to try with demo accounts or create a free account.

Point out:

- Value proposition headline
- Feature cards
- Demo account quick-access buttons
- Login form and clear path to signup

## 2) Login and Dashboard Overview (1:30 - 2:45)

Do:

- Click Athena demo button or enter credentials manually
- Click Login
- Wait for dashboard to load

Say:

I am logging in as Athena, who represents a consistent improver persona. The dashboard is designed to answer three questions quickly: what has the user been doing, what patterns are emerging, and what to do next.

Show and narrate:

- Recent entries area
- AI chat panel
- Personalized summary cards (best next action, confidence, risk)
- Any trend or summary cards visible

Say:

The key part is that these insights are not generic. They are tied to this user’s history and baseline, so recommendations are explainable and personal.

## 3) Analytics and Metric Explanation (2:45 - 4:10)

Do:

- Navigate to Trends (`/trends`)
- Highlight trend chart plus weight chart
- Highlight top correlation and top "What to do next" cards

Say:

This is our personalization core: we show behavior trend, supporting evidence, and the next actions to test. The page is intentionally concise so users can decide quickly instead of reading too many cards.

Then explain metrics in one sentence each:

- Post-workout energy: how energized the user feels after training (higher is better)
- Post-workout mood: how positive they feel after training (higher is better)
- Post-workout stress: stress after training (lower is better)
- Baseline line: user's typical level from prior history
- Recent average line: current behavior window

If asked about AI:

Our rules and signals are deterministic and explainable. Optional AI is used for wording polish, not to invent core signals.

## 4) History Page: Data Grounding (4:10 - 5:10)

Do:

- Navigate to History
- Scroll through entries

Say:

History is the source of truth for what the model learns from. You can see workouts and meals, plus pre and post feelings. This is important because users can verify whether the insights actually match their real behavior.

Call out:

- Entry descriptions in natural language
- Time patterns
- Feeling values before and after sessions

## 5) Weight Tracker Feature (5:10 - 6:00)

Do:

- Navigate to Weight (`/weight`)
- Log one weight entry with a selected date
- Show trend chart and history table

Say:

This feature tracks body-weight trajectory and ties it back to performance context in analytics. It supports backfilling historical dates so users can recover real history.

## 6) Log a New Entry Live (6:00 - 7:15)

Do:

- Navigate to Trends
- Change metric and time window controls if available

Say:

Trends shows progression over time and compares recent performance to baseline. This makes it easier to see whether a pattern is stable, improving, or slipping.

Call out:

- Chart movement and windowing
- Baseline versus recent behavior
- Weight trend alignment with behavior trends

## 7) AI Coach Feature (7:15 - 8:15)

Do:

- Open AI Coach (`/coach`)
- Ask a question: "Based on my last few logs, what should I adjust tomorrow?"
- Show reply style adapting to the user context

Say:

AI coach is chat-first. It uses the user's plan, recent behavior, and adaptive mode to provide contextual guidance instead of generic templates.

## 8) Persona Comparison to Show Personalization (8:15 - 9:45)

Do:

- Navigate to Log
- Enter a sample workout
- Fill pre and post feelings
- Submit
- Go back to Dashboard or History

Suggested sample entry:

Workout: 45 minute morning strength session with squats, rows, and a short cooldown walk.

Say:

Now I will simulate real usage by logging a new session. This is the core user loop: log activity, log feelings, receive immediate AI advice from that log plus the day context, and review the long-term trend over time.

Do:

- Logout
- Login as Boris
- Open Dashboard and Trends quickly

Say:

Now I switched to Boris, a more inconsistent and higher-stress persona. The app should surface different guidance than Athena, because the behavior history is different. This demonstrates personalized adaptation rather than one-size-fits-all coaching.

Optional:

- Switch to Cora and mention maintenance and optimization style recommendations for high performers

## 9) Architecture and Technical Credibility (9:45 - 10:30)

Say:

Under the hood, this is a multi-stream implementation. We have a TypeScript frontend, Node and Prisma backend, PostgreSQL data layer, analytics validation notebooks, and integration scenarios. Authentication is JWT-based with per-user data isolation. The product is designed so core insights remain reliable and explainable.

## 10) Reflection: Goal vs What We Built (10:30 - 11:10)

Say:

At the beginning of the semester, our goal was to help people connect daily habits with how they feel and perform. What we actually built is a full MVP with authentication, logging, personalized baselines, insights, trends, and forecasting, plus realistic demo personas for validation. The biggest learning was that users trust systems more when personalization is paired with clear explainability.

## Closing Line

Say:

FitForecast helps people move from generic advice and guesswork to personal, data-informed fitness decisions. Thank you.

---

## 6 to 8 Minute Submission Version

If you need a shorter recording, use this compressed order:

1. Problem and solution in 30 to 45 seconds
2. Landing + login in 45 seconds
3. Dashboard outcome-first panel in 60 to 90 seconds
4. Analytics metric explanation in 90 seconds
5. Log one entry + show immediate advice in 60 seconds
6. Weight tracker in 45 seconds
7. Boris quick comparison in 45 seconds
8. Reflection in 30 to 45 seconds

This still satisfies required video content:

- Landing page walkthrough
- Application demo
