// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {KinVault} from "../contracts/KinVault.sol";

interface ScriptVm {
    function addr(uint256 privateKey) external returns (address);
    function envUint(string calldata key) external returns (uint256);
    function envAddress(string calldata key) external returns (address);
    function envOr(string calldata key, address defaultValue) external returns (address);
    function envOr(string calldata key, uint256 defaultValue) external returns (uint256);
    function startBroadcast(uint256 privateKey) external;
    function stopBroadcast() external;
    function serializeAddress(string calldata objectKey, string calldata valueKey, address value)
        external
        returns (string memory);
    function serializeUint(string calldata objectKey, string calldata valueKey, uint256 value)
        external
        returns (string memory);
    function serializeString(string calldata objectKey, string calldata valueKey, string calldata value)
        external
        returns (string memory);
    function writeJson(string calldata json, string calldata path) external;
}

contract DeployMezo {
    ScriptVm private constant vm = ScriptVm(address(uint160(uint256(keccak256("hevm cheat code")))));

    address private constant DEFAULT_MEZO_TESTNET_MUSD = 0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503;
    uint256 private constant DEFAULT_HEARTBEAT_INTERVAL = 60;

    function run() external returns (KinVault vault) {
        uint256 privateKey = vm.envUint("MEZO_PRIVATE_KEY");
        address owner = vm.addr(privateKey);
        address beneficiary = vm.envAddress("MEZO_BENEFICIARY");
        address asset = vm.envOr("MEZO_MUSD", DEFAULT_MEZO_TESTNET_MUSD);
        uint256 heartbeatInterval = vm.envOr("MEZO_HEARTBEAT_INTERVAL", DEFAULT_HEARTBEAT_INTERVAL);

        vm.startBroadcast(privateKey);
        vault = new KinVault(owner, beneficiary, asset, heartbeatInterval);
        vm.stopBroadcast();

        string memory root = "deployment";
        vm.serializeString(root, "network", "mezo-testnet");
        vm.serializeUint(root, "chainId", 31611);
        vm.serializeAddress(root, "owner", owner);
        vm.serializeAddress(root, "beneficiary", beneficiary);
        vm.serializeAddress(root, "asset", asset);
        vm.serializeUint(root, "heartbeatInterval", heartbeatInterval);
        string memory json = vm.serializeAddress(root, "vault", address(vault));
        vm.writeJson(json, "outputs/proofs/mezo-deployment.json");
    }
}
