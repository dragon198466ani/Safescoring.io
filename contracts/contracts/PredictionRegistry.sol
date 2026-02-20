// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title PredictionRegistry
 * @dev On-chain registry for cryptographic prediction commitments
 *
 * This contract stores hashes of predictions BEFORE events happen,
 * creating immutable proof of SafeScoring's predictive accuracy.
 *
 * Flow:
 * 1. SafeScoring generates a prediction with risk assessment
 * 2. Prediction data is hashed (SHA-256)
 * 3. Hash is published to this contract
 * 4. When incident occurs, prediction can be verified against the hash
 * 5. Accuracy stats prove methodology value over time
 */
contract PredictionRegistry is Ownable {

    // =========================================
    // STRUCTS
    // =========================================

    struct Prediction {
        bytes32 commitmentHash;     // SHA-256 of prediction JSON
        uint256 productId;          // Product being predicted
        uint8 riskLevel;            // 0=MINIMAL, 1=LOW, 2=MEDIUM, 3=HIGH, 4=CRITICAL
        uint8 safeScoreAtPrediction; // SAFE score when prediction was made
        uint16 windowDays;          // Prediction valid for N days
        uint64 timestamp;           // When prediction was committed
        uint64 expiresAt;           // When prediction expires
        bool validated;             // Has outcome been recorded?
        bool incidentOccurred;      // Did incident happen?
        uint64 validatedAt;         // When validation happened
    }

    struct WeeklyCommitment {
        bytes32 merkleRoot;         // Merkle root of all predictions that week
        uint256 predictionCount;    // How many predictions in this batch
        uint64 weekStart;           // Start of week (timestamp)
        uint64 timestamp;           // When committed
        string ipfsHash;            // IPFS hash of full prediction data
    }

    // =========================================
    // STATE
    // =========================================

    // All individual predictions
    mapping(bytes32 => Prediction) public predictions;
    bytes32[] public predictionHashes;

    // Weekly batch commitments (more gas efficient)
    WeeklyCommitment[] public weeklyCommitments;

    // Product => prediction hashes
    mapping(uint256 => bytes32[]) public productPredictions;

    // Stats
    uint256 public totalPredictions;
    uint256 public validatedPredictions;
    uint256 public correctPredictions;
    uint256 public incorrectPredictions;

    // Accuracy by risk level
    mapping(uint8 => uint256) public predictionsByRisk;
    mapping(uint8 => uint256) public correctByRisk;

    // =========================================
    // EVENTS
    // =========================================

    event PredictionCommitted(
        bytes32 indexed commitmentHash,
        uint256 indexed productId,
        uint8 riskLevel,
        uint8 safeScore,
        uint16 windowDays,
        uint64 expiresAt
    );

    event PredictionValidated(
        bytes32 indexed commitmentHash,
        uint256 indexed productId,
        bool incidentOccurred,
        bool predictionCorrect
    );

    event WeeklyBatchCommitted(
        uint256 indexed weekIndex,
        bytes32 merkleRoot,
        uint256 predictionCount,
        string ipfsHash
    );

    event AccuracyUpdated(
        uint256 totalValidated,
        uint256 correct,
        uint256 accuracyBps // Basis points (e.g., 8500 = 85.00%)
    );

    // =========================================
    // CONSTRUCTOR
    // =========================================

    constructor() Ownable(msg.sender) {}

    // =========================================
    // COMMIT FUNCTIONS
    // =========================================

    /**
     * @dev Commit a single prediction hash
     * @param commitmentHash SHA-256 hash of prediction data
     * @param productId Product ID from database
     * @param riskLevel 0-4 (MINIMAL to CRITICAL)
     * @param safeScore SAFE score at time of prediction
     * @param windowDays How many days prediction is valid
     */
    function commitPrediction(
        bytes32 commitmentHash,
        uint256 productId,
        uint8 riskLevel,
        uint8 safeScore,
        uint16 windowDays
    ) external onlyOwner {
        require(predictions[commitmentHash].timestamp == 0, "Already committed");
        require(riskLevel <= 4, "Invalid risk level");
        require(safeScore <= 100, "Invalid score");
        require(windowDays > 0 && windowDays <= 365, "Invalid window");

        uint64 expiresAt = uint64(block.timestamp + (windowDays * 1 days));

        predictions[commitmentHash] = Prediction({
            commitmentHash: commitmentHash,
            productId: productId,
            riskLevel: riskLevel,
            safeScoreAtPrediction: safeScore,
            windowDays: windowDays,
            timestamp: uint64(block.timestamp),
            expiresAt: expiresAt,
            validated: false,
            incidentOccurred: false,
            validatedAt: 0
        });

        predictionHashes.push(commitmentHash);
        productPredictions[productId].push(commitmentHash);

        totalPredictions++;
        predictionsByRisk[riskLevel]++;

        emit PredictionCommitted(
            commitmentHash,
            productId,
            riskLevel,
            safeScore,
            windowDays,
            expiresAt
        );
    }

    /**
     * @dev Commit multiple predictions in batch
     */
    function commitPredictionsBatch(
        bytes32[] calldata hashes,
        uint256[] calldata productIds,
        uint8[] calldata riskLevels,
        uint8[] calldata safeScores,
        uint16[] calldata windowDays
    ) external onlyOwner {
        require(hashes.length == productIds.length, "Length mismatch");
        require(hashes.length == riskLevels.length, "Length mismatch");
        require(hashes.length == safeScores.length, "Length mismatch");
        require(hashes.length == windowDays.length, "Length mismatch");

        for (uint256 i = 0; i < hashes.length; i++) {
            // Skip already committed
            if (predictions[hashes[i]].timestamp != 0) continue;

            uint64 expiresAt = uint64(block.timestamp + (windowDays[i] * 1 days));

            predictions[hashes[i]] = Prediction({
                commitmentHash: hashes[i],
                productId: productIds[i],
                riskLevel: riskLevels[i],
                safeScoreAtPrediction: safeScores[i],
                windowDays: windowDays[i],
                timestamp: uint64(block.timestamp),
                expiresAt: expiresAt,
                validated: false,
                incidentOccurred: false,
                validatedAt: 0
            });

            predictionHashes.push(hashes[i]);
            productPredictions[productIds[i]].push(hashes[i]);

            totalPredictions++;
            predictionsByRisk[riskLevels[i]]++;

            emit PredictionCommitted(
                hashes[i],
                productIds[i],
                riskLevels[i],
                safeScores[i],
                windowDays[i],
                expiresAt
            );
        }
    }

    /**
     * @dev Commit a weekly Merkle root (gas efficient for many predictions)
     * @param merkleRoot Merkle root of all predictions
     * @param predictionCount Number of predictions in this batch
     * @param weekStart Start timestamp of the week
     * @param ipfsHash IPFS hash containing full prediction data
     */
    function commitWeeklyBatch(
        bytes32 merkleRoot,
        uint256 predictionCount,
        uint64 weekStart,
        string calldata ipfsHash
    ) external onlyOwner {
        weeklyCommitments.push(WeeklyCommitment({
            merkleRoot: merkleRoot,
            predictionCount: predictionCount,
            weekStart: weekStart,
            timestamp: uint64(block.timestamp),
            ipfsHash: ipfsHash
        }));

        emit WeeklyBatchCommitted(
            weeklyCommitments.length - 1,
            merkleRoot,
            predictionCount,
            ipfsHash
        );
    }

    // =========================================
    // VALIDATION FUNCTIONS
    // =========================================

    /**
     * @dev Validate a prediction (record outcome)
     * @param commitmentHash The prediction to validate
     * @param incidentOccurred Whether an incident happened
     */
    function validatePrediction(
        bytes32 commitmentHash,
        bool incidentOccurred
    ) external onlyOwner {
        Prediction storage pred = predictions[commitmentHash];
        require(pred.timestamp != 0, "Prediction not found");
        require(!pred.validated, "Already validated");

        pred.validated = true;
        pred.incidentOccurred = incidentOccurred;
        pred.validatedAt = uint64(block.timestamp);

        validatedPredictions++;

        // Determine if prediction was correct
        bool isCorrect;
        if (pred.riskLevel >= 3) {
            // HIGH or CRITICAL risk predicted
            isCorrect = incidentOccurred; // Correct if incident happened
        } else {
            // LOW or MINIMAL risk predicted
            isCorrect = !incidentOccurred; // Correct if no incident
        }

        if (isCorrect) {
            correctPredictions++;
            correctByRisk[pred.riskLevel]++;
        } else {
            incorrectPredictions++;
        }

        emit PredictionValidated(
            commitmentHash,
            pred.productId,
            incidentOccurred,
            isCorrect
        );

        // Emit accuracy update
        uint256 accuracyBps = validatedPredictions > 0
            ? (correctPredictions * 10000) / validatedPredictions
            : 0;

        emit AccuracyUpdated(validatedPredictions, correctPredictions, accuracyBps);
    }

    /**
     * @dev Batch validate expired predictions (no incident = correct for low risk)
     */
    function validateExpiredPredictions(bytes32[] calldata hashes) external onlyOwner {
        for (uint256 i = 0; i < hashes.length; i++) {
            Prediction storage pred = predictions[hashes[i]];

            if (pred.timestamp == 0) continue;
            if (pred.validated) continue;
            if (block.timestamp < pred.expiresAt) continue;

            pred.validated = true;
            pred.incidentOccurred = false;
            pred.validatedAt = uint64(block.timestamp);

            validatedPredictions++;

            // Low risk predictions that expired without incident are correct
            if (pred.riskLevel <= 2) {
                correctPredictions++;
                correctByRisk[pred.riskLevel]++;
            } else {
                // High risk predictions that expired are incorrect (false positive)
                incorrectPredictions++;
            }

            emit PredictionValidated(hashes[i], pred.productId, false, pred.riskLevel <= 2);
        }

        uint256 accuracyBps = validatedPredictions > 0
            ? (correctPredictions * 10000) / validatedPredictions
            : 0;
        emit AccuracyUpdated(validatedPredictions, correctPredictions, accuracyBps);
    }

    // =========================================
    // VIEW FUNCTIONS
    // =========================================

    /**
     * @dev Get prediction details
     */
    function getPrediction(bytes32 hash) external view returns (Prediction memory) {
        return predictions[hash];
    }

    /**
     * @dev Get all prediction hashes for a product
     */
    function getProductPredictions(uint256 productId) external view returns (bytes32[] memory) {
        return productPredictions[productId];
    }

    /**
     * @dev Get accuracy stats
     */
    function getAccuracyStats() external view returns (
        uint256 total,
        uint256 validated,
        uint256 correct,
        uint256 incorrect,
        uint256 accuracyBps
    ) {
        total = totalPredictions;
        validated = validatedPredictions;
        correct = correctPredictions;
        incorrect = incorrectPredictions;
        accuracyBps = validated > 0 ? (correct * 10000) / validated : 0;
    }

    /**
     * @dev Get accuracy by risk level
     */
    function getAccuracyByRisk(uint8 riskLevel) external view returns (
        uint256 total,
        uint256 correct,
        uint256 accuracyBps
    ) {
        total = predictionsByRisk[riskLevel];
        correct = correctByRisk[riskLevel];
        accuracyBps = total > 0 ? (correct * 10000) / total : 0;
    }

    /**
     * @dev Get weekly commitment
     */
    function getWeeklyCommitment(uint256 index) external view returns (WeeklyCommitment memory) {
        require(index < weeklyCommitments.length, "Invalid index");
        return weeklyCommitments[index];
    }

    /**
     * @dev Get total weekly commitments count
     */
    function getWeeklyCommitmentsCount() external view returns (uint256) {
        return weeklyCommitments.length;
    }

    /**
     * @dev Verify a prediction hash exists and was committed before a timestamp
     */
    function verifyPredictionAnterior(
        bytes32 hash,
        uint64 beforeTimestamp
    ) external view returns (bool exists, bool isAnterior, uint64 committedAt) {
        Prediction memory pred = predictions[hash];
        exists = pred.timestamp != 0;
        committedAt = pred.timestamp;
        isAnterior = exists && pred.timestamp < beforeTimestamp;
    }
}
