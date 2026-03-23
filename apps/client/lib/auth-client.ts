import { createAuthClient } from "better-auth/react"
import { adminClient } from "better-auth/client/plugins"
import { passkeyClient } from "@better-auth/passkey/client"

const backendUrl =
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    "http://localhost:3000"

const authClient = createAuthClient({
    baseURL: backendUrl,
    basePath: "/auth/api",
    plugins: [
        adminClient(),
        passkeyClient(),
    ],
})

export { authClient };