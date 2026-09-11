
// LifeKey Hub - Universal Secure Article Publisher
// File: functions/api/publish.js

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    // --------------------------------------------------
    // SECURITY
    // --------------------------------------------------

    const origin = request.headers.get("Origin");
    const allowedOrigin = new URL(request.url).origin;

    if (origin && origin !== allowedOrigin) {
      return jsonResponse(
        {
          success: false,
          message: "Unauthorized origin."
        },
        403
      );
    }

    const publisherPassword =
      request.headers.get("X-Publisher-Password");

    if (!env.PUBLISHER_PASSWORD) {
      return jsonResponse(
        {
          success: false,
          message:
            "Publisher is not configured yet. Add PUBLISHER_PASSWORD in Cloudflare."
        },
        500
      );
    }

    if (
      !publisherPassword ||
      publisherPassword !== env.PUBLISHER_PASSWORD
    ) {
      return jsonResponse(
        {
          success: false,
          message: "Incorrect publisher password."
        },
        401
      );
    }

    if (!env.GITHUB_TOKEN) {
      return jsonResponse(
        {
          success: false,
          message:
            "GitHub publishing is not configured yet. Add GITHUB_TOKEN in Cloudflare."
        },
        500
      );
    }

    // --------------------------------------------------
    // GITHUB SETTINGS
    // --------------------------------------------------

    const owner = "reubenpromise";
    const repo = "innovezone-lifekeyhub";
    const branch = "main";

    const data = await request.json();

    const category = String(data.category || "").trim();
    const title = String(data.title || "").trim();
    const description = String(data.description || "").trim();
    const content = String(data.content || "").trim();
    const tags = Array.isArray(data.tags)
      ? data.tags
      : [];

    if (!category || !title || !content) {
      return jsonResponse(
        {
          success: false,
          message:
            "Category, title and article content are required."
        },
        400
      );
    }

    // --------------------------------------------------
    // CREATE SAFE SLUG
    // --------------------------------------------------

    const slug = createSlug(title);

    if (!slug) {
      return jsonResponse(
        {
          success: false,
          message:
            "The article title could not create a valid filename."
        },
        400
      );
    }

    // --------------------------------------------------
    // UNIVERSAL CATEGORY → FOLDER
    // --------------------------------------------------

    const categoryFolders = {

      // Money & Opportunity
      "Money & Opportunities": "money-opportunities",
      "Money & Finance": "money-finance",
      "Trading-Investing": "trading-investing",
      "Freelancing": "freelancing",
      "Affiliate Marketing": "affiliate-marketing",
      "Digital Products": "digital-products",
      "Dropshipping": "dropshipping",
      "Real Estate": "real-estate",
      "Build Your Online Presence": "build-online",
      "Earn Online": "earn-online",
      "Monetization Platforms": "monetization-platforms",

      // Business & Technology
      "Business & Entrepreneurship": "business-entrepreneurship",
      "Digital Marketing & Technology": "digital-marketing",
      "Web Design": "web-design",
      "Graphic Design": "graphic-design",
      "Innovation": "innovation",
      "AI & Artificial Intelligence": "ai-artificial-intelligence",
      "LifeKey Creative Studio": "creative-studio",

      // Life & Development
      "Health & Wellness": "health-wellness",
      "Education & Learning": "education-learning",
      "Fish Farming & Agriculture": "fish-farming-agriculture",

      // Knowledge & Society
      "History": "history",
      "Politics & Current Affairs": "politics-current-affairs",
      "Portfolio": "portfolio",

      // Blog hubs
      "Technology": "technology",
      "Engineering": "engineering",
      "Repairs & Maintenance": "repairs-maintenance",
      "Energy & Power": "energy-power",
      "Agriculture & Food": "agriculture-food",
      "Environment": "environment",
      "Personal Development": "personal-development",
      "Home & Living": "home-living",
      "Opportunities": "opportunities",
      "Projects & Experiments": "projects-experiments",

      // Fallback
      "General LifeKey Article": "general"
    };

    const folder =
      categoryFolders[category] ||
      createSlug(category) ||
      "general";

    const filePath =
      `articles/${folder}/${slug}.html`;

    // --------------------------------------------------
    // CATEGORY DESTINATION
    // --------------------------------------------------

    const categoryDestinations = {

      "Money & Opportunities":
        "../../money.html",

      "Money & Finance":
        "../../money.html",

      "Trading-Investing":
        "../../money.html",

      "Affiliate Marketing":
        "../../affiliate-marketing.html",

      "Digital Products":
        "../../digital-products.html",

      "Dropshipping":
        "../../dropshipping.html",

      "Real Estate":
        "../../real-estate.html",

      "Build Your Online Presence":
        "../../build-online.html",

      "Earn Online":
        "../../earn-online.html",

      "Freelancing":
        "../../freelancing.html",

      "Digital Marketing & Technology":
        "../../digital-marketing.html",

      "AI & Artificial Intelligence":
        "../../ai-artificial-intelligence.html",

      "Innovation":
        "../../innovation.html",

      "Education & Learning":
        "../../education-learning.html",

      "Health & Wellness":
        "../../health-wellness.html"
    };

    const categoryDestination =
      categoryDestinations[category] ||
      "../../blog.html";

    // --------------------------------------------------
    // ARTICLE HTML
    // --------------------------------------------------

    const articleHTML = buildArticleHTML({
      title,
      description,
      category,
      content,
      tags,
      categoryDestination
    });

    // --------------------------------------------------
    // GITHUB API
    // --------------------------------------------------

    const githubURL =
      `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;

    const headers = githubHeaders(env.GITHUB_TOKEN);

    // --------------------------------------------------
    // CHECK DUPLICATE
    // --------------------------------------------------

    const existingResponse = await fetch(
      githubURL,
      {
        method: "GET",
        headers
      }
    );

    if (existingResponse.ok) {
      return jsonResponse(
        {
          success: false,
          message:
            "An article with this title already exists. Change the title or edit the existing article.",
          path: filePath
        },
        409
      );
    }

    // --------------------------------------------------
    // CREATE ARTICLE
    // --------------------------------------------------

    const encodedContent =
      utf8ToBase64(articleHTML);

    const publishResponse = await fetch(
      githubURL,
      {
        method: "PUT",
        headers: {
          ...headers,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: `Publish article: ${title}`,
          content: encodedContent,
          branch
        })
      }
    );

    const publishText =
      await publishResponse.text();

    let publishResult = null;

    try {
      publishResult = publishText
        ? JSON.parse(publishText)
        : null;
    } catch (_) {
      publishResult = null;
    }

    if (!publishResponse.ok) {
      return jsonResponse(
        {
          success: false,
          message:
            `GitHub rejected the publish request (HTTP ${publishResponse.status}).`,
          githubError:
            publishResult?.message ||
            publishText ||
            "GitHub could not publish the article.",
          path: filePath
        },
        publishResponse.status
      );
    }

    // --------------------------------------------------
    // UPDATE ARTICLES.JSON
    // --------------------------------------------------

    const indexURL =
      `https://api.github.com/repos/${owner}/${repo}/contents/articles.json`;

    const indexResponse = await fetch(
      indexURL,
      {
        method: "GET",
        headers
      }
    );

    let articles = [];
    let indexSHA = null;

    if (indexResponse.ok) {

      const indexText =
        await indexResponse.text();

      let indexData = null;

      try {
        indexData = indexText
          ? JSON.parse(indexText)
          : null;
      } catch (_) {
        indexData = null;
      }

      indexSHA = indexData?.sha || null;

      if (indexData?.content) {
        try {
          const decoded =
            base64ToUtf8(
              indexData.content.replace(/\n/g, "")
            );

          const parsed =
            JSON.parse(decoded);

          if (Array.isArray(parsed)) {
            articles = parsed;
          }
        } catch (_) {
          articles = [];
        }
      }
    }

    // --------------------------------------------------
    // ARTICLE INDEX RECORD
    // --------------------------------------------------

    const articleRecord = {
      id: `${Date.now()}`,
      title,
      description,
      category,
      folder,
      slug,
      url: `/articles/${folder}/${slug}.html`,
      publishedAt: new Date().toISOString().split("T")[0],
      author: "LifeKey Hub",
      tags,
      featured: false,
      commentsEnabled: true,
      views: 0,
      likes: 0,
      shares: 0,
      categoryDestination
    };

    // Put newest article first
    articles.unshift(articleRecord);

    const newIndexContent =
      JSON.stringify(articles, null, 2);

    const indexPayload = {
      message: `Update article index: ${title}`,
      content: utf8ToBase64(newIndexContent),
      branch
    };

    if (indexSHA) {
      indexPayload.sha = indexSHA;
    }

    const indexUpdateResponse =
      await fetch(
        indexURL,
        {
          method: "PUT",
          headers: {
            ...headers,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(indexPayload)
        }
      );

    const indexUpdateText =
      await indexUpdateResponse.text();

    let indexUpdateResult = null;

    try {
      indexUpdateResult = indexUpdateText
        ? JSON.parse(indexUpdateText)
        : null;
    } catch (_) {
      indexUpdateResult = null;
    }

    // --------------------------------------------------
    // ARTICLE CREATED BUT INDEX FAILED
    // --------------------------------------------------

    if (!indexUpdateResponse.ok) {
      return jsonResponse(
        {
          success: true,
          warning: true,
          message:
            "Article was published, but articles.json could not be updated automatically.",
          title,
          category,
          path: filePath,
          url: `/articles/${folder}/${slug}.html`,
          indexError:
            indexUpdateResult?.message ||
            indexUpdateText
        }
      );
    }

    // --------------------------------------------------
    // SUCCESS
    // --------------------------------------------------

    return jsonResponse({
      success: true,
      message:
        "Article published successfully.",
      title,
      category,
      path: filePath,
      url:
        `/articles/${folder}/${slug}.html`,
      indexUpdated: true
    });

  } catch (error) {

    return jsonResponse(
      {
        success: false,
        message: "Publishing failed.",
        error:
          error?.message ||
          String(error)
      },
      500
    );
  }
}


