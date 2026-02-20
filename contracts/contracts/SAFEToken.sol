// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SAFEToken
 * @dev $SAFE Token for SafeScoring platform — AUTONOMOUS TOKEN MODEL
 *
 * The token is 100% independent from EUR subscription revenue.
 * EUR subscriptions = founder's income. Token = separate economy.
 *
 * Tokenomics:
 * - Total Supply: 100,000,000 SAFE (100M) - FIXED, no inflation
 * - Decimals: 18
 *
 * Distribution:
 * - 40% Community Rewards (earn via platform usage, halving schedule)
 * - 20% Treasury (development, locked via SAFEVesting: 6mo cliff + 24mo linear)
 * - 20% Team (locked via SAFEVesting: 12mo cliff + 36mo linear)
 * - 10% Initial Liquidity
 * - 10% Reserve (future use)
 *
 * How $SAFE gains value without subscription revenue:
 * 1. DEMAND: Exclusive features (raw API, early access, priority eval, alerts)
 *    → Only accessible by staking $SAFE → users must BUY on market
 * 2. BURN: spendAndBurn() → 50% permanently burned, 50% recycled
 *    → Every usage reduces circulating supply
 * 3. SCARCITY: Emission halving (500K/month → 250K → 125K → ...)
 *    → New supply decreases over time
 * 4. VESTING: Team/Treasury locked on-chain → no insider dump
 */
