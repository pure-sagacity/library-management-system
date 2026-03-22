"use client";

import { Suspense } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeft, Calendar, Clock3, UserRound } from "lucide-react";
import { useParams } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { api, getAuthErrorMessage } from "@/lib/api";

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
            delayChildren: 0.08,
        },
    },
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.45,
            ease: "easeOut" as const,
        },
    },
};

const formatDate = (date: Date | null) => {
    if (!date) {
        return "-";
    }

    return new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
    }).format(new Date(date));
};

export default function BookHistory() {
    const params = useParams<{ id?: string | string[] }>();
    const id = Array.isArray(params.id) ? params.id[0] : params.id;

    if (!id) {
        return (
            <div className="min-h-screen px-6 py-16 bg-white">
                <p className="max-w-5xl mx-auto font-sans text-sm text-gray-600">
                    Book ID is missing from the URL.
                </p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white">
            <motion.div
                className="max-w-5xl px-6 py-16 mx-auto"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                <Suspense fallback={<BookHistoryHeaderSkeleton id={id} />}>
                    <BookHistoryHeader id={id} />
                </Suspense>

                <motion.section className="mt-8" variants={itemVariants}>
                    <Suspense fallback={<BookHistoryListSkeleton />}>
                        <BookHistoryList id={id} />
                    </Suspense>
                </motion.section>
            </motion.div>
        </div>
    );
}

function BookHistoryHeader({ id }: { id: string }) {
    const { data: result } = useSuspenseQuery({
        queryKey: ["book", id],
        queryFn: async () => {
            const response = await api.books({ id }).get();

            if (response.error) {
                return {
                    ok: false as const,
                    message: getAuthErrorMessage(
                        response.error.value ?? response.error,
                        "Failed to load this book.",
                    ),
                };
            }

            if (!response.data) {
                return {
                    ok: false as const,
                    message: "Book not found.",
                };
            }

            return {
                ok: true as const,
                book: response.data,
            };
        },
    });

    if (!result.ok) {
        return (
            <motion.div variants={itemVariants}>
                <p className="font-sans text-sm text-red-600">{result.message}</p>
            </motion.div>
        );
    }

    return (
        <>
            <motion.div variants={itemVariants}>
                <Link
                    href={`/book/${id}`}
                    className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 transition-colors hover:text-orange-600"
                >
                    <ArrowLeft size={16} />
                    Back to book details
                </Link>
            </motion.div>

            <motion.div className="mt-6" variants={itemVariants}>
                <p className="font-sans text-xs font-semibold tracking-widest text-orange-500 uppercase">
                    Loan History
                </p>
                <h1 className="mt-2 text-3xl font-bold leading-tight text-gray-900 sm:text-4xl">
                    {result.book.title}
                </h1>
            </motion.div>

            <motion.div className="mt-8 flex items-center gap-3" variants={itemVariants}>
                <div className="flex-1 h-px bg-gray-200" />
                <Clock3 size={17} className="text-orange-400" />
                <div className="flex-1 h-px bg-gray-200" />
            </motion.div>
        </>
    );
}

function BookHistoryList({ id }: { id: string }) {
    const { data: result } = useSuspenseQuery({
        queryKey: ["book-loans", id],
        queryFn: async () => {
            const response = await api.books({ id }).loans.get();

            if (response.error) {
                return {
                    ok: false as const,
                    message: getAuthErrorMessage(
                        response.error.value ?? response.error,
                        "Failed to load this book's loan history.",
                    ),
                };
            }

            return {
                ok: true as const,
                loans: response.data ?? [],
            };
        },
    });

    if (!result.ok) {
        return (
            <p className="font-sans text-sm text-red-600">{result.message}</p>
        );
    }

    if (result.loans.length === 0) {
        return (
            <p className="font-sans text-sm text-gray-500">
                No loan history available for this book.
            </p>
        );
    }

    return (
        <ul className="space-y-4">
            {result.loans.map((entry) => (
                <motion.li
                    key={entry.id}
                    className="p-5 border border-gray-200 rounded-2xl"
                    variants={itemVariants}
                >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${entry.status === "active"
                            ? "bg-amber-100 text-amber-700"
                            : entry.status === "overdue"
                                ? "bg-rose-100 text-rose-700"
                                : "bg-emerald-100 text-emerald-700"
                            }`}>
                            {entry.status}
                        </span>
                        <span className="font-sans text-xs text-gray-500">
                            Loan ID: {entry.id}
                        </span>
                    </div>

                    <div className="grid grid-cols-1 gap-3 mt-4 font-sans text-sm text-gray-700 sm:grid-cols-2">
                        <div className="flex items-center gap-2">
                            <Calendar size={14} className="text-orange-500" />
                            Checked out: {formatDate(entry.checkout_date)}
                        </div>
                        <div className="flex items-center gap-2">
                            <Calendar size={14} className="text-orange-500" />
                            Due: {formatDate(entry.due_date)}
                        </div>
                        <div className="flex items-center gap-2 sm:col-span-2">
                            <Clock3 size={14} className="text-orange-500" />
                            Returned: {formatDate(entry.returned_at)}
                        </div>
                        <div className="flex items-center gap-2 sm:col-span-2">
                            <UserRound size={14} className="text-orange-500" />
                            User ID: {entry.user_id}
                        </div>
                    </div>
                </motion.li>
            ))}
        </ul>
    );
}

function BookHistoryHeaderSkeleton({ id }: { id: string }) {
    return (
        <>
            <motion.div variants={itemVariants}>
                <Link
                    href={`/book/${id}`}
                    className="inline-flex items-center gap-2 text-sm font-medium text-gray-600"
                >
                    <ArrowLeft size={16} />
                    Back to book details
                </Link>
            </motion.div>

            <motion.div className="mt-6 space-y-3" variants={itemVariants}>
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-10 w-2/3" />
            </motion.div>

            <motion.div className="mt-8" variants={itemVariants}>
                <Skeleton className="h-px w-full" />
            </motion.div>
        </>
    );
}

function BookHistoryListSkeleton() {
    return (
        <ul className="space-y-4">
            {Array.from({ length: 3 }, (_, index) => (
                <li key={`book-history-skeleton-${index}`} className="p-5 border border-gray-200 rounded-2xl space-y-4">
                    <div className="flex justify-between gap-3">
                        <Skeleton className="h-6 w-24 rounded-full" />
                        <Skeleton className="h-4 w-20" />
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <Skeleton className="h-4 w-40" />
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-4 w-44 sm:col-span-2" />
                        <Skeleton className="h-4 w-36 sm:col-span-2" />
                    </div>
                </li>
            ))}
        </ul>
    );
}
