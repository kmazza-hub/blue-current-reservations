BLUE CURRENT V34.1.7b — CC-018b NOTIFICATION ROUTING RULES

REPLACE:
- client/index.html
- client/styles.css
- client/js/modules/regionalNotifications.js

ADD:
- client/js/modules/notificationRouting.js

WHAT THIS MICRO-UPDATE ADDS
- Notification routing-rule editor
- Audience selection
- Immediate or digest cadence
- In-app, email, and SMS delivery options
- Enable / mute controls
- Active, critical, digest, and muted KPIs
- Save and reset-default workflows
- Browser persistence after refresh
- Regional Notifications now emits routing events for new alerts

TEST
1. npm run check
2. npm start
3. Open Command Center
4. Confirm Notification Routing Rules appears
5. Change audience, cadence, and delivery settings
6. Disable one rule
7. Save and refresh
8. Confirm settings remain
9. Reset defaults and confirm the original rules return
