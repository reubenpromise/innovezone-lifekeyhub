
// LifeKey Universal Publisher V2
// Publishing engine used by Cloudflare Pages Function.

const API = "https://api.github.com";
const OWNER = "reubenpromise";
const REPO = "innovezone-lifekeyhub";
const BRANCH = "main";
const SITE = "https://reubenpromise.github.io/innovezone-lifekeyhub";

const DEST = {
  "Innovation": "../../innovation.html",
  "Affiliate Marketing": "../../affiliate-marketing.html",
  "Money & Opportunities": "../../money.html",
  "Money & Finance": "../../money.html",
  "Trading-Investing": "../../money.html",
  "Freelancing": "../../freelancing.html",
  "Digital Products": "../../digital-products.html",
  "Dropshipping": "../../dropshipping.html",
  "Real Estate": "../../real-estate.html",
  "Build Your Online Presence": "../../build-online.html",
  "Earn Online": "../../earn-online.html",
  "Monetization Platforms": "../../monetization-platforms.html",
  "Digital Marketing & Technology": "../../digital-marketing.html",
  "AI & Artificial Intelligence": "../../ai-artificial-intelligence.html",
  "Education & Learning": "../../education-learning.html",
  "Health & Wellness": "../../health-wellness.html"
};

const FOLD = {
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
  "Business & Entrepreneurship": "business-entrepreneurship",
  "Digital Marketing & Technology": "digital-marketing",
  "Web Design": "web-design",
  "Graphic Design": "graphic-design",
  "Innovation": "innovation",
  "AI & Artificial Intelligence": "ai-artificial-intelligence",
  "LifeKey Creative Studio": "creative-studio",
  "Health & Wellness": "health-wellness",
  "Education & Learning": "education-learning",
  "Fish Farming & Agriculture": "fish-farming-agriculture",
  "History": "history",
  "Politics & Current Affairs": "politics-current-affairs",
  "Portfolio": "portfolio",
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
  "General LifeKey Article": "general"
};

function headers(token) {
  return {
    "Authorization": `Bearer ${token}`,
    "Accept": "application/vnd.github+json",
    "User-Agent": "LifeKey-Hub-Publisher"
  };
}

function esc(value) {
  return String(value ?? "").replace(/[&<>"]/g, function (char) {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;"
    }[char];
  });
}

function slug(value) {
  return String(value)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90) || "article";
}

function encodeBase64(text) {
  return btoa(unescape(encodeURIComponent(text)));
}

function decodeBase64(text) {
  return decodeURIComponent(
    escape(atob(text.replace(/\n/g, "")))
  );
}

