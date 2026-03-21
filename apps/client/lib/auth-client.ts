import { createAuthClient } from "better-auth/react"

const backendUrl =
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    "http://localhost:3000"

const authClient = createAuthClient({
    baseURL: backendUrl,
    basePath: "/auth/api",
})

export { authClient };