"use client";

import { Suspense } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { CalendarClock, CircleAlert, LibraryBig, RotateCcw, Undo2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { authClient } from "@/lib/auth-client";
import { capitalizeFirstLetter } from "@/lib/utils";

type SessionResponse = Awaited<ReturnType<typeof authClient.getSession>>;
type SessionUser = NonNullable<SessionResponse["data"]>["user"];

type CurrentLoan = {
    loan_id: string;
    book_id: string;
    title: string;
    genre: string;
    publication_year: number;
    checkout_date: Date | string;
    due_date: Date | string;
    status: "active" | "overdue" | "returned";
};

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

function useLoansSession() {
    return useSuspenseQuery({
        queryKey: ["loans-session"],
        queryFn: async () => {
            try {
                const session = await authClient.getSession();
                return {
                    user: (session?.data?.user ?? null) as SessionUser | null,
                    hasSessionError: false,
                };
            } catch (error) {
                console.error("Failed to load loans session", error);
                return {
                    user: null,
                    hasSessionError: true,
                };
            }
        },
    });
}

function LoansContent() {
    const router = useRouter();
    const { data: sessionState } = useLoansSession();
    const user = sessionState.user;

    const { data } = useSuspenseQuery({
        queryKey: ["current-loans", user?.id],
        queryFn: async (): Promise<{
            ok: boolean;
            message?: string;
            loans: CurrentLoan[];
        }> => {
            if (!user?.id) {
                return {
                    ok: false,
                    message: sessionState.hasSessionError
                        ? "Could not reach auth service."
                        : "Log in to view your loans.",
                    loans: [],
                };
            }

            const response = await api.loans.users({ user_id: user.id }).current.get();

            if (response.error) {
                return {
                    ok: false,
                    message: "Failed to load current loans.",
                    loans: [],
                };
            }

            if (response.data?.ok) {
                const currentLoans = response.data.loans.filter(
                    (loan) => loan.status === "active" || loan.status === "overdue",
                );

                return {
                    ok: true,
                    loans: currentLoans,
                };
            }

            return {
                ok: false,
                message: response.data?.message ?? "Failed to load current loans.",
                loans: [],
            };
        },
    });

    if (!data.ok) {
        return (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                <div className="flex items-center gap-2 font-medium">
                    <CircleAlert size={16} />
                    Unable to load loans
                </div>
                <p className="mt-2">{data.message}</p>
            </div>
        );
    }

    if (data.loans.length === 0) {
        return (
            <div className="rounded-2xl border border-stone-200 bg-white p-8 text-center">
                <LibraryBig size={26} className="mx-auto mb-3 text-stone-400" />
                <h2 className="text-lg font-semibold text-stone-900">No current loans</h2>
                <p className="mt-1 text-sm text-stone-500">
                    You do not have any active or overdue books right now.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {data.loans.map((loan) => (
                <article
                    key={loan.loan_id}
                    className="rounded-2xl border border-stone-200 bg-white p-4"
                >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                            <h2 className="truncate text-base font-semibold text-stone-900">{loan.title}</h2>
                            <p className="mt-1 text-xs text-stone-500">
                                {loan.genre} · Published {loan.publication_year} · Book #{loan.book_id}
                            </p>
                        </div>
                        <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getStatusTone(loan.status)}`}
                        >
                            {loan.status.toUpperCase()}
                        </span>
                    </div>

                    <div className="mt-3 grid gap-2 text-sm text-stone-600 sm:grid-cols-2">
                        <p className="flex items-center gap-2">
                            <CalendarClock size={15} className="text-stone-400" />
                            Borrowed: {formatDate(loan.checkout_date)}
                        </p>
                        <p className="flex items-center gap-2">
                            <CalendarClock size={15} className="text-stone-400" />
                            Due: {formatDate(loan.due_date)}
                        </p>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                        <button
                            type="button"
                            className="inline-flex items-center gap-2 rounded-lg bg-orange-100 px-3 py-2 text-sm font-medium text-orange-700 transition-colors hover:bg-orange-200"
                            onClick={() => router.push(`/loan/${loan.loan_id}`)}
                        >
                            <RotateCcw size={14} />
                            Renew
                        </button>
                        <button
                            type="button"
                            className="inline-flex items-center gap-2 rounded-lg bg-green-100 px-3 py-2 text-sm font-medium text-green-700 transition-colors hover:bg-green-200"
                            onClick={() => router.push(`/loan/${loan.loan_id}`)}
                        >
                            <Undo2 size={14} />
                            Return
                        </button>
                    </div>
                </article>
            ))}
        </div>
    );
}

function LoansPageSkeleton() {
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
                    <div className="mt-4 flex gap-2">
                        <Skeleton className="h-9 w-24" />
                        <Skeleton className="h-9 w-24" />
                    </div>
                </div>
            ))}
        </div>
    );
}

export default function LoansPage() {
    return (
        <div className="min-h-screen">
            <div className="mx-auto max-w-5xl px-6 py-8">
                <header className="mb-6">
                    <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                        Library Account
                    </p>
                    <h1 className="mt-1 text-3xl font-bold text-stone-900">Current Loans</h1>
                    <p className="mt-2 text-sm text-stone-600">
                        View all currently borrowed books and quickly open renew or return actions.
                    </p>
                </header>

                <Suspense fallback={<LoansPageSkeleton />}>
                    <LoansContent />
                </Suspense>
            </div>
        </div>
    );
}
