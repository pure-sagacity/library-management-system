import { treaty } from '@elysiajs/eden'
import type { App } from '@library-management-system/server'

const backendUrl =
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    "http://localhost:3000"

const api = treaty<App>(backendUrl);

export { api };