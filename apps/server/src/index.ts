import { Elysia } from 'elysia'
import { cors } from '@elysiajs/cors'
import { auth } from '@/lib/auth';

// Routes
import { books } from './routes/books';
import { loans } from './routes/loans';

const app = new Elysia()
    .mount('/books', books)
    .mount('/loans', loans)
    .mount('/auth', auth.handler)
    .use(cors())
    .listen(3000);

console.log(
    `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);

export type App = typeof app;