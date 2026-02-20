// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title SAFEVesting
 * @dev On-chain vesting for $SAFE team and treasury tokens.
 *
 * FIX for Test 3: "Les insiders ont-ils fini de vendre ?"
 *
 * Guarantees:
 * - 12-month cliff: ZERO tokens released before cliff
 * - 36-month linear vesting after cliff
 * - All parameters immutable after deployment (no owner override)
 * - Anyone can verify remaining locked amount on-chain
 * - Beneficiary can only claim vested tokens, never more
 *
 * Once deployed, NOBODY (not even the deployer) can:
 * - Change the vesting schedule
 * - Withdraw unvested tokens
 * - Accelerate the unlock
 */
contract SAFEVesting is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // =========================================
    // IMMUTABLE STATE (set once, never changed)
    // =========================================

    IERC20 public immutable token;
    address public immutable beneficiary;
    uint256 public immutable totalAllocation;
    uint256 public immutable startTimestamp;     // TGE date
    uint256 public immutable cliffDuration;      // 12 months
    uint256 public immutable vestingDuration;    // 36 months after cliff
    uint256 public immutable cliffEnd;           // startTimestamp + cliffDuration
    uint256 public immutable vestingEnd;         // cliffEnd + vestingDuration

    // =========================================
    // MUTABLE STATE
    // =========================================

    uint256 public totalClaimed;

    // =========================================
    // EVENTS
    // =========================================

    event TokensClaimed(
        address indexed beneficiary,
        uint256 amount,
        uint256 totalClaimed,
        uint256 remainingLocked
    );

    // =========================================
    // CONSTRUCTOR
    // =========================================

    /**
     * @param _token $SAFE token address
     * @param _beneficiary Team or treasury wallet
     * @param _totalAllocation Total tokens to vest (e.g. 20M for team)
     * @param _startTimestamp TGE date (token generation event)
     * @param _cliffMonths Months before first unlock (12)
     * @param _vestingMonths Months of linear unlock after cliff (36)
     */
    constructor(
        address _token,
        address _beneficiary,
        uint256 _totalAllocation,
        uint256 _startTimestamp,
        uint256 _cliffMonths,
        uint256 _vestingMonths
    ) {
        require(_token != address(0), "Invalid token");
        require(_beneficiary != address(0), "Invalid beneficiary");
        require(_totalAllocation > 0, "Zero allocation");
        require(_cliffMonths > 0, "Zero cliff");
        require(_vestingMonths > 0, "Zero vesting");

        token = IERC20(_token);
        beneficiary = _beneficiary;
        totalAllocation = _totalAllocation;
        startTimestamp = _startTimestamp;
        cliffDuration = _cliffMonths * 30 days;
        vestingDuration = _vestingMonths * 30 days;
        cliffEnd = _startTimestamp + (_cliffMonths * 30 days);
        vestingEnd = _startTimestamp + (_cliffMonths * 30 days) + (_vestingMonths * 30 days);
    }

    // =========================================
    // CLAIM
    // =========================================

    /**
     * @dev Claim vested tokens. Only beneficiary can call.
     * Returns the amount actually transferred.
     */
    function claim() external nonReentrant returns (uint256) {
        require(msg.sender == beneficiary, "Not beneficiary");

        uint256 vested = vestedAmount();
        uint256 claimable = vested - totalClaimed;
        require(claimable > 0, "Nothing to claim");

        totalClaimed += claimable;

        token.safeTransfer(beneficiary, claimable);

        emit TokensClaimed(
            beneficiary,
            claimable,
            totalClaimed,
            totalAllocation - totalClaimed
        );

        return claimable;
    }

    // =========================================
    // VIEW FUNCTIONS (public transparency)
    // =========================================

    /**
     * @dev Total tokens vested as of now (including already claimed).
     * Before cliff: 0
     * During vesting: linear between 0 and totalAllocation
     * After vesting end: totalAllocation
     */
    function vestedAmount() public view returns (uint256) {
        if (block.timestamp < cliffEnd) {
            return 0; // Before cliff: nothing
        }
        if (block.timestamp >= vestingEnd) {
            return totalAllocation; // After vesting: everything
        }
        // Linear vesting between cliffEnd and vestingEnd
        uint256 elapsed = block.timestamp - cliffEnd;
        return (totalAllocation * elapsed) / vestingDuration;
    }

    /**
     * @dev Tokens available to claim right now.
     */
    function claimableAmount() external view returns (uint256) {
        uint256 vested = vestedAmount();
        if (vested <= totalClaimed) return 0;
        return vested - totalClaimed;
    }

    /**
     * @dev Tokens still locked (not yet vested).
     */
    function lockedAmount() external view returns (uint256) {
        return totalAllocation - vestedAmount();
    }

    /**
     * @dev Percentage vested (basis points, 10000 = 100%).
     */
    function vestedPercentBps() external view returns (uint256) {
        if (totalAllocation == 0) return 0;
        return (vestedAmount() * 10000) / totalAllocation;
    }

    /**
     * @dev Full transparency: return all vesting info in one call.
     */
    function getVestingInfo() external view returns (
        address _beneficiary,
        uint256 _totalAllocation,
        uint256 _vestedAmount,
        uint256 _claimedAmount,
        uint256 _claimableNow,
        uint256 _lockedAmount,
        uint256 _startTimestamp,
        uint256 _cliffEnd,
        uint256 _vestingEnd,
        uint256 _percentVestedBps
    ) {
        uint256 vested = vestedAmount();
        uint256 claimable = vested > totalClaimed ? vested - totalClaimed : 0;

        return (
            beneficiary,
            totalAllocation,
            vested,
            totalClaimed,
            claimable,
            totalAllocation - vested,
            startTimestamp,
            cliffEnd,
            vestingEnd,
            totalAllocation > 0 ? (vested * 10000) / totalAllocation : 0
        );
    }
}
