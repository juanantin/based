/* ==========================================================================
   What the indexer watches.
   --------------------------------------------------------------------------
   Everything in this file is a TODO. Until the addresses below are real, the
   indexer has nothing to scan — which is why the "Index rewards" workflow
   ships with its schedule commented out.

   ⚠ Which on-chain flow represents "fees collected" versus "distributed"
   differs per platform. Check /debug after the first sync and compare against
   whatever panel the platform publishes before trusting the numbers — see
   worker/README.md.
   ========================================================================== */

export const CHAIN_ID = 8453;                    // Base

/* The 0xAAAA… values below are deliberately fake — placeholders shaped like
   addresses so the test suite has something well-formed to exercise. They
   match nothing on chain: an indexer left on these values sums zero. */

export const TOKENS = {
  // TODO — the token people buy
  STR: '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  // TODO — the reward token holders are paid in, 18 decimals
  KEX: '0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
};

export const CONTRACTS = {
  // TODO — the trading pair
  pool: '0xCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC',
  // TODO — where trading fees accrue. Careful: on some platforms this is one
  // locker shared by every token, in which case summing it gives you the whole
  // platform's fees rather than yours.
  feeLocker: '0xDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD',
  // TODO — the distributor holders are actually paid from. This is the address
  // the streams below watch.
  rewardsIndex: '0xEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE',
};

// TODO — the block the token launched at. Nothing relevant happened before it,
// so the scan starts here rather than at genesis; leaving this at 0 means
// scanning all of Base history, which will not finish.
export const START_BLOCK = 0;

/* The three flows the totals are built from:

     `feesIn`   reward tokens ARRIVING at the distributor — "fees collected"
     `paidOut`  everything LEAVING it: holder payments plus the protocol's cut,
                so it is not the "distributed" figure on its own
     `holders`  every token transfer folded into a running balance per address;
                addresses left holding something are the holder count

   Verify these against the platform's own panel before trusting them. */
export const STREAMS = [
  { id: 'feesIn', kind: 'sum', token: TOKENS.KEX, to: CONTRACTS.rewardsIndex, decimals: 18 },
  { id: 'paidOut', kind: 'sum', token: TOKENS.KEX, from: CONTRACTS.rewardsIndex, decimals: 18 },
  { id: 'holders', kind: 'balances', token: TOKENS.STR, decimals: 18 },
];

/* Share of the outflow that reaches holders — the rest is the protocol's cut.
   TODO: set it to whatever split the platform publishes. Better still, set
   PROTOCOL_ADDRESS below and the protocol's share is subtracted exactly
   instead, which survives any change to the percentage. */
export const HOLDER_SHARE = 0.9;
export const PROTOCOL_ADDRESS = null;

if (PROTOCOL_ADDRESS) {
  STREAMS.push({
    id: 'protocolOut', kind: 'sum', token: TOKENS.KEX,
    from: CONTRACTS.rewardsIndex, to: PROTOCOL_ADDRESS, decimals: 18,
  });
}

/** Tokens that actually reached holders. */
export function holderPayout(totals) {
  const paidOut = totals.paidOut ?? 0;
  if (PROTOCOL_ADDRESS) return Math.max(0, paidOut - (totals.protocolOut ?? 0));
  return paidOut * HOLDER_SHARE;
}

/* Addresses that hold supply but are not holders in the sense the tile means:
   the pool itself, the fee locker, the rewards contract. */
export const EXCLUDE_FROM_HOLDERS = [
  CONTRACTS.pool,
  CONTRACTS.feeLocker,
  CONTRACTS.rewardsIndex,
].map((a) => a.toLowerCase());

/* Scan pacing. A Worker run is short, so it takes bites and resumes. Raise
   MAX_CHUNKS_PER_RUN to backfill faster; lower CHUNK_SIZE if the RPC complains
   (it halves automatically anyway). */
export const CHUNK_SIZE = 2000;
export const MAX_CHUNKS_PER_RUN = 60;
export const CONFIRMATIONS = 5;

// Price the token totals in USD. Public, no key.
export const DEXSCREENER_PAIR =
  'https://api.dexscreener.com/latest/dex/pairs/base/' + CONTRACTS.pool;
export const DEXSCREENER_KEX_TOKEN =
  'https://api.dexscreener.com/latest/dex/tokens/' + TOKENS.KEX;
