import { db } from "@/lib/db";
import { user as userTable } from "@/lib/db/schema";
import { buildRequestLogger, getOrCreateRequestId } from "@/lib/logger";
import { eq } from "drizzle-orm";
import Elysia from "elysia";
import z from "zod";

const PublicUserProfileSchema = z.object({
    id: z.string(),
    name: z.string(),
    image: z.string().nullable(),
    createdAt: z.date(),
    updatedAt: z.date(),
    role: z.string().nullable(),
    banned: z.boolean().nullable(),
    banReason: z.string().nullable(),
    banExpires: z.date().nullable(),
});

const user = new Elysia({ prefix: "/user" })
    .get("/profile/:id", async ({ params, set }) => {
        const { id: user_id } = params;

        try {
            const [profile] = await db
                .select({
                    id: userTable.id,
                    name: userTable.name,
                    image: userTable.image,
                    createdAt: userTable.createdAt,
                    updatedAt: userTable.updatedAt,
                    role: userTable.role,
                    banned: userTable.banned,
                    banReason: userTable.banReason,
                    banExpires: userTable.banExpires,
                })
                .from(userTable)
                .where(eq(userTable.id, user_id))
                .limit(1);

            if (!profile) {
                set.status = 404;
                return {
                    ok: false,
                    message: "User profile not found.",
                };
            }

            return {
                id: profile.id,
                name: profile.name,
                image: profile.image,
                createdAt: profile.createdAt,
                updatedAt: profile.updatedAt,
                role: profile.role,
                banned: profile.banned ?? null,
                banReason: profile.banReason,
                banExpires: profile.banExpires,
            };
        } catch {
            set.status = 500;
            return {
                ok: false,
                message: "Failed to fetch user profile due to an unexpected error.",
            };
        }
    }, {
        params: z.object({
            id: z.string(),
        }),
        response: {
            200: PublicUserProfileSchema,
            404: z.object({
                ok: z.literal(false),
                message: z.string(),
            }),
            500: z.object({
                ok: z.literal(false),
                message: z.string(),
            }),
        },
    })
    .get("/:id/isAdmin", async ({ params, set, request }) => {
        const { id: user_id } = params;
        const requestId = getOrCreateRequestId(request);
        const requestLogger = buildRequestLogger(request, requestId);

        try {
            const [userRole] = await db
                .select({
                    role: userTable.role,
                })
                .from(userTable)
                .where(eq(userTable.id, user_id))
                .limit(1);

            return {
                isAdmin: userRole?.role === "admin",
            };
        } catch (err) {
            set.status = 500;
            requestLogger.error(
                { error: err instanceof Error ? err.message : String(err) },
                "Error checking admin status",
            );
            return {
                ok: false,
                message: "Failed to check admin status due to an unexpected error.",
            };
        }
    }, {
        params: z.object({
            id: z.string(),
        }),
        response: {
            200: z.object({
                isAdmin: z.boolean(),
            }),
            500: z.object({
                ok: z.literal(false),
                message: z.string(),
            }),
        },
    });

export { user };