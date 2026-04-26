# User Manual

## AI-Driven Investment Intelligence Platform
**Version:** 1.0 · **Date:** 2026-04-22

Welcome. This manual walks you through every feature of the platform, step by step. It is written for end users (retail investors, advisors, researchers) — no coding knowledge is required.

> **Important disclaimer.** This platform provides **research and educational output only**. Nothing here constitutes investment advice, solicitation, or a recommendation to buy or sell any security. Always do your own research and consult a SEBI-registered advisor before acting.

---

## 1. Getting Started

### 1.1 Creating an account

1. Open the portal at your provisioned URL (e.g. `https://app.investment.local`).
2. Click **Sign up** on the landing page.
3. Enter your full name, email, and a password (minimum 12 characters, at least one number and one symbol).
4. Accept the research-only disclaimer and click **Create account**.
5. Check your inbox for a verification email. Click the link within 24 hours.

### 1.2 Logging in

1. Click **Log in** on the landing page.
2. Enter your email and password.
3. Optionally tick **Keep me signed in** to extend the session to 30 days on this device.

### 1.3 Resetting your password

1. Click **Forgot password?** on the login screen.
2. Enter your email; you will receive a reset link.
3. Open the link, enter a new password and confirm.

### 1.4 Your profile

- Top-right avatar → **Settings** to update:
  - Name, avatar
  - Email (requires re-verification)
  - Password
  - Notification preferences (daily digest, alert emails)
  - API keys (if you have developer access)

---

## 2. The Dashboard

The Dashboard is your daily starting point. It loads the most recent trading day's snapshot.

**What you see at the top**

- **Market Regime badge.** A single pill that reads *Bull*, *Bear*, or *Sideways*, alongside a *Risk-On* or *Risk-Off* flag. Hover to see the detector's reasoning (indices trend, breadth, VIX proxy).
- **Refresh time.** Timestamp of the last pipeline run.

**Key widgets**

1. **Today's Top Signals.** A table of assets newly classified BUY, with confidence score and a one-line rationale. Click a row to open the asset detail page.
2. **Avoid Today.** Assets newly flagged AVOID (overvalued, breaking trend, liquidity risk). Read these with the same weight as your buys.
3. **Sector Strength.** Ranked sectors by relative strength. A green upward arrow means the sector outperformed the benchmark over the last 1 month.
4. **Quick Recommendations.** A compact card showing the suggested split across Equity / Debt / Gold for the current regime.
5. **Headline Chart.** NIFTY 50 (or your chosen benchmark) for the last 3 months with overlayed moving averages.

**Tips**

- All widgets are resizable on desktop. Drag the bottom-right corner.
- Click the three-dot menu on any widget to export its data as CSV.

---

## 3. Asset Explorer

Navigate to **Assets** in the left sidebar.

### 3.1 Searching

- Use the search box at the top: type a ticker (`RELIANCE`), an ISIN, or a fund name (`Parag Parikh Flexi Cap`).
- Results are typeahead; press ↵ to open the first result.

### 3.2 Filtering

- **Type** — Equity, Mutual Fund, ETF, Index, Commodity, Currency.
- **Sector / Industry** — multi-select.
- **Market cap** — Large / Mid / Small (equities only).
- **Rating** — shows only assets with AI score above threshold.
- **Signal** — BUY / HOLD / AVOID.

Filters combine with AND semantics.

### 3.3 Asset Detail page

Click any row. The page has five tabs.

1. **Overview** — AI score, latest signal with rationale, key metrics (1Y return, 3Y return, Sharpe, Max drawdown), assigned benchmark, sector/industry.
2. **Price / NAV** — interactive chart with toggles for 1M / 3M / 6M / 1Y / 3Y / 5Y / Max, log-scale option, moving-average overlays (20/50/100/200), RSI and MACD sub-panels.
3. **Metrics** — the full feature store row: returns at multiple horizons, risk metrics, trend indicators, fund-specific metrics (consistency, downside protection, expense-adjusted return for MFs).
4. **Signal History** — every past signal with date, probability, confidence, rationale, and a small sparkline of subsequent price movement (for visually evaluating past accuracy).
5. **Corporate Actions** (equities only) — splits, dividends, bonuses.

### 3.4 Exporting

