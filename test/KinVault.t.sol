// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {KinVault} from "../contracts/KinVault.sol";

interface Vm {
    function prank(address) external;
    function startPrank(address) external;
    function stopPrank() external;
    function deal(address, uint256) external;
    function warp(uint256) external;
    function expectRevert(bytes4) external;
    function expectRevert(bytes memory) external;
}

contract MockMUSD {
    string public name = "Mock MUSD";
    uint8 public decimals = 18;
    mapping(address => uint256) public balanceOf;
    address public minter;

    constructor() {
        minter = msg.sender;
    }

    function setMinter(address m) external {
        minter = m;
    }

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        require(balanceOf[msg.sender] >= amount, "insufficient");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        require(balanceOf[from] >= amount, "insufficient");
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        return true;
    }
}

contract MockBorrowerOperations {
    MockMUSD public musdToken;
    uint256 public constant BORROWING_RATE = 1000000000000000; // 0.1%
    uint256 public constant MIN_NET_DEBT_VAL = 1800 ether;
    uint256 public constant GAS_COMP = 200 ether;

    constructor(address musd_) {
        musdToken = MockMUSD(musd_);
    }

    function openTrove(uint256 _debtAmount, address, address) external payable {
        require(_debtAmount >= MIN_NET_DEBT_VAL, "below min debt");
        musdToken.mint(msg.sender, _debtAmount);
    }

    function minNetDebt() external pure returns (uint256) {
        return MIN_NET_DEBT_VAL;
    }

    function MUSD_GAS_COMPENSATION() external pure returns (uint256) {
        return GAS_COMP;
    }

    function getBorrowingFee(uint256 _debt) external pure returns (uint256) {
        return (_debt * BORROWING_RATE) / 1e18;
    }

    function MCR() external pure returns (uint256) {
        return 1100000000000000000;
    }

    function borrowingRate() external pure returns (uint256) {
        return BORROWING_RATE;
    }
}

contract MockPriceFeed {
    uint256 public price;

    constructor(uint256 price_) {
        price = price_;
    }

    function setPrice(uint256 price_) external {
        price = price_;
    }

    function fetchPrice() external view returns (uint256) {
        return price;
    }
}

