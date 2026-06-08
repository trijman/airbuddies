export * from "./generated/api";
// Export only types that don't conflict with Zod schemas in generated/api.ts
// (Params types for endpoints with query params are excluded — they exist in both)
export * from './generated/types/adminFlightsList';
export * from './generated/types/adminFlightSummary';
export * from './generated/types/adminStats';
export * from './generated/types/airlineRatingAggregate';
export * from './generated/types/airlineRatingSummaryItem';
export * from './generated/types/flightPassengers';
export * from './generated/types/flightRatingAggregate';
export * from './generated/types/flightRegistrationInput';
export * from './generated/types/flightRegistrationResponse';
export * from './generated/types/healthStatus';
export * from './generated/types/ratingInput';
export * from './generated/types/ratingResult';
export * from './generated/types/ratingsSummary';
export * from './generated/types/unregisterFlightRequest';
export * from './generated/types/unregisterResult';
