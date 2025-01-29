// src/types/error.types.ts
export interface ApiError extends Error {
    statusCode?: number;
    details?: any;
}