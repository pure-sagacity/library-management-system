const TIME_LENGTH_DUE_DATE = 14 * 24 * 60 * 60 * 1000; // 14 Days in Milliseconds

import { Elysia } from 'elysia'
import z from "zod";
import { protectRoute, requireAdmin } from '@/middleware/protect';
import { db } from '@/lib/db';
import { book as bookTable, loan } from '@/lib/db/schema';
import { and, asc, count, eq, inArray } from 'drizzle-orm';
import { buildRequestLogger, getOrCreateRequestId, toErrorDetails } from '@/lib/logger';
import { cleanupOrphanLoans } from '@/lib/db/queries/orphan-loans';

const LoanStatusSchema = z.enum(["active", "returned", "overdue"]);

const CurrentLoanSchema = z.object({
    loan_id: z.string(),
    book_id: z.string(),
    title: z.string(),
    genre: z.enum(["Fiction", "Non-Fiction", "Science Fiction", "Fantasy", "Biography", "History", "Children's"]),
    publication_year: z.number(),
    checkout_date: z.date(),
    due_date: z.date(),
    status: LoanStatusSchema,
});

const LoanAccessDeniedSchema = z.object({
    ok: z.literal(false),
    message: z.string(),
});

const MAX_LOGGED_ORPHAN_LOAN_IDS = 3;

const runOrphanCleanupForRead = async ({
    requestLogger,
    route,
}: {
    requestLogger: ReturnType<typeof buildRequestLogger>;
    route: string;
}): Promise<number> => {
    try {
        const cleanupResult = await cleanupOrphanLoans();

        if (cleanupResult.deletedCount > 0) {
            requestLogger.warn(
                {
                    deletedCount: cleanupResult.deletedCount,
                    deletedLoanIdsSample: cleanupResult.deletedLoanIds.slice(0, MAX_LOGGED_ORPHAN_LOAN_IDS),
                },
                `${route}.orphan_cleanup.deleted`,
            );
        }

        return cleanupResult.deletedCount;
    } catch (error) {
        requestLogger.error(
            {
                error: toErrorDetails(error),
            },
            `${route}.orphan_cleanup.error`,
        );
        return 0;
    }
};

