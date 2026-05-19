// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {KinVault} from "../contracts/KinVault.sol";

interface Vm {
    function prank(address account) external;
    function expectRevert(bytes calldata errorData) external;
    function warp(uint256 timestamp) external;
}

contract MockMUSD {
    string public constant name = "Mock MUSD";
    string public constant symbol = "MUSD";
    uint8 public constant decimals = 18;
    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 amount);
    event Approval(address indexed owner, address indexed spender, uint256 amount);

    function mint(address account, uint256 amount) external {
        balanceOf[account] += amount;
        totalSupply += amount;
        emit Transfer(address(0), account, amount);
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 allowed = allowance[from][msg.sender];
        require(allowed >= amount, "ALLOWANCE");
        allowance[from][msg.sender] = allowed - amount;
        _transfer(from, to, amount);
        return true;
    }

    function _transfer(address from, address to, uint256 amount) private {
        require(to != address(0), "TO_ZERO");
        require(balanceOf[from] >= amount, "BALANCE");
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
    }
}

contract KinVaultTest {
    Vm private constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    address private constant OWNER = address(0xA11CE);
    address private constant BENEFICIARY = address(0xB0B);
    address private constant NEXT_BENEFICIARY = address(0xCAFE);
    uint256 private constant HEARTBEAT_INTERVAL = 60;
    uint256 private constant RESERVE = 12_500 ether;

    MockMUSD private musd;
    KinVault private vault;

    function setUp() external {
        vm.warp(1_771_484_400);
        musd = new MockMUSD();
        musd.mint(OWNER, RESERVE);
        vault = new KinVault(OWNER, BENEFICIARY, address(musd), HEARTBEAT_INTERVAL);

        vm.prank(OWNER);
        musd.approve(address(vault), RESERVE);
    }

    function testOwnerFundsVault() external {
        vm.prank(OWNER);
        vault.deposit(RESERVE);

        require(vault.totalDeposited() == RESERVE, "total deposited mismatch");
        require(vault.vaultBalance() == RESERVE, "vault balance mismatch");
        require(musd.balanceOf(OWNER) == 0, "owner balance should be moved");
    }

    function testRejectsEarlyRelease() external {
        vm.prank(OWNER);
        vault.deposit(RESERVE);

        uint256 releaseAt = vault.releaseAt();
        vm.expectRevert(abi.encodeWithSelector(KinVault.HeartbeatStillActive.selector, releaseAt));
        vm.prank(BENEFICIARY);
        vault.releaseToBeneficiary();
    }

    function testBeneficiaryReleasesAfterMissedHeartbeat() external {
        vm.prank(OWNER);
        vault.deposit(RESERVE);

        vm.warp(vault.releaseAt());
        vm.prank(BENEFICIARY);
        vault.releaseToBeneficiary();

        require(vault.released(), "release flag missing");
        require(vault.vaultBalance() == 0, "vault should be empty");
        require(musd.balanceOf(BENEFICIARY) == RESERVE, "beneficiary did not receive reserve");
    }

    function testHeartbeatExtendsReleaseWindow() external {
        vm.prank(OWNER);
        vault.deposit(RESERVE);

        vm.warp(vault.releaseAt() - 1);
        vm.prank(OWNER);
        vault.heartbeat();

        uint256 extendedReleaseAt = vault.releaseAt();
        vm.expectRevert(abi.encodeWithSelector(KinVault.HeartbeatStillActive.selector, extendedReleaseAt));
        vm.prank(BENEFICIARY);
        vault.releaseToBeneficiary();

        vm.warp(extendedReleaseAt);
        vm.prank(BENEFICIARY);
        vault.releaseToBeneficiary();

        require(musd.balanceOf(BENEFICIARY) == RESERVE, "extended release failed");
    }

    function testOnlyOwnerCanRotateBeneficiary() external {
        vm.expectRevert(abi.encodeWithSelector(KinVault.NotOwner.selector));
        vm.prank(BENEFICIARY);
        vault.updateBeneficiary(NEXT_BENEFICIARY);

        vm.prank(OWNER);
        vault.updateBeneficiary(NEXT_BENEFICIARY);

        require(vault.beneficiary() == NEXT_BENEFICIARY, "beneficiary not updated");
    }
}
