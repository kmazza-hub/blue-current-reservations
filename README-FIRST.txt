BLUE CURRENT V34.0.13.8 — CONFIDENCE DRIFT MONITOR

REPLACE
- client/index.html
- client/styles.css
- client/js/modules/outcomeLearningEngine.js

ADD
- client/js/modules/confidenceDriftMonitor.js

USER STORY
As an executive, I can see when recent forecast accuracy is drifting away from
the learned baseline and receive a clear retraining or calibration recommendation.

TEST
1. Replace/add the four files.
2. Run npm run check.
3. Run npm start.
4. Record at least three measured decision outcomes.
5. Confirm recent accuracy, baseline accuracy, confidence gap, and drift score update.
6. Confirm the governance recommendation changes between Stable, Watch, and Review.
7. Test Acknowledge Recommendation and Open Learning Engine.
