import { auth } from "@/lib/auth";
import Elysia from "elysia";

const protectRoute = new Elysia()
    .onError(() => {
        return new Response("Unauthorized", { status: 401 });
    })
    .derive(async () => {
        const session = await auth.api.getSession();

        if (!session) {
            throw new Error("Unauthorized");
        }

        return { session };
    })

const requireAdmin = new Elysia()
    .onError(() => {
        return new Response("Forbidden", { status: 403 });
    })
    .derive(async () => {
        const session = await auth.api.getSession();

        if (!session || !session.user.role || session.user.role !== "admin") {
            throw new Error("Forbidden");
        }

        return { session };
    });


export { protectRoute, requireAdmin };