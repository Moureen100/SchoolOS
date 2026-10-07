// One place that defines the access rules per role,
// so Login/Signup pages don't need to hardcode per-role logic.

export const AUTH_CONFIG = {
  admin: {
    label: "Admin",
    dashboard: "/admin",
    allowSignup: false,
    singleAccount: true,
  },

  bursar: {
    label: "Bursar",
    dashboard: "/bursar",
    allowSignup: false,
    singleAccount: true,
  },

  teacher: {
    label: "Teacher",
    dashboard: "/teacher",
    allowSignup: true,
    singleAccount: false,
  },

  parent: {
    label: "Parent",
    dashboard: "/parent",
    allowSignup: true,
    singleAccount: false,
  },

  "class-teacher": {
    label: "Class Teacher",
    dashboard: "/class-teacher",
    allowSignup: false,
    singleAccount: false,
  },
};