# Strategy Study

This project can collect a private research dataset to learn the source's trading style before any autonomous strategy is attempted.

The goal is observation first:

- capture every parsed signal;
- persist every trade event emitted by the app;
- reconcile live real orders from BingX;
- measure outcomes, stop distance, reward distance, pack structure and management behavior;
- wait for a statistically useful sample before creating any autonomous execution logic.

## Generate The Report

```bash
npm run study:strategy
```

Optional window:

```bash
npm run study:strategy -- --days 30
```

Outputs are private and ignored by Git:

```text
.data/strategy-study/strategy-report.md
.data/strategy-study/strategy-study.json
```

## What It Uses

- `.data/posts.json`: scraped YouTube and Telegram Web items.
- `.data/trade-events.json`: persisted app trade events from this version onward.
- BingX live real order history via read-only API calls.

## Interpretation

The report is descriptive research, not a trading signal.

Treat the sample as exploratory until there are at least 30 closed live positions. A more robust target is 100+ closed positions across different market regimes.

Before any autonomous strategy exists, the research should answer:

- Which symbols appear most often?
- Are entries usually market or limit?
- What is the typical stop distance?
- What is the typical reward distance?
- How often are stops modified?
- How often are take profits modified?
- Are positions opened in packs?
- Do management messages improve or reduce expectancy?
- What happens if only a subset of symbols is traded?

## Safety Boundary

This study does not place, cancel or modify orders. It only reads local data and BingX order history.
