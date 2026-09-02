
// LifeKey Hub - Secure Article Publisher
// File: functions/api/publish.js

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    // ---------------------------------------------------------
    // 1. BASIC SECURITY
    // ---------------------------------------------------------

    const origin = request.headers.get("Origin");
    const allowedOrigin = new URL(request.url).origin;

    if (origin && origin !== allowedOrigin) {
      return jsonResponse(
        { success: false, message: "Unauthorized origin." },
        403
      );
    }

    // Your publisher password is stored securely in Cloudflare.
    // It must NOT be written inside your HTML or JavaScript.
    const publisherPassword = request.headers.get("X-Publisher-Password");

    if (!env.PUBLISHER_PASSWORD) {
      return jsonResponse(
        {
          success: false,
          message:
            "Publisher is not configured yet. Add PUBLISHER_PASSWORD in Cloudflare.",
        },
        500
      );
    }

    if (!publisherPassword || publisherPassword !== env.PUBLISHER_PASSWORD) {
      return jsonResponse(
        { success: false, message: "Incorrect publisher password." },
        401
      );
    }

    // ---------------------------------------------------------
    // 2. GITHUB SETTINGS
    // ---------------------------------------------------------

    const githubToken = env.GITHUB_TOKEN;

    if (!githubToken) {
      return jsonResponse(
        {
          success: false,
          message:
            "GitHub publishing is not configured yet. Add GITHUB_TOKEN in Cloudflare.",
        },
        500
      );
    }

    const owner = "reubenpromise";
    const repo = "innovezone-lifekeyhub";
    const branch = "main";

    // ---------------------------------------------------------
    // 3. RECEIVE ARTICLE
    // ---------------------------------------------------------

    const data = await request.json();

    const category = String(data.category || "").trim();
    const title = String(data.title || "").trim();
    const description = String(data.description || "").trim();
    const content = String(data.content || "").trim();

    if (!category || !title || !content) {
      return jsonResponse(
        {
          success: false,
          message: "Category, title and article content are required.",
        },
        400
      );
    }

    // ---------------------------------------------------------
    // 4. CREATE SAFE SLUG
    // ---------------------------------------------------------

    const slug = createSlug(title);

    if (!slug) {
      return jsonResponse(
        {
          success: false,
          message: "The article title could not create a valid filename.",
        },
        400
      );
    }

    // ---------------------------------------------------------
    // 5. CATEGORY FOLDER
    // ---------------------------------------------------------

    const categoryFolders = {
      "Freelancing": "freelancing",
      "Affiliate Marketing": "affiliate-marketing",
      "Digital Marketing": "digital-marketing",
      "Email Marketing": "email-marketing",
      "Digital Products": "digital-products",
      "Money & Finance": "money-finance",
      "Real Estate": "real-estate",
      "Innovation": "innovation",
      "Technology": "technology",
      "Education": "education",
      "Health & Wellness": "health-wellness",
      "General LifeKey Article": "general"
    };

    const folder =
      categoryFolders[category] ||
      createSlug(category) ||
      "general";

    const filePath = `articles/${folder}/${slug}.html`;

    // ---------------------------------------------------------
    // 6. CREATE ARTICLE HTML
    // ---------------------------------------------------------

    const articleHTML = buildArticleHTML({
      title,
      description,
      category,
      content
    });

    // ---------------------------------------------------------
    // 7. CHECK WHETHER ARTICLE ALREADY EXISTS
    // ---------------------------------------------------------

    const githubURL =
      `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;

    const existingResponse = await fetch(githubURL, {
      method: "GET",
      headers: githubHeaders(githubToken)
    });

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

    // ---------------------------------------------------------
    // 8. PUBLISH TO GITHUB
    // ---------------------------------------------------------

    const encodedContent = utf8ToBase64(articleHTML);

    const publishResponse = await fetch(githubURL, {
      method: "PUT",
      headers: {
        ...githubHeaders(githubToken),
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: `Publish article: ${title}`,
        content: encodedContent,
        branch
      })
    });

    const publishResult = await publishResponse.json();

    if (!publishResponse.ok) {
      return jsonResponse(
        {
          success: false,
          message:
            publishResult.message ||
            "GitHub could not publish the article."
        },
        publishResponse.status
      );
    }

    // ---------------------------------------------------------
    // 9. SUCCESS
    // ---------------------------------------------------------

    const articleURL =
      `/articles/${folder}/${slug}.html`;

    return jsonResponse({
      success: true,
      message: "Article published successfully.",
      title,
      category,
      path: filePath,
      url: articleURL
    });
  } catch (error) {
    return jsonResponse(
      {
        success: false,
        message: "Publishing failed.",
        error: error.message
      },
      500
    );
  }
}


// =============================================================
// HELPERS
// =============================================================

function createSlug(text) {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .substring(0, 100);
}


function escapeHTML(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


function formatArticleContent(content) {
  const safeText = escapeHTML(content);

  return safeText
    .split(/\n\s*\n/)
    .map(paragraph => {
      const formatted = paragraph
        .replace(/\n/g, "<br>");

      return `<p>${formatted}</p>`;
    })
    .join("\n");
}


function buildArticleHTML({
  title,
  description,
  category,
  content
}) {
  const safeTitle = escapeHTML(title);
  const safeDescription = escapeHTML(description);
  const safeCategory = escapeHTML(category);
  const formattedContent = formatArticleContent(content);

  return `<!DOCTYPE html>
