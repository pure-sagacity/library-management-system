"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { CalendarClock, CircleAlert, History, LibraryBig } from "lucide-react";
import { Suspense, useMemo, useState } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";
import { api } from "@/lib/api";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { capitalizeFirstLetter } from "@/lib/utils";

type SessionResponse = Awaited<ReturnType<typeof authClient.getSession>>;
type SessionUser = NonNullable<SessionResponse["data"]>["user"];

type CurrentLoan = {
    loan_id: string;
    book_id: string;
    title: string;
    genre: string;
    publication_year: number;
    checkout_date: Date;
    due_date: Date;
    status: "active" | "overdue" | "returned";
};

const HISTORY_PAGE_SIZE = 8;

const formatDate = (value: Date | string | null | undefined) => {
    if (!value) return "-";
    return new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
    }).format(new Date(value));
};

const getStatusTone = (status: CurrentLoan["status"]) => {
    switch (status) {
        case "active":
            return "bg-emerald-100 text-emerald-700";
        case "overdue":
            return "bg-red-100 text-red-700";
        case "returned":
            return "bg-stone-200 text-stone-700";
        default:
            return "bg-stone-200 text-stone-700";
    }
};

function useHistorySession() {
    return useSuspenseQuery({
        queryKey: ["history-session"],
        queryFn: async () => {
            try {
                const session = await authClient.getSession();
                return {
                    user: (session?.data?.user ?? null) as SessionUser | null,
                    hasSessionError: false,
                };
            } catch (error) {
                console.error("Failed to load history session", error);
                return {
                    user: null,
                    hasSessionError: true,
                };
            }
        },
    });
}

