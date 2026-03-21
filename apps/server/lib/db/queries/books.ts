import { asc, count, ilike, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { book } from "@/lib/db/schema";

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
    const offset = (page - 1) * perPage;
    const normalizedQuery = q?.trim();
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

    const [books, totalResult] = await Promise.all([booksQuery, countQuery]);

    return {
        books,
        totalItems: totalResult[0]?.totalItems ?? 0,
    };
};
