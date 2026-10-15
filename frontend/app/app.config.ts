export default defineAppConfig({
  auth: {
    passkeyEnrollment: {
      enabled: false,
      cooldownDays: 30,
    },
  },
  ui: {
    colors: {
      primary: "red",
    },
  },
})
