/* ==========================================================================
   STONKEX STRATEGY — site configuration
   --------------------------------------------------------------------------
   This is the only file you need to edit.
   ========================================================================== */

window.STONKEX_CONFIG = {
  /* Build stamp. Shown in the ?debug=1 panel, so you can confirm which version
     a browser actually has rather than guessing at a cache. Bump it together
     with the ?v= on the script tags in index.html whenever you deploy. */
  version: '2026-08-29.20',

  /* ---- Token ---------------------------------------------------------- */

  // $BASED on Base — the token people buy, and the one the CA button copies.
  contractAddress: '0x594d5833FdcE9217BaE8bdaDCF371Ee0AcbCcD96',

  // The reward token — the one holders are paid in. Used to price "total
  // distributed" in USD when the rewards source doesn't already give a USD
  // figure. Null until $COIN's address is known: the previous value was
  // $STONKEX's, which would price $BASED's rewards off the wrong token.
  rewardTokenAddress: null,

  chain: 'base',    // DexScreener chain slug
  chainId: 8453,    // EVM chain id

  /* Related contracts.
       pool         the trading pair — DexScreener is asked about THIS pool
                    first, and only falls back to searching by token address
       rewardPool   the reward token's own pair, used to price it
       feeLocker    where trading fees accrue
       rewardsIndex the distributor holders are paid from

     All null until $BASED's own are known. They previously held $STONKEXSTR's,
     and `pool` is read on every load — so leaving it would have kept the
     dashboard reporting the old token's market cap, liquidity and volume no
     matter which contract address sits above. With these null, DexScreener is
     searched by the contract address instead, which is correct if slower. */
  contracts: {
    pool: null,
    rewardPool: null,
    feeLocker: null,
    rewardsIndex: null,
  },

  /* ---- Links ---------------------------------------------------------- */

  links: {
    x: 'https://x.com/basedcoin_base',

    // Leave null to auto-build a DexScreener link from the contract address.
    chart: null,

    launchedIn: 'https://www.thestonks.exchange/',
    rewardsBy: 'https://www.stockify.finance/',
  },

  /* ======================================================================
     DATA SOURCES
     Each source fills in the fields it knows about. Later sources win, so
     `rewards` can override anything. Whatever no source provides falls back
     to `stats` below, and anything still missing renders as "—".
     ====================================================================== */

  sources: {

    /* Market cap, liquidity, 24h volume, and the token price.
       Public API, no key, CORS-enabled. */
    dexscreener: {
      enabled: true,
    },

    /* Holder count. DexScreener does not report holders, and no single explorer
       is reliable for a token this new — Blockscout was answering 0 for
       $STONKEXSTR, which just means it hasn't indexed the holders yet.

       So the providers below are tried IN ORDER and the first one to return a
       count above zero wins. A zero is treated as "no answer" and falls through
       to the next provider: a launched token with liquidity cannot have none.
       Run the page with ?debug=1 to see which provider answered.

         blockscout     — base.blockscout.com. Free, no key. Was returning 0,
                          then errors, for this token — it has not indexed it.
         geckoterminal  — free, no key. Only has a count for tokens it indexes.
         etherscan      — Etherscan V2 multichain. Needs `etherscanApiKey`, and
                          its tokenholdercount action requires a PAID plan.
         moralis        — needs `moralisApiKey`; the free tier is enough.

       Providers without a key are skipped, so the key-free ones are tried first
       and the rest only engage once you fill a key in.

       ▸ The reliable answer is the indexer in worker/: it counts holders from
         $STONKEXSTR transfer history, so it needs no explorer at all. Once it
         is deployed and synced it supplies `holders` through sources.rewards
         and this whole chain becomes a fallback.

       Set `enabled: false` to stop fetching holders here entirely. */
    holders: {
      enabled: true,
      providers: ['blockscout', 'geckoterminal', 'etherscan', 'moralis'],

      blockscoutBase: 'https://base.blockscout.com',
      geckoterminalBase: 'https://api.geckoterminal.com/api/v2',
      etherscanApiKey: '',
      moralisApiKey: '',
    },

    /* Rewards figures — total fees collected and total $STONKEX distributed.
       These are project numbers, so they come from the project's own API.

       ▸ SET `url` TO THE JSON ENDPOINT that carries the reward totals.
         Pass one URL or an array of them; each is read through `fields` below
         and the first source to yield a number for a metric wins.

       These thestonks.exchange endpoints have been checked and do NOT carry the
       totals — don't bother pointing at them again:
         /api/kols/airdrops?token=<ca>   KOL airdrops; empty for this token
         /api/fee-routing?pairs=<ca>:<feeLocker>
                                         routing config only — it is what told
                                         us fees route to "rewards" via the
                                         index contract recorded above
         /api/coins                      token metadata + supply, no totals

       The token page also issues Alchemy JSON-RPC calls, so the figures it
       renders are likely read straight off the rewards-index contract rather
       than served by an API. If so, they need either an endpoint that exposes
       them or an indexer — a browser cannot sum transfer logs over Base history.

       `fields` maps our metric names onto the response. Values are dot-paths,
       so 'data.stats.totalFeesUsd' and 'rewards.0.amount' both work. Several
       common spellings are listed per metric — the first one that resolves to a
       number wins, so you can usually just add yours to the front of the list.

       The endpoint must send permissive CORS headers, since the browser calls
       it directly. If it doesn't, proxy it from your own domain.              */
    rewards: {
      /* OFF: data/rewards.json still holds $STONKEXSTR's figures, and this
         source is merged LAST, so it overrides everything DexScreener reports
         for $BASED. Fees and distributed therefore read "—" for now, which is
         the honest answer, rather than another token's totals.

         To switch it back on: repoint scripts/index-rewards.mjs (see
         worker/src/config.js — TOKENS, CONTRACTS and START_BLOCK) at $BASED's
         reward token and distributor, let it rewrite data/rewards.json, then
         set this back to true. */
      enabled: false,
      // A string, or an array of them — the first source with a number for a
      // metric wins, so put live endpoints in front of the committed file.
      //
      // worker/ is a Cloudflare Worker that indexes these totals from Base and
      // serves exactly this shape. Once deployed:
      //   url: ['https://stonkex-rewards.<you>.workers.dev', 'data/rewards.json'],
      // and data/rewards.json stays as the fallback if it is ever down.
      url: 'data/rewards.json',

      fields: {
        totalFeesCollected: [
          'totalFeesCollected', 'totalFeesUsd', 'feesCollectedUsd', 'fees.totalUsd',
          'data.totalFeesCollected', 'stats.totalFeesCollected',
        ],
        totalFeesTokens: ['totalFeesTokens', 'feesTokens', 'data.totalFeesTokens'],
        totalDistributed: [
          'totalDistributed', 'totalRewardsDistributed', 'rewardsDistributed',
          'data.totalDistributed', 'stats.totalDistributed',
        ],
        totalDistributedUsd: [
          'totalDistributedUsd', 'totalRewardsDistributedUsd', 'rewardsDistributedUsd',
          'data.totalDistributedUsd', 'stats.totalDistributedUsd',
        ],
        holders: [
          'holders', 'holderCount', 'totalHolders', 'data.holders', 'stats.holders',
        ],
        marketCap: ['marketCap', 'marketCapUsd', 'data.marketCap'],
        liquidity: ['liquidity', 'liquidityUsd', 'data.liquidity'],
        volume24h: ['volume24h', 'volume24hUsd', 'volumeUsd24h', 'data.volume24h'],
      },
    },
  },

  // How often to refresh, in seconds. 0 disables auto-refresh.
  refreshSeconds: 60,

  /* ---- Fallbacks ------------------------------------------------------ */
  // Used only where no source supplies a value. Leave a field null and the
  // tile shows "—" rather than a number that isn't real.

  stats: {
    totalFeesCollected: null,
    totalFeesTokens: null,
    totalDistributed: null,
    totalDistributedUsd: null,
    holders: null,
    marketCap: null,
    liquidity: null,
    volume24h: null,
  },

};
