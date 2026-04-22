const fs = require('fs');
const path = require('path');

// 1. Configuration
const NOTION_TOKEN = process.env.NOTION_TOKEN;
const DATABASE_ID = process.env.NOTION_BLOG_DATABASE_ID; // User needs to provide this

if (!NOTION_TOKEN || !DATABASE_ID) {
    console.error('Error: NOTION_TOKEN or NOTION_BLOG_DATABASE_ID is missing.');
    console.log('Please set these environment variables before running the sync.');
    process.exit(1);
}

const NOTION_VERSION = '2022-06-28';
const BLOG_DIR = path.join(__dirname, '../blog');
const TEMPLATE_PATH = path.join(BLOG_DIR, 'post-template.html');
const INDEX_PATH = path.join(BLOG_DIR, 'index.html');

// 2. Notion API Helpers
async function notionFetch(endpoint, options = {}) {
    const response = await fetch(`https://api.notion.com/v1${endpoint}`, {
        ...options,
        headers: {
            'Authorization': `Bearer ${NOTION_TOKEN}`,
            'Content-Type': 'application/json',
            'Notion-Version': NOTION_VERSION,
            ...options.headers
        }
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(`Notion API Error: ${JSON.stringify(error)}`);
    }
    return response.json();
}

async function getPublishedPosts() {
    return notionFetch(`/databases/${DATABASE_ID}/query`, {
        method: 'POST',
        body: JSON.stringify({
            filter: {
                property: 'Status',
                status: {
                    equals: 'Ready to Publish'
                }
            }
        })
    });
}

async function getPageBlocks(pageId) {
    let blocks = [];
    let cursor;
    do {
        const response = await notionFetch(`/blocks/${pageId}/children${cursor ? `?start_cursor=${cursor}` : ''}`);
        blocks = blocks.concat(response.results);
        cursor = response.next_cursor;
    } while (cursor);
    return blocks;
}

// 3. Conversion Helpers
function blocksToHtml(blocks) {
    return blocks.map(block => {
        const type = block.type;
        const data = block[type];
        
        switch (type) {
            case 'paragraph':
                return `<p>${richTextToHtml(data.rich_text)}</p>`;
            case 'heading_1':
                return `<h1>${richTextToHtml(data.rich_text)}</h1>`;
            case 'heading_2':
                return `<h2>${richTextToHtml(data.rich_text)}</h2>`;
            case 'heading_3':
                return `<h3>${richTextToHtml(data.rich_text)}</h3>`;
            case 'bulleted_list_item':
                return `<li>${richTextToHtml(data.rich_text)}</li>`;
            case 'numbered_list_item':
                return `<li>${richTextToHtml(data.rich_text)}</li>`;
            case 'quote':
                return `<blockquote>${richTextToHtml(data.rich_text)}</blockquote>`;
            case 'divider':
                return `<hr style="margin: var(--spacing-lg) 0; opacity: 0.2;">`;
            case 'image':
                const url = data.type === 'external' ? data.external.url : data.file.url;
                return `<figure><img src="${url}" alt="${richTextToHtml(data.caption)}"><figcaption>${richTextToHtml(data.caption)}</figcaption></figure>`;
            default:
                return '';
        }
    }).join('\n');
}

function richTextToHtml(richText) {
    if (!richText) return '';
    return richText.map(t => {
        let content = t.text.content;
        if (t.annotations.bold) content = `<strong>${content}</strong>`;
        if (t.annotations.italic) content = `<em>${content}</em>`;
        if (t.annotations.underline) content = `<u>${content}</u>`;
        if (t.annotations.strikethrough) content = `<s>${content}</s>`;
        if (t.annotations.code) content = `<code>${content}</code>`;
        if (t.href) content = `<a href="${t.href}">${content}</a>`;
        return content;
    }).join('');
}

// 4. Main Sync Logic
async function sync() {
    console.log('Checking Notion for new blog articles...');
    
    const posts = await getPublishedPosts();
    if (posts.results.length === 0) {
        console.log('No new articles to publish.');
        return;
    }

    const template = fs.readFileSync(TEMPLATE_PATH, 'utf8');
    const indexContent = fs.readFileSync(INDEX_PATH, 'utf8');

    for (const post of posts.results) {
        const props = post.properties;
        const title = props.Title.title[0]?.plain_text || 'Untitled';
        const slug = props.Slug.rich_text[0]?.plain_text || `post-${post.id}`;
        const date = props.Date?.date?.start || new Date().toISOString().split('T')[0];
        const summary = props.Summary?.rich_text[0]?.plain_text || '';
        
        console.log(`Processing: ${title} (${slug})...`);
        
        const blocks = await getPageBlocks(post.id);
        const htmlContent = blocksToHtml(blocks);

        // Format date for display (e.g., April 21, 2026)
        const displayDate = new Date(date).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        });

        // 5. Generate Post File
        let postHtml = template
            .replace(/<title>.*?<\/title>/, `<title>${title} | Jason Bedient</title>`)
            .replace(/<meta name="description" content=".*?">/, `<meta name="description" content="${summary}">`)
            .replace(/<h1>.*?<\/h1>/, `<h1>${title}</h1>`)
            .replace(/<p class="hero-subtitle">.*?<\/p>/, `<p class="hero-subtitle">${summary}</p>`)
            .replace(/<span class="date".*?>.*?<\/span>/, `<span class="date" style="display: block; margin-bottom: 1rem; color: var(--text-muted);">${displayDate}</span>`)
            .replace(/<div class="article-content".*?>[\s\S]*?<\/div>/, `<div class="article-content" style="margin-top: var(--spacing-lg);">\n${htmlContent}\n</div>`);

        const postPath = path.join(BLOG_DIR, `${slug}.html`);
        fs.writeFileSync(postPath, postHtml);
        console.log(`Saved: ${postPath}`);

        // 6. Update Notion Status to 'Live'
        await notionFetch(`/pages/${post.id}`, {
            method: 'PATCH',
            body: JSON.stringify({
                properties: {
                    Status: {
                        status: { name: 'Live' }
                    }
                }
            })
        });
        console.log(`Updated status in Notion to 'Live'.`);

        // 7. Update blog/index.html
        const newPostPreview = `
                    <!-- Article: ${title} -->
                    <article class="blog-preview-card">
                        <span class="date">${displayDate}</span>
                        <div>
                            <a href="${slug}.html">
                                <h3>${title}</h3>
                            </a>
                            <p>${summary}</p>
                            <a href="${slug}.html" class="btn btn-link pl-0">Read Article</a>
                        </div>
                    </article>`;
        
        // Insert after the grid start comment or first entry
        const gridStart = '<div class="grid blog-list-grid">';
        if (indexContent.includes(gridStart) && !indexContent.includes(`${slug}.html`)) {
            const updatedIndex = indexContent.replace(gridStart, `${gridStart}\n${newPostPreview}`);
            fs.writeFileSync(INDEX_PATH, updatedIndex);
            console.log(`Updated blog/index.html with new post.`);
        }
    }

    console.log('Sync complete!');
}

sync().catch(err => {
    console.error('Sync failed:', err);
    process.exit(1);
});
