import { Elysia } from 'elysia'
import { cors } from '@elysiajs/cors'
import { auth } from '@/lib/auth';
import z from "zod";
import { getPaginatedBooks } from '@/lib/db/queries/books';

const BookSchema = z.object({
  id: z.string(),
  title: z.string(),
  genre: z.enum(["Fiction", "Non-Fiction", "Science Fiction", "Fantasy", "Biography", "History", "Children's"]),
  publication_year: z.number(),
  created_at: z.date(),
});

const book = new Elysia()
  .get("/", async ({ query }) => {
    const page = query.page;
    const perPage = Math.min(query.perPage, 100);

    const { books, totalItems } = await getPaginatedBooks({ page, perPage });
    const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / perPage);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1 && totalPages > 0;

    return {
      books,
      metadata: {
        hasNextPage,
        hasPreviousPage,
        nextPage: hasNextPage ? page + 1 : null,
        previousPage: hasPreviousPage ? Math.min(page - 1, totalPages) : null,
        totalItems,
        totalPages,
        currentPage: page,
        perPage,
      }
    };
  }, {
    response: z.object({
      books: z.array(BookSchema),
      metadata: z.object({
        hasNextPage: z.boolean(),
        hasPreviousPage: z.boolean(),
        nextPage: z.number().nullable(),
        previousPage: z.number().nullable(),
        totalItems: z.number(),
        totalPages: z.number(),
        currentPage: z.number(),
        perPage: z.number(),
      })
    }),
    query: z.object({
      page: z.coerce.number().int().min(1).default(1),
      perPage: z.coerce.number().int().min(1).default(20),
    })
  })
  .get("/search", async ({ query }) => {
    const page = query.page;
    const perPage = Math.min(query.perPage, 100);
    const q = query.q;

    const { books, totalItems } = await getPaginatedBooks({ page, perPage, q });
    const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / perPage);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1 && totalPages > 0;

    return {
      books,
      metadata: {
        hasNextPage,
        hasPreviousPage,
        nextPage: hasNextPage ? page + 1 : null,
        previousPage: hasPreviousPage ? Math.min(page - 1, totalPages) : null,
        totalItems,
        totalPages,
        currentPage: page,
        perPage,
      }
    };
  }, {
    response: z.object({
      books: z.array(BookSchema),
      metadata: z.object({
        hasNextPage: z.boolean(),
        hasPreviousPage: z.boolean(),
        nextPage: z.number().nullable(),
        previousPage: z.number().nullable(),
        totalItems: z.number(),
        totalPages: z.number(),
        currentPage: z.number(),
        perPage: z.number(),
      })
    }),
    query: z.object({
      q: z.string().trim().min(1),
      page: z.coerce.number().int().min(1).default(1),
      perPage: z.coerce.number().int().min(1).default(20),
    })
  })

const app = new Elysia()
  .mount('/books', book)
  .mount('/auth', auth.handler)
  .use(cors())
  .listen(3000);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);