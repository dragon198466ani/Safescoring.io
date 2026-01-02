// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title SafePassNFT
 * @dev NFT providing lifetime access to SafeScoring premium features
 * Supports multiple tiers: Explorer, Professional, Enterprise
 */
contract SafePassNFT is ERC721, ERC721Enumerable, Ownable {
    using Strings for uint256;

    // USDC on Polygon
    IERC20 public immutable usdc;

    // Tier definitions
    enum Tier { Explorer, Professional, Enterprise }

    struct TierConfig {
        uint256 priceUSDC;      // Price in USDC (6 decimals)
        uint256 maxSupply;      // Max NFTs for this tier (0 = unlimited)
        uint256 minted;         // Current minted count
        bool active;            // Is tier available for purchase
    }

    // Tier ID => Config
    mapping(Tier => TierConfig) public tiers;

    // Token ID => Tier
    mapping(uint256 => Tier) public tokenTier;

    // Base URI for metadata
    string private _baseTokenURI;

    // Token counter
    uint256 private _tokenIdCounter;

    // Treasury address for payments
    address public treasury;

    // Events
    event SafePassMinted(address indexed buyer, uint256 indexed tokenId, Tier tier, uint256 price);
    event TierUpdated(Tier tier, uint256 price, uint256 maxSupply, bool active);
    event TreasuryUpdated(address newTreasury);

    constructor(
        address _usdc,
        address _treasury
    ) ERC721("SafePass", "SAFEPASS") Ownable(msg.sender) {
        usdc = IERC20(_usdc);
        treasury = _treasury;

        // Initialize tiers with prices in USDC (6 decimals)
        // Explorer: $99 lifetime (vs $19/month)
        tiers[Tier.Explorer] = TierConfig({
            priceUSDC: 99 * 1e6,
            maxSupply: 10000,
            minted: 0,
            active: true
        });

        // Professional: $249 lifetime (vs $49/month)
        tiers[Tier.Professional] = TierConfig({
            priceUSDC: 249 * 1e6,
            maxSupply: 5000,
            minted: 0,
            active: true
        });

        // Enterprise: $999 lifetime (vs $299/month)
        tiers[Tier.Enterprise] = TierConfig({
            priceUSDC: 999 * 1e6,
            maxSupply: 1000,
            minted: 0,
            active: true
        });
    }

    /**
     * @dev Mint a SafePass NFT by paying in USDC
     * @param tier The tier level to mint
     */
    function mint(Tier tier) external returns (uint256) {
        TierConfig storage config = tiers[tier];

        require(config.active, "Tier not available");
        require(config.maxSupply == 0 || config.minted < config.maxSupply, "Tier sold out");

        // Transfer USDC from buyer to treasury
        require(
            usdc.transferFrom(msg.sender, treasury, config.priceUSDC),
            "USDC transfer failed"
        );

        // Mint NFT
        uint256 tokenId = _tokenIdCounter++;
        _safeMint(msg.sender, tokenId);
        tokenTier[tokenId] = tier;
        config.minted++;

        emit SafePassMinted(msg.sender, tokenId, tier, config.priceUSDC);

        return tokenId;
    }

    /**
     * @dev Check if an address has access to a specific tier (or higher)
     * @param user Address to check
     * @param requiredTier Minimum tier required
     */
    function hasAccess(address user, Tier requiredTier) external view returns (bool) {
        uint256 balance = balanceOf(user);
        if (balance == 0) return false;

        // Check all tokens owned by user
        for (uint256 i = 0; i < balance; i++) {
            uint256 tokenId = tokenOfOwnerByIndex(user, i);
            Tier userTier = tokenTier[tokenId];

            // Higher tier = better access (Enterprise > Professional > Explorer)
            if (uint8(userTier) >= uint8(requiredTier)) {
                return true;
            }
        }

        return false;
    }

    /**
     * @dev Get the highest tier owned by a user
     * @param user Address to check
     */
    function getHighestTier(address user) external view returns (bool hasNFT, Tier highestTier) {
        uint256 balance = balanceOf(user);
        if (balance == 0) return (false, Tier.Explorer);

        hasNFT = true;
        highestTier = Tier.Explorer;

        for (uint256 i = 0; i < balance; i++) {
            uint256 tokenId = tokenOfOwnerByIndex(user, i);
            Tier userTier = tokenTier[tokenId];

            if (uint8(userTier) > uint8(highestTier)) {
                highestTier = userTier;
            }
        }

        return (hasNFT, highestTier);
    }

    /**
     * @dev Get tier details
     */
    function getTierInfo(Tier tier) external view returns (
        uint256 priceUSDC,
        uint256 maxSupply,
        uint256 minted,
        uint256 remaining,
        bool active
    ) {
        TierConfig memory config = tiers[tier];
        remaining = config.maxSupply == 0 ? type(uint256).max : config.maxSupply - config.minted;
        return (config.priceUSDC, config.maxSupply, config.minted, remaining, config.active);
    }

    // ============ Admin Functions ============

    function updateTier(
        Tier tier,
        uint256 priceUSDC,
        uint256 maxSupply,
        bool active
    ) external onlyOwner {
        tiers[tier].priceUSDC = priceUSDC;
        tiers[tier].maxSupply = maxSupply;
        tiers[tier].active = active;

        emit TierUpdated(tier, priceUSDC, maxSupply, active);
    }

    function setBaseURI(string memory baseURI) external onlyOwner {
        _baseTokenURI = baseURI;
    }

    function setTreasury(address newTreasury) external onlyOwner {
        require(newTreasury != address(0), "Invalid treasury");
        treasury = newTreasury;
        emit TreasuryUpdated(newTreasury);
    }

    /**
     * @dev Admin mint for giveaways or partnerships
     */
    function adminMint(address to, Tier tier) external onlyOwner returns (uint256) {
        uint256 tokenId = _tokenIdCounter++;
        _safeMint(to, tokenId);
        tokenTier[tokenId] = tier;
        tiers[tier].minted++;

        emit SafePassMinted(to, tokenId, tier, 0);

        return tokenId;
    }

    // ============ Overrides ============

    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);

        string memory baseURI = _baseURI();
        Tier tier = tokenTier[tokenId];

        // Return tier-specific metadata: baseURI/explorer/1, baseURI/professional/2, etc.
        if (bytes(baseURI).length > 0) {
            string memory tierName = tier == Tier.Explorer ? "explorer" :
                                     tier == Tier.Professional ? "professional" : "enterprise";
            return string(abi.encodePacked(baseURI, tierName, "/", tokenId.toString()));
        }

        return "";
    }

    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721, ERC721Enumerable)
        returns (address)
    {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(address account, uint128 value)
        internal
        override(ERC721, ERC721Enumerable)
    {
        super._increaseBalance(account, value);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