contract SAFEToken is ERC20, ERC20Burnable, Ownable {
    uint256 public constant MAX_SUPPLY = 100_000_000 * 10**18;

    // =========================================
    // ALLOCATION CONSTANTS
    // =========================================

    uint256 public constant COMMUNITY_ALLOCATION = 40_000_000 * 10**18;  // 40%
    uint256 public constant TREASURY_ALLOCATION  = 20_000_000 * 10**18;  // 20%
    uint256 public constant TEAM_ALLOCATION      = 20_000_000 * 10**18;  // 20%
    uint256 public constant LIQUIDITY_ALLOCATION = 10_000_000 * 10**18;  // 10%
    uint256 public constant RESERVE_ALLOCATION   = 10_000_000 * 10**18;  // 10%

    // =========================================
    // VESTING CONTRACTS (immutable after set)
    // =========================================

    address public teamVestingContract;
    address public treasuryVestingContract;
    bool public vestingContractsLocked; // Once true, cannot change

    // =========================================
    // DISTRIBUTION WALLETS
    // =========================================

    address public communityRewardsWallet;
    address public liquidityWallet;

    // =========================================
    // MINTED TRACKING
    // =========================================

    uint256 public communityMinted;
    uint256 public treasuryMinted;
    uint256 public teamMinted;
    uint256 public liquidityMinted;

    // =========================================
    // BURN TRACKING (spend burn only — autonomous model)
    // =========================================

    uint256 public totalEmitted;             // Total community tokens emitted
    uint256 public totalSpendBurned;         // Tokens burned from user spending (50%)

    // Monthly tracking for burn/emission ratio
    struct MonthlyStats {
        uint256 emitted;      // Tokens emitted this month
        uint256 burned;       // Tokens burned this month (spend only)
        uint256 timestamp;    // When this month started
    }
    MonthlyStats[] public monthlyStats;

    // =========================================
    // EMISSION HALVING (deflationary schedule)
    // =========================================

    uint256 public constant INITIAL_MONTHLY_CAP = 500_000 * 10**18; // 500K/month max
    uint256 public constant HALVING_INTERVAL = 365 days;            // Halve yearly
    uint256 public deployTimestamp;
    uint256 public monthlyEmitted; // Current month emissions
    uint256 public lastMonthReset;

    // =========================================
    // RECYCLING
    // =========================================

    uint256 public recycledPool;

    // =========================================
    // EVENTS
    // =========================================

    event TeamTokensMintedToVesting(address indexed vestingContract, uint256 amount);
    event TreasuryTokensMintedToVesting(address indexed vestingContract, uint256 amount);
    event CommunityRewardsMinted(address indexed to, uint256 amount);
    event SpendBurned(address indexed user, uint256 spent, uint256 burned, uint256 recycled);
    event VestingContractsLocked(address team, address treasury);
    event MonthlyStatsRecorded(uint256 month, uint256 emitted, uint256 burned);

    // =========================================
    // CONSTRUCTOR
    // =========================================

    constructor(
        address _communityRewardsWallet,
        address _liquidityWallet
    ) ERC20("SafeScoring Token", "SAFE") Ownable(msg.sender) {
        require(_communityRewardsWallet != address(0), "Invalid community wallet");
        require(_liquidityWallet != address(0), "Invalid liquidity wallet");

        communityRewardsWallet = _communityRewardsWallet;
        liquidityWallet = _liquidityWallet;
        deployTimestamp = block.timestamp;
        lastMonthReset = block.timestamp;

        // Only mint liquidity at deployment — everything else goes through vesting
        _mint(_liquidityWallet, LIQUIDITY_ALLOCATION);
        liquidityMinted = LIQUIDITY_ALLOCATION;

        // Initialize first month stats
        monthlyStats.push(MonthlyStats({
            emitted: 0,
            burned: 0,
            timestamp: block.timestamp
        }));
    }

    // =========================================
    // VESTING SETUP (one-time, then locked forever)
    // =========================================

    /**
     * @dev Set vesting contracts and lock them permanently.
     * Team and treasury tokens can ONLY be minted to these contracts.
     * This function can only be called ONCE.
     */
    function setAndLockVestingContracts(
        address _teamVesting,
        address _treasuryVesting
    ) external onlyOwner {
        require(!vestingContractsLocked, "Already locked");
        require(_teamVesting != address(0), "Invalid team vesting");
        require(_treasuryVesting != address(0), "Invalid treasury vesting");

        teamVestingContract = _teamVesting;
        treasuryVestingContract = _treasuryVesting;
        vestingContractsLocked = true;

        emit VestingContractsLocked(_teamVesting, _treasuryVesting);
    }

    /**
     * @dev Mint team tokens ONLY to the vesting contract. Not to a wallet.
     */
    function mintToTeamVesting(uint256 amount) external onlyOwner {
        require(vestingContractsLocked, "Vesting not configured");
        require(teamMinted + amount <= TEAM_ALLOCATION, "Exceeds team allocation");

        teamMinted += amount;
        _mint(teamVestingContract, amount);

        emit TeamTokensMintedToVesting(teamVestingContract, amount);
    }

    /**
     * @dev Mint treasury tokens ONLY to the vesting contract.
     */
    function mintToTreasuryVesting(uint256 amount) external onlyOwner {
        require(vestingContractsLocked, "Vesting not configured");
        require(treasuryMinted + amount <= TREASURY_ALLOCATION, "Exceeds treasury allocation");

        treasuryMinted += amount;
        _mint(treasuryVestingContract, amount);

        emit TreasuryTokensMintedToVesting(treasuryVestingContract, amount);
    }

    // =========================================
    // COMMUNITY REWARDS (with emission cap + halving)
    // =========================================

    /**
     * @dev Mint community rewards with monthly emission cap.
     * Cap halves every year to create decreasing emission.
     */
    function mintCommunityRewards(address to, uint256 amount) external onlyOwner {
        // Reset monthly counter if new month
        if (block.timestamp >= lastMonthReset + 30 days) {
            _recordMonthlyStats();
            monthlyEmitted = 0;
            lastMonthReset = block.timestamp;
        }

        uint256 currentCap = getCurrentMonthlyCap();
        require(monthlyEmitted + amount <= currentCap, "Monthly emission cap reached");

        uint256 remainingAllocation = COMMUNITY_ALLOCATION - communityMinted;

        if (amount <= remainingAllocation) {
            communityMinted += amount;
            _mint(to, amount);
        } else if (remainingAllocation > 0) {
            uint256 fromRecycled = amount - remainingAllocation;
            require(fromRecycled <= recycledPool, "Exceeds available tokens");
            communityMinted += remainingAllocation;
            recycledPool -= fromRecycled;
            _mint(to, amount);
        } else {
            require(amount <= recycledPool, "Exceeds recycled pool");
            recycledPool -= amount;
            _mint(to, amount);
        }

        monthlyEmitted += amount;
        totalEmitted += amount;

        // Update current month stats
        if (monthlyStats.length > 0) {
            monthlyStats[monthlyStats.length - 1].emitted += amount;
        }

        emit CommunityRewardsMinted(to, amount);
    }

    /**
     * @dev Current monthly emission cap (halves yearly).
     * Year 1: 500K/month, Year 2: 250K/month, Year 3: 125K/month, etc.
     */
    function getCurrentMonthlyCap() public view returns (uint256) {
        uint256 yearsSinceDeployment = (block.timestamp - deployTimestamp) / HALVING_INTERVAL;
        uint256 cap = INITIAL_MONTHLY_CAP;
        for (uint256 i = 0; i < yearsSinceDeployment && i < 10; i++) {
            cap = cap / 2;
        }
        // Minimum cap: 10K tokens/month
        if (cap < 10_000 * 10**18) {
            cap = 10_000 * 10**18;
        }
        return cap;
    }

    // =========================================
    // SPEND & BURN (autonomous deflation)
    // =========================================

    /**
     * @dev Burn tokens when users spend them on token-exclusive features.
     * 50% permanently burned → circulating supply decreases.
     * 50% recycled to reward pool → feeds community rewards without new minting.
     *
     * This is the CORE value mechanism of the autonomous token:
     * - User wants exclusive feature → buys $SAFE on market (demand)
     * - User spends $SAFE → 50% burned (deflation)
     * - Net effect: buy pressure + supply reduction
     */
    function spendAndBurn(uint256 amount) external {
        require(balanceOf(msg.sender) >= amount, "Insufficient balance");

        uint256 burnAmount = amount / 2;            // 50% permanently burned
        uint256 recycleAmount = amount - burnAmount; // 50% recycled to reward pool

        _burn(msg.sender, amount);
        recycledPool += recycleAmount;
        totalSpendBurned += burnAmount;

        // Update current month stats
        if (monthlyStats.length > 0) {
            monthlyStats[monthlyStats.length - 1].burned += burnAmount;
        }

        emit SpendBurned(msg.sender, amount, burnAmount, recycleAmount);
    }

    // =========================================
    // TRANSPARENCY (on-chain verifiable)
    // =========================================

    /**
     * @dev Is the token net-deflationary this month? (burn > emissions)
     */
    function isNetDeflationary() external view returns (
        bool deflationary,
        uint256 currentMonthEmitted,
        uint256 currentMonthBurned,
        int256 netFlow
    ) {
        uint256 emitted = monthlyEmitted;
        uint256 burned = monthlyStats.length > 0
            ? monthlyStats[monthlyStats.length - 1].burned
            : 0;

        int256 flow = int256(burned) - int256(emitted);

        return (flow >= 0, emitted, burned, flow);
    }

    /**
     * @dev Lifetime burn/emission ratio (basis points).
     * 10000 = break even, >10000 = deflationary, <10000 = inflationary
     */
    function getBurnEmissionRatioBps() external view returns (uint256) {
        if (totalEmitted == 0) return 10000;
        return (totalSpendBurned * 10000) / totalEmitted;
    }

    /**
     * @dev Get remaining allocations
     */
    function getRemainingAllocations() external view returns (
        uint256 communityRemaining,
        uint256 treasuryRemaining,
        uint256 teamRemaining,
        uint256 liquidityRemaining,
        uint256 recycledAvailable
    ) {
        return (
            COMMUNITY_ALLOCATION - communityMinted,
            TREASURY_ALLOCATION - treasuryMinted,
            TEAM_ALLOCATION - teamMinted,
            LIQUIDITY_ALLOCATION - liquidityMinted,
            recycledPool
        );
    }

    function getAvailableForRewards() external view returns (uint256) {
        return (COMMUNITY_ALLOCATION - communityMinted) + recycledPool;
    }

    /**
     * @dev Monthly stats history for transparency dashboards
     */
    function getMonthlyStatsCount() external view returns (uint256) {
        return monthlyStats.length;
    }

    // =========================================
    // INTERNAL
    // =========================================

    function _recordMonthlyStats() internal {
        // Start new month
        monthlyStats.push(MonthlyStats({
            emitted: 0,
            burned: 0,
            timestamp: block.timestamp
        }));

        if (monthlyStats.length >= 2) {
            uint256 prevIndex = monthlyStats.length - 2;
            emit MonthlyStatsRecorded(
                prevIndex,
                monthlyStats[prevIndex].emitted,
                monthlyStats[prevIndex].burned
            );
        }
    }
}