- **Export to CSV** — downloads the visible table or chart series.
- **Add to Watchlist** — pin to your sidebar and receive alerts.
- **Open in Comparison** — opens the Comparison Tool with this asset preloaded.

---

## 4. Comparison Tool

The Comparison Tool answers "which one is better?"

1. Go to **Compare** from the sidebar.
2. Add 2–4 assets via the search pickers. You can mix types (e.g. a stock vs. its sector index vs. a sectoral fund).
3. Choose a metric axis:
   - Returns (1M/3M/6M/1Y/3Y/5Y/SI)
   - Risk (stdev, Sharpe, Sortino, Max DD)
   - Trend (RSI, MACD histogram, MAs)
   - Correlation (heatmap across selected assets)
4. Choose a benchmark for relative-strength view.
5. The main chart overlays normalized price/NAV (base = 100 at start).
6. The table below shows side-by-side numbers with the best cell in each row highlighted.

**Use cases**

- Comparing two large-cap funds against Nifty 100 TRI.
- Testing whether a sector ETF beats a hand-picked stock basket.
- Checking correlation before adding a "diversifier" to your portfolio.

---

## 5. Signals

The **Signals** page is the pure signal feed.

- **Today** — today's BUY, HOLD, AVOID lists, grouped and filterable.
- **History** — scroll back day-by-day.
- **Performance** — a ledger of past BUY calls and their 1M/3M/6M forward returns. A small summary card at the top shows the aggregate hit rate and average forward return.

Each signal row shows:

| Column | Meaning |
|---|---|
| Symbol | Ticker / scheme code |
| Name | Full name |
| Signal | BUY / HOLD / AVOID badge |
| Probability | Model's estimated outperformance probability (0–100%) |
| Confidence | How confident the model is in its own prediction |
| Rationale | One-line human explanation |

Click any row to jump to the Asset Detail page.

---

## 6. Reports

The **Reports** section hosts the auto-generated Daily Report.

### 6.1 Viewing the latest report

Click **Reports → Today** (or "latest" if today's run hasn't completed yet).

The report has seven sections:

1. **Executive Summary** — three paragraphs of plain-English narration.
2. **Market Overview** — indices snapshot, regime, breadth.
3. **Key Signals Summary** — today's notable upgrades and downgrades.
4. **Top Opportunities** — top 10 equities + top 5 MFs per category.
5. **Avoid / Caution List** — flagged assets with reasons.
6. **Sector View** — rotation commentary, ranked table.
7. **Asset Allocation Suggestion** — Equity / Debt / Gold split with rationale.

### 6.2 Archive

**Reports → Archive** shows every past report. Filter by:

- Date range
- Specific asset (find every report that mentioned a ticker)
- Section (e.g. only "Top Opportunities" entries)

### 6.3 Downloading & Emailing

Every report has three buttons on the top right:

- **Download PDF** — press-ready PDF.
- **Email me** — sends the PDF and HTML summary to your registered email.
- **Copy link** — shareable URL (only accessible to logged-in users).

### 6.4 Daily digest (opt-in)

Go to **Settings → Notifications** and enable **Daily Digest**. You'll receive the report by email every morning at 07:30 IST.

---

## 7. Alerts

Alerts notify you when something changes.

### 7.1 Types of alerts

- **Signal change** — when an asset moves BUY → AVOID or vice versa.
- **Risk flag** — high volatility spike, drawdown breach, liquidity dry-up.
- **Trend reversal** — MACD cross, 200-DMA break.

### 7.2 Creating an alert

1. Go to **Alerts** in the sidebar.
2. Click **+ New alert**.
3. Choose the asset (or *All watchlist assets*).
4. Choose the condition and threshold.
5. Choose the channel: in-app, email, or both.
6. Save.

### 7.3 Managing alerts

- Toggle the *Active* switch to pause an alert without deleting.
- Click **Events** to see the history of fires.

---

## 8. Watchlists

- **Pin** an asset on any detail page to add it to your default watchlist.
- Create additional themed watchlists: sidebar → **Watchlists → + New**.
- Watchlists appear on the Dashboard as a compact table with inline signal badges.

---

## 9. Settings

| Tab | What you can do |
|---|---|
| Profile | Name, avatar, email |
| Security | Password, active sessions, 2FA (if enabled for your org) |
| Notifications | Email digest toggle, alert channels, quiet hours |
| API Keys | Issue, rotate, revoke personal API tokens (dev access only) |
| Appearance | Light / dark / system theme |
| Data | Export your data (JSON), request account deletion |

