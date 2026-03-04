export const SITE = {
  website: "https://qisthi.dev/",
  author: "Qisthi Ramadhani",
  profile: "https://qisthi.dev/",
  desc: "Technical blog by Qisthi Ramadhani — deep dives into Laravel, PHP, Go, PostgreSQL, DevOps, and modern web development. Tutorials, performance optimization, and clean code practices.",
  title: "Qisthi Ramadhani",
  ogImage: "astropaper-og.jpg",
  lightAndDarkMode: true,
  postPerIndex: 6,
  postPerPage: 10,
  scheduledPostMargin: 15 * 60 * 1000, // 15 minutes
  showArchives: true,
  showBackButton: true,
  editPost: {
    enabled: false,
    text: "Edit this post",
    url: "https://github.com/qisthidev/blog/edit/main/",
  },
  dynamicOgImage: true,
  dir: "ltr",
  lang: "en",
  timezone: "Asia/Jakarta",
  umami: {
    websiteId: "", // e.g., "12345678-abcd-1234-abcd-1234567890ab"
    url: "https://cloud.umami.is/script.js",
  },
  plausible: {
    domain: "", // e.g., "qisthi.dev"
    url: "https://plausible.io/js/script.js",
  },
  googleAnalyticsId: "", // e.g., "G-XXXXXXXXXX"
} as const;
