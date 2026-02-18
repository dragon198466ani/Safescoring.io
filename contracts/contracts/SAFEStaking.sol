// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title SAFEStaking
 * @dev Staking contract for $SAFE tokens — PURE UTILITY MODEL.
 *
 * The $SAFE token is 100% autonomous. Zero subscription revenue goes to the token.
 * Platform EUR revenue = founder's income, completely separate.
 *
 * Why stake $SAFE?
 * → Access exclusive features NOT available via EUR subscription:
 *   - Raw evaluation data API
 *   - Early score access (48h before public)
 *   - Priority evaluation queue
 *   - Custom score alerts
 *
 * Why does the token gain value?
 * → DEMAND: People must BUY $SAFE on market to stake and access features
 * → BURN: When users spend $SAFE (via SAFEToken.spendAndBurn), 50% is burned
 * → SCARCITY: Emission halving (500K → 250K → 125K/month)
 *
 * No inflationary rewards. No revenue redistribution.
 * Pure utility + deflation = sustainable token model.
 *
 * Vote power: 1 person = 1 vote, always. Staking tier has zero effect on votes.
 */
contract SAFEStaking is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable safeToken;

    // =========================================
    // STAKING STATE
    // =========================================

    struct StakeInfo {
        uint256 amount;
        uint256 stakedAt;
    }

    struct UnstakeRequest {
        uint256 amount;
        uint256 unlockTime;
    }

    mapping(address => StakeInfo[]) public userStakes;
    mapping(address => UnstakeRequest[]) public unstakeRequests;
    mapping(address => uint256) public totalStakedByUser;

    uint256 public totalStaked;
    uint256 public totalStakers;

    // =========================================
    // TIER SYSTEM (feature access only)
    // =========================================

    uint256 public constant BRONZE_THRESHOLD   = 100 * 10**18;
    uint256 public constant SILVER_THRESHOLD   = 500 * 10**18;
    uint256 public constant GOLD_THRESHOLD     = 1_000 * 10**18;
    uint256 public constant PLATINUM_THRESHOLD = 2_500 * 10**18;
    uint256 public constant DIAMOND_THRESHOLD  = 5_000 * 10**18;

    uint256 public constant UNSTAKE_COOLDOWN = 7 days;
    uint256 public constant MIN_STAKE = 100 * 10**18;

    // =========================================
    // EVENTS
    // =========================================

    event Staked(address indexed user, uint256 amount, uint256 totalUserStaked);
    event UnstakeRequested(address indexed user, uint256 amount, uint256 unlockTime);
    event Withdrawn(address indexed user, uint256 amount);
    event TierChanged(address indexed user, uint8 newTier);

    // =========================================
    // CONSTRUCTOR
    // =========================================

    constructor(address _safeToken) Ownable(msg.sender) {
        require(_safeToken != address(0), "Invalid SAFE token");
        safeToken = IERC20(_safeToken);
    }

    // =========================================
    // STAKING
    // =========================================

    function stake(uint256 amount) external nonReentrant {
        require(amount >= MIN_STAKE, "Below minimum stake");

        safeToken.safeTransferFrom(msg.sender, address(this), amount);

        bool isNewStaker = totalStakedByUser[msg.sender] == 0;

        userStakes[msg.sender].push(StakeInfo({
            amount: amount,
            stakedAt: block.timestamp
        }));

        totalStakedByUser[msg.sender] += amount;
        totalStaked += amount;

        if (isNewStaker) {
            totalStakers++;
        }

        uint8 tier = getTier(msg.sender);
        emit TierChanged(msg.sender, tier);
        emit Staked(msg.sender, amount, totalStakedByUser[msg.sender]);
    }

    function requestUnstake(uint256 stakeIndex) external nonReentrant {
        require(stakeIndex < userStakes[msg.sender].length, "Invalid stake index");

        StakeInfo storage stakeInfo = userStakes[msg.sender][stakeIndex];
        require(stakeInfo.amount > 0, "Nothing to unstake");

        uint256 amount = stakeInfo.amount;
        uint256 unlockTime = block.timestamp + UNSTAKE_COOLDOWN;

        unstakeRequests[msg.sender].push(UnstakeRequest({
            amount: amount,
            unlockTime: unlockTime
        }));

        stakeInfo.amount = 0;
        totalStakedByUser[msg.sender] -= amount;
        totalStaked -= amount;

        uint8 tier = getTier(msg.sender);
        emit TierChanged(msg.sender, tier);
        emit UnstakeRequested(msg.sender, amount, unlockTime);
    }

    function withdraw() external nonReentrant {
        uint256 totalWithdraw = 0;
        UnstakeRequest[] storage requests = unstakeRequests[msg.sender];

        for (uint256 i = 0; i < requests.length; i++) {
            if (requests[i].unlockTime <= block.timestamp && requests[i].amount > 0) {
                totalWithdraw += requests[i].amount;
                requests[i].amount = 0;
            }
        }

        require(totalWithdraw > 0, "Nothing to withdraw");
        safeToken.safeTransfer(msg.sender, totalWithdraw);

        if (totalStakedByUser[msg.sender] == 0) {
            totalStakers--;
        }

        emit Withdrawn(msg.sender, totalWithdraw);
    }

    // =========================================
    // TIER (feature access only, NOT vote power)
    // =========================================
    // Vote power is always 1:1 (1 person = 1 vote) regardless of stake.
    // Tiers only affect: which exclusive features you can access.

    function getTier(address user) public view returns (uint8) {
        uint256 staked = totalStakedByUser[user];
        if (staked >= DIAMOND_THRESHOLD) return 5;
        if (staked >= PLATINUM_THRESHOLD) return 4;
        if (staked >= GOLD_THRESHOLD) return 3;
        if (staked >= SILVER_THRESHOLD) return 2;
        if (staked >= BRONZE_THRESHOLD) return 1;
        return 0;
    }

    // =========================================
    // VIEW FUNCTIONS
    // =========================================

    function getUserStakes(address user) external view returns (StakeInfo[] memory) {
        return userStakes[user];
    }

    function getUnstakeRequests(address user) external view returns (UnstakeRequest[] memory) {
        return unstakeRequests[user];
    }

    /**
     * @dev Get user's complete staking summary
     */
    function getUserSummary(address user) external view returns (
        uint256 stakedAmount,
        uint8 tier,
        uint256 stakeCount
    ) {
        return (
            totalStakedByUser[user],
            getTier(user),
            userStakes[user].length
        );
    }
}
