/**
 * SwipeVoting - Interface Tinder pour votes communautaires
 *
 * Usage:
 * import SwipeVoting from '@/components/SwipeVoting';
 * // ou
 * import { SwipeVoting, SwipeCard, SwipeCardStack } from '@/components/SwipeVoting';
 *
 * <SwipeVoting
 *   productSlug="ledger-nano-x"  // optionnel
 *   pillar="S"                    // optionnel: S, A, F, E
 *   maxItems={10}                 // optionnel
 *   onComplete={() => {}}         // optionnel
 *   onVoteSubmitted={(vote) => {}} // optionnel
 * />
 */

export { default } from "./SwipeVoting";
export { default as SwipeVoting } from "./SwipeVoting";
export { default as SwipeCard } from "./SwipeCard";
export { default as SwipeCardStack } from "./SwipeCardStack";
export { default as JustificationModal } from "./JustificationModal";
export { default as ProofModal } from "./ProofModal";