// ======================================================
// BUILD ARTICLE PAGE
// ======================================================

function buildArticleHTML({
  title,
  description,
  category,
  content,
  tags,
  categoryDestination
}) {

  const safeTitle =
    escapeHTML(title);

  const safeDescription =
    escapeHTML(description);

  const safeCategory =
    escapeHTML(category);

  const safeContent =
    formatArticleContent(content);

  const safeTags =
    tags
      .map(tag => escapeHTML(String(tag)))
      .filter(Boolean)
      .join(", ");

  const readingText =
    estimateReadingTime(content);

  return `<!DOCTYPE html>
<html lang="en">
<head>

<meta charset="UTF-8">

<meta name="viewport"
content="width=device-width, initial-scale=1.0">

<title>${safeTitle} | LifeKey Hub</title>

<meta name="description"
content="${safeDescription}">

<meta property="og:title"
content="${safeTitle}">

<meta property="og:description"
content="${safeDescription}">

<meta property="og:type"
content="article">

<meta name="author"
content="LifeKey Hub">

<style>

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: Arial, sans-serif;
  background:
    radial-gradient(circle at top, #241044, #08030f 65%);
  color: #f5f0ff;
  line-height: 1.8;
}

header {
  padding: 20px;
  text-align: center;
  border-bottom: 1px solid rgba(255,255,255,.12);
}

header a {
  color: #fff;
  text-decoration: none;
  font-weight: bold;
}

main {
  max-width: 850px;
  margin: auto;
  padding: 45px 20px;
}

.category {
  display: inline-block;
  padding: 7px 14px;
  border-radius: 20px;
  background: rgba(140,80,255,.2);
  border: 1px solid rgba(180,130,255,.35);
  color: #d8c2ff;
  font-size: 13px;
}

h1 {
  font-size: clamp(32px, 6vw, 54px);
  line-height: 1.15;
  margin: 20px 0;
}

.description {
  color: #c9bfd6;
  font-size: 18px;
}

.meta {
  color: #a99db7;
  font-size: 14px;
  margin: 15px 0 30px;
}

.article-content {
  font-size: 17px;
}

.article-content h2 {
  margin-top: 40px;
  color: #fff;
}

.article-content h3 {
  margin-top: 30px;
}

.article-content img {
  max-width: 100%;
  height: auto;
  border-radius: 15px;
}

.article-content a {
  color: #c6a6ff;
}

.back {
  display: inline-block;
  margin-top: 45px;
  padding: 12px 18px;
  border-radius: 10px;
  background: rgba(255,255,255,.08);
  color: white;
  text-decoration: none;
}

footer {
  text-align: center;
  padding: 30px;
  color: #8e829b;
  border-top: 1px solid rgba(255,255,255,.08);
}

</style>

</head>

<body>

<header>
<a href="../../index.html">
⚡ LifeKey Hub
</a>
</header>

<main>

<span class="category">
${safeCategory}
</span>

<h1>
${safeTitle}
</h1>

<div class="description">
${safeDescription}
</div>

<div class="meta">
LifeKey Hub • ${readingText}
${safeTags ? ` • ${safeTags}` : ""}
</div>

<article class="article-content">
${safeContent}
</article>

<a class="back"
href="${categoryDestination}">
← Back to ${safeCategory}
</a>

</main>

<footer>
© ${new Date().getFullYear()} LifeKey Hub
</footer>

</body>
</html>`;
}


