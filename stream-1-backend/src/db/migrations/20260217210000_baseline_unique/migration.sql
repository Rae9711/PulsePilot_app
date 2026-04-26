-- CreateIndex
CREATE UNIQUE INDEX "user_scope_metric_window" ON "BaselineMetric"("userId","scope","metric","windowDays");
