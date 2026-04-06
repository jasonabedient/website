// api/contact.js
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { name, email, message } = req.body;

        if (!name || !email || !message) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const NOTION_TOKEN = process.env.NOTION_TOKEN;
        const DATABASE_ID = '336fec44-504e-805d-8b84-fa70f2b9d6d2';

        if (!NOTION_TOKEN) {
            // Logs to the Vercel dashboard
            console.error('Missing NOTION_TOKEN environment variable.');
            return res.status(500).json({ error: 'Server misconfiguration. Please try again later.' });
        }

        // Forward payload to Notion
        const response = await fetch('https://api.notion.com/v1/pages', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${NOTION_TOKEN}`,
                'Content-Type': 'application/json',
                'Notion-Version': '2022-06-28'
            },
            body: JSON.stringify({
                parent: { database_id: DATABASE_ID },
                properties: {
                    "Subject": {
                        title: [
                            { text: { content: `Message from ${name}` } }
                        ]
                    },
                    "Sender": {
                        email: email
                    },
                    "Status": {
                        status: { name: "Unread" }
                    },
                    "Date Received": {
                        date: { start: new Date().toISOString() }
                    },
                    "Category": {
                        multi_select: [
                            { name: "Marketing" }
                        ]
                    }
                },
                children: [
                    {
                        object: "block",
                        type: "paragraph",
                        paragraph: {
                            rich_text: [
                                { type: "text", text: { content: message } }
                            ]
                        }
                    }
                ]
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Notion API Error:', errorData);
            return res.status(response.status).json({ error: 'Failed to save to Notion' });
        }

        return res.status(200).json({ success: true, message: 'Message sent successfully!' });
    } catch (error) {
        console.error('Server error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}
