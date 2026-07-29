BLUE CURRENT V34.1.4a — CC-015a EXECUTIVE MORNING BRIEF

REPLACE:
- client/index.html
- client/styles.css
- client/js/modules/districtCommandCenter.js

ADD:
- client/js/modules/executiveMorningBrief.js

WHAT THIS MICRO-UPDATE ADDS
- Executive portfolio headline and narrative
- Portfolio health, revenue, labor, and alert KPIs
- Top-risk location
- Best-performing location
- Three executive priorities
- Review Priority Location shortcut
- Automatic refresh when district location data changes

TEST
1. npm run check
2. npm start
3. Open Command Center
4. Confirm Executive Morning Brief appears below District Command Center
5. Confirm portfolio values match the district cards
6. Click Review Priority Location
7. Change district sorting and confirm the brief remains accurate
