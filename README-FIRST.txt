BLUE CURRENT V34.0.8c — CC-009c RECOMMENDATION TIMELINE

REPLACE:
- client/index.html
- client/styles.css
- client/js/modules/managerShiftBrief.js

WHAT THIS MICRO-UPDATE ADDS
- Timeline beneath each AI recommendation
- 'Now', 'Next 30 min', 'Dinner Rush', and 'Shift Close' checkpoints
- Estimated operational impact at each stage
- Visual progress indicator
- Automatic updates from the current recommendation

PATCH SUMMARY

1. Add a new 'Recommendation Timeline' card beneath the Scenario Comparison.
2. Add timeline styling to styles.css.
3. Extend managerShiftBrief.js with:
   - buildRecommendationTimeline()
   - syncRecommendationTimeline()
   - call syncRecommendationTimeline() after syncScenarioComparison()

This keeps the recommendation focused on WHEN to act instead of only WHAT to do.
