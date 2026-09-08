
"use strict";

const withId = (prefix, value) => ({
  ...value,
  id: value.id || `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
});

module.exports = {
  organization: value => withId("org", value),
  location: value => withId("loc", value),
  reservation: value => withId("res", value),
  audit: value => withId("audit", { ...value, createdAt: value.createdAt || new Date().toISOString() }),
  operationalEvent: value => withId("evt", { ...value, createdAt: value.createdAt || new Date().toISOString() })
};
