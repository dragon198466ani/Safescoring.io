export default function robots() {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/dashboard/", "/admin/", "/onboarding/"],
      },
    ],
    sitemap: "https://safescoring.io/sitemap.xml",
  };
}