function formatContent(text) {
  let html = esc(text);

  html = html
    .replace(/```([\s\S]*?)```/g, "<pre>$1</pre>")
    .replace(/^### (.*)$/gm, "<h3>$1</h3>")
    .replace(/^## (.*)$/gm, "<h2>$1</h2>")
    .replace(/^> INFO: (.*)$/gm, "<aside><b>💡 INFO:</b> $1</aside>")
    .replace(/^> TIP: (.*)$/gm, "<aside><b>✅ TIP:</b> $1</aside>")
    .replace(/^> WARNING: (.*)$/gm, "<aside><b>⚠️ WARNING:</b> $1</aside>")
    .replace(/^> (.*)$/gm, "<blockquote>$1</blockquote>")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(
      /!\[(.*?)\]\((https?:\/\/[^)]+)\)/g,
      '<img alt="$1" src="$2">'
    )
    .replace(
      /\[(.*?)\]\((https?:\/\/[^)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener">$1</a>'
    );

  let output = "";
  let unordered = false;
  let ordered = false;

  for (const line of html.split("\n")) {

    if (/^[-*] /.test(line)) {

      if (!unordered) {
        if (ordered) {
          output += "</ol>";
          ordered = false;
        }

        output += "<ul>";
        unordered = true;
      }

      output += "<li>" + line.slice(2) + "</li>";

    } else if (/^\d+\. /.test(line)) {

      if (!ordered) {
        if (unordered) {
          output += "</ul>";
          unordered = false;
        }

        output += "<ol>";
        ordered = true;
      }

      output += "<li>" +
        line.replace(/^\d+\. /, "") +
        "</li>";

    } else {

      if (unordered) {
        output += "</ul>";
        unordered = false;
      }

      if (ordered) {
        output += "</ol>";
        ordered = false;
      }

      if (
        line.trim() &&
        !/^<h[23]>/.test(line) &&
        !/^<aside>/.test(line) &&
        !/^<blockquote>/.test(line) &&
        !/^<pre>/.test(line) &&
        !/^<hr/.test(line)
      ) {
        output += "<p>" + line + "</p>";
      } else {
        output += line;
      }
    }
  }

  if (unordered) output += "</ul>";
  if (ordered) output += "</ol>";

  return output;
}

async function getFile(path, token) {
  const response = await fetch(
    `${API}/repos/${OWNER}/${REPO}/contents/${path}?ref=${BRANCH}`,
    {
      headers: headers(token)
    }
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(
      `GitHub GET ${path}: ${response.status} ${await response.text()}`
    );
  }

  return response.json();
}

async function putFile(path, text, message, token, sha) {

  const body = {
    message,
    content: encodeBase64(text),
    branch: BRANCH
  };

  if (sha) {
    body.sha = sha;
  }

  const response = await fetch(
    `${API}/repos/${OWNER}/${REPO}/contents/${path}`,
    {
      method: "PUT",
      headers: {
        ...headers(token),
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    }
  );

  if (!response.ok) {
    throw new Error(
      `GitHub PUT ${path}: ${response.status} ${await response.text()}`
    );
  }

  return response.json();
}

function articleHtml(data, url, backUrl) {

  const keywords = data.tags.join(", ");

  return `<!doctype html>
<html lang="en">

<head>

<meta charset="utf-8">

<meta name="viewport"
content="width=device-width,initial-scale=1">

<title>${esc(data.seoTitle)}</title>

<meta name="description"
content="${esc(data.seoDescription)}">

<meta name="keywords"
content="${esc(keywords)}">

<meta name="author"
content="${esc(data.author)}">

<link rel="canonical"
href="${url}">

<meta property="og:type"
content="article">

<meta property="og:title"
content="${esc(data.seoTitle)}">

<meta property="og:description"
content="${esc(data.seoDescription)}">

<meta property="og:url"
content="${url}">

${data.socialImage
    ? `<meta property="og:image" content="${esc(data.socialImage)}">`
    : ""}

<meta name="twitter:card"
content="${data.socialImage ? "summary_large_image" : "summary"}">

<meta name="twitter:title"
content="${esc(data.seoTitle)}">

<meta name="twitter:description"
content="${esc(data.seoDescription)}">

${data.socialImage
    ? `<meta name="twitter:image" content="${esc(data.socialImage)}">`
    : ""}

<script type="application/ld+json">
${JSON.stringify({
  "@context": "https://schema.org",
  "@type": "Article",
  headline: data.seoTitle,
  description: data.seoDescription,
  author: {
    "@type": "Organization",
    name: data.author
  },
  datePublished: data.publishedAt,
  articleSection: data.category,
  keywords: keywords,
  mainEntityOfPage: url
})}
</script>

<style>

body{
margin:0;
background:#090611;
color:#eee;
font:16px/1.75 system-ui,sans-serif
}

header{
padding:20px;
max-width:900px;
margin:auto
}

main{
max-width:900px;
margin:auto;
padding:20px
}

.article{
background:#151020;
border:1px solid #ffffff18;
border-radius:18px;
padding:25px
}

a{
color:#9fffc0
}

img{
max-width:100%;
height:auto
}

.badge{
display:inline-block;
border:1px solid #7040a5;
border-radius:99px;
padding:5px 10px
}

aside,
blockquote{
padding:14px;
margin:16px 0;
background:#21182c;
border-left:4px solid #73ffc0;
border-radius:8px
}

pre{
overflow:auto;
background:#09070d;
padding:14px
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

<span class="badge">
${esc(data.category)}
 ·
${esc(data.subcategory)}
 ·
#${String(data.articleNumber).padStart(3, "0")}
</span>

<div class="article">

<h1>${esc(data.title)}</h1>

<p>${esc(data.description)}</p>

<small>
Published ${esc(data.publishedAt)}
 ·
${esc(data.author)}
</small>

<hr>

${formatContent(data.content)}

<p>
<a href="${backUrl}">
← Back to ${esc(data.category)}
</a>
</p>

</div>

</main>

</body>

</html>`;
}

async function connectCategory(category, token) {

  const destination = DEST[category];

  if (!destination) return;

  const path = destination
    .replace(/^\.\.\//, "")
    .replace(/^\.\.\//, "");

  const file = await getFile(path, token);

  if (!file) return;

  let html = decodeBase64(file.content);

  if (!html.includes("category-articles.js")) {

    html = html.replace(
      /<\/body>/i,
      `<script src="category-articles.js" data-lifekey-category="${esc(category)}"></script></body>`
    );

    await putFile(
      path,
      html,
      `Connect LifeKey articles: ${category}`,
      token,
      file.sha
    );
  }
}

async function addSitemap(url, date, token) {

  const file = await getFile("sitemap.xml", token);

  if (!file) return;

  let sitemap = decodeBase64(file.content);

  if (!sitemap.includes(`<loc>${url}</loc>`)) {

    sitemap = sitemap.replace(
      /<\/urlset>/i,
      `<url><loc>${url}</loc><lastmod>${date}</lastmod></url></urlset>`
    );

    await putFile(
      "sitemap.xml",
      sitemap,
      "Add article to sitemap",
      token,
      file.sha
    );
  }
}

export async function onRequestPost({ request, env }) {

  try {

    const data = await request.json();

    if (
      !data.password ||
      data.password !== env.PUBLISHER_PASSWORD
    ) {

      return new Response(
        JSON.stringify({
          error: "Invalid publisher password"
        }),
        {
          status: 401,
          headers: {
            "Content-Type": "application/json"
          }
        }
      );
    }

    for (const field of [
      "category",
      "subcategory",
      "title",
      "description",
      "content"
    ]) {

      if (!String(data[field] || "").trim()) {

        return new Response(
          JSON.stringify({
            error: `Missing ${field}`
          }),
          {
            status: 400,
            headers: {
              "Content-Type": "application/json"
            }
          }
        );
      }
    }

    if (!env.GITHUB_TOKEN) {
      throw new Error(
        "GITHUB_TOKEN is not configured in Cloudflare."
      );
    }

    const token = env.GITHUB_TOKEN;

    const folder =
      FOLD[data.category] ||
      slug(data.category);

    const sectionFolder =
      slug(data.subcategory);

    const database =
      await getFile("articles.json", token);

    let articles =
      database
        ? JSON.parse(decodeBase64(database.content))
        : [];

    const sameSection =
      articles.filter(function (article) {

        return (
          article.category === data.category &&
          article.subcategory === data.subcategory &&
          Number(article.articleNumber) > 0
        );

      });

    const articleNumber =
      sameSection.reduce(
        function (maximum, article) {
          return Math.max(
            maximum,
            Number(article.articleNumber) || 0
          );
        },
        0
      ) + 1;

    const basePath =
      `articles/${folder}/${sectionFolder}`;

    const baseSlug =
      slug(data.title);

    let articleSlug = baseSlug;

    let path =
      `${basePath}/${articleSlug}.html`;

    let counter = 2;

    while (await getFile(path, token)) {

      articleSlug =
        `${baseSlug}-${counter++}`;

      path =
        `${basePath}/${articleSlug}.html`;
    }

    const url =
      `${SITE}/${path}`;

    const backUrl =
      DEST[data.category] ||
      "../../blog.html";

    const date =
      new Date().toISOString().slice(0, 10);

    const tags =
      String(data.tags || "")
        .split(",")
        .map(function (tag) {
          return tag.trim();
        })
        .filter(Boolean);

    const record = {

      id: String(Date.now()),

      title: data.title,

      description: data.description,

      seoTitle:
        data.seoTitle ||
        data.title,

      seoDescription:
        data.seoDescription ||
        data.description,

      category:
        data.category,

      subcategory:
        data.subcategory,

      articleNumber:
        articleNumber,

      folder:
        folder,

      sectionFolder:
        sectionFolder,

      slug:
        articleSlug,

      url:
        url,

      canonicalURL:
        url,

      publishedAt:
        date,

      author:
        "LifeKey Hub",

      tags:
        tags,

      featured:
        !!data.featured,

      commentsEnabled:
        data.commentsEnabled !== false,

      views:
        0,

      likes:
        0,

      shares:
        0,

      categoryDestination:
        backUrl
    };

    await putFile(
      path,

      articleHtml(
        {
          ...data,
          ...record
        },
        url,
        backUrl
      ),

      `Publish ${data.category} #${String(articleNumber).padStart(3, "0")}: ${data.title}`,

      token
    );

    articles.unshift(record);

    await putFile(
      "articles.json",

      JSON.stringify(
        articles,
        null,
        2
      ) + "\n",

      `Register article: ${data.title}`,

      token,

      database?.sha
    );

    await addSitemap(
      url,
      date,
      token
    );

    await connectCategory(
      data.category,
      token
    );

    return new Response(
      JSON.stringify({
        success: true,
        title: data.title,
        category: data.category,
        subcategory: data.subcategory,
        articleNumber:
          `#${String(articleNumber).padStart(3, "0")}`,
        path: path,
        url: url,
        canonicalURL: url
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );

  } catch (error) {

    return new Response(
      JSON.stringify({
        error:
          error?.message ||
          "Publishing failed"
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
  }
}
