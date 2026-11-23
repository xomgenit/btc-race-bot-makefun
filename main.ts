// btc-race-24h-20261123-0511 — cbBTC trend bot (agent-fun/bars-replay/v1).
//
// Strategy (backtested on the frozen 24h dev window, 1,440 1-minute bars):
//   * Enter long on a 60-bar Donchian breakout: the close prints above the
//     highest high of the previous 60 bars. Full size (100% of cash).
//   * Exit on a 2% trailing stop measured from the highest close since entry.
//   * After a stop-out, wait 120 bars before the next entry (no re-chasing
//     dead-cat bounces in a downtrend).
//   * max_slippage_bps 150 on every order: a fill more than 1.5% away from
//     the latest close is rejected, so the bot never chases a vertical gap.
//   * Nothing else trades. No clock, no randomness, no network: every
//     decision comes from the bars the harness sent, so two runs agree.
//
// Dev-window backtest (exact replay economics: 4 bps fee + 2 bps slippage
// + constant-product impact vs the fill bar's open depth, fills at the next
// bar's open): net PnL +$29.50 on 1 trade, max drawdown 1.98%.
// Buy-and-hold on the same window makes +$32.17 but loses -$38.83 on the
// mirrored (-3.6%) window; this bot loses only -$17.78 there (one stopped
// trade) — the asymmetry is the point: ride uptrends, cap downtrend losses.
// Split-half: first 12h (trend) +$29.50, second 12h (flat) +$2.70, both on
// 1 trade; no churn in either half. A tighter trail (1.2%) and two-tier
// trails were tested and rejected: they stop out on noise, re-enter, and
// lose more on the mirrored window (-$34 to -$57).
//
// The bot speaks the protocol through the kit's SDK shim (vendor/).

import { runBars } from './vendor/makefun-bars.ts';
import type { BarsState, Batch } from './vendor/makefun-bars.ts';

const SYMBOL = 'CBBTC';
// Breakout lookback: the close must beat the highest high of these bars.
const N_HI = 60;
// Trailing stop, in basis points below the highest close since entry.
const TRAIL_BPS = 200;
// Bars to wait after a stop-out before the next entry may fire.
const COOLDOWN_BARS = 120;
// An order whose fill would land further than this from the latest close
// (in basis points) is rejected by the replay; 150 bps is wide enough for
// normal 1-minute moves (dev max: 72 bps) plus impact, tight enough to
// refuse chasing a gap.
const MAX_SLIPPAGE_BPS = 150;

// Price scale of the symbol: price p means p / 10^5 USDC per BTC.
const PRICE_SCALE = 5;

// History of closes and highs, in USDC, oldest first. Appended from every
// batch that carries a CBBTC bar, warm-up batches included (they are real
// bars before the scored window, there to build history from).
const closes: number[] = [];
const highs: number[] = [];
// Highest close since the current entry (0 while flat).
let peak = 0;
// Bars seen so far (counts batches that carried a CBBTC bar).
let barsSeen = 0;
// Bar index of the last stop-out sell decision (-1e9 = never).
let lastSellBar = -1e9;

function usd(price: bigint): number {
  return Number(price) / 10 ** PRICE_SCALE;
}

function onBatch(state: BarsState, _batch: Batch) {
  const bar = state.latest.get(SYMBOL);
  if (bar === undefined) return [];
  const close = usd(BigInt(bar.c));
  const high = usd(BigInt(bar.h));
  closes.push(close);
  highs.push(high);
  barsSeen += 1;

  // Warm-up batches build history only; any order decided on one is
  // rejected by the replay, so answer empty.
  if (state.warmingUp) return [];

  const pos = state.positions.get(SYMBOL);
  const qty = pos === undefined ? 0n : pos.qty;

  if (qty > 0n) {
    // Holding: trail the stop from the highest close since entry.
    if (close > peak) peak = close;
    if (close * 10000 <= peak * (10000 - TRAIL_BPS)) {
      lastSellBar = barsSeen;
      return [{ side: 'sell', symbol: SYMBOL, qty, max_slippage_bps: MAX_SLIPPAGE_BPS }];
    }
    return [];
  }

  // Flat: respect the post-stop-out cooldown, then look for a breakout.
  if (barsSeen - lastSellBar < COOLDOWN_BARS) return [];
  if (closes.length <= N_HI) return [];
  let hi = -Infinity;
  for (let i = closes.length - N_HI - 1; i < closes.length - 1; i += 1) {
    if (highs[i] > hi) hi = highs[i];
  }
  if (close > hi && state.cash > 1000000n) {
    peak = close;
    return [{ side: 'buy', symbol: SYMBOL, notional_quote_units: state.cash, max_slippage_bps: MAX_SLIPPAGE_BPS }];
  }
  return [];
}

await runBars({ onBatch });
