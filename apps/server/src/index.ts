const TIME_LENGTH_DUE_DATE = 14 * 24 * 60 * 60 * 1000; // 14 Days in Milliseconds

import { Elysia } from 'elysia'
import { cors } from '@elysiajs/cors'
import { auth } from '@/lib/auth';
import z from "zod";
import { getPaginatedBooks } from '@/lib/db/queries/books';
import { protectRoute, requireAdmin } from '@/middleware/protect';
import { db } from '@/lib/db';
import { book as bookTable, loan } from '@/lib/db/schema';
import { and, eq, sql } from 'drizzle-orm';

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
  .use(protectRoute)
  .post("/:id/borrow", async ({ params, session, set }) => {
    const book_id = params.id;
    try {
      const existingBook = await db
        .select({ id: bookTable.id })
        .from(bookTable)
        .where(eq(bookTable.id, book_id))
        .limit(1);

      if (existingBook.length === 0) {
        set.status = 404;
        return { message: `Book with ID ${book_id} was not found.`, ok: false };
      }

      const activeLoanForBook = await db
        .select({ id: loan.id })
        .from(loan)
        .where(and(eq(loan.book_id, book_id), eq(loan.status, "active")))
        .limit(1);

      if (activeLoanForBook.length > 0) {
        set.status = 409;
        return { message: `Book with ID ${book_id} is already borrowed.`, ok: false };
      }

      const checkoutAt = new Date();
      const dueAt = new Date(checkoutAt.getTime() + TIME_LENGTH_DUE_DATE);

      await db.insert(loan).values({
        book_id,
        user_id: session.user.id,
        checkout_date: checkoutAt,
        status: "active",
        due_date: dueAt,
      });

      return { message: `Book with ID ${book_id} has been borrowed successfully.`, ok: true };
    } catch (err) {
      set.status = 500;
      console.error('Error borrowing book:', err);
      return { message: 'Failed to borrow book due to an unexpected error.', ok: false };
    }
  }, {
    params: z.object({
      id: z.string(),
    }),
    response: z.object({
      ok: z.boolean(),
      message: z.string(),
    })
  })
  .post("/:id/return", async ({ params, session, set }) => {
    const book_id = params.id;
    try {
      const activeLoan = await db
        .select({ id: loan.id })
        .from(loan)
        .where(and(eq(loan.book_id, book_id), eq(loan.user_id, session.user.id), eq(loan.status, "active")))
        .limit(1);

      if (activeLoan.length === 0) {
        set.status = 404;
        return { message: `No active loan found for book with ID ${book_id} for the current user.`, ok: false };
      }

      await db.update(loan)
        .set({ status: "returned", returned_at: new Date() })
        .where(eq(loan.id, activeLoan[0].id));

      return { message: `Book with ID ${book_id} has been returned successfully.`, ok: true };
    } catch (err) {
      set.status = 500;
      console.error('Error returning book:', err);
      return { message: 'Failed to return book due to an unexpected error.', ok: false };
    }
  }, {
    params: z.object({
      id: z.string(),
    }),
    response: z.object({
      ok: z.boolean(),
      message: z.string(),
    })
  })
  .use(requireAdmin)
  .post("/", async ({ body, set }) => {
    const { title, genre, publication_year } = body;
    try {
      const normalizedTitle = title.trim();

      const duplicateBook = await db
        .select({ id: bookTable.id })
        .from(bookTable)
        .where(
          and(
            eq(bookTable.publication_year, publication_year),
            sql`lower(${bookTable.title}) = lower(${normalizedTitle})`
          )
        )
        .limit(1);

      if (duplicateBook.length > 0) {
        set.status = 409;
        return {
          ok: false,
          message: `A book with title "${normalizedTitle}" and publication year ${publication_year} already exists.`,
        };
      }

      const created = await db
        .insert(bookTable)
        .values({
          title: normalizedTitle,
          genre,
          publication_year,
        })
        .returning({
          id: bookTable.id,
          title: bookTable.title,
          genre: bookTable.genre,
          publication_year: bookTable.publication_year,
          created_at: bookTable.created_at,
        });

      set.status = 201;
      return {
        ok: true,
        message: `Book "${created[0].title}" has been added successfully.`,
        book: created[0],
      };
    } catch (err) {
      set.status = 500;
      console.error('Error adding book:', err);
      return { message: 'Failed to add book due to an unexpected error.', ok: false };
    }
  }, {
    body: z.object({
      title: z.string().trim().min(1),
      genre: z.enum(["Fiction", "Non-Fiction", "Science Fiction", "Fantasy", "Biography", "History", "Children's"]),
      publication_year: z.number().int().min(0).max(new Date().getFullYear()),
    }),
    response: z.union([
      z.object({
        ok: z.literal(true),
        message: z.string(),
        book: BookSchema,
      }),
      z.object({
        ok: z.literal(false),
        message: z.string(),
      }),
    ])
  });

const app = new Elysia()
  .mount('/books', book)
  .mount('/auth', auth.handler)
  .use(cors())
  .listen(3000);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);