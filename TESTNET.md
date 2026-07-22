# Testnet certification (Base Sepolia)

Prove the x402 payment loop works end-to-end with play-money **before** you
point it at a real wallet. Nothing here touches real funds.

## 1. Get a Base Sepolia wallet + test USDC

- Create a throwaway wallet (e.g. in a viem script, MetaMask, or Coinbase
  Wallet) on **Base Sepolia**. Use a key you don't use anywhere else.
- Fund it with test ETH (gas) and test USDC from a faucet:
  - Base Sepolia ETH: https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet
  - Test USDC (Circle): https://faucet.circle.com (select Base Sepolia)

## 2. Local `.env` (gitignored — never commit)

```
PAYMENTS_ENABLED=true
X402_NETWORK=base-sepolia
RECEIVING_WALLET_ADDRESS=0xYOUR_RECEIVING_ADDRESS      # can be the same test wallet
WALLET_PRIVATE_KEY=0xYOUR_FUNDED_TEST_KEY              # buyer side; testnet only
```

## 3. Run

```
npm run test:testnet
```

Expected:

```
PASS  unpaid request returns 402 ...
PASS  paid request returns 200 ...
```

- **402 PASS** = the seller middleware is wired correctly (verified with no
  funds at all).
- **200 PASS** = the full `402 -> pay -> retry` loop settled a real (test) USDC
  payment on Base Sepolia. That's your green light.

## 4. Flip to mainnet

Once the loop passes on testnet, change `.env` (or the Vercel env):

```
X402_NETWORK=base
RECEIVING_WALLET_ADDRESS=0xYOUR_REAL_BASE_WALLET
CDP_API_KEY_ID=...            # Coinbase CDP keys for the mainnet facilitator
CDP_API_KEY_SECRET=...
# remove WALLET_PRIVATE_KEY from the server env — that's a buyer/agent concern
```

Then deploy (`vercel --prod`). The receiving wallet just accrues USDC; sweep it
whenever you like.
