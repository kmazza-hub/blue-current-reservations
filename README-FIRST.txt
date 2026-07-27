BLUE CURRENT V34.1.0a — CC-011a PREDICTIVE OPERATIONS

REPLACE:
- client/index.html
- client/styles.css

ADD:
- client/js/modules/predictiveOperations.js

WHAT THIS MICRO-UPDATE ADDS
- 0, 30, 60, and 90-minute operating-pressure forecast
- Host-stand congestion forecast
- Kitchen-pressure forecast
- Labor outlook
- Estimated revenue for the next 90 minutes
- Highest predicted risk and Go to priority shortcut
- Automatic refresh when live operating data changes

IMPORTANT
This is a transparent pilot forecasting model. It is decision support, not a guarantee.

TEST
1. npm run check
2. npm start
3. Open Command Center
4. Confirm Predictive Operations appears below Restaurant Pulse
5. Confirm pressure, host, kitchen, labor, and revenue forecasts populate
6. Click Go to priority
7. Refresh live data and confirm forecasts update
