import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/lib/db"; // your drizzle instance
import { admin } from "better-auth/plugins";
import { passkey } from "@better-auth/passkey";
import { account, session, user, verification } from "../db/schema";

export const auth = betterAuth({
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