const loans = new Elysia({ prefix: '/loans' })
    .use(protectRoute)
    .get("/users/:user_id/total-books", async ({ params, session, set, request }) => {
        const startedAt = Date.now();
        const requestId = getOrCreateRequestId(request);
        const requestLogger = buildRequestLogger(request, requestId);
        const user_id = params.user_id;

        requestLogger.debug(
            {
                user_id,
                requesterUserId: session.user.id,
                requesterRole: session.user.role ?? null,
            },
            'loans.totalBooks.start',
        );

        const canAccessUserData = session.user.id === user_id || session.user.role === "admin";

        if (!canAccessUserData) {
            set.status = 403;
            requestLogger.warn(
                {
                    user_id,
                    requesterUserId: session.user.id,
                    requesterRole: session.user.role ?? null,
                    durationMs: Date.now() - startedAt,
                },
                'loans.totalBooks.forbidden',
            );
            return {
                ok: false,
                message: 'You are not authorized to access this user data.',
            };
        }

        try {
            const orphanLoansDeleted = await runOrphanCleanupForRead({
                requestLogger,
                route: 'loans.totalBooks',
            });

            const [result] = await db
                .select({ totalBooks: count(loan.id) })
                .from(loan)
                .where(eq(loan.user_id, user_id));

            requestLogger.info(
                {
                    user_id,
                    requesterUserId: session.user.id,
                    totalBooks: result.totalBooks,
                    orphanLoansDeleted,
                    durationMs: Date.now() - startedAt,
                },
                'loans.totalBooks.success',
            );

            return {
                ok: true,
                user_id,
                totalBooks: result.totalBooks,
            };
        } catch (error) {
            set.status = 500;
            requestLogger.error(
                {
                    user_id,
                    requesterUserId: session.user.id,
                    durationMs: Date.now() - startedAt,
                    error: toErrorDetails(error),
                },
                'loans.totalBooks.error',
            );
            return {
                ok: false,
                message: 'Failed to fetch total borrowed books due to an unexpected error.',
            };
        }
    }, {
        params: z.object({
            user_id: z.string(),
        }),
        response: z.union([
            z.object({
                ok: z.literal(true),
                user_id: z.string(),
                totalBooks: z.number(),
            }),
            LoanAccessDeniedSchema,
        ]),
    })
    .get("/users/:user_id/active-count", async ({ params, session, set, request }) => {
        const startedAt = Date.now();
        const requestId = getOrCreateRequestId(request);
        const requestLogger = buildRequestLogger(request, requestId);
        const user_id = params.user_id;

        requestLogger.debug(
            {
                user_id,
                requesterUserId: session.user.id,
                requesterRole: session.user.role ?? null,
            },
            'loans.activeCount.start',
        );

        const canAccessUserData = session.user.id === user_id || session.user.role === "admin";

        if (!canAccessUserData) {
            set.status = 403;
            requestLogger.warn(
                {
                    user_id,
                    requesterUserId: session.user.id,
                    requesterRole: session.user.role ?? null,
                    durationMs: Date.now() - startedAt,
                },
                'loans.activeCount.forbidden',
            );
            return {
                ok: false,
                message: 'You are not authorized to access this user data.',
            };
        }

        try {
            const orphanLoansDeleted = await runOrphanCleanupForRead({
                requestLogger,
                route: 'loans.activeCount',
            });

            const [result] = await db
                .select({ activeLoans: count(loan.id) })
                .from(loan)
                .where(
                    and(
                        eq(loan.user_id, user_id),
                        inArray(loan.status, ["active", "overdue"]),
                    ),
                );

            requestLogger.info(
                {
                    user_id,
                    requesterUserId: session.user.id,
                    activeLoans: result.activeLoans,
                    orphanLoansDeleted,
                    durationMs: Date.now() - startedAt,
                },
                'loans.activeCount.success',
            );

            return {
                ok: true,
                user_id,
                activeLoans: result.activeLoans,
            };
        } catch (error) {
            set.status = 500;
            requestLogger.error(
                {
                    user_id,
                    requesterUserId: session.user.id,
                    durationMs: Date.now() - startedAt,
                    error: toErrorDetails(error),
                },
                'loans.activeCount.error',
            );
            return {
                ok: false,
                message: 'Failed to fetch active loans due to an unexpected error.',
            };
        }
    }, {
        params: z.object({
            user_id: z.string(),
        }),
        response: z.union([
            z.object({
                ok: z.literal(true),
                user_id: z.string(),
                activeLoans: z.number(),
            }),
            LoanAccessDeniedSchema,
        ]),
    })
    .get("/users/:user_id/current", async ({ params, session, set, request }) => {
        const startedAt = Date.now();
        const requestId = getOrCreateRequestId(request);
        const requestLogger = buildRequestLogger(request, requestId);
        const user_id = params.user_id;

        requestLogger.debug(
            {
                user_id,
                requesterUserId: session.user.id,
                requesterRole: session.user.role ?? null,
            },
            'loans.current.start',
        );

        const canAccessUserData = session.user.id === user_id || session.user.role === "admin";

        if (!canAccessUserData) {
            set.status = 403;
            requestLogger.warn(
                {
                    user_id,
                    requesterUserId: session.user.id,
                    requesterRole: session.user.role ?? null,
                    durationMs: Date.now() - startedAt,
                },
                'loans.current.forbidden',
            );
            return {
                ok: false,
                message: 'You are not authorized to access this user data.',
            };
        }

        try {
            const orphanLoansDeleted = await runOrphanCleanupForRead({
                requestLogger,
                route: 'loans.current',
            });

            const currentLoans = await db
                .select({
                    loan_id: loan.id,
                    book_id: loan.book_id,
                    title: bookTable.title,
                    genre: bookTable.genre,
                    publication_year: bookTable.publication_year,
                    checkout_date: loan.checkout_date,
                    due_date: loan.due_date,
                    status: loan.status,
                })
                .from(loan)
                .innerJoin(bookTable, eq(loan.book_id, bookTable.id))
                .where(
                    and(
                        eq(loan.user_id, user_id),
                        inArray(loan.status, ["active", "overdue"]),
                    ),
                )
                .orderBy(asc(loan.due_date));

            requestLogger.info(
                {
                    user_id,
                    requesterUserId: session.user.id,
                    returnedCount: currentLoans.length,
                    orphanLoansDeleted,
                    durationMs: Date.now() - startedAt,
                },
                'loans.current.success',
            );

            return {
                ok: true,
                user_id,
                loans: currentLoans,
            };
        } catch (error) {
            set.status = 500;
            requestLogger.error(
                {
                    user_id,
                    requesterUserId: session.user.id,
                    durationMs: Date.now() - startedAt,
                    error: toErrorDetails(error),
                },
                'loans.current.error',
            );
            return {
                ok: false,
                message: 'Failed to fetch current loans due to an unexpected error.',
            };
        }
    }, {
        params: z.object({
            user_id: z.string(),
        }),
        response: z.union([
            z.object({
                ok: z.literal(true),
                user_id: z.string(),
                loans: z.array(CurrentLoanSchema),
            }),
            LoanAccessDeniedSchema,
        ]),
    })
    .post("/:id/borrow", async ({ params, session, set, request }) => {
        const startedAt = Date.now();
        const requestId = getOrCreateRequestId(request);
        const requestLogger = buildRequestLogger(request, requestId);
        const book_id = params.id;

        requestLogger.debug(
            {
                book_id,
                userId: session.user.id,
            },
            'loans.borrow.start',
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
                        userId: session.user.id,
                        durationMs: Date.now() - startedAt,
                    },
                    'loans.borrow.book_not_found',
                );
                return { message: `Book with ID ${book_id} was not found.`, ok: false };
            }

            const activeLoanForBook = await db
                .select({ id: loan.id })
                .from(loan)
                .where(and(eq(loan.book_id, book_id), eq(loan.status, "active")))
                .limit(1);

            if (activeLoanForBook.length > 0) {
                set.status = 409;
                requestLogger.warn(
                    {
                        book_id,
                        userId: session.user.id,
                        durationMs: Date.now() - startedAt,
                    },
                    'loans.borrow.conflict.already_borrowed',
                );
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

            requestLogger.info(
                {
                    book_id,
                    userId: session.user.id,
                    checkoutAt: checkoutAt.toISOString(),
                    dueAt: dueAt.toISOString(),
                    durationMs: Date.now() - startedAt,
                },
                'loans.borrow.success',
            );
            return { message: `Book with ID ${book_id} has been borrowed successfully.`, ok: true };
        } catch (error) {
            set.status = 500;
            requestLogger.error(
                {
                    book_id,
                    userId: session.user.id,
                    durationMs: Date.now() - startedAt,
                    error: toErrorDetails(error),
                },
                'loans.borrow.error',
            );
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
    .post("/:id/renew", async ({ params, session, set, request }) => {
        const startedAt = Date.now();
        const requestId = getOrCreateRequestId(request);
        const requestLogger = buildRequestLogger(request, requestId);
        const loan_id = params.id;

        requestLogger.debug(
            {
                loan_id,
                userId: session.user.id,
            },
            'loans.renew.start',
        );

        try {
            const activeLoan = await db
                .select({ id: loan.id, due_date: loan.due_date })
                .from(loan)
                .where(and(eq(loan.id, loan_id), eq(loan.user_id, session.user.id), eq(loan.status, "active")))
                .limit(1);

            if (activeLoan.length === 0) {
                set.status = 404;
                requestLogger.warn(
                    {
                        loan_id,
                        userId: session.user.id,
                        durationMs: Date.now() - startedAt,
                    },
                    'loans.renew.not_found.active_loan',
                );
                return { message: `No active loan found with ID ${loan_id} for the current user.`, ok: false };
            }

            const previousDueAt = activeLoan[0].due_date;
            const renewedDueAt = new Date(Date.now() + TIME_LENGTH_DUE_DATE);

            await db.update(loan)
                .set({ due_date: renewedDueAt })
                .where(eq(loan.id, loan_id));

            requestLogger.info(
                {
                    loan_id,
                    userId: session.user.id,
                    previousDueAt: previousDueAt?.toISOString() ?? null,
                    renewedDueAt: renewedDueAt.toISOString(),
                    durationMs: Date.now() - startedAt,
                },
                'loans.renew.success',
            );
            return { message: `Loan with ID ${loan_id} has been renewed successfully.`, ok: true };
        } catch (error) {
            set.status = 500;
            requestLogger.error(
                {
                    loan_id,
                    userId: session.user.id,
                    durationMs: Date.now() - startedAt,
                    error: toErrorDetails(error),
                },
                'loans.renew.error',
            );
            return { message: 'Failed to renew loan due to an unexpected error.', ok: false };
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
    .post("/:id/return", async ({ params, session, set, request }) => {
        const startedAt = Date.now();
        const requestId = getOrCreateRequestId(request);
        const requestLogger = buildRequestLogger(request, requestId);
        const book_id = params.id;

        requestLogger.debug(
            {
                book_id,
                userId: session.user.id,
            },
            'loans.return.start',
        );

        try {
            const activeLoan = await db
                .select({ id: loan.id })
                .from(loan)
                .where(and(eq(loan.book_id, book_id), eq(loan.user_id, session.user.id), eq(loan.status, "active")))
                .limit(1);

            if (activeLoan.length === 0) {
                set.status = 404;
                requestLogger.warn(
                    {
                        book_id,
                        userId: session.user.id,
                        durationMs: Date.now() - startedAt,
                    },
                    'loans.return.not_found.active_loan',
                );
                return { message: `No active loan found for book with ID ${book_id} for the current user.`, ok: false };
            }

            await db.update(loan)
                .set({ status: "returned", returned_at: new Date() })
                .where(eq(loan.id, activeLoan[0].id));

            requestLogger.info(
                {
                    book_id,
                    userId: session.user.id,
                    loanId: activeLoan[0].id,
                    durationMs: Date.now() - startedAt,
                },
                'loans.return.success',
            );
            return { message: `Book with ID ${book_id} has been returned successfully.`, ok: true };
        } catch (error) {
            set.status = 500;
            requestLogger.error(
                {
                    book_id,
                    userId: session.user.id,
                    durationMs: Date.now() - startedAt,
                    error: toErrorDetails(error),
                },
                'loans.return.error',
            );
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
    .put("/:id/force-return", async ({ params, set, request }) => {
        const startedAt = Date.now();
        const requestId = getOrCreateRequestId(request);
        const requestLogger = buildRequestLogger(request, requestId);
        const loan_id = params.id;

        requestLogger.debug(
            {
                loan_id,
            },
            'loans.forceReturn.start',
        );

        try {
            const existingLoan = await db
                .select({
                    id: loan.id,
                    status: loan.status,
                    returned_at: loan.returned_at,
                })
                .from(loan)
                .where(eq(loan.id, loan_id))
                .limit(1);

            if (existingLoan.length === 0) {
                set.status = 404;
                requestLogger.warn(
                    {
                        loan_id,
                        durationMs: Date.now() - startedAt,
                    },
                    'loans.forceReturn.not_found',
                );
                return {
                    ok: false,
                    message: `Loan with ID ${loan_id} was not found.`,
                };
            }

            const currentLoan = existingLoan[0];

            if (currentLoan.status === "returned") {
                requestLogger.info(
                    {
                        loan_id,
                        durationMs: Date.now() - startedAt,
                    },
                    'loans.forceReturn.noop.already_returned',
                );
                return {
                    ok: true,
                    message: `Loan with ID ${loan_id} is already returned.`,
                    loan: {
                        id: currentLoan.id,
                        previous_status: currentLoan.status,
                        new_status: currentLoan.status,
                        returned_at: currentLoan.returned_at,
                    },
                };
            }

            const forcedReturn = await db
                .update(loan)
                .set({ status: "returned", returned_at: new Date() })
                .where(eq(loan.id, loan_id))
                .returning({
                    id: loan.id,
                    status: loan.status,
                    returned_at: loan.returned_at,
                });

            requestLogger.info(
                {
                    loan_id,
                    previousStatus: currentLoan.status,
                    newStatus: forcedReturn[0].status,
                    durationMs: Date.now() - startedAt,
                },
                'loans.forceReturn.success',
            );
            return {
                ok: true,
                message: `Loan with ID ${loan_id} has been force-returned successfully.`,
                loan: {
                    id: forcedReturn[0].id,
                    previous_status: currentLoan.status,
                    new_status: forcedReturn[0].status,
                    returned_at: forcedReturn[0].returned_at,
                },
            };
        } catch (error) {
            set.status = 500;
            requestLogger.error(
                {
                    loan_id,
                    durationMs: Date.now() - startedAt,
                    error: toErrorDetails(error),
                },
                'loans.forceReturn.error',
            );
            return { message: 'Failed to force return loan due to an unexpected error.', ok: false };
        }
    }, {
        params: z.object({
            id: z.string(),
        }),
        response: z.union([
            z.object({
                ok: z.literal(true),
                message: z.string(),
                loan: z.object({
                    id: z.string(),
                    previous_status: z.enum(["active", "returned", "overdue"]),
                    new_status: z.enum(["active", "returned", "overdue"]),
                    returned_at: z.date().nullable(),
                }),
            }),
            z.object({
                ok: z.literal(false),
                message: z.string(),
            }),
        ])
    })
    .delete("/:id", async ({ params, set, request }) => {
        const startedAt = Date.now();
        const requestId = getOrCreateRequestId(request);
        const requestLogger = buildRequestLogger(request, requestId);
        const loan_id = params.id;

        requestLogger.debug(
            {
                loan_id,
            },
            'loans.delete.start',
        );

        try {
            const existingLoan = await db
                .select({
                    id: loan.id,
                    status: loan.status,
                })
                .from(loan)
                .where(eq(loan.id, loan_id))
                .limit(1);

            if (existingLoan.length === 0) {
                set.status = 404;
                requestLogger.warn(
                    {
                        loan_id,
                        durationMs: Date.now() - startedAt,
                    },
                    'loans.delete.not_found',
                );
                return {
                    ok: false,
                    message: `Loan with ID ${loan_id} was not found.`,
                };
            }

            const currentLoan = existingLoan[0];

            await db
                .delete(loan)
                .where(eq(loan.id, loan_id));

            requestLogger.info(
                {
                    loan_id,
                    previousStatus: currentLoan.status,
                    durationMs: Date.now() - startedAt,
                },
                'loans.delete.success',
            );
            return {
                ok: true,
                message: `Loan with ID ${loan_id} has been deleted successfully.`,
                loan: {
                    id: currentLoan.id,
                    previous_status: currentLoan.status,
                },
            };
        } catch (error) {
            set.status = 500;
            requestLogger.error(
                {
                    loan_id,
                    durationMs: Date.now() - startedAt,
                    error: toErrorDetails(error),
                },
                'loans.delete.error',
            );
            return { message: 'Failed to delete loan due to an unexpected error.', ok: false };
        }
    }, {
        params: z.object({
            id: z.string(),
        }),
        response: z.union([
            z.object({
                ok: z.literal(true),
                message: z.string(),
                loan: z.object({
                    id: z.string(),
                    previous_status: z.enum(["active", "returned", "overdue"]),
                }),
            }),
            z.object({
                ok: z.literal(false),
                message: z.string(),
            }),
        ])
    });

export { loans };