---

## 10. Mobile & Accessibility

- The portal is fully responsive. Tables become scrollable cards below 768 px.
- WCAG AA contrast. Keyboard navigation for every interactive element (`Tab`, `Shift+Tab`, `Enter`).
- `⌘K` / `Ctrl+K` opens the global command palette from any page.
- Screen-reader labels on all icons and charts (charts expose a data table fallback).

---

## 11. Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `⌘K` / `Ctrl+K` | Command palette |
| `g` then `d` | Go to Dashboard |
| `g` then `a` | Go to Assets |
| `g` then `s` | Go to Signals |
| `g` then `r` | Go to Reports |
| `/` | Focus search |
| `?` | Show this shortcut list |

---

## 12. How to Read a Signal Rationale

A typical rationale looks like:

> **RELIANCE · BUY · 72% probability, 0.81 confidence**
> Momentum positive (50D > 200D), relative strength vs NIFTY50 in the top decile, volatility below 60-day average, model agrees across GBM and RF ensembles.

Read it this way:

- **Probability** — the model estimates a 72% chance the asset will outperform its benchmark over the next 1 month.
- **Confidence** — 0.81 means the ensemble models agree strongly with each other.
- **Rationale** — the top contributing features, translated to plain English.

A high-probability, low-confidence signal is less reliable than a medium-probability, high-confidence one. Look at both numbers, not just one.

---

## 13. Frequently Asked Questions

**Q: How often is data updated?**
A: End-of-day data is ingested daily around 19:30 IST. Signals and the Daily Report are published by 07:30 IST the next morning.

**Q: Does the platform give advice on intraday trades?**
A: No. The platform is EOD-based for v1. Intraday is on the roadmap.

**Q: Is it safe to share my reports with others?**
A: The PDF contains no personal data, only market information. The copy-link feature, however, requires login by the recipient.

**Q: How accurate are the signals?**
A: The Performance page shows the live hit rate. Past performance never guarantees future results. Signals are probabilistic, not deterministic.

**Q: Can I override a signal for an asset I know well?**
A: Not in v1. The Custom Rule Builder is planned for v2 (see Roadmap M5).

**Q: Why is a popular fund not appearing?**
A: Likely because it's too new (insufficient history) or has very low AUM. Filter settings may also exclude it. Check the filter chips above the Asset list.

**Q: How do I delete my account?**
A: **Settings → Data → Request account deletion**. Your data is removed within 30 days.

---

## 14. Support

- In-app: click **Help** in the sidebar → live chat during business hours, async ticket otherwise.
- Email: `support@investment.local`.
- Status page: `https://status.investment.local`.

When reporting an issue, please include:
- The page URL
- The time (IST)
- A screenshot if possible
- Your `requestId` (visible at the bottom of any error toast)

---

## 15. Glossary (for non-technical readers)

- **BUY / HOLD / AVOID** — The model's classification of a security's near-term relative outlook.
- **Benchmark** — A reference index (e.g. NIFTY 50) against which performance is measured.
- **Sharpe ratio** — Return per unit of risk. Higher is better.
- **Sortino ratio** — Like Sharpe but penalizes only downside volatility.
- **Max drawdown** — The worst peak-to-trough fall in a given window.
- **Moving average (DMA)** — Smoothed price over the last N days.
- **RSI** — Relative Strength Index. Readings > 70 suggest overbought, < 30 oversold.
- **MACD** — A trend-following momentum indicator.
- **AUM** — Assets Under Management (mutual fund size).
- **Expense ratio** — Annual fee of a fund as a % of assets.
- **Market regime** — Overall market state (Bull / Bear / Sideways).
- **Risk-on / Risk-off** — Shorthand for whether investors are embracing or avoiding risky assets.

---

## 16. Release Notes

- **v1.0 (2026-08-18)** — Public launch: Dashboard, Asset Explorer, Compare, Signals, Reports, Alerts.
- **v0.9 (2026-07-28)** — Closed beta with invited users.
- **v0.5 (2026-06-30)** — Internal beta; signals via API only.

Future releases will appear on the **What's New** page in-app.

— *Thank you for using the Investment Intelligence Platform. Invest thoughtfully.*
