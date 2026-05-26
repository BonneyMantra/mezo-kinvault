// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {KinVault} from "./KinVault.sol";

contract KinVaultFactory {
    event VaultCreated(address indexed owner, address vault, uint256 heartbeatInterval);

    address public immutable borrowerOps;
    address public immutable priceFeed;
    address public immutable musd;
    address public immutable mezo;
    uint16 public immutable defaultKeeperBps;

    address[] public allVaults;
    mapping(address => address[]) public vaultsByOwner;

    constructor(
        address borrowerOps_,
        address priceFeed_,
        address musd_,
        address mezo_,
        uint16 defaultKeeperBps_
    ) {
        borrowerOps = borrowerOps_;
        priceFeed = priceFeed_;
        musd = musd_;
        mezo = mezo_;
        defaultKeeperBps = defaultKeeperBps_;
    }

    function createVault(uint256 heartbeatInterval) external returns (address) {
        return createVaultFor(msg.sender, heartbeatInterval);
    }

    function createVaultFor(address owner_, uint256 heartbeatInterval) public returns (address) {
        KinVault vault = new KinVault(
            owner_,
            borrowerOps,
            priceFeed,
            musd,
            mezo,
            heartbeatInterval,
            defaultKeeperBps
        );
        address v = address(vault);
        allVaults.push(v);
        vaultsByOwner[owner_].push(v);
        emit VaultCreated(owner_, v, heartbeatInterval);
        return v;
    }

    function getVaultsByOwner(address owner) external view returns (address[] memory) {
        return vaultsByOwner[owner];
    }

    function vaultCount() external view returns (uint256) {
        return allVaults.length;
    }

    function getVault(uint256 index) external view returns (address) {
        return allVaults[index];
    }
}
