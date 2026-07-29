BLUE CURRENT V34.1.4c — CC-015c EXECUTIVE RECOMMENDATIONS

REPLACE:
- client/index.html
- client/styles.css

ADD:
- client/js/modules/executiveRecommendations.js

WHAT THIS MICRO-UPDATE ADDS
- Three live executive recommendations
- Recommendations based on:
  - Location health
  - Labor
  - Revenue
  - Active alerts
  - Current operating status
- Priority, expected impact, suggested owner, and due timing
- Review Location shortcut
- Create Action workflow using the existing manager-action API
- Recommendation rationale saved as a note
- Automatic refresh when district data changes

TEST
1. npm run check
2. npm start
3. Sign in and open Command Center
4. Confirm Executive Recommendations appears
5. Test Review Location
6. Create an executive action
7. Confirm the action appears in the location Action List
8. Refresh and verify the action remains
