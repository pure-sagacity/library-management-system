import { asc, count, ilike, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { book } from "@/lib/db/schema";
import { logger, toErrorDetails } from "@/lib/logger";

type GetPaginatedBooksInput = {
    page: number;
    perPage: number;
    q?: string;
};

type GetPaginatedBooksResult = {
    books: typeof book.$inferSelect[];
    totalItems: number;
};

export const getPaginatedBooks = async ({
    page,
    perPage,
    q,
}: GetPaginatedBooksInput): Promise<GetPaginatedBooksResult> => {
    const startedAt = Date.now();
    const offset = (page - 1) * perPage;
    const normalizedQuery = q?.trim();

    logger.debug(
        {
            page,
            perPage,
            offset,
            hasSearchQuery: Boolean(normalizedQuery),
        },
        "db.getPaginatedBooks.start",
    );

    const whereClause = normalizedQuery
        ? or(
            ilike(book.title, `%${normalizedQuery}%`),
            ilike(book.genre, `%${normalizedQuery}%`),
        )
        : undefined;

    const booksQuery = whereClause
        ? db.select().from(book).where(whereClause).orderBy(asc(book.title)).limit(perPage).offset(offset)
        : db.select().from(book).orderBy(asc(book.title)).limit(perPage).offset(offset);

    const countQuery = whereClause
        ? db.select({ totalItems: count() }).from(book).where(whereClause)
        : db.select({ totalItems: count() }).from(book);

    try {
        const [books, totalResult] = await Promise.all([booksQuery, countQuery]);

        logger.info(
            {
                page,
                perPage,
                hasSearchQuery: Boolean(normalizedQuery),
                booksCount: books.length,
                totalItems: totalResult[0]?.totalItems ?? 0,
                durationMs: Date.now() - startedAt,
            },
            "db.getPaginatedBooks.success",
        );

        return {
            books,
            totalItems: totalResult[0]?.totalItems ?? 0,
        };
    } catch (error) {
        logger.error(
            {
                page,
                perPage,
                hasSearchQuery: Boolean(normalizedQuery),
                durationMs: Date.now() - startedAt,
                error: toErrorDetails(error),
            },
            "db.getPaginatedBooks.error",
        );
        throw error;
    }
};
