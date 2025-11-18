## AI Code Review Companion

React/Next.js web app that lets you upload source files or paste snippets and receive GPT-powered review feedback without running any backend services. The OpenAI API key is collected client-side only and never stored.

### Tech stack

- Next.js (App Router) + TypeScript + Tailwind CSS  
- Client-side fetches to OpenAI Chat Completions (`gpt-4o-mini` by default)  
- `react-markdown` + `remark-gfm` for nicely formatted feedback

## Getting started

```bash
npm install
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to use the reviewer UI.

## Usage

1. Paste your temporary OpenAI API key into the “OpenAI Access” card.  
2. Upload one or more UTF-8 files and/or paste additional snippets.  
3. Optionally change the review focus (security, performance, tests, etc.).  
4. Click **Run AI review** to send the aggregated bundle directly to OpenAI.  
5. Read the structured feedback and revisit any prior runs from the history list.

## Security notes

- Because the API key is entered on the page, it stays in memory only for your session. Refreshing or closing the tab clears it automatically.  
- Rotate or revoke the key when you finish reviewing, and avoid using production keys.  
- If you need stricter guarantees, proxy the request through a small server and inject the key there instead of client-side.

## Deployment

Deploy anywhere that runs Next.js (Vercel, Netlify, etc.). No server-side runtime is required unless you later decide to proxy OpenAI traffic.

### Deploy to Vercel (Recommended)

1. [Fork or clone the repo.](https://github.com/your-repo)
2. Visit [vercel.com/import](https://vercel.com/import), connect your GitHub, and import the project.
3. **Set environment variable in Vercel Project Settings** for OpenAI API Key if you plan to prefill in code, else users must enter it client-side only.
4. Use Vercel's CI/CD for production & preview.

#### Environment Example
The app **does not require a server-side API key**. The review key is used client-side. You may specify:

```
OPENAI_API_KEY=sk-...   # (enter in Vercel dashboard only if prepopulating)
```

#### vercel.json
For custom build & routing, see `vercel.json` in this repository.

### Notes
- We recommend not storing API keys in public repos. Users should input keys per session.
- Set up custom domain & extra config via [vercel dashboard](https://vercel.com/dashboard)
