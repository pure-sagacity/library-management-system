import { db } from "@/lib/db";
import { session as sessionTable, user as userTable } from "@/lib/db/schema";
import { buildRequestLogger, getOrCreateRequestId, toErrorDetails } from "@/lib/logger";
import { protectRoute } from "@/middleware/protect";
import { eq } from "drizzle-orm";
import Elysia from "elysia";

const account = new Elysia({ prefix: "/account" })
    .use(protectRoute)
    .post("/deactivate", async ({ request, set, session }) => {
        const requestId = getOrCreateRequestId(request);
        const requestLogger = buildRequestLogger(request, requestId);

        requestLogger.debug(
            {
                userId: session.user.id,
            },
            "account.deactivate.start",
        );

        try {
            await db
                .update(userTable)
                .set({
                    banned: true,
                    banReason: "Self-deactivated",
                    banExpires: null,
                })
                .where(eq(userTable.id, session.user.id));

            await db.delete(sessionTable).where(eq(sessionTable.userId, session.user.id));

            requestLogger.info(
                {
                    userId: session.user.id,
                },
                "account.deactivate.success",
            );

            return {
                status: true,
            };
        } catch (error) {
            set.status = 500;

            requestLogger.error(
                {
                    userId: session.user.id,
                    error: toErrorDetails(error),
                },
                "account.deactivate.failed",
            );

            return {
                status: false,
                message: "Failed to deactivate account.",
            };
        }
    });

export { account };