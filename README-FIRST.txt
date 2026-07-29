BLUE CURRENT V34.1.7a — CC-018a REGIONAL NOTIFICATIONS

REPLACE:
- client/index.html
- client/styles.css

ADD:
- client/js/modules/regionalNotifications.js

WHAT THIS MICRO-UPDATE ADDS
- Regional notification center
- All, Critical, Unread, and Acknowledged views
- Unread, critical, acknowledged, and escalated KPIs
- Acknowledge / Mark Unread workflow
- Create Action escalation
- Browser persistence after refresh
- Automatic notifications from forecast and action activity

TEST
1. npm run check
2. npm start
3. Open Command Center
4. Confirm Regional Notifications appears
5. Test all four filters
6. Acknowledge a notification
7. Create an action from a notification
8. Refresh and verify state remains
