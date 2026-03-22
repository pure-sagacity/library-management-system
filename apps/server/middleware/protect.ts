import { auth } from "@/lib/auth";
import { Elysia } from "elysia";
import { buildRequestLogger, getOrCreateRequestId, toErrorDetails } from "@/lib/logger";

const protectRoute = new Elysia({ name: "protectRoute" })
    .onError(({ request, error }) => {
        const requestId = getOrCreateRequestId(request);
        const requestLogger = buildRequestLogger(request, requestId);

        requestLogger.warn(
            {
                error: toErrorDetails(error),
            },
            "middleware.protectRoute.onError.unauthorized",
        );

        return new Response("Unauthorized", { status: 401 });
    })
    .derive({ as: "scoped" }, async ({ request }) => {
        const startedAt = Date.now();
        const requestId = getOrCreateRequestId(request);
        const requestLogger = buildRequestLogger(request, requestId);

        requestLogger.debug("middleware.protectRoute.derive.start");

        const session = await auth.api.getSession({
            headers: request.headers,
        });

        if (!session) {
            requestLogger.warn(
                {
                    durationMs: Date.now() - startedAt,
                },
                "middleware.protectRoute.derive.session_missing",
            );
            throw new Error("Unauthorized");
        }

        requestLogger.info(
            {
                durationMs: Date.now() - startedAt,
                userId: session.user.id,
                role: session.user.role,
            },
            "middleware.protectRoute.derive.success",
        );

        return { session };
    })

const requireAdmin = new Elysia({ name: "requireAdmin" })
    .onError(({ request, error }) => {
        const requestId = getOrCreateRequestId(request);
        const requestLogger = buildRequestLogger(request, requestId);

        requestLogger.warn(
            {
                error: toErrorDetails(error),
            },
            "middleware.requireAdmin.onError.forbidden",
        );

        return new Response("Forbidden", { status: 403 });
    })
    .derive({ as: "scoped" }, async ({ request }) => {
        const startedAt = Date.now();
        const requestId = getOrCreateRequestId(request);
        const requestLogger = buildRequestLogger(request, requestId);

        requestLogger.debug("middleware.requireAdmin.derive.start");

        const session = await auth.api.getSession({
            headers: request.headers,
        });

        if (!session || !session.user.role || session.user.role !== "admin") {
            requestLogger.warn(
                {
                    durationMs: Date.now() - startedAt,
                    hasSession: Boolean(session),
                    role: session?.user.role,
                },
                "middleware.requireAdmin.derive.not_admin",
            );
            throw new Error("Forbidden");
        }

        requestLogger.info(
            {
                durationMs: Date.now() - startedAt,
                userId: session.user.id,
                role: session.user.role,
            },
            "middleware.requireAdmin.derive.success",
        );

        return { session };
    });


export { protectRoute, requireAdmin };