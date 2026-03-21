const PORT = Number(process.env.PORT) || 3000;

import { Elysia } from 'elysia'
import { cors } from '@elysiajs/cors'
import { auth } from '@/lib/auth';

// Routes
import { books } from './routes/books';
import { loans } from './routes/loans';

const app = new Elysia()
    .use(books)
    .use(loans)
    .mount("/auth", auth.handler)
    .use(cors())
    .listen(PORT);

console.log(
    `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);

export type App = typeof app;