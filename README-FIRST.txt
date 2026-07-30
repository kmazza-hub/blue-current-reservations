BLUE CURRENT V34.0.13.7 — ADAPTIVE FORECAST WEIGHTS

BUILT FROM
The actual uploaded project: blue-current-reservations(3).zip

REPLACE
- client/index.html
- client/styles.css
- client/js/modules/predictiveCommandCenter.js
- client/js/modules/domainForecastingModels.js

ADD
- client/js/modules/adaptiveForecastWeights.js

USER STORY
Forecast weights adapt to the current weekday/weekend and opening/lunch/dinner/
closing context using measured decision outcomes.

TEST
1. Replace/add the five files.
2. Run npm run check.
3. Run npm start.
4. Open Outcome Learning Engine.
5. Confirm the Active Contextual Profile appears.
6. Record measured outcomes and recalculate.
7. Confirm demand, kitchen, floor, and labor weights update.
8. Confirm Predictive Command Center and Domain Forecasting use the new weights.
