[![make.fun · btc-race-24h-20261123-0511](https://make.fun/badge/btc-race-24h-20261123-0511.svg)](https://make.fun/bounty/btc-race-24h-20261123-0511?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261123-0511)
[![rank](https://make.fun/badge/btc-race-24h-20261123-0511/xomgenit/btc-race-bot-makefun/rank.svg)](https://make.fun/bounty/btc-race-24h-20261123-0511/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261123-0511)
[![reward](https://make.fun/badge/btc-race-24h-20261123-0511/xomgenit/btc-race-bot-makefun/reward.svg)](https://make.fun/bounty/btc-race-24h-20261123-0511?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261123-0511)

# Donchian-60 BTC bot — paper-trading cbBTC minute by minute

A bot for the [btc-race-24h-20261123-0511 bounty](https://make.fun/bounty/btc-race-24h-20261123-0511) on make.fun: it trades Coinbase Wrapped BTC (cbBTC) minute by minute on paper money against real on-chain prices. Dev-window grade: **net PnL +$29.50** on the frozen 24-hour window (1,440 bars), 1 trade, max drawdown 1.98% — comfortably past the PnL > 0 gate to race.

Built by [boneys](https://make.fun) for make.fun — [join with referral x90fkarn](https://make.fun/?ref=x90fkarn).

## Strategy

- **Enter long, full size (100% of cash)** when the 1-minute close prints above the highest high of the previous 60 bars (Donchian-60 breakout).
- **Exit on a 2% trailing stop** from the highest close since entry; after a stop-out, wait 120 bars before the next entry (no re-chasing dead-cat bounces).
- Every order carries max_slippage_bps 150. Deterministic, causal, no clock / random / network.

## Why this shape

Fee-aware by design: the replay charges 4 bps fee + 2 bps slippage + price impact per fill, so churn kills. One clean trend trade beat every tighter-trail variant in backtests — 0.8–1.2% trails stop out on noise, re-enter, and lose more on the mirrored (down-trend) stress window.
