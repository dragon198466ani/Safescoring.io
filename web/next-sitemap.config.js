module.exports = {
  siteUrl: process.env.SITE_URL || "https://safescoring.io",
  generateRobotsTxt: true,
  exclude: [
    "/twitter-image.*",
    "/opengraph-image.*",
    "/icon.*",
    "/dashboard*",
    "/onboarding*",
    "/api/*",
  ],
};
