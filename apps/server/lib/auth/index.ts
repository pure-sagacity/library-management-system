import { account, session, user, verification, passkey as passkeyTable } from "../db/schema";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/lib/db"; // your drizzle instance
import { passkey } from "@better-auth/passkey";
import { betterAuth, url } from "better-auth";
import { admin } from "better-auth/plugins";
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
            session,
            passkey: passkeyTable
        }
    }),
    emailAndPassword: {
        enabled: true,
        requireEmailVerification: false,
    },
    plugins: [
        passkey({
            rpID: process.env.BETTER_AUTH_SITE_URL || "localhost",           // your domain in prod, e.g. "yourdomain.com"
            rpName: "The Archive",
            authenticatorSelection: {
                authenticatorAttachment: "platform",
                requireResidentKey: true,
                userVerification: "required",
            }
        }),
        admin()
    ],
    basePath: '/api'
});

logger.info("auth.init.ready");