// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SafeScoreRegistry
 * @dev On-chain registry for SAFE scores - provides immutable proof of evaluations
 * Only stores summary scores, detailed evaluations remain off-chain (Supabase)
 */
contract SafeScoreRegistry is Ownable {

    struct SafeScore {
        uint8 overall;          // 0-100 SAFE score
        uint8 security;         // S pillar - 0-100
        uint8 adversity;        // A pillar - 0-100
        uint8 fidelity;         // F pillar - 0-100
        uint8 efficiency;       // E pillar - 0-100
        bytes32 evaluationHash; // IPFS/Arweave hash of detailed evaluation
        uint64 timestamp;       // When score was published
        uint16 normVersion;     // Version of SAFE methodology used
    }

    // Product ID (from Supabase) => Score history
    mapping(uint256 => SafeScore[]) public scoreHistory;

    // Product ID => Latest score
    mapping(uint256 => SafeScore) public latestScores;

    // Product ID => exists
    mapping(uint256 => bool) public productExists;

    // Total products scored
    uint256 public totalProducts;

    // Current methodology version
    uint16 public currentNormVersion = 1;

    // Events
    event ScorePublished(
        uint256 indexed productId,
        uint8 overall,
        uint8 security,
        uint8 adversity,
        uint8 fidelity,
        uint8 efficiency,
        bytes32 evaluationHash,
        uint64 timestamp
    );

    event NormVersionUpdated(uint16 oldVersion, uint16 newVersion);

    constructor() Ownable(msg.sender) {}

    /**
     * @dev Publish a new SAFE score for a product
     * @param productId Product ID from Supabase database
     * @param scores Array of [overall, security, adversity, fidelity, efficiency]
     * @param evaluationHash IPFS/Arweave hash containing full evaluation details
     */
    function publishScore(
        uint256 productId,
        uint8[5] calldata scores,
        bytes32 evaluationHash
    ) external onlyOwner {
        require(scores[0] <= 100, "Invalid overall score");
        require(scores[1] <= 100, "Invalid security score");
        require(scores[2] <= 100, "Invalid adversity score");
        require(scores[3] <= 100, "Invalid fidelity score");
        require(scores[4] <= 100, "Invalid efficiency score");

        SafeScore memory newScore = SafeScore({
            overall: scores[0],
            security: scores[1],
            adversity: scores[2],
            fidelity: scores[3],
            efficiency: scores[4],
            evaluationHash: evaluationHash,
            timestamp: uint64(block.timestamp),
            normVersion: currentNormVersion
        });

        // Track new products
        if (!productExists[productId]) {
            productExists[productId] = true;
            totalProducts++;
        }

        scoreHistory[productId].push(newScore);
        latestScores[productId] = newScore;

        emit ScorePublished(
            productId,
            scores[0],
            scores[1],
            scores[2],
            scores[3],
            scores[4],
            evaluationHash,
            uint64(block.timestamp)
        );
    }

    /**
     * @dev Batch publish scores for multiple products
     */
    function publishScoresBatch(
        uint256[] calldata productIds,
        uint8[5][] calldata scores,
        bytes32[] calldata evaluationHashes
    ) external onlyOwner {
        require(productIds.length == scores.length, "Array length mismatch");
        require(productIds.length == evaluationHashes.length, "Array length mismatch");

        for (uint256 i = 0; i < productIds.length; i++) {
            this.publishScore(productIds[i], scores[i], evaluationHashes[i]);
        }
    }

    /**
     * @dev Get the latest score for a product
     */
    function getScore(uint256 productId) external view returns (SafeScore memory) {
        return latestScores[productId];
    }

    /**
     * @dev Get score history for a product
     */
    function getScoreHistory(uint256 productId) external view returns (SafeScore[] memory) {
        return scoreHistory[productId];
    }

    /**
     * @dev Get scores for multiple products at once
     */
    function getScoresBatch(uint256[] calldata productIds) external view returns (SafeScore[] memory) {
        SafeScore[] memory results = new SafeScore[](productIds.length);
        for (uint256 i = 0; i < productIds.length; i++) {
            results[i] = latestScores[productIds[i]];
        }
        return results;
    }

    /**
     * @dev Check if a product has been scored
     */
    function hasScore(uint256 productId) external view returns (bool) {
        return productExists[productId];
    }

    /**
     * @dev Get the number of times a product has been scored
     */
    function getScoreCount(uint256 productId) external view returns (uint256) {
        return scoreHistory[productId].length;
    }

    /**
     * @dev Update methodology version (when norms are updated)
     */
    function updateNormVersion(uint16 newVersion) external onlyOwner {
        require(newVersion > currentNormVersion, "Version must increase");
        emit NormVersionUpdated(currentNormVersion, newVersion);
        currentNormVersion = newVersion;
    }
}
