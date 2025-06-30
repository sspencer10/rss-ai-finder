import express from 'express';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import Parser from 'rss-parser';

dotenv.config();

const app = express();
const port = process.env.PORT || 3030;
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});
const parser = new Parser();

app.use(express.json());
app.set('json spaces', 2);

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
async function findRSSFeed(query) {
    const prompt = `You are an expert in locating real, valid RSS or Atom feeds. 
    Given the topic or website "${query}", return only actual working feed URLs (XML format). 
    Do not include pages that list RSS links or redirect to HTML. Use well-known feeds when needed, like 
    WSJ: https://feeds.a.dj.com/rss/RSSWorldNews.xml 
    Return only direct feed links (one per line). No markdown, no commentary.`;

    const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
    });

    const text = completion.choices[0].message.content.trim();
    const urls = [...text.matchAll(/https?:\/\/[^\s)"]+/g)].map(match => match[0]);

    if (completion.usage) {
        const inputCost = (completion.usage.prompt_tokens / 1000000) * 0.15;
        const outputCost = (completion.usage.completion_tokens / 1000000) * 0.60;
        const totalCost = inputCost + outputCost;

        console.log('OpenAI API Usage:');
        console.log(`- Prompt Tokens: ${completion.usage.prompt_tokens}`);
        console.log(`- Completion Tokens: ${completion.usage.completion_tokens}`);
        console.log(`- Total Tokens: ${completion.usage.total_tokens}`);
        console.log(`- Estimated Cost: $${totalCost.toFixed(8)}`);
    }

    return urls;
}   

async function getFeedDetails(urls) {
    const feedDetails = [];
    await Promise.all(urls.map(async (url) => {
        try {
            const feed = await parser.parseURL(url);

            // Verify feed has at least 2 items
            if (feed.items && feed.items.length >= 2) {
                const latestItem = feed.items[0];

                // Verify the latest item has a date and is not older than 14 days
                if (latestItem.isoDate) {
                    const itemDate = new Date(latestItem.isoDate);
                    const twoWeeksAgo = new Date();
                    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

                    if (itemDate >= twoWeeksAgo) {
                        const iconDomain = new URL(feed.link).hostname;
                        feedDetails.push({
                            title: feed.title,
                            rss_url: url,
                            icon: `https://www.google.com/s2/favicons?domain=${iconDomain}&sz=128`
                        });
                    }
                }
            }
        } catch (error) {
            console.error(`Could not parse feed from ${url}: ${error.message}`);
        }
    }));
    return feedDetails;
}

app.post("/find-feed", async (req, res) => {
  const { query } = req.body;

  if (!query || typeof query !== "string") {
    return res.status(400).json({ error: "Missing or invalid 'query' parameter." });
  }

  try {
    const feedUrls = await findRSSFeed(query);
    const feedsWithTitles = await getFeedDetails(feedUrls);
    res.json(feedsWithTitles);
  } catch (err) {
    console.error("❌ Error:", err.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});