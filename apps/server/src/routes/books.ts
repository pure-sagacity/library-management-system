import { Elysia } from 'elysia'
import z from "zod";
import { getPaginatedBooks } from '@/lib/db/queries/books';
import { protectRoute, requireAdmin } from '@/middleware/protect';
import { db } from '@/lib/db';
import { book as bookTable, loan } from '@/lib/db/schema';
import { and, eq, ne, sql } from 'drizzle-orm';
import { buildRequestLogger, getOrCreateRequestId, toErrorDetails } from '@/lib/logger';

const BookSchema = z.object({
    id: z.string(),
    title: z.string(),
    genre: z.enum(["Fiction", "Non-Fiction", "Science Fiction", "Fantasy", "Biography", "History", "Children's"]),
    publication_year: z.number(),
    created_at: z.date(),
});

const UpdateBookBodySchema = z.object({
    title: z.string().trim().min(1).optional(),
    genre: z.enum(["Fiction", "Non-Fiction", "Science Fiction", "Fantasy", "Biography", "History", "Children's"]).optional(),
    publication_year: z.number().int().min(0).max(new Date().getFullYear()).optional(),
}).refine((payload) => payload.title !== undefined || payload.genre !== undefined || payload.publication_year !== undefined, {
    message: "At least one field is required to update a book.",
});