// ======================================================
// FORMAT ARTICLE CONTENT
// ======================================================

function formatArticleContent(content) {

  let text =
    escapeHTML(content);

  // Paragraphs
  text = text
    .split(/\n\s*\n/)
    .map(paragraph => {

      const trimmed =
        paragraph.trim();

      if (!trimmed) {
        return "";
      }

      if (trimmed.startsWith("### ")) {
        return `<h3>${trimmed.substring(4)}</h3>`;
      }

      if (trimmed.startsWith("## ")) {
        return `<h2>${trimmed.substring(3)}</h2>`;
      }

      return `<p>${trimmed.replace(/\n/g, "<br>")}</p>`;
    })
    .join("\n");

  return text;
}


// ======================================================
// SLUG
// ======================================================

function createSlug(value) {

  return String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}


// ======================================================
// HTML ESCAPE
// ======================================================

function escapeHTML(value) {

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


// ======================================================
// READING TIME
// ======================================================

function estimateReadingTime(content) {

  const words =
    String(content)
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .length;

  const minutes =
    Math.max(1, Math.ceil(words / 200));

  return `${minutes} min read`;
}


// ======================================================
// GITHUB HEADERS
// ======================================================

function githubHeaders(token) {

  return {
    "Authorization":
      `Bearer ${token}`,

    "Accept":
      "application/vnd.github+json",

    "X-GitHub-Api-Version":
      "2022-11-28",

    "User-Agent":
      "LifeKey-Hub-Publisher"
  };
}


// ======================================================
// UTF-8 BASE64
// ======================================================

function utf8ToBase64(value) {

  const bytes =
    new TextEncoder()
      .encode(value);

  let binary = "";

  const chunkSize = 0x8000;

  for (
    let i = 0;
    i < bytes.length;
    i += chunkSize
  ) {

    binary += String.fromCharCode(
      ...bytes.subarray(
        i,
        i + chunkSize
      )
    );
  }

  return btoa(binary);
}


// ======================================================
// BASE64 → UTF-8
// ======================================================

function base64ToUtf8(value) {

  const binary =
    atob(value);

  const bytes =
    Uint8Array.from(
      binary,
      char => char.charCodeAt(0)
    );

  return new TextDecoder()
    .decode(bytes);
}


// ======================================================
// JSON RESPONSE
// ======================================================

function jsonResponse(data, status = 200) {

  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: {
        "Content-Type":
          "application/json; charset=utf-8"
      }
    }
  );
}
