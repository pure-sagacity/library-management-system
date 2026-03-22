import { Elysia } from 'elysia'
import { cors } from '@elysiajs/cors'
import { auth } from '@/lib/auth';
import { logger, toErrorDetails } from '@/lib/logger';

// Routes
import { books } from './routes/books';
import { loans } from './routes/loans';

const PORT = Number(process.env.PORT) || 3000;

logger.info({ port: PORT }, 'server.bootstrap.start');

const app = new Elysia()
    .onError(({ error, code, path, request }) => {
        logger.error(
            {
                code,
                path,
                method: request.method,
                url: request.url,
                error: toErrorDetails(error),
            },
            'server.request.unhandled_error',
        );
    })
    .use(
        cors({
            origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
            credentials: true,
        }),
    )
    .use(books)
    .use(loans)
    .mount("/auth", auth.handler)
    .listen(PORT);

logger.info(
    {
        hostname: app.server?.hostname,
        port: app.server?.port,
    },
    'server.bootstrap.ready',
);

export type App = typeof app;
export type { Book, Genre, Loan, Status, User } from "../lib/db/schema";