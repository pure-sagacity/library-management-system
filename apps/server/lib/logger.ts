import pino from "pino";

const isProduction = process.env.NODE_ENV === "production";
const logLevel = process.env.LOG_LEVEL ?? (isProduction ? "info" : "debug");

const REDACTED_PATHS = [
    "authorization",
    "cookie",
    "password",
    "token",
    "refreshToken",
    "accessToken",
    "headers.authorization",
    "headers.cookie",
    "req.headers.authorization",
    "req.headers.cookie",
];

export const logger = pino({
    level: logLevel,
    base: {
        service: "library-management-system-server",
        env: process.env.NODE_ENV ?? "development",
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    redact: {
        paths: REDACTED_PATHS,
        censor: "[REDACTED]",
    },
});

const getPathname = (request: Request): string => {
    try {
        return new URL(request.url).pathname;
    } catch {
        return request.url;
    }
};

export const getOrCreateRequestId = (request: Request): string => {
    return (
        request.headers.get("x-request-id") ??
        request.headers.get("x-correlation-id") ??
        crypto.randomUUID()
    );
};

export const buildRequestLogger = (request: Request, requestId: string) => {
    return logger.child({
        requestId,
        method: request.method,
        path: getPathname(request),
    });
};

export const toErrorDetails = (error: unknown) => {
    if (error instanceof Error) {
        return {
            name: error.name,
            message: error.message,
            stack: error.stack,
        };
    }

    return {
        message: String(error),
    };
};
