# Mezo SDK Research Notes

**Date:** 2026-05-25
**Source:** `node_modules/@mezo-org/*` packages installed in this lane

---

## Confirmed Contract Addresses — Mezo Testnet (chain 31611, "matsnet")

All addresses sourced from `@mezo-org/musd-contracts@1.1.0` deployments/matsnet/ and `@mezo-org/mezod-contracts@1.0.0`.

### MUSD System (Liquity v1 fork)

| Contract | Address | Source |
|----------|---------|--------|
| **MUSD** (ERC-20) | `0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503` | musd-contracts/deployments/matsnet/MUSD.json |
| **BorrowerOperations** | `0xCdF7028ceAB81fA0C6971208e83fa7872994beE5` | musd-contracts/deployments/matsnet/BorrowerOperations.json |
| **TroveManager** | `0xE47c80e8c23f6B4A1aE41c34837a0599D5D16bb0` | musd-contracts/deployments/matsnet/TroveManager.json |
| **PriceFeed** | `0x86bCF0841622a5dAC14A313a15f96A95421b9366` | musd-contracts/deployments/matsnet/PriceFeed.json |
| **StabilityPool** | `0x1CCA7E410eE41739792eA0A24e00349Dd247680e` | musd-contracts/deployments/matsnet/StabilityPool.json |
| **ActivePool** | `0x143A063F62340DA3A8bEA1C5642d18C6D0F7FF51` | musd-contracts/deployments/matsnet/ActivePool.json |
| **HintHelpers** | `0x4e4cBA3779d56386ED43631b4dCD6d8EacEcBCF6` | musd-contracts/deployments/matsnet/HintHelpers.json |
| **SortedTroves** | `0x722E4D24FD6Ff8b0AC679450F3D91294607268fA` | musd-contracts/deployments/matsnet/SortedTroves.json |

### MEZO Token

| Contract | Address | Source |
|----------|---------|--------|
| **MEZO** | `0x7B7c000000000000000000000000000000000001` | passport/lib/contracts/artifacts/MEZO.json (precompile) |

### Passport API

| Endpoint | URL | Source |
|----------|-----|--------|
| Auth API (testnet) | `https://api.test.mezo.org` | passport/api/auth.js |
| Rewards API (testnet) | `https://api.test.mezo.org/rewards/` | passport/api/rewards.js |
| Portal API (testnet) | (derived from env) | passport/api/portal.js |

---

## MUSD Borrowing Model — Liquity v1

MUSD on Mezo is a **Liquity v1 fork**. Users open "troves" by depositing BTC (native token) as collateral and borrowing MUSD.

### BorrowerOperations Key Functions

```solidity
// Open a new trove — send BTC as msg.value, specify MUSD debt
function openTrove(uint256 _debtAmount, address _upperHint, address _lowerHint) external payable

// Add more BTC collateral — send BTC as msg.value
function addColl(address _upperHint, address _lowerHint) external payable

// Withdraw BTC collateral
function withdrawColl(uint256 _amount, address _upperHint, address _lowerHint) external

// Borrow more MUSD from existing trove
function withdrawMUSD(uint256 _amount, address _upperHint, address _lowerHint) external

// Repay MUSD debt
function repayMUSD(uint256 _amount, address _upperHint, address _lowerHint) external

// General adjustment (collateral withdraw + debt change in one tx)
function adjustTrove(uint256 _collWithdrawal, uint256 _debtChange, bool _isDebtIncrease, address _upperHint, address _lowerHint) external payable

// Close trove entirely (repay all debt, get all collateral back)
function closeTrove() external

// Claim collateral surplus after liquidation
function claimCollateral() external

// View: get borrowing fee for a given debt
function getBorrowingFee(uint256 _debt) external view returns (uint256)
```

### TroveManager Key View Functions

```solidity
function getTroveColl(address _borrower) external view returns (uint256)
function getTroveDebt(address _borrower) external view returns (uint256)
function getTroveStatus(address _borrower) external view returns (uint8)
// Status: 0=nonExistent, 1=active, 2=closedByOwner, 3=closedByLiquidation, 4=closedByRedemption
function getEntireDebtAndColl(address _borrower) external view returns (uint256 coll, uint256 principal, uint256 interest, uint256 pendingColl, uint256 pendingPrincipal, uint256 pendingInterest)
function getCurrentICR(address _borrower, uint256 _price) external view returns (uint256)
function MCR() external view returns (uint256)  // Minimum Collateral Ratio
function CCR() external view returns (uint256)  // Critical Collateral Ratio
function MUSD_GAS_COMPENSATION() external view returns (uint256)
```

### Hint System

Liquity uses a sorted list of troves. To insert efficiently, callers must provide "hints" — the addresses of neighbors in the sorted list. Use `HintHelpers.getApproxHint()` off-chain then `SortedTroves.findInsertPosition()` for exact hints. For hackathon demo, using `address(0), address(0)` as hints works (less gas-efficient but functional).

---

## Passport — API-Based Identity

Mezo Passport is NOT an on-chain verification contract. It's an **off-chain identity API** (`api.test.mezo.org`).

### Account Lookup

```typescript
// Check if address has a Passport account
const account = await authApiClient.getAccountByMezoIdOrAddress(address);
// Returns account data or null if not found (404)
```

### React Hooks (from @mezo-org/passport)

```typescript
useGetAccountByAddress(address)     // Look up account by wallet address
useGetAccountByMezoId(mezoId)       // Look up by mezo.id (e.g., "alice.mezo")
useGetCurrentAccount()              // Get current signed-in account
useSignInWithWallet()               // Sign in to Passport
useSignUpWithWallet()               // Create Passport account
useBorrowData()                     // Read trove data for current user
useTokensBalances()                 // Token balances
useCollateralPrice()                // BTC/USD price from PriceFeed
```

### Important: Passport is a frontend/API concept

There is no `IMezoPassport.isVerified(address)` on-chain. For on-chain gating, the pattern would be:
1. Frontend checks Passport API to confirm beneficiary has an account
2. Contract relies on ownership/signature verification, not on-chain Passport state
3. OR: implement a simple on-chain registry that the frontend populates after Passport verification

---

## Mezo Earn — Not Found in SDK Packages

No explicit "Mezo Earn" contracts or interfaces found in:
- `@mezo-org/musd-contracts`
- `@mezo-org/mezod-contracts`
- `@mezo-org/passport`
- `@mezo-org/orangekit`

Mezo Earn appears to be a product-level feature of the Mezo portal, not a standalone SDK. The vault/strategy pattern may not be directly accessible for third-party contract integration on testnet.

**Recommendation:** For the hackathon, simulate yield accrual in the UI using BTC price changes + borrowing rate, rather than integrating with a nonexistent Earn SDK. Mention mainnet Earn integration in the roadmap.

---

## Open Questions

1. **Passport on-chain gating:** No on-chain Passport verification exists. Should we build a lightweight on-chain registry where verified Passport holders register, or handle this purely in the frontend?
2. **Mezo Earn integration:** No SDK found. Is this accessible on testnet or mainnet-only?
3. **Min net debt:** `BorrowerOperations.minNetDebt()` — what's the minimum MUSD that can be borrowed? Need to check this on-chain.
4. **Gas compensation:** `MUSD_GAS_COMPENSATION` — Liquity charges a gas compensation in MUSD. Need to account for this in debt calculations.
5. **Hint helpers:** For production, we'd use HintHelpers. For hackathon demo, `address(0)` hints should work.