function HistoryContent() {
    const router = useRouter();
    const [page, setPage] = useState(1);

    const { data: sessionState } = useHistorySession();
    const user = sessionState.user;

    const { data } = useSuspenseQuery({
        queryKey: ["loan-history", user?.id, page, HISTORY_PAGE_SIZE],
        queryFn: async (): Promise<{
            ok: boolean;
            message?: string;
            loans: CurrentLoan[];
            pagination: {
                page: number;
                limit: number;
                total: number;
                totalPages: number;
            };
        }> => {
            if (!user?.id) {
                return {
                    ok: false,
                    message: sessionState.hasSessionError
                        ? "Could not reach auth service."
                        : "Log in to view your loan history.",
                    loans: [],
                    pagination: {
                        page: 1,
                        limit: HISTORY_PAGE_SIZE,
                        total: 0,
                        totalPages: 1,
                    },
                };
            }

            const response = await api.loans.users({ user_id: user.id }).history.get({
                query: {
                    page,
                    limit: HISTORY_PAGE_SIZE,
                },
            });

            if (response.error) {
                return {
                    ok: false,
                    message: "Failed to load loan history.",
                    loans: [],
                    pagination: {
                        page: 1,
                        limit: HISTORY_PAGE_SIZE,
                        total: 0,
                        totalPages: 1,
                    },
                };
            }

            if (response.data?.ok) {
                return {
                    ok: true,
                    loans: response.data.loans,
                    pagination: response.data.pagination,
                };
            }

            return {
                ok: false,
                message: response.data?.message ?? "Failed to load loan history.",
                loans: [],
                pagination: {
                    page: 1,
                    limit: HISTORY_PAGE_SIZE,
                    total: 0,
                    totalPages: 1,
                },
            };
        },
    });

    const groupedLoans = useMemo(() => {
        return data.loans.reduce<Record<string, CurrentLoan[]>>((groups, loan) => {
            const key = formatDate(loan.checkout_date);

            if (!groups[key]) {
                groups[key] = [];
            }

            groups[key].push(loan);
            return groups;
        }, {});
    }, [data.loans]);

    if (!data.ok) {
        return (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                <div className="flex items-center gap-2 font-medium">
                    <CircleAlert size={16} />
                    Unable to load history
                </div>
                <p className="mt-2">{data.message}</p>
            </div>
        );
    }

    if (data.loans.length === 0) {
        return (
            <div className="rounded-2xl border border-stone-200 bg-white p-8 text-center">
                <LibraryBig size={26} className="mx-auto mb-3 text-stone-400" />
                <h2 className="text-lg font-semibold text-stone-900">No loan activity yet</h2>
                <p className="mt-1 text-sm text-stone-500">Once you borrow a book, it will appear here.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {Object.entries(groupedLoans).map(([dateLabel, loans], groupIndex) => (
                <section key={dateLabel}>
                    <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-stone-500">
                        {dateLabel}
                    </h2>
                    <div className="space-y-3">
                        {loans.map((loan, loanIndex) => {
                            const animationIndex = groupIndex * HISTORY_PAGE_SIZE + loanIndex;

                            return (
                                <motion.article
                                    key={loan.loan_id}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.2, delay: animationIndex * 0.02 }}
                                    className="rounded-2xl border border-stone-200 bg-white p-4"
                                    onClick={() => router.push(`/loan/${loan.loan_id}`)}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <h3 className="truncate text-base font-semibold text-stone-900">{loan.title}</h3>
                                            <p className="mt-1 text-xs text-stone-500">
                                                {loan.genre} · Published {loan.publication_year} · Book #{loan.book_id}
                                            </p>
                                        </div>
                                        <span
                                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getStatusTone(
                                                loan.status
                                            )}`}
                                        >
                                            {capitalizeFirstLetter(loan.status)}
                                        </span>
                                    </div>

                                    <div className="mt-3 grid gap-2 text-sm text-stone-600 sm:grid-cols-2">
                                        <p className="flex items-center gap-2">
                                            <History size={15} className="text-stone-400" />
                                            Borrowed: {formatDate(loan.checkout_date)}
                                        </p>
                                        <p className="flex items-center gap-2">
                                            <CalendarClock size={15} className="text-stone-400" />
                                            Due: {formatDate(loan.due_date)}
                                        </p>
                                    </div>
                                </motion.article>
                            );
                        })}
                    </div>
                </section>
            ))}

            {data.pagination.totalPages > 1 && (
                <div className="space-y-2">
                    <p className="text-center text-xs text-stone-500">
                        Page {data.pagination.page} of {data.pagination.totalPages} · {data.pagination.total} total loans
                    </p>
                    <Pagination>
                        <PaginationContent>
                            <PaginationItem>
                                <PaginationPrevious
                                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                                    disabled={data.pagination.page <= 1}
                                />
                            </PaginationItem>
                            <PaginationItem>
                                <PaginationNext
                                    onClick={() =>
                                        setPage((current) => Math.min(data.pagination.totalPages, current + 1))
                                    }
                                    disabled={data.pagination.page >= data.pagination.totalPages}
                                />
                            </PaginationItem>
                        </PaginationContent>
                    </Pagination>
                </div>
            )}
        </div>
    );
}

function HistoryPageSkeleton() {
    return (
        <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, idx) => (
                <div key={idx} className="rounded-2xl border border-stone-200 bg-white p-4">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="mt-2 h-4 w-64" />
                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                        <Skeleton className="h-4 w-40" />
                        <Skeleton className="h-4 w-36" />
                    </div>
                </div>
            ))}
        </div>
    );
}

export default function HistoryPage() {
    return (
        <div className="min-h-screen">
            <div className="mx-auto max-w-5xl px-6 py-8">
                <header className="mb-6">
                    <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">Library Account</p>
                    <h1 className="mt-1 text-3xl font-bold text-stone-900">Loan History</h1>
                    <p className="mt-2 text-sm text-stone-600">Track your currently borrowed books and due dates.</p>
                </header>

                <Suspense fallback={<HistoryPageSkeleton />}>
                    <HistoryContent />
                </Suspense>
            </div>
        </div>
    );
}
