import { treaty } from '@elysiajs/eden'
import type { App } from '@library-management-system/server'

const backendUrl =
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    "http://localhost:3000"

const api = treaty<App>(backendUrl, {
    fetch: {
        credentials: "include",
    },
});

type GenericError = {
    message?: string;
    status?: number;
    statusText?: string;
    error?: unknown;
    cause?: unknown;
};

const getText = (value: unknown): string | null => {
    return typeof value === 'string' && value.trim().length > 0 ? value : null;
};

export const getAuthErrorMessage = (
    error: unknown,
    fallback: string,
): string => {
    if (!error) {
        return fallback;
    }

    const direct = getText(error);
    if (direct) {
        return direct;
    }

    if (error instanceof Error) {
        return getText(error.message) || fallback;
    }

    if (typeof error === 'object') {
        const source = error as GenericError;
        const message = getText(source.message);
        if (message) {
            return message;
        }

        const statusText = getText(source.statusText);
        if (statusText) {
            return statusText;
        }

        const nestedMessage = getAuthErrorMessage(
            source.error ?? source.cause,
            fallback,
        );
        if (nestedMessage !== fallback) {
            return nestedMessage;
        }

        if (typeof source.status === 'number') {
            return `Request failed with status ${source.status}.`;
        }
    }

    return fallback;
};

export { api };