const books = new Elysia({ prefix: "/books" })
    .get("/", async ({ query, request }) => {
        const startedAt = Date.now();
        const requestId = getOrCreateRequestId(request);
        const requestLogger = buildRequestLogger(request, requestId);
        const page = query.page;
        const perPage = Math.min(query.perPage, 100);

        requestLogger.debug(
            {
                page,
                perPage,
            },
            'books.list.start',
        );

        try {
            const { books, totalItems } = await getPaginatedBooks({ page, perPage });
            const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / perPage);
            const hasNextPage = page < totalPages;
            const hasPreviousPage = page > 1 && totalPages > 0;

            requestLogger.info(
                {
                    page,
                    perPage,
                    totalItems,
                    totalPages,
                    returnedCount: books.length,
                    durationMs: Date.now() - startedAt,
                },
                'books.list.success',
            );

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
        } catch (error) {
            requestLogger.error(
                {
                    page,
                    perPage,
                    durationMs: Date.now() - startedAt,
                    error: toErrorDetails(error),
                },
                'books.list.error',
            );
            throw error;
        }
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
    .get("/search", async ({ query, request }) => {
        const startedAt = Date.now();
        const requestId = getOrCreateRequestId(request);
        const requestLogger = buildRequestLogger(request, requestId);
        const page = query.page;
        const perPage = Math.min(query.perPage, 100);
        const q = query.q;

        requestLogger.debug(
            {
                page,
                perPage,
                queryLength: q.length,
            },
            'books.search.start',
        );

        try {
            const { books, totalItems } = await getPaginatedBooks({ page, perPage, q });
            const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / perPage);
            const hasNextPage = page < totalPages;
            const hasPreviousPage = page > 1 && totalPages > 0;

            requestLogger.info(
                {
                    page,
                    perPage,
                    queryLength: q.length,
                    totalItems,
                    totalPages,
                    returnedCount: books.length,
                    durationMs: Date.now() - startedAt,
                },
                'books.search.success',
            );

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
        } catch (error) {
            requestLogger.error(
                {
                    page,
                    perPage,
                    queryLength: q.length,
                    durationMs: Date.now() - startedAt,
                    error: toErrorDetails(error),
                },
                'books.search.error',
            );
            throw error;
        }
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
    .use(requireAdmin)
    .post("/", async ({ body, set, request }) => {
        const startedAt = Date.now();
        const requestId = getOrCreateRequestId(request);
        const requestLogger = buildRequestLogger(request, requestId);
        const { title, genre, publication_year } = body;

        requestLogger.debug(
            {
                genre,
                publication_year,
                titleLength: title.length,
            },
            'books.create.start',
        );

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
                requestLogger.warn(
                    {
                        title: normalizedTitle,
                        publication_year,
                        durationMs: Date.now() - startedAt,
                    },
                    'books.create.conflict.duplicate',
                );
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
            requestLogger.info(
                {
                    createdBookId: created[0].id,
                    genre,
                    publication_year,
                    durationMs: Date.now() - startedAt,
                },
                'books.create.success',
            );
            return {
                ok: true,
                message: `Book "${created[0].title}" has been added successfully.`,
                book: created[0],
            };
        } catch (error) {
            set.status = 500;
            requestLogger.error(
                {
                    genre,
                    publication_year,
                    durationMs: Date.now() - startedAt,
                    error: toErrorDetails(error),
                },
                'books.create.error',
            );
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
    })
    .put("/:id", async ({ params, body, set, request }) => {
        const startedAt = Date.now();
        const requestId = getOrCreateRequestId(request);
        const requestLogger = buildRequestLogger(request, requestId);
        const book_id = params.id;
        const { title, genre, publication_year } = body;

        requestLogger.debug(
            {
                book_id,
                hasTitleUpdate: title !== undefined,
                hasGenreUpdate: genre !== undefined,
                hasPublicationYearUpdate: publication_year !== undefined,
            },
            'books.update.start',
        );

        try {
            const existingBook = await db
                .select({
                    id: bookTable.id,
                    title: bookTable.title,
                    genre: bookTable.genre,
                    publication_year: bookTable.publication_year,
                    created_at: bookTable.created_at,
                })
                .from(bookTable)
                .where(eq(bookTable.id, book_id))
                .limit(1);

            if (existingBook.length === 0) {
                set.status = 404;
                requestLogger.warn(
                    {
                        book_id,
                        durationMs: Date.now() - startedAt,
                    },
                    'books.update.not_found',
                );
                return {
                    ok: false,
                    message: `Book with ID ${book_id} was not found.`,
                };
            }

            const currentBook = existingBook[0];
            const normalizedTitle = title?.trim();
            const effectiveTitle = normalizedTitle ?? currentBook.title;
            const effectiveGenre = genre ?? currentBook.genre;
            const effectivePublicationYear = publication_year ?? currentBook.publication_year;

            const isTitleOrYearChanged =
                effectiveTitle !== currentBook.title ||
                effectivePublicationYear !== currentBook.publication_year;

            if (isTitleOrYearChanged) {
                const duplicateBook = await db
                    .select({ id: bookTable.id })
                    .from(bookTable)
                    .where(
                        and(
                            eq(bookTable.publication_year, effectivePublicationYear),
                            sql`lower(${bookTable.title}) = lower(${effectiveTitle})`,
                            ne(bookTable.id, book_id),
                        )
                    )
                    .limit(1);

                if (duplicateBook.length > 0) {
                    set.status = 409;
                    requestLogger.warn(
                        {
                            book_id,
                            effectiveTitle,
                            effectivePublicationYear,
                            durationMs: Date.now() - startedAt,
                        },
                        'books.update.conflict.duplicate',
                    );
                    return {
                        ok: false,
                        message: `A book with title "${effectiveTitle}" and publication year ${effectivePublicationYear} already exists.`,
                    };
                }
            }

            const updated = await db
                .update(bookTable)
                .set({
                    title: effectiveTitle,
                    genre: effectiveGenre,
                    publication_year: effectivePublicationYear,
                    updated_at: new Date(),
                })
                .where(eq(bookTable.id, book_id))
                .returning({
                    id: bookTable.id,
                    title: bookTable.title,
                    genre: bookTable.genre,
                    publication_year: bookTable.publication_year,
                    created_at: bookTable.created_at,
                });

            requestLogger.info(
                {
                    book_id,
                    updatedBookId: updated[0].id,
                    durationMs: Date.now() - startedAt,
                },
                'books.update.success',
            );
            return {
                ok: true,
                message: `Book "${updated[0].title}" has been updated successfully.`,
                book: updated[0],
            };
        } catch (error) {
            set.status = 500;
            requestLogger.error(
                {
                    book_id,
                    durationMs: Date.now() - startedAt,
                    error: toErrorDetails(error),
                },
                'books.update.error',
            );
            return { message: 'Failed to update book due to an unexpected error.', ok: false };
        }
    }, {
        params: z.object({
            id: z.string(),
        }),
        body: UpdateBookBodySchema,
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
        ]),
    })
    .delete("/:id", async ({ params, set, request }) => {
        const startedAt = Date.now();
        const requestId = getOrCreateRequestId(request);
        const requestLogger = buildRequestLogger(request, requestId);
        const book_id = params.id;

        requestLogger.debug(
            {
                book_id,
            },
            'books.delete.start',
        );

        try {
            const existingBook = await db
                .select({ id: bookTable.id })
                .from(bookTable)
                .where(eq(bookTable.id, book_id))
                .limit(1);

            if (existingBook.length === 0) {
                set.status = 404;
                requestLogger.warn(
                    {
                        book_id,
                        durationMs: Date.now() - startedAt,
                    },
                    'books.delete.not_found',
                );
                return { message: `Book with ID ${book_id} was not found.`, ok: false };
            }

            const activeLoan = await db
                .select({ id: loan.id })
                .from(loan)
                .where(and(eq(loan.book_id, book_id), eq(loan.status, "active")))
                .limit(1);

            if (activeLoan.length > 0) {
                set.status = 409;
                requestLogger.warn(
                    {
                        book_id,
                        durationMs: Date.now() - startedAt,
                    },
                    'books.delete.conflict.active_loan',
                );
                return {
                    message: `Book with ID ${book_id} cannot be deleted while it has an active loan.`,
                    ok: false,
                };
            }

            await db.delete(bookTable).where(eq(bookTable.id, book_id));

            requestLogger.info(
                {
                    book_id,
                    durationMs: Date.now() - startedAt,
                },
                'books.delete.success',
            );
            return {
                ok: true,
                message: `Book with ID ${book_id} has been deleted successfully.`,
            };
        } catch (error) {
            set.status = 500;
            requestLogger.error(
                {
                    book_id,
                    durationMs: Date.now() - startedAt,
                    error: toErrorDetails(error),
                },
                'books.delete.error',
            );
            return { message: 'Failed to delete book due to an unexpected error.', ok: false };
        }
    }, {
        params: z.object({
            id: z.string(),
        }),
        response: z.object({
            ok: z.boolean(),
            message: z.string(),
        })
    });

export { books };