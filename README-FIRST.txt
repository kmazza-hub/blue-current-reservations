BLUE CURRENT V34.0.14.4 — EXECUTIVE PERFORMANCE TRENDS

BUILT FROM
The uploaded blue-current-reservations(6).zip project.

REPLACE
- client/index.html
- client/styles.css

ADD
- client/js/modules/executivePerformanceTrends.js

ADDS
- Multi-shift performance trend score
- Average session score
- First-shift to latest-shift score, critical-event, and outcome deltas
- Shift score trajectory chart
- Consistency score
- Primary performance driver
- Recommended executive focus
- Full saved-shift history table
- Copyable executive trend brief
- Automatic refresh when a replay session is saved

TEST
1. Replace/add the three files.
2. Run npm run check.
3. Run npm start.
4. Save at least two replay sessions with different metrics.
5. Confirm trend score, KPI deltas, chart, summary, and table update.
6. Test Refresh Trends and Copy Trend Brief.
