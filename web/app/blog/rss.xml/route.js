import { articles } from "@/app/blog/_assets/content";

/**
 * RSS Feed for SafeScoring Blog
 * Accessible at /blog/rss.xml
 *
 * Used by:
 * - RSS readers (Feedly, etc.)
 * - Newsletter automation
 * - Google News indexing
 * - Content aggregators
 */
export async function GET() {
  const baseUrl = "https://safescoring.io";

  const sortedArticles = [...articles].sort(
    (a, b) => new Date(b.publishedAt) - new Date(a.publishedAt)
  );

  const rssItems = sortedArticles
    .map(
      (article) => `
    <item>
      <title><![CDATA[${article.title}]]></title>
      <link>${baseUrl}/blog/${article.slug}</link>
      <guid isPermaLink="true">${baseUrl}/blog/${article.slug}</guid>
      <description><![CDATA[${article.description}]]></description>
      <pubDate>${new Date(article.publishedAt).toUTCString()}</pubDate>
      ${
        article.author
          ? `<dc:creator><![CDATA[${article.author.name}]]></dc:creator>`
          : ""
      }
      ${
        article.categories
          ?.map((cat) => `<category><![CDATA[${cat?.title}]]></category>`)
          .join("\n      ") || ""
      }
      ${
        article.image?.urlRelative
          ? `<enclosure url="${baseUrl}${article.image.urlRelative}" type="image/png" />`
          : ""
      }
    </item>`
    )
    .join("");

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  xmlns:content="http://purl.org/rss/1.0/modules/content/"
  xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>SafeScoring Blog</title>
    <link>${baseUrl}/blog</link>
    <description>Security reviews, hack analysis, and practical guides to protect your crypto. Backed by data from 916 norms.</description>
    <language>en</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${baseUrl}/blog/rss.xml" rel="self" type="application/rss+xml" />
    <image>
      <url>${baseUrl}/icon.png</url>
      <title>SafeScoring Blog</title>
      <link>${baseUrl}/blog</link>
    </image>
    ${rssItems}
  </channel>
</rss>`;

  return new Response(rss.trim(), {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