<html lang="en">

<head>
<meta charset="UTF-8">

<meta name="viewport"
content="width=device-width, initial-scale=1.0">

<meta name="description"
content="${safeDescription}">

<meta name="robots"
content="index, follow">

<title>${safeTitle} | LifeKey Hub</title>

<style>

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: Arial, Helvetica, sans-serif;
  background: #f5f7fb;
  color: #172033;
  line-height: 1.8;
}

header {
  background: #111827;
  color: white;
  padding: 18px 6%;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.logo {
  font-size: 22px;
  font-weight: bold;
}

header a {
  color: white;
  text-decoration: none;
}

.article-wrapper {
  max-width: 900px;
  margin: 50px auto;
  padding: 0 20px;
}

.article-card {
  background: white;
  padding: 45px;
  border-radius: 18px;
  box-shadow: 0 10px 35px rgba(0,0,0,0.08);
}

.category {
  display: inline-block;
  padding: 7px 14px;
  border-radius: 20px;
  background: #eef2ff;
  color: #3730a3;
  font-size: 14px;
  font-weight: bold;
  margin-bottom: 18px;
}

h1 {
  font-size: 42px;
  line-height: 1.2;
  margin: 0 0 18px;
}

.description {
  font-size: 18px;
  color: #5b6475;
  margin-bottom: 35px;
}

.article-content p {
  margin: 0 0 24px;
}

.back {
  display: inline-block;
  margin-top: 30px;
  padding: 12px 18px;
  background: #111827;
  color: white;
  text-decoration: none;
  border-radius: 8px;
}

footer {
  text-align: center;
  padding: 35px 20px;
  color: #697386;
}

@media (max-width: 600px) {

  .article-card {
    padding: 25px;
  }

  h1 {
    font-size: 30px;
  }

}

</style>

</head>

<body>

<header>

<div class="logo">
LifeKey Hub
</div>

<a href="../../index.html">
Home
</a>

</header>

<main class="article-wrapper">

<article class="article-card">

<div class="category">
${safeCategory}
</div>

<h1>
${safeTitle}
</h1>

<div class="description">
${safeDescription}
</div>

<div class="article-content">

${formattedContent}

</div>

<a class="back"
href="../../blog.html">
← Back to LifeKey Blog
</a>

</article>

</main>

<footer>

LifeKey Hub — Unlock Your Next Level.

</footer>

</body>

</html>`;
}


function githubHeaders(token) {
  return {
    "Authorization": `Bearer ${token}`,
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28"
  };
}


function utf8ToBase64(text) {
  const bytes = new TextEncoder().encode(text);

  let binary = "";

  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(
      i,
      Math.min(i + chunkSize, bytes.length)
    );

    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}


function jsonResponse(data, status = 200) {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store"
      }
    }
  );
}
