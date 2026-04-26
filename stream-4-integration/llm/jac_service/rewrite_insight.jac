obj InsightRewrite {
    has title: str;
    has summary: str;
    has priority: str;
    has category: str;
    has bullets: list[str];
}

obj ForecastRewrite {
    has headline: str;
    has coachSummary: str;
    has priorities: list[str];
    has nextActions: list[str];
    has checkInQuestions: list[str];
}

sem InsightRewrite = "Structured output for a FitForecast insight card.";
sem InsightRewrite.title = "Short title for the dashboard card, usually 4 to 8 words.";
sem InsightRewrite.summary = "Two-sentence evidence-based explanation for the user.";
sem InsightRewrite.priority = "One of: high, medium, low.";
sem InsightRewrite.category = "Human-readable category label such as workout timing, recovery, or nutrition.";
sem InsightRewrite.bullets = "Exactly three short actionable bullets grounded only in the provided evidence.";

sem ForecastRewrite = "Structured output for a FitForecast predictive coaching summary.";
sem ForecastRewrite.headline = "Short headline for the forecast panel, usually 4 to 8 words.";
sem ForecastRewrite.coachSummary = "Two or three sentences summarizing the forecast without inventing evidence.";
sem ForecastRewrite.priorities = "Exactly three short priority statements grounded in the provided evidence.";
sem ForecastRewrite.nextActions = "Exactly three next actions grounded in the provided evidence.";
sem ForecastRewrite.checkInQuestions = "Exactly two follow-up questions that help the user validate the forecast.";

sem rewrite_fitness_insight = "Rewrite a deterministic FitForecast insight into concise, user-facing language without inventing new evidence or changing the recommendation meaning.";
sem rewrite_fitness_insight.title = "Current deterministic title for the insight.";
sem rewrite_fitness_insight.summary = "Current deterministic summary for the insight.";
sem rewrite_fitness_insight.priority = "Current priority level as high, medium, or low.";
sem rewrite_fitness_insight.category = "Current category label.";
sem rewrite_fitness_insight.bullets_json = "JSON string containing the current bullet list.";
sem rewrite_fitness_insight.supporting_stats_json = "JSON string containing supporting statistics that must remain the evidence source.";
sem rewrite_fitness_insight.return = "Return a structured rewrite that stays faithful to the original insight and evidence. Keep priority aligned with the input unless the wording clearly requires a softer presentation.";

def rewrite_fitness_insight(
    title: str,
    summary: str,
    priority: str,
    category: str,
    bullets_json: str,
    supporting_stats_json: str
) -> InsightRewrite by llm(temperature=0.2, max_tokens=220);

sem personalize_fitness_forecast = "Rewrite a structured FitForecast predictive summary into concise coaching language without inventing any new evidence or changing the forecast meaning.";
sem personalize_fitness_forecast.headline = "Current deterministic headline for the forecast.";
sem personalize_fitness_forecast.coachSummary = "Current deterministic summary for the forecast.";
sem personalize_fitness_forecast.priorities_json = "JSON string containing the current priority statements.";
sem personalize_fitness_forecast.next_actions_json = "JSON string containing the current action statements.";
sem personalize_fitness_forecast.questions_json = "JSON string containing the current follow-up questions.";
sem personalize_fitness_forecast.supporting_stats_json = "JSON string containing supporting forecast statistics that must remain the evidence source.";
sem personalize_fitness_forecast.return = "Return a structured rewrite that keeps the same evidence, forecast direction, and confidence while sounding more personalized and readable.";

def personalize_fitness_forecast(
    headline: str,
    coachSummary: str,
    priorities_json: str,
    next_actions_json: str,
    questions_json: str,
    supporting_stats_json: str
) -> ForecastRewrite by llm(temperature=0.2, max_tokens=260);
