# LifeKey Universal Publisher V2

Files:
- lifekey-publisher-v2.html
- functions/api/publish-v2.js
- category-articles.js

Cloudflare secrets required:
- PUBLISHER_PASSWORD
- GITHUB_TOKEN

Publisher endpoint:
POST /api/publish-v2

Important:
1. Keep the existing working publisher as backup.
2. Upload these V2 files to the repository.
3. Cloudflare Pages must deploy from main/root.
4. Open lifekey-publisher-v2.html on the deployed site.
5. Test Innovation -> Hidden Inventions & Technology -> #001.
6. Do not put the GitHub token in HTML.
