const fs = require('fs');
const path = require('path');

/**
 * YouTube Sync Script
 * Fetches the latest videos from @BedoCreate and updates the videos/index.html page.
 */

const CHANNEL_ID = 'UCeNfaqkc8EcTWnmozbdtDeA';
const FEED_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`;
const VIDEOS_INDEX_PATH = path.join(__dirname, '../videos/index.html');

async function sync() {
    console.log(`Fetching latest videos from YouTube channel: ${CHANNEL_ID}...`);

    try {
        const response = await fetch(FEED_URL);
        if (!response.ok) throw new Error(`Failed to fetch feed: ${response.statusText}`);
        const xml = await response.text();

        // Very basic XML parsing using Regex to avoid dependencies
        const entries = [];
        const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
        let match;

        while ((match = entryRegex.exec(xml)) !== null && entries.length < 6) {
            const entryXml = match[1];
            const title = entryXml.match(/<title>(.*?)<\/title>/)?.[1] || 'Untitled';
            const videoId = entryXml.match(/<yt:videoId>(.*?)<\/yt:videoId>/)?.[1];
            const published = entryXml.match(/<published>(.*?)<\/published>/)?.[1];

            if (videoId) {
                entries.push({
                    title,
                    videoId,
                    published: published ? new Date(published).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recent'
                });
            }
        }

        if (entries.length === 0) {
            console.log('No videos found in feed.');
            return;
        }

        console.log(`Found ${entries.length} videos. Updating ${VIDEOS_INDEX_PATH}...`);

        let indexContent = fs.readFileSync(VIDEOS_INDEX_PATH, 'utf8');

        // Generate the new grid content
        const gridContent = entries.map(video => `
                    <!-- Video: ${video.title} -->
                    <article class="video-preview-card">
                        <a href="https://www.youtube.com/watch?v=${video.videoId}" target="_blank" class="video-thumbnail-container">
                            <img src="https://img.youtube.com/vi/${video.videoId}/maxresdefault.jpg" alt="${video.title} Thumbnail" class="video-thumbnail">
                            <div class="video-play-overlay">
                                <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"></path></svg>
                            </div>
                        </a>
                        <div class="video-details">
                            <span class="date">${video.published}</span>
                            <a href="https://www.youtube.com/watch?v=${video.videoId}" target="_blank">
                                <h3>${video.title}</h3>
                            </a>
                            <a href="https://www.youtube.com/watch?v=${video.videoId}" target="_blank" class="btn-youtube">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                                Watch on YouTube
                            </a>
                        </div>
                    </article>`).join('\n');

        // Regex to find the video grid container and replace its content
        const gridRegex = /(<div class="grid video-list-grid">)([\s\S]*?)(<\/div>)/;
        const updatedContent = indexContent.replace(gridRegex, `$1\n${gridContent}\n                $3`);

        fs.writeFileSync(VIDEOS_INDEX_PATH, updatedContent);
        console.log('Sync complete!');

    } catch (error) {
        console.error('Error during sync:', error);
    }
}

sync();
