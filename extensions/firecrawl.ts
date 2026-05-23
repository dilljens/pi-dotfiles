/**
 * Firecrawl Extension — self-contained, no skill files needed on disk.
 *
 * Embeds all 29 firecrawl skill instructions directly.
 * When a subcommand is invoked, sends a formatted `<skill>` block to the LLM.
 *
 * Usage:
 *   /firecrawl              — Interactive menu to pick a skill
 *   /firecrawl:scrape       — Scrape a URL
 *   /firecrawl:search       — Web search
 *   /fc                     — Shorthand for /firecrawl
 *   /fc:scrape              — Shorthand for /firecrawl:scrape
 *   ...etc for all 29 skills
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

// ── Skill definitions ──────────────────────────────────────────────────────

interface SkillDef {
  name: string;        // skill name like "firecrawl-scrape"
  desc: string;        // short description
  group: string;       // category group
  instructions(): string; // full skill block body to send to LLM
}

const SKILLS: SkillDef[] = [

  // ── Overview ───────────────────────────────────────────────────────────

  {
    name: "firecrawl",
    desc: "Firecrawl CLI reference — prerequisites, auth, usage",
    group: "Overview",
    instructions: () => `## Firecrawl CLI

Search, scrape, and interact with the web. Returns clean markdown optimized for LLM context windows.

### Prerequisites

Must be installed and authenticated. Check with \`firecrawl --status\`.

\`\`\`
  🔥 firecrawl cli v1.8.0
  ● Authenticated via FIRECRAWL_API_KEY
  Concurrency: 0/100 jobs (parallel scrape limit)
  Credits: 500,000 remaining
\`\`\`

Before doing real work, verify with:

\`\`\`bash
mkdir -p .firecrawl
firecrawl scrape "https://firecrawl.dev" -o .firecrawl/install-check.md
firecrawl search "query" --scrape --limit 3
\`\`\`

### Workflow Escalation Pattern

1. **Search** — No URL yet. Find pages, answer questions, discover sources.
2. **Scrape** — Have a URL. Extract its content.
3. **Map + Scrape** — Large site, find the right subpage, then scrape it.
4. **Crawl** — Need bulk content from an entire site section.
5. **Interact** — Scrape first, then interact (pagination, modals, forms, multi-step).

| Need | Command | When |
|------|---------|------|
| Find pages on a topic | \`search\` | No specific URL yet |
| Get a page's content | \`scrape\` | Have a URL, page is static or JS-rendered |
| Find URLs within a site | \`map\` | Need to locate a specific subpage |
| Bulk content | \`crawl\` | Need many pages from a site/section |
| Interaction | \`interact\` | Need clicks, forms, navigation |
| Download site | \`download\` | Save site as local files |
| Local files | \`parse\` | Extract content from PDF/DOCX/XLSX |
| AI extraction | \`agent\` | Complex multi-page structured data |

### Output Handling

- Always write to \`.firecrawl/\` with \`-o\` to avoid context window bloat.
- Add \`.firecrawl/\` to \`.gitignore\`.
- Naming convention: \`.firecrawl/{site}-{path}.md\`
- Single format outputs raw content; multiple formats (e.g., \`--format markdown,links\`) output JSON.
- Always quote URLs — shell interprets \`?\` and \`&\`.
- Check \`firecrawl --status\` for concurrency and credits.`,
  },

  // ── Core Extraction ──────────────────────────────────────────────────

  {
    name: "firecrawl-scrape",
    desc: "Extract clean markdown from a URL",
    group: "Core Extraction",
    instructions: () => `## firecrawl scrape

Scrape one or more URLs. Returns clean, LLM-optimized markdown. Multiple URLs are scraped concurrently.

### When to use
- You have a specific URL and want its content
- The page is static or JS-rendered (SPA)
- Step 2 in the escalation pattern: search → **scrape** → map → crawl → interact

### Quick start

\`\`\`bash
# Basic markdown extraction
firecrawl scrape "<url>" -o .firecrawl/page.md

# Main content only, no nav/footer
firecrawl scrape "<url>" --only-main-content -o .firecrawl/page.md

# Wait for JS to render
firecrawl scrape "<url>" --wait-for 3000 -o .firecrawl/page.md

# Multiple URLs (each saved to .firecrawl/)
firecrawl scrape https://example.com https://example.com/blog

# Get markdown and links together
firecrawl scrape "<url>" --format markdown,links -o .firecrawl/page.json

# Ask a question about the page
firecrawl scrape "https://example.com/pricing" --query "What is the enterprise plan price?"
\`\`\`

### Key Options
| Option | Description |
|--------|-------------|
| \`-f, --format <formats>\` | Output formats: markdown, html, rawHtml, links, screenshot, json |
| \`-Q, --query <prompt>\` | Ask a question about the page content (5 credits) |
| \`-H\` | Include HTTP headers |
| \`--only-main-content\` | Strip nav, footer, sidebar |
| \`--wait-for <ms>\` | Wait for JS rendering |
| \`--include-tags <tags>\` / \`--exclude-tags <tags>\` | HTML tag filtering |
| \`-o, --output <path>\` | Output file path |

### Tips
- **Prefer plain scrape over \`--query\`.** Save to file, then use \`grep\` / \`head\` / read. \`--query\` costs 5 extra credits.
- **Try scrape before interact.** Escalate to interact only when you need clicks, form fills, etc.
- Multiple URLs are scraped concurrently — check \`firecrawl --status\` for your limit.`,
  },

  {
    name: "firecrawl-search",
    desc: "Web search with full page content",
    group: "Core Extraction",
    instructions: () => `## firecrawl search

Web search with optional content scraping. Returns search results as JSON, optionally with full page content.

### When to use
- You don't have a specific URL yet
- You need to find pages, answer questions, or discover sources
- First step: **search** → scrape → map → crawl → interact

### Quick start

\`\`\`bash
# Basic search
firecrawl search "your query" -o .firecrawl/result.json --json

# Search and scrape full page content from results
firecrawl search "your query" --scrape -o .firecrawl/scraped.json --json

# News from the past day
firecrawl search "your query" --sources news --tbs qdr:d -o .firecrawl/news.json --json
\`\`\`

### Key Options
| Option | Description |
|--------|-------------|
| \`--limit <n>\` | Max results |
| \`--sources <web,images,news>\` | Source types |
| \`--tbs <qdr:h|d|w|m|y>\` | Time filter |
| \`--scrape\` | Also scrape full page content for each result |
| \`-o, --output <path>\` | Output file path |
| \`--json\` | Output as JSON |

### Tips
- **\`--scrape\` fetches full content** — don't re-scrape URLs from results.
- Always write to \`.firecrawl/\` with \`-o\`.
- Use \`jq\` to extract: \`jq -r '.data.web[].url' .firecrawl/search.json\`
- Naming: \`.firecrawl/search-{query}.json\` or \`.firecrawl/search-{query}-scraped.json\`

### Search Feedback (refunds 1 credit)

Search costs 2 credits. After processing results, send feedback with \`firecrawl search-feedback <id>\`.

\`\`\`bash
SEARCH_ID=$(jq -r '.id' .firecrawl/search-result.json)
firecrawl search-feedback "$SEARCH_ID" --rating good \\
  --valuable-sources '[{"url":"https://example.com","reason":"Most relevant"}]' \\
  --missing-content '[{"topic":"specific topic","description":"details"}]' \\
  --silent &
\`\`\`

**Rules:** Must be sent within ~2 minutes. Daily refund cap (default 100 credits/team/UTC day). When \`dailyCapReached: true\`, stop calling. Use \`--silent &\` pattern so it never blocks.`,
  },

  {
    name: "firecrawl-map",
    desc: "Discover/list all URLs on a site",
    group: "Core Extraction",
    instructions: () => `## firecrawl map

Discover URLs on a site. Use \`--search\` to find a specific page within a large site.

### When to use
- You need to find a specific subpage on a large site
- You want a list of all URLs before scraping or crawling
- Step 3: search → scrape → **map** → crawl → interact

### Quick start

\`\`\`bash
# Find a specific page
firecrawl map "<url>" --search "authentication" -o .firecrawl/filtered.txt

# Get all URLs
firecrawl map "<url>" --limit 500 --json -o .firecrawl/urls.json
\`\`\`

### Key Options
| Option | Description |
|--------|-------------|
| \`--limit <n>\` | Max URLs to return |
| \`--search <query>\` | Filter URLs by search query |
| \`--sitemap <include|skip|only>\` | Sitemap strategy |
| \`--include-subdomains\` | Include subdomain URLs |
| \`--json\` | JSON output |
| \`-o, --output <path>\` | Output file path |

### Tips
- **Map + scrape is a common pattern**: map to find the URL, then scrape it.
- Example: \`map https://docs.example.com --search "auth"\` → found \`/docs/api/authentication\` → scrape.`,
  },

  {
    name: "firecrawl-crawl",
    desc: "Bulk extract content from a site/section",
    group: "Core Extraction",
    instructions: () => `## firecrawl crawl

Bulk extract content from a website. Crawls pages following links up to a depth/limit.

### When to use
- Need content from many pages on a site (e.g., all \`/docs/\`)
- Want to extract an entire site section
- Step 4: search → scrape → map → **crawl** → interact

### Quick start

\`\`\`bash
# Crawl a docs section
firecrawl crawl "<url>" --include-paths /docs --limit 50 --wait -o .firecrawl/crawl.json

# Full crawl with depth limit
firecrawl crawl "<url>" --max-depth 3 --wait --progress -o .firecrawl/crawl.json

# Check status of a running crawl
firecrawl crawl <job-id>
\`\`\`

### Key Options
| Option | Description |
|--------|-------------|
| \`--wait\` | Wait for crawl to complete |
| \`--progress\` | Show progress while waiting |
| \`--limit <n>\` | Max pages |
| \`--max-depth <n>\` | Max link depth |
| \`--include-paths <paths>\` | Only matching paths |
| \`--exclude-paths <paths>\` | Skip matching paths |
| \`-o, --output <path>\` | Output file path |

### Tips
- Always use \`--wait\` when you need results immediately.
- Use \`--include-paths\` to scope — don't crawl the entire site.
- Crawl consumes credits per page. Check \`firecrawl credit-usage\` before large crawls.`,
  },

  {
    name: "firecrawl-interact",
    desc: "Click, fill forms, navigate live pages",
    group: "Core Extraction",
    instructions: () => `## firecrawl interact

Interact with scraped pages in a live browser session. Scrape first, then click, fill forms, navigate, extract.

### When to use
- Content requires interaction: clicks, form fills, pagination, login
- \`scrape\` failed because content is behind JS interaction
- Need to navigate a multi-step flow
- Last resort: search → scrape → map → crawl → **interact**
- **Never use interact for web searches** — use \`search\` instead

### Quick start

\`\`\`bash
# 1. Scrape a page (scrape ID is saved automatically)
firecrawl scrape "<url>"

# 2. Interact with natural language
firecrawl interact --prompt "Click the login button"
firecrawl interact --prompt "Fill in the email field with test@example.com"
firecrawl interact --prompt "Extract the pricing table"

# 3. Or use code for precise control
firecrawl interact --code "agent-browser click @e5" --language bash

# 4. Stop the session when done
firecrawl interact stop
\`\`\`

### Key Options
| Option | Description |
|--------|-------------|
| \`--prompt <text>\` | Natural language instruction (use this OR --code) |
| \`--code <code>\` | Code to execute in the browser session |
| \`--language <lang>\` | Language: bash, python, node |
| \`--timeout <seconds>\` | Execution timeout (default: 30, max: 300) |
| \`--scrape-id <id>\` | Target specific scrape (default: last) |
| \`-o, --output <path>\` | Output file path |

### Profiles (persist browser state)

\`\`\`bash
# Login and save state
firecrawl scrape "https://app.example.com/login" --profile my-app
firecrawl interact --prompt "Fill in email and click login"

# Come back authenticated
firecrawl scrape "https://app.example.com/dashboard" --profile my-app
firecrawl interact --prompt "Extract dashboard data"

# Read-only reconnect (no writes to profile)
firecrawl scrape "https://app.example.com" --profile my-app --no-save-changes
\`\`\`

### Tips
- Always scrape first — interact needs a scrape ID from a previous scrape.
- The scrape ID is saved automatically.
- Use \`firecrawl interact stop\` to free resources when done.`,
  },

  {
    name: "firecrawl-download",
    desc: "Download entire site as local files",
    group: "Core Extraction",
    instructions: () => `## firecrawl download

> **Experimental.** Combines \`map\` + \`scrape\` to save site as local files.

### When to use
- You want to save an entire site/section to local files
- Need offline access to documentation or content
- Bulk content extraction with organized file structure

### Quick start

\`\`\`bash
# Interactive wizard
firecrawl download https://docs.example.com

# With screenshots
firecrawl download https://docs.example.com --screenshot --limit 20 -y

# Multiple formats per page
firecrawl download https://docs.example.com --format markdown,links --screenshot --limit 20 -y

# Filter to specific sections
firecrawl download https://docs.example.com --include-paths "/features,/sdks"

# Skip translations
firecrawl download https://docs.example.com --exclude-paths "/zh,/ja,/fr,/es"
\`\`\`

### Key Options
| Option | Description |
|--------|-------------|
| \`--limit <n>\` | Max pages |
| \`--search <query>\` | Filter URLs by query |
| \`--include-paths <paths>\` | Only matching paths |
| \`--exclude-paths <paths>\` | Skip matching paths |
| \`-y\` | Skip confirmation prompt (always use in automation) |

All scrape options also work: \`-f <formats>\`, \`-H\`, \`--screenshot\`, \`--only-main-content\`, \`--include-tags\`, \`--exclude-tags\`, \`--wait-for\`, etc.`,
  },

  // ── File & Agent ──────────────────────────────────────────────────────

  {
    name: "firecrawl-parse",
    desc: "Extract markdown from local files (PDF, DOCX, etc.)",
    group: "File & Agent",
    instructions: () => `## firecrawl parse

Turn a local document into clean markdown. Supports **PDF, DOCX, DOC, ODT, RTF, XLSX, XLS, HTML/HTM/XHTML**.

### When to use
- You have a file on disk (not a URL) and want its text as markdown
- User drops a PDF/DOCX and asks what it says or to summarize
- Use \`scrape\` instead when the source is a URL

### Quick start

\`\`\`bash
mkdir -p .firecrawl

# File → markdown
firecrawl parse ./paper.pdf -o .firecrawl/paper.md

# AI summary
firecrawl parse ./paper.pdf -S -o .firecrawl/paper-summary.md

# Ask a question about the doc
firecrawl parse ./paper.pdf -Q "What are the main conclusions?" -o .firecrawl/paper-qa.md
\`\`\`

Then \`head\`, \`grep\`, \`rg\`, or incrementally read — don't load the whole file at once.

### Key Options
| Option | Description |
|--------|-------------|
| \`-S, --summary\` | AI-generated summary |
| \`-Q, --query <prompt>\` | Ask a question about parsed content |
| \`-o, --output <path>\` | Output file path — **always use this** |
| \`-f, --format <fmt>\` | markdown (default), html, summary |
| \`--timing\` | Show request duration |

### Tips
- Quote paths with spaces: \`firecrawl parse "./My Doc.pdf"\`.
- Max upload size: **50 MB** per file.
- Credits: ~1 per PDF page; HTML is 1 flat.
- Check \`.firecrawl/\` before re-parsing the same file.
- Check balance with \`firecrawl credit-usage\` for batch processing.`,
  },

  {
    name: "firecrawl-agent",
    desc: "AI-powered structured extraction from websites",
    group: "File & Agent",
    instructions: () => `## firecrawl agent

AI-powered autonomous extraction. The agent navigates sites and extracts structured data (takes 2-5 minutes).

### When to use
- You need structured data from complex multi-page sites
- Manual scraping would require navigating many pages
- You want the AI to figure out where the data lives

### Quick start

\`\`\`bash
# Extract structured data
firecrawl agent "extract all pricing tiers" --wait -o .firecrawl/pricing.json

# With a JSON schema for structured output
firecrawl agent "extract products" --schema '{"type":"object","properties":{"name":{"type":"string"},"price":{"type":"number"}}}' --wait -o .firecrawl/products.json

# Focus on specific pages
firecrawl agent "get feature list" --urls "<url>" --wait -o .firecrawl/features.json
\`\`\`

### Key Options
| Option | Description |
|--------|-------------|
| \`--urls <urls>\` | Starting URLs for the agent |
| \`--model <model>\` | Model: spark-1-mini or spark-1-pro |
| \`--schema <json>\` | JSON schema for structured output |
| \`--schema-file <path>\` | Path to JSON schema file |
| \`--max-credits <n>\` | Credit limit for this run |
| \`--wait\` | Wait for completion |
| \`-o, --output <path>\` | Output file path |

### Tips
- Always use \`--wait\` to get results inline.
- Use \`--schema\` for predictable structured output.
- Agent runs consume more credits than scrapes. Use \`--max-credits\` to cap.
- For simple single-page extraction, prefer \`scrape\` — faster and cheaper.`,
  },

  // ── Build Integration ─────────────────────────────────────────────────

  {
    name: "firecrawl-build-onboarding",
    desc: "Get Firecrawl credentials & SDK setup",
    group: "Build Integration",
    instructions: () => `## firecrawl build-onboarding

Get Firecrawl credentials and SDK setup into a project.

### Use When
- A project needs \`FIRECRAWL_API_KEY\`
- The user wants Firecrawl wired into \`.env\`
- Adding Firecrawl to an app for the first time
- Need to choose the first SDK or REST path

### Install

\`\`\`bash
npx -y firecrawl-cli@latest init --all --browser
\`\`\`

This installs CLI, CLI skills, and build skills together, and opens browser auth.

### Auth Options

| Option | When |
|--------|------|
| \`FIRECRAWL_API_KEY\` | Required — set in \`.env\` |
| \`FIRECRAWL_API_URL\` | Optional — for self-hosted deployments |

### Source of Truth

Read the source-of-truth page for your language before writing integration code:
- **Node/TS**: docs.firecrawl.dev/agent-source-of-truth/node
- **Python**: docs.firecrawl.dev/agent-source-of-truth/python
- **Rust**: docs.firecrawl.dev/agent-source-of-truth/rust
- **Java**: docs.firecrawl.dev/agent-source-of-truth/java
- **cURL/REST**: docs.firecrawl.dev/agent-source-of-truth/curl`,
  },

  {
    name: "firecrawl-build-scrape",
    desc: "Integrate /scrape into product code",
    group: "Build Integration",
    instructions: () => `## firecrawl build-scrape

Integrate Firecrawl \`/scrape\` into product code for single-page extraction.

### Use When
- Feature starts from a known URL
- Need page content for retrieval, summarization, enrichment, or monitoring
- Want the default extraction primitive before considering \`/interact\`

### Default Recommendations
- Return \`markdown\` unless the feature needs another format.
- Use \`onlyMainContent\` for article-like pages.
- Add waits/rendering options only when needed.

### Common Patterns
- Knowledge ingestion from known URLs
- Enrichment from company/product/docs pages
- Pricing, changelog, and documentation extraction
- Page-level quality checks or monitoring

### Escalation
- No URL yet? Start with \`firecrawl-build-search\`.
- Need clicks/forms? Escalate to \`firecrawl-build-interact\`.

### Source of Truth
Read docs for your language: docs.firecrawl.dev/agent-source-of-truth/{lang}`,
  },

  {
    name: "firecrawl-build-search",
    desc: "Integrate /search into product code",
    group: "Build Integration",
    instructions: () => `## firecrawl build-search

Integrate Firecrawl \`/search\` into product code and agent workflows.

### Use When
- Feature starts with a query, not a URL
- The product must discover sources first
- Need current web results
- Turn search query into a shortlist for later scraping

### Default Recommendations
- Use \`/search\` first when URL discovery is part of product behavior.
- Keep search and extraction conceptually separate.
- Prefer selective follow-up over broad hydration when cost matters.

### Common Patterns
- Answer generation with cited sources
- Company/competitor/topic discovery
- Research workflows with shortlist before deeper extraction
- Query-to-URL pipelines for later \`/scrape\` or \`/interact\`

### Escalation
- Have the URL? Use \`firecrawl-build-scrape\`.
- Need clicks/forms? Escalate to \`firecrawl-build-interact\`.

### Source of Truth
Read docs for your language: docs.firecrawl.dev/agent-source-of-truth/{lang}`,
  },

  {
    name: "firecrawl-build-interact",
    desc: "Integrate /interact into product code",
    group: "Build Integration",
    instructions: () => `## firecrawl build-interact

Integrate Firecrawl \`/interact\` for dynamic pages and browser actions after scraping.

### Use When
- Content appears only after clicks, typing, or navigation
- Feature needs forms, pagination, filters, or multi-step flows
- Product must stay in same browser context after scraping

### Default Recommendations
- Start with \`/scrape\`, then escalate to \`/interact\`.
- Keep \`/interact\` scoped to the smallest browser workflow.
- Use persistent profiles only when authenticated state across sessions is needed.

### Common Patterns
- Search forms and faceted filters
- Paginated result sets
- Login-gated dashboards or tools
- Flows where page must be explored before extraction

### Escalation
- Page can be read directly? Stay on \`firecrawl-build-scrape\`.

### Source of Truth
Read docs for your language: docs.firecrawl.dev/agent-source-of-truth/{lang}`,
  },

  // ── Research & Intelligence ──────────────────────────────────────────

  {
    name: "firecrawl-deep-research",
    desc: "Multi-source deep research report",
    group: "Research & Intelligence",
    instructions: () => `## firecrawl deep-research

Multi-source deep research. Produces a sourced briefing.

### When to use
- User wants a researched report, comparison, or investigation
- Need to synthesize web evidence across many sources
- Topic is technical, market, or multi-faceted

### Collection Plan
- Quick: search 3-5 queries, scrape 5-10 high-quality sources
- Thorough: search 5-10 queries from different angles, scrape 15-25 sources
- Exhaustive: search 10+ queries, scrape 25+ sources including primary, research papers, contrarian

### Parallel Work (use sub-agents by angle)
- Overview and definitions
- Technical or implementation details
- Market and industry context
- Contrarian views, risks, and limitations
- Primary sources and official docs

### Final Deliverable (default structure)

\`\`\`markdown
# Research Report: [Topic]

## Executive Summary

## Key Findings (with sources)

## Analysis

## Sources
\`\`\`

Avoid re-scraping URLs already returned with full content from a search-with-scrape result.`,
  },

  {
    name: "firecrawl-research-papers",
    desc: "Find & synthesize research papers",
    group: "Research & Intelligence",
    instructions: () => `## firecrawl research-papers

Find and synthesize research papers, whitepapers, PDFs, technical reports, and academic sources.

### When to use
- Literature review on a specific topic
- Paper summary or comparison
- Research landscape from scholarly/industry publications
- Sourced synthesis from PDFs

### Collection Plan
1. Search multiple academic-style queries with \`--sources web\` and \`--scrape\`.
2. Scrape arxiv, PubMed, Semantic Scholar, or similar.
3. Use \`firecrawl parse\` for PDF papers on disk.

### Parallel Work (sub-agents)
- Paper discovery and screening
- Deep extraction from selected papers
- Synthesis and cross-comparison

### Deliverable
Structured summary with paper metadata, key contributions, methodology notes, and relevance assessment.`,
  },

  {
    name: "firecrawl-market-research",
    desc: "Extract market/financial/industry metrics",
    group: "Research & Intelligence",
    instructions: () => `## firecrawl market-research

Extract market, financial, earnings, industry, and company metrics.

### When to use
- Market research and industry trends
- Public company data and financial comparisons
- Earnings research
- Structured market reports

### Collection Plan
1. Search for industry reports, earnings data, financial metrics.
2. Scrape company pages, financial data sources, market analysis.
3. Use \`--scrape\` with search to get full content.

### Parallel Work (sub-agents)
- Market sizing and trends
- Competitor financials and metrics
- Industry reports and analysis
- Growth projections and forecasts

### Deliverable
Structured report with market data, comparative metrics, and sourced analysis.`,
  },

  {
    name: "firecrawl-competitive-intel",
    desc: "Monitor competitor pricing/features/changelogs",
    group: "Research & Intelligence",
    instructions: () => `## firecrawl competitive-intel

Monitor competitor pricing, features, changelogs, dashboards, and product changes.

### When to use
- Recurring competitive intelligence
- Pricing tier extraction
- Feature change tracking
- Structured competitor alerts

### Collection Plan
1. Map competitor sites to discover pricing, features, changelog pages.
2. Scrape those pages for structured comparison.
3. For recurring monitoring, set up with appropriate scraping cadence.

### Parallel Work (sub-agents)
- Pricing and packaging comparison
- Features matrix
- Changelog and release tracking
- Messaging and positioning changes

### Deliverable
Structured comparison with changes over time, competitive positioning, and alerts for significant changes.`,
  },

  {
    name: "firecrawl-lead-research",
    desc: "Pre-meeting lead/company intelligence brief",
    group: "Research & Intelligence",
    instructions: () => `## firecrawl lead-research

Produce pre-meeting lead intelligence briefs.

### When to use
- Company research for sales calls
- Person/executive research before meetings
- Recent news and talking points
- Pain points and outreach preparation
- Partnership meetings, investor conversations, customer interviews

### Collection Plan
1. Search for company: products, news, funding, leadership, competitors.
2. Scrape company website, blog, recent announcements.
3. Search for person: background, posts, interviews, panels.
4. Search for industry context and recent trends.

### Parallel Work (sub-agents)
- Company snapshot (founded, size, funding, product, competitors)
- Person intelligence (role, background, recent activity, interests)
- Recent news and signals (3-6 months)
- Pain points and opportunities

### Deliverable
Concise brief with company snapshot, person intel, recent signals, talking points, and recommended approach.`,
  },

  {
    name: "firecrawl-lead-gen",
    desc: "Generate structured prospect lead lists",
    group: "Research & Intelligence",
    instructions: () => `## firecrawl lead-gen

Generate structured lead lists from prospect databases and web directories.

### When to use
- Finding prospects by role, company type, industry, stage, location, technologies
- Exporting CRM-ready JSON or CSV
- Building targeted outreach lists

### Collection Plan
1. Search/identify relevant directories, databases, or listing pages.
2. Use \`map\` to discover all listing URLs.
3. Crawl or scrape each listing page for structured data.
4. Use \`agent\` with JSON schema for structured extraction when format varies.

### Parallel Work (sub-agents)
- Source discovery (find directories/listing pages)
- Extraction per source
- Deduplication and enrichment
- Export formatting (JSON/CSV)

### Deliverable
Structured list of prospects with contact info, company details, and source URLs.`,
  },

  {
    name: "firecrawl-company-directories",
    desc: "Extract company lists from directories",
    group: "Research & Intelligence",
    instructions: () => `## firecrawl company-directories

Extract structured company lists from directories (YC, Crunchbase, Product Hunt, G2, startup directories, etc.).

### When to use
- Scraping YC, Crunchbase, Product Hunt, G2, or category directories
- Building company databases for research, CRM, or analysis
- Custom company databases into JSON, CSV, or research tables

### Collection Plan
1. Map the directory site to understand listing patterns.
2. For paginated listings, use \`crawl\` or sequential \`scrape\`.
3. For each company page, extract name, description, category, funding, etc.
4. Use \`agent\` with schema for varied formats.

### Parallel Work (sub-agents)
- Site structure discovery
- Batch extraction per source
- Data cleaning and normalization
- Export in requested format`,
  },

  // ── Analysis & QA ────────────────────────────────────────────────────

  {
    name: "firecrawl-seo-audit",
    desc: "SEO audit: metadata, headings, site structure",
    group: "Analysis & QA",
    instructions: () => `## firecrawl seo-audit

Audit a website's SEO with Firecrawl.

### When to use
- SEO audit requested
- Metadata and heading review
- Sitemap/site-structure analysis
- Keyword opportunities and competitor SERP comparison
- Prioritized search optimization recommendations

### Collection Plan
1. Map the site to understand URL structure.
2. Scrape key pages: homepage, product, pricing, docs, blog, about, high-value landing pages.
3. Extract title tags, meta descriptions, headings, internal links, content structure, image alt text.
4. Search target keywords and scrape top-ranking pages for comparison.

### Parallel Work (sub-agents)
- Site Structure: URL patterns, sitemap health, internal linking, orphan pages
- On-Page SEO: titles, meta descriptions, H1/H2 hierarchy, content quality
- Keyword and SERP: target keywords, ranking pages, competitor patterns
- Technical Issues: broken links, duplicate content, missing metadata

### Deliverable
\`\`\`markdown
# SEO Audit: [Site]

## Executive Summary
## Site Structure
## On-Page SEO
## Keyword Analysis
## Technical Issues
## Prioritized Recommendations
\`\`\``,
  },

  {
    name: "firecrawl-qa",
    desc: "QA test a live website with browser evidence",
    group: "Analysis & QA",
    instructions: () => `## firecrawl qa

QA test a live website with Firecrawl browser and scrape evidence.

### When to use
- Exploratory QA
- Form testing
- Navigation/link checks
- Responsive checks
- Performance observations
- Bug reports and pre-launch quality review

### Collection Plan
1. Map the site to discover pages.
2. Use browser for interactions, forms, navigation, responsive checks.
3. Use scrape for page content and link extraction.

### Parallel Work (sub-agents)
- Full: Navigation and links, Forms and interactions, Content and visual, Error states
- Forms: Form discovery, Happy path, Edge cases, Validation
- Navigation: Sitemap, Nav testing, Link checker, Routing
- Responsive: Desktop, Tablet, Mobile
- Performance: Page load, Asset audit, Content efficiency

### Deliverable
\`\`\`markdown
# QA Report: [Site]

## Summary (health score, pages tested, issues by severity)
## Issues (severity, URL, description, evidence, reproduction steps)
\`\`\``,
  },

  {
    name: "firecrawl-demo-walkthrough",
    desc: "Walk through a product's key UX flows",
    group: "Analysis & QA",
    instructions: () => `## firecrawl demo-walkthrough

Walk through a product's key flows and produce a structured UX/product walkthrough.

### When to use
- Signup and onboarding analysis
- Pricing and docs review
- Dashboard and core feature walkthrough
- Product demo prep
- UX teardown and first-run experience analysis

### Collection Plan
1. Map the site structure to identify key sections.
2. For public pages, \`scrape\` each section.
3. For interactive flows (signup, onboarding, dashboard), use \`interact\` with browser.
4. Document each step with screenshots via \`--format screenshot\` or \`--screenshot\`.

### Deliverable
Structured walkthrough: flow overview, step-by-step with screenshots, UX observations, and recommendations.`,
  },

  {
    name: "firecrawl-dashboard-reporting",
    desc: "Pull metrics from analytics dashboards",
    group: "Analysis & QA",
    instructions: () => `## firecrawl dashboard-reporting

Pull metrics from analytics dashboards and internal web tools.

### When to use
- Dashboard reporting across platforms
- Cross-platform metric summaries
- Authenticated analytics extraction
- Date-range reports
- Structured metrics from web dashboards

### Collection Plan
1. For authenticated dashboards, scrape with \`--profile\` to persist login state.
2. Scrape dashboard pages for key metrics.
3. For interactive dashboards, use \`interact\` to navigate date ranges, filters, exports.

### Tips
- Use profiles for persistent login state across sessions.
- For regular reporting, set up the profile once and reuse.
- Document the exact navigation path so it's repeatable.`,
  },

  // ── Knowledge & Content ─────────────────────────────────────────────

  {
    name: "firecrawl-knowledge-base",
    desc: "Build a knowledge base from web content",
    group: "Knowledge & Content",
    instructions: () => `## firecrawl knowledge-base

Build a knowledge base from web content.

### When to use
- Local reference docs from web sources
- RAG-ready chunks for LLM applications
- Fine-tuning datasets
- Documentation mirrors
- Topic corpora organized from web sources

### Collection Plan
1. Map the source site to understand structure.
2. Crawl relevant sections with \`--include-paths\` to scope.
3. Or download with \`firecrawl download\` for organized local files.
4. Parse using \`--only-main-content\` for clean extraction.

### Parallel Work (sub-agents)
- Source discovery and mapping
- Extraction per section (use \`download\` for broad, \`crawl\` for JSON)
- Post-processing and chunking
- Format readiness (RAG, fine-tuning, etc.)

### Deliverable
Organized markdown files or JSON ready for downstream use.`,
  },

  {
    name: "firecrawl-knowledge-ingest",
    desc: "Ingest docs portals & login-gated knowledge bases",
    group: "Knowledge & Content",
    instructions: () => `## firecrawl knowledge-ingest

Ingest public or authenticated knowledge bases and docs portals.

### When to use
- JS-heavy documentation sites
- Login-gated portals and help centers
- Paginated knowledge bases
- Structured JSON/markdown extraction from docs sites

### Collection Plan
1. For public docs: map + crawl with \`--include-paths /docs\`.
2. For authenticated portals: scrape with \`--profile\` to persist login.
3. Use \`interact\` for paginated search results or filtered browsing.
4. For search-driven knowledge bases, use \`search\` with multiple targeted queries.

### Tips
- Use profiles for authenticated sessions.
- Combine \`download\` for offline mirror, \`crawl\` for structured JSON.`,
  },

  {
    name: "firecrawl-website-design-clone",
    desc: "Extract design system from any website",
    group: "Knowledge & Content",
    instructions: () => `## firecrawl website-design-clone

Extract any website's design system into an agent-ready DESIGN.md.

### When to use
- You want to capture a website's colors, fonts, spacing, components, layout patterns
- Need brand/UI guidance from a website for AI agents
- Creating new websites inspired by a specific design
- Cloning a look and feel for a new project

### Collection Plan
1. Map the site to discover key pages (homepage, about, product, etc.).
2. Scrape homepage and representative pages with full formatting.
3. Extract: color palette, typography (fonts, sizes, weights), spacing patterns, component styles, layout patterns, and interaction patterns.
4. Screenshot key pages for visual reference.

### Deliverable
\`DESIGN.md\` with extracted design tokens, component descriptions, layout patterns, and implementation notes for AI agents.`,
  },

  {
    name: "firecrawl-shop",
    desc: "Research products & produce shopping recommendations",
    group: "Knowledge & Content",
    instructions: () => `## firecrawl shop

Research products across the web and produce shopping recommendations.

### When to use
- Comparing products or services
- Finding the best option within budget/requirements
- Evaluating reviews and ratings
- Shopping research with saved browser session

### Collection Plan
1. Search for products with multiple queries (reviews, comparisons, specs).
2. Scrape product pages, review sites, and comparison articles.
3. For authenticated e-commerce sites, use \`--profile\`.

### Deliverable
Structured comparison with product specs, prices, pros/cons, review summaries, and final recommendation.`,
  },

  // ── Overview ─────────────────────────────────────────────────────────

  {
    name: "firecrawl-workflows",
    desc: "Overview of outcome-focused Firecrawl workflows",
    group: "Overview",
    instructions: () => `## firecrawl workflows

Outcome-focused Firecrawl workflows that produce deliverables.

### Available Workflows

| Workflow | Deliverable |
|----------|-------------|
| \`firecrawl-deep-research\` | Sourced multi-source research report |
| \`firecrawl-seo-audit\` | Site structure, on-page SEO, keyword/SERP audit |
| \`firecrawl-qa\` | Live-site QA testing and bug reports |
| \`firecrawl-lead-research\` | Pre-meeting company/person intelligence brief |
| \`firecrawl-lead-gen\` | Structured prospect lead lists |
| \`firecrawl-company-directories\` | Company lists from directories |
| \`firecrawl-competitive-intel\` | Recurring pricing/feature/changelog monitoring |
| \`firecrawl-knowledge-base\` | Knowledge base from web content |
| \`firecrawl-knowledge-ingest\` | Docs portal ingestion |
| \`firecrawl-dashboard-reporting\` | Dashboard metrics extraction |
| \`firecrawl-market-research\` | Market/financial/industry metrics |
| \`firecrawl-research-papers\` | Paper/whitepaper synthesis |
| \`firecrawl-demo-walkthrough\` | UX/product walkthrough |
| \`firecrawl-website-design-clone\` | Design system extraction |
| \`firecrawl-shop\` | Shopping research and recommendations |

### General Approach
1. Identify which workflow matches the user's request.
2. Use the corresponding subcommand for detailed instructions.
3. For product-code integration, use the build-* skills instead.`,
  },
];

// ── Command registration ───────────────────────────────────────────────────

const GROUP_ORDER = [
  "Overview",
  "Core Extraction",
  "File & Agent",
  "Build Integration",
  "Research & Intelligence",
  "Analysis & QA",
  "Knowledge & Content",
];

interface MenuItem { label: string; value: string; }

export default function (pi: ExtensionAPI) {
  // Register every /firecrawl:<name> and /fc:<name> command
  for (const skill of SKILLS) {
    const cmdName = `firecrawl:${skill.name.replace("firecrawl-", "")}`;
    pi.registerCommand(cmdName, {
      description: `[Firecrawl] ${skill.desc}`,
      handler: async (_args, ctx) =>
        invokeSkill(pi, ctx, skill),
    });

    // Also register /fc: shorthand
    const shorthand = `fc:${skill.name.replace("firecrawl-", "")}`;
    pi.registerCommand(shorthand, {
      description: `[FC] ${skill.desc}`,
      handler: async (_args, ctx) =>
        invokeSkill(pi, ctx, skill),
    });
  }

  // /firecrawl — interactive menu grouped by category
  pi.registerCommand("firecrawl", {
    description: "Firecrawl commands: scrape, search, crawl, map, interact, download, and more",
    handler: async (_args, ctx) => {
      const choice = await ctx.ui.select("Firecrawl skill:", groupMenuItems());
      if (choice) {
        const skill = SKILLS.find((s) => s.name === choice);
        if (skill) invokeSkill(pi, ctx, skill);
      }
    },
  });

  // /fc — shorthand for /firecrawl
  pi.registerCommand("fc", {
    description: "Shorthand for /firecrawl",
    handler: async (_args, ctx) => {
      const choice = await ctx.ui.select("Firecrawl skill:", groupMenuItems());
      if (choice) {
        const skill = SKILLS.find((s) => s.name === choice);
        if (skill) invokeSkill(pi, ctx, skill);
      }
    },
  });
}

// ── Dispatch ───────────────────────────────────────────────────────────────

function invokeSkill(pi: ExtensionAPI, ctx: { ui: { notify: (msg: string, type: string) => void } }, skill: SkillDef) {
  ctx.ui.notify(`Loading firecrawl skill (${skill.name})...`, "info");

  const body = skill.instructions().trim();
  const skillBlock = `<skill name="${skill.name}">
References are relative to the firecrawl CLI.

${body}
</skill>`;

  pi.sendUserMessage(skillBlock, { triggerTurn: true });
}

// ── Menu builder ───────────────────────────────────────────────────────────

function groupMenuItems(): MenuItem[] {
  const items: MenuItem[] = [];
  const groups = new Map<string, SkillDef[]>();

  for (const skill of SKILLS) {
    const list = groups.get(skill.group) || [];
    list.push(skill);
    groups.set(skill.group, list);
  }

  for (const groupName of GROUP_ORDER) {
    const cmds = groups.get(groupName);
    if (!cmds || cmds.length === 0) continue;
    items.push({ label: `── ${groupName} ──`, value: "" });
    for (const cmd of cmds) {
      const sub = cmd.name.replace("firecrawl-", "");
      items.push({
        label: `  firecrawl:${sub.padEnd(28)} ${cmd.desc}`,
        value: cmd.name,
      });
    }
  }

  return items;
}
