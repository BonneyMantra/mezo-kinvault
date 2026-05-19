// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IERC20Like {
    function balanceOf(address account) external view returns (uint256);
}

contract KinVault {
    error InvalidAddress();
    error InvalidInterval();
    error InvalidAmount();
    error NotOwner();
    error NotBeneficiary();
    error AlreadyReleased();
    error HeartbeatStillActive(uint256 releaseAt);
    error EmptyVault();
    error TokenTransferFailed();

    event VaultFunded(address indexed owner, uint256 amount, uint256 totalDeposited);
    event Heartbeat(address indexed owner, uint256 at);
    event BeneficiaryUpdated(address indexed previousBeneficiary, address indexed nextBeneficiary);
    event BeneficiaryReleased(address indexed beneficiary, uint256 amount, uint256 releasedAt);

    address public immutable owner;
    address public beneficiary;
    address public immutable asset;
    uint256 public immutable heartbeatInterval;
    uint256 public lastHeartbeatAt;
    uint256 public totalDeposited;
    bool public released;

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyBeneficiary() {
        if (msg.sender != beneficiary) revert NotBeneficiary();
        _;
    }

    modifier notReleased() {
        if (released) revert AlreadyReleased();
        _;
    }

    constructor(address owner_, address beneficiary_, address asset_, uint256 heartbeatInterval_) {
        if (owner_ == address(0) || beneficiary_ == address(0) || asset_ == address(0)) {
            revert InvalidAddress();
        }
        if (heartbeatInterval_ == 0) revert InvalidInterval();

        owner = owner_;
        beneficiary = beneficiary_;
        asset = asset_;
        heartbeatInterval = heartbeatInterval_;
        lastHeartbeatAt = block.timestamp;

        emit Heartbeat(owner_, block.timestamp);
    }

    function deposit(uint256 amount) external onlyOwner notReleased {
        if (amount == 0) revert InvalidAmount();

        totalDeposited += amount;
        _safeTokenCall(abi.encodeWithSignature("transferFrom(address,address,uint256)", msg.sender, address(this), amount));

        emit VaultFunded(msg.sender, amount, totalDeposited);
    }

    function heartbeat() external onlyOwner notReleased {
        lastHeartbeatAt = block.timestamp;
        emit Heartbeat(msg.sender, block.timestamp);
    }

    function updateBeneficiary(address nextBeneficiary) external onlyOwner notReleased {
        if (nextBeneficiary == address(0)) revert InvalidAddress();

        address previousBeneficiary = beneficiary;
        beneficiary = nextBeneficiary;

        emit BeneficiaryUpdated(previousBeneficiary, nextBeneficiary);
    }

    function releaseToBeneficiary() external onlyBeneficiary notReleased {
        uint256 releaseTime = lastHeartbeatAt + heartbeatInterval;
        if (block.timestamp < releaseTime) revert HeartbeatStillActive(releaseTime);

        uint256 balance = vaultBalance();
        if (balance == 0) revert EmptyVault();

        released = true;
        _safeTokenCall(abi.encodeWithSignature("transfer(address,uint256)", beneficiary, balance));

        emit BeneficiaryReleased(beneficiary, balance, block.timestamp);
    }

    function canRelease() external view returns (bool) {
        return !released && block.timestamp >= lastHeartbeatAt + heartbeatInterval;
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
        return IERC20Like(asset).balanceOf(address(this));
    }

    function _safeTokenCall(bytes memory callData) private {
        (bool success, bytes memory returnData) = asset.call(callData);
        if (!success) revert TokenTransferFailed();
        if (returnData.length > 0 && !abi.decode(returnData, (bool))) revert TokenTransferFailed();
    }
}
