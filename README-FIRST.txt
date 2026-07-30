BLUE CURRENT V34.0.13.6 — OUTCOME LEARNING ENGINE

REPLACE
- client/index.html
- client/styles.css
- client/js/modules/predictiveCommandCenter.js
- client/js/modules/domainForecastingModels.js

ADD
- client/js/modules/outcomeLearningEngine.js

USER STORY
Measured decision outcomes recalibrate forecast confidence and produce a visible
learning profile for demand, kitchen, floor, and labor predictions.

TEST
1. Replace/add the five files.
2. Run npm run check.
3. Run npm start.
4. Record one or more measured outcomes.
5. Confirm Outcome Learning Engine updates accuracy, variance, success rate,
   calibration score, confidence adjustment, and domain weights.
6. Confirm Predictive Command Center and Domain Forecasting use the updated
   confidence adjustment after refresh or recalculation.
