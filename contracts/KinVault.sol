// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IBorrowerOperations {
    function openTrove(uint256 _debtAmount, address _upperHint, address _lowerHint) external payable;
    function minNetDebt() external view returns (uint256);
    function MUSD_GAS_COMPENSATION() external view returns (uint256);
    function getBorrowingFee(uint256 _debt) external view returns (uint256);
    function MCR() external view returns (uint256);
    function borrowingRate() external view returns (uint256);
}

interface IPriceFeed {
    function fetchPrice() external returns (uint256);
}

interface IERC20 {
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

/// @title KinVault — Bitcoin beneficiary rehearsal + emergency MUSD liquidity on Mezo
/// @notice An owner locks BTC, names beneficiaries, and keeps a heartbeat alive.
///         If the heartbeat lapses, anyone can trigger release: the vault borrows
///         MUSD against the BTC via Mezo BorrowerOperations and distributes it to
///         beneficiaries. An optional MEZO bond rewards the keeper who triggers
///         release and tops up beneficiaries. Beneficiaries can rehearse their
///         claim on-chain at any time to prove readiness.
contract KinVault {
    error InvalidAddress();
    error InvalidInterval();
    error InvalidBps();
    error BpsOverflow();
    error BpsIncomplete();
    error NotOwner();
    error AlreadyReleased();
    error HeartbeatStillActive(uint256 releaseAt);
    error EmptyVault();
    error InsufficientCollateral();
    error TransferFailed();
    error BeneficiaryExists();
    error NoBeneficiaries();
    error NotBeneficiary();
    error ZeroAmount();

    struct Beneficiary {
        address addr;
        uint16 bps;
    }

    event Deposited(address indexed owner, uint256 amount, uint256 totalBalance);
    event Heartbeat(address indexed owner, uint256 at);
    event BeneficiaryAdded(address indexed addr, uint16 bps, uint256 index);
    event BeneficiaryRemoved(address indexed addr, uint16 bps, uint256 index);
    event TroveOpened(uint256 collateral, uint256 debtBorrowed, uint256 musdReceived);
    event InheritanceMUSDDistributed(address indexed beneficiary, uint256 amount, uint16 bps);
    event VaultReleased(uint256 totalMUSD, uint256 beneficiaryCount, uint256 releasedAt);
    // MEZO utility
    event MezoBondFunded(address indexed owner, uint256 amount, uint256 totalBond);
    event MezoKeeperRewardPaid(address indexed keeper, uint256 amount);
    event MezoBeneficiaryRewardPaid(address indexed beneficiary, uint256 amount, uint16 bps);
    // Rehearsal
    event BeneficiaryRehearsed(address indexed beneficiary, uint256 at, uint16 bps);

    address public immutable owner;
    IBorrowerOperations public immutable borrowerOps;
    IPriceFeed public immutable priceFeed;
    IERC20 public immutable musd;
    IERC20 public immutable mezo;
    uint256 public immutable heartbeatInterval;
    /// @notice Portion of the MEZO bond paid to whoever triggers release (basis points).
    uint16 public immutable keeperRewardBps;

    uint256 public lastHeartbeatAt;
    bool public released;
    Beneficiary[] public beneficiaries;
    uint256 public totalBps;

    /// @notice MEZO tokens locked as a keeper/beneficiary bond.
    uint256 public mezoBond;
    /// @notice Last time each beneficiary rehearsed their claim. 0 = never.
    mapping(address => uint256) public rehearsalAt;

    uint256 private constant PRECISION = 1e18;
    uint256 private constant BPS_BASE = 10000;
    // 130% collateral ratio — above 110% MCR with safety margin
    uint256 private constant SAFETY_CR = 13e17;

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier notReleased() {
        if (released) revert AlreadyReleased();
        _;
    }

    constructor(
        address owner_,
        address borrowerOps_,
        address priceFeed_,
        address musd_,
        address mezo_,
        uint256 heartbeatInterval_,
        uint16 keeperRewardBps_
    ) {
        if (
            owner_ == address(0) || borrowerOps_ == address(0) || priceFeed_ == address(0) || musd_ == address(0)
                || mezo_ == address(0)
        ) {
            revert InvalidAddress();
        }
        if (heartbeatInterval_ == 0) revert InvalidInterval();
        if (keeperRewardBps_ > uint16(BPS_BASE)) revert InvalidBps();

        owner = owner_;
        borrowerOps = IBorrowerOperations(borrowerOps_);
        priceFeed = IPriceFeed(priceFeed_);
        musd = IERC20(musd_);
        mezo = IERC20(mezo_);
        heartbeatInterval = heartbeatInterval_;
        keeperRewardBps = keeperRewardBps_;
        lastHeartbeatAt = block.timestamp;

        emit Heartbeat(owner_, block.timestamp);
    }

    receive() external payable onlyOwner notReleased {
        emit Deposited(msg.sender, msg.value, address(this).balance);
    }

    function deposit() external payable onlyOwner notReleased {
        if (msg.value == 0) revert EmptyVault();
        emit Deposited(msg.sender, msg.value, address(this).balance);
    }

    function heartbeat() external onlyOwner notReleased {
        lastHeartbeatAt = block.timestamp;
        emit Heartbeat(msg.sender, block.timestamp);
    }

    /// @notice Owner funds a MEZO bond. Owner must approve this contract for `amount` first.
    function fundMezoBond(uint256 amount) external onlyOwner notReleased {
        if (amount == 0) revert ZeroAmount();
        bool ok = mezo.transferFrom(msg.sender, address(this), amount);
        if (!ok) revert TransferFailed();
        mezoBond += amount;
        emit MezoBondFunded(msg.sender, amount, mezoBond);
    }

    function addBeneficiary(address addr_, uint16 bps_) external onlyOwner notReleased {
        if (addr_ == address(0)) revert InvalidAddress();
        if (bps_ == 0 || bps_ > uint16(BPS_BASE)) revert InvalidBps();
        if (totalBps + bps_ > BPS_BASE) revert BpsOverflow();

        for (uint256 i; i < beneficiaries.length; i++) {
            if (beneficiaries[i].addr == addr_) revert BeneficiaryExists();
        }

        beneficiaries.push(Beneficiary(addr_, bps_));
        totalBps += bps_;

        emit BeneficiaryAdded(addr_, bps_, beneficiaries.length - 1);
    }

    function removeBeneficiary(uint256 index) external onlyOwner notReleased {
        uint256 len = beneficiaries.length;
        if (index >= len) revert InvalidBps();

        Beneficiary memory removed = beneficiaries[index];
        totalBps -= removed.bps;

        beneficiaries[index] = beneficiaries[len - 1];
        beneficiaries.pop();

        emit BeneficiaryRemoved(removed.addr, removed.bps, index);
    }

    /// @notice A configured beneficiary rehearses their claim on-chain to prove readiness.
    ///         Does not move funds; records a timestamp and emits an event.
    function rehearseClaim() external returns (uint16 bps) {
        (bool found, uint16 b) = _beneficiaryBps(msg.sender);
        if (!found) revert NotBeneficiary();
        rehearsalAt[msg.sender] = block.timestamp;
        emit BeneficiaryRehearsed(msg.sender, block.timestamp, b);
        return b;
    }

    function release() external notReleased {
        uint256 releaseTime = lastHeartbeatAt + heartbeatInterval;
        if (block.timestamp < releaseTime) revert HeartbeatStillActive(releaseTime);
        if (totalBps != BPS_BASE) revert BpsIncomplete();

        uint256 collateral = address(this).balance;
        if (collateral == 0) revert EmptyVault();

        uint256 len = beneficiaries.length;
        if (len == 0) revert NoBeneficiaries();

        uint256 price = priceFeed.fetchPrice();
        uint256 netDebt = _computeNetDebt(collateral, price);

        uint256 minDebt = borrowerOps.minNetDebt();
        if (netDebt < minDebt) revert InsufficientCollateral();

        released = true;

        borrowerOps.openTrove{value: collateral}(netDebt, address(0), address(0));

        uint256 musdBalance = musd.balanceOf(address(this));
        emit TroveOpened(collateral, netDebt, musdBalance);

        uint256 distributed;
        for (uint256 i; i < len; i++) {
            uint256 share = (i == len - 1)
                ? musdBalance - distributed
                : (musdBalance * beneficiaries[i].bps) / BPS_BASE;

            bool ok = musd.transfer(beneficiaries[i].addr, share);
            if (!ok) revert TransferFailed();

            distributed += share;
            emit InheritanceMUSDDistributed(beneficiaries[i].addr, share, beneficiaries[i].bps);
        }

        emit VaultReleased(distributed, len, block.timestamp);

        _payMezoRewards(len);
    }

    /// @dev Pays the keeper (msg.sender) a portion of the MEZO bond, then splits
    ///      the remainder among beneficiaries by BPS. No-op if the bond is empty.
    function _payMezoRewards(uint256 len) internal {
        uint256 bond = mezoBond;
        if (bond == 0) return;
        mezoBond = 0;

        uint256 keeperReward = (bond * keeperRewardBps) / BPS_BASE;
        if (keeperReward > 0) {
            bool ok = mezo.transfer(msg.sender, keeperReward);
            if (!ok) revert TransferFailed();
            emit MezoKeeperRewardPaid(msg.sender, keeperReward);
        }

        uint256 remaining = bond - keeperReward;
        if (remaining == 0) return;

        uint256 paid;
        for (uint256 i; i < len; i++) {
            uint256 share =
                (i == len - 1) ? remaining - paid : (remaining * beneficiaries[i].bps) / BPS_BASE;
            if (share > 0) {
                bool ok = mezo.transfer(beneficiaries[i].addr, share);
                if (!ok) revert TransferFailed();
                emit MezoBeneficiaryRewardPaid(beneficiaries[i].addr, share, beneficiaries[i].bps);
                paid += share;
            }
        }
    }

    function _computeNetDebt(uint256 collateral, uint256 price) internal view returns (uint256) {
        uint256 maxTotalDebt = (collateral * price) / SAFETY_CR;
        uint256 gasComp = borrowerOps.MUSD_GAS_COMPENSATION();
        uint256 rate = borrowerOps.borrowingRate();

        if (maxTotalDebt <= gasComp) revert InsufficientCollateral();

        uint256 maxNetBeforeFee = maxTotalDebt - gasComp;
        uint256 netDebt = (maxNetBeforeFee * PRECISION) / (PRECISION + rate);

        return netDebt;
    }

    function _beneficiaryBps(address who) internal view returns (bool found, uint16 bps) {
        uint256 len = beneficiaries.length;
        for (uint256 i; i < len; i++) {
            if (beneficiaries[i].addr == who) return (true, beneficiaries[i].bps);
        }
        return (false, 0);
    }

    // ─── Views ───────────────────────────────────────────────────────────

    function isBeneficiary(address who) external view returns (bool) {
        (bool found,) = _beneficiaryBps(who);
        return found;
    }

    function beneficiaryBps(address who) external view returns (uint16) {
        (, uint16 bps) = _beneficiaryBps(who);
        return bps;
    }

    function hasRehearsed(address who) external view returns (bool) {
        return rehearsalAt[who] != 0;
    }

    function canRelease() external view returns (bool) {
        return !released && block.timestamp >= lastHeartbeatAt + heartbeatInterval && totalBps == BPS_BASE
            && address(this).balance > 0;
    }

    function releaseAt() public view returns (uint256) {
        return lastHeartbeatAt + heartbeatInterval;
    }

    function secondsUntilRelease() external view returns (uint256) {
        uint256 releaseTime = releaseAt();
        if (block.timestamp >= releaseTime) return 0;
        return releaseTime - block.timestamp;
    }

    function vaultBalance() public view returns (uint256) {
        return address(this).balance;
    }

    function beneficiaryCount() external view returns (uint256) {
        return beneficiaries.length;
    }

    function getBeneficiary(uint256 index) external view returns (address addr, uint16 bps) {
        Beneficiary memory b = beneficiaries[index];
        return (b.addr, b.bps);
    }

    function estimateMUSD(uint256 price) external view returns (uint256) {
        uint256 collateral = address(this).balance;
        if (collateral == 0) return 0;
        return _computeNetDebt(collateral, price);
    }
}
