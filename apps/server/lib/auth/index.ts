import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/lib/db"; // your drizzle instance
import { admin } from "better-auth/plugins";
import { passkey } from "@better-auth/passkey";
import { account, session, user, verification } from "../db/schema";
import { logger } from "@/lib/logger";

const trustedOrigins = [
    process.env.CORS_ORIGIN,
    process.env.FRONTEND_URL,
    "http://localhost:5173",
].filter((origin): origin is string => Boolean(origin));

logger.info(
    {
        basePath: "/api",
        trustedOrigins,
        emailPasswordEnabled: true,
        passkeyEnabled: true,
        adminPluginEnabled: true,
    },
    "auth.init.start",
);

export const auth = betterAuth({
    trustedOrigins,
    database: drizzleAdapter(db, {
        provider: "pg", // or "mysql", "sqlite"
        schema: {
            user,
            verification,
            account,
            session
        }
    }),
    emailAndPassword: {
        enabled: true,
    },
    plugins: [
        passkey(),
        admin()
    ],
    basePath: '/api'
});

logger.info("auth.init.ready");