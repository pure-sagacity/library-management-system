const TIME_LENGTH_DUE_DATE = 14 * 24 * 60 * 60 * 1000; // 14 Days in Milliseconds

import { Elysia } from 'elysia'
import z from "zod";
import { protectRoute, requireAdmin } from '@/middleware/protect';
import { db } from '@/lib/db';
import { book as bookTable, loan } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import { buildRequestLogger, getOrCreateRequestId, toErrorDetails } from '@/lib/logger';

const loans = new Elysia({ prefix: '/loans' })
    .use(protectRoute)
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