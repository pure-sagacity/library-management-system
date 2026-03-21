import { auth } from "@/lib/auth";
import { Elysia } from "elysia";

const protectRoute = new Elysia({ name: "protectRoute" })
    .onError(() => {
        return new Response("Unauthorized", { status: 401 });
    })
    .derive({ as: "global" }, async ({ request }) => {
        const session = await auth.api.getSession({
            headers: request.headers,
        });

        if (!session) {
            throw new Error("Unauthorized");
        }

        return { session };
    })

const requireAdmin = new Elysia({ name: "requireAdmin" })
    .onError(() => {
        return new Response("Forbidden", { status: 403 });
    })
    .derive({ as: "global" }, async ({ request }) => {
        const session = await auth.api.getSession({
            headers: request.headers,
        });

        if (!session || !session.user.role || session.user.role !== "admin") {
            throw new Error("Forbidden");
        }

        return { session };
    });


export { protectRoute, requireAdmin };