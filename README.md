# RSS Finder

A Node.js service to find and parse RSS feeds using AI.

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/sspencer10/rss-ai-finder.git
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file and add your OpenAI API key:
   ```
   OPENAI_API_KEY="your_openai_api_key_here"
   ```

## Usage

1. Start the server:
   ```bash
   npm start
   ```
2. Send a POST request to the `/find-feed` endpoint:
   ```bash
   curl -X POST -H "Content-Type: application/json" -d '{"query": "The Wall Street Journal"}' http://localhost:3030/find-feed