contract KinVaultTest {
    Vm private constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    address constant OWNER = address(0xA11cE);
    address constant BEN_A = address(0xBA);
    address constant BEN_B = address(0xBB);
    address constant BEN_C = address(0xBC);
    address constant ANYONE = address(0xD00D);

    MockMUSD musd;
    MockBorrowerOperations borrowerOps;
    MockPriceFeed priceFeed;
    KinVault vault;

    uint256 constant BTC_PRICE = 76830e18;
    uint256 constant HEARTBEAT = 60;
    uint256 constant DEPOSIT = 0.04 ether;

    function setUp() public {
        vm.warp(1_771_484_400);

        musd = new MockMUSD();
        priceFeed = new MockPriceFeed(BTC_PRICE);
        borrowerOps = new MockBorrowerOperations(address(musd));

        vm.prank(OWNER);
        vault = new KinVault(
            OWNER,
            address(borrowerOps),
            address(priceFeed),
            address(musd),
            HEARTBEAT
        );
    }

    function testOwnerDepositsBTC() public {
        vm.deal(OWNER, DEPOSIT);
        vm.prank(OWNER);
        vault.deposit{value: DEPOSIT}();

        require(vault.vaultBalance() == DEPOSIT, "balance mismatch");
    }

    function testAddMultipleBeneficiaries() public {
        vm.startPrank(OWNER);
        vault.addBeneficiary(BEN_A, 5000);
        vault.addBeneficiary(BEN_B, 3000);
        vault.addBeneficiary(BEN_C, 2000);
        vm.stopPrank();

        require(vault.totalBps() == 10000, "totalBps mismatch");
        require(vault.beneficiaryCount() == 3, "count mismatch");

        (address a, uint16 bpsA) = vault.getBeneficiary(0);
        require(a == BEN_A && bpsA == 5000, "ben A mismatch");
    }

    function testRejectBpsOverflow() public {
        vm.startPrank(OWNER);
        vault.addBeneficiary(BEN_A, 6000);
        vm.expectRevert(KinVault.BpsOverflow.selector);
        vault.addBeneficiary(BEN_B, 5000);
        vm.stopPrank();
    }

    function testRejectEarlyRelease() public {
        _fundAndSetupBeneficiaries();

        uint256 releaseTime = vault.releaseAt();
        vm.expectRevert(abi.encodeWithSelector(KinVault.HeartbeatStillActive.selector, releaseTime));
        vault.release();
    }

    function testRejectReleaseWithIncompleteBps() public {
        vm.deal(OWNER, DEPOSIT);
        vm.startPrank(OWNER);
        vault.deposit{value: DEPOSIT}();
        vault.addBeneficiary(BEN_A, 5000);
        vm.stopPrank();

        vm.warp(vault.releaseAt());
        vm.expectRevert(KinVault.BpsIncomplete.selector);
        vault.release();
    }

    function testSuccessfulRelease() public {
        _fundAndSetupBeneficiaries();

        vm.warp(vault.releaseAt());

        vm.prank(ANYONE);
        vault.release();

        require(vault.released(), "not released");

        uint256 balA = musd.balanceOf(BEN_A);
        uint256 balB = musd.balanceOf(BEN_B);
        uint256 balC = musd.balanceOf(BEN_C);

        require(balA > 0 && balB > 0 && balC > 0, "zero balances");
        require(balA > balB, "A should get more than B");
        require(balB > balC, "B should get more than C");

        uint256 total = balA + balB + balC;
        uint256 expectedA = (total * 5000) / 10000;
        uint256 expectedB = (total * 3000) / 10000;
        require(_withinDust(balA, expectedA), "A share wrong");
        require(_withinDust(balB, expectedB), "B share wrong");
    }

    function testHeartbeatExtendsWindow() public {
        _fundAndSetupBeneficiaries();

        vm.warp(vault.releaseAt() - 1);

        vm.prank(OWNER);
        vault.heartbeat();

        uint256 newRelease = vault.releaseAt();
        vm.expectRevert(abi.encodeWithSelector(KinVault.HeartbeatStillActive.selector, newRelease));
        vault.release();

        vm.warp(newRelease);
        vm.prank(ANYONE);
        vault.release();
        require(vault.released(), "not released after extended heartbeat");
    }

    function testDoubleReleaseReverts() public {
        _fundAndSetupBeneficiaries();
        vm.warp(vault.releaseAt());
        vault.release();

        vm.expectRevert(KinVault.AlreadyReleased.selector);
        vault.release();
    }

    function testNonOwnerCannotAddBeneficiary() public {
        vm.prank(BEN_A);
        vm.expectRevert(KinVault.NotOwner.selector);
        vault.addBeneficiary(BEN_B, 5000);
    }

    function testAnyoneCanTriggerRelease() public {
        _fundAndSetupBeneficiaries();
        vm.warp(vault.releaseAt());

        vm.prank(ANYONE);
        vault.release();
        require(vault.released(), "anyone should trigger release");
    }

    function _fundAndSetupBeneficiaries() internal {
        vm.deal(OWNER, DEPOSIT);
        vm.startPrank(OWNER);
        vault.deposit{value: DEPOSIT}();
        vault.addBeneficiary(BEN_A, 5000);
        vault.addBeneficiary(BEN_B, 3000);
        vault.addBeneficiary(BEN_C, 2000);
        vm.stopPrank();
    }

    function _withinDust(uint256 a, uint256 b) internal pure returns (bool) {
        if (a > b) return a - b <= 1;
        return b - a <= 1;
    }
}
