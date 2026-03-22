"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Calendar, Clock3, UserRound } from "lucide-react";
import { useParams } from "next/navigation";
import { Spinner } from "@/components/ui/spinner";
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

    const {
        data: book,
        isLoading: isBookLoading,
        isError: isBookError,
        error: bookError,
    } = useQuery({
        queryKey: ["book", id],
        enabled: Boolean(id),
        queryFn: async () => {
            if (!id) {
                throw new Error("Book ID is missing from the route.");
            }

            const response = await api.books({ id }).get();

            if (response.error) {
                throw new Error(
                    getAuthErrorMessage(
                        response.error.value ?? response.error,
                        "Failed to load this book.",
                    ),
                );
            }

            if (!response.data) {
                throw new Error("Book not found.");
            }

            return response.data;
        },
    });

    const {
        data: loanHistory,
        isLoading: isLoansLoading,
        isError: isLoansError,
        error: loansError,
    } = useQuery({
        queryKey: ["book-loans", id],
        enabled: Boolean(id),
        queryFn: async () => {
            if (!id) {
                throw new Error("Book ID is missing from the route.");
            }

            const response = await api.books({ id }).loans.get();

            if (response.error) {
                throw new Error(
                    getAuthErrorMessage(
                        response.error.value ?? response.error,
                        "Failed to load this book's loan history.",
                    ),
                );
            }

            return response.data ?? [];
        },
    });

    if (!id) {
        return (
            <div className="min-h-screen px-6 py-16 bg-white">
                <p className="max-w-5xl mx-auto font-sans text-sm text-gray-600">
                    Book ID is missing from the URL.
                </p>
            </div>
        );
    }

    if (isBookLoading || isLoansLoading) {
        return (
            <div className="min-h-screen px-6 py-16 bg-white">
                <Spinner className="w-8 h-8 mx-auto text-orange-500" />
            </div>
        );
    }

    if (isBookError || !book) {
        return (
            <div className="min-h-screen px-6 py-16 bg-white">
                <p className="max-w-5xl mx-auto font-sans text-sm text-red-600">
                    {bookError instanceof Error ? bookError.message : "Book not found."}
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
                        {book.title}
                    </h1>
                </motion.div>

                <motion.div className="mt-8 flex items-center gap-3" variants={itemVariants}>
                    <div className="flex-1 h-px bg-gray-200" />
                    <Clock3 size={17} className="text-orange-400" />
                    <div className="flex-1 h-px bg-gray-200" />
                </motion.div>

                <motion.section className="mt-8" variants={itemVariants}>
                    {isLoansError ? (
                        <p className="font-sans text-sm text-red-600">
                            {loansError instanceof Error ? loansError.message : "Could not load loan history."}
                        </p>
                    ) : (loanHistory?.length ?? 0) === 0 ? (
                        <p className="font-sans text-sm text-gray-500">
                            No loan history available for this book.
                        </p>
                    ) : (
                        <ul className="space-y-4">
                            {loanHistory?.map((entry) => (
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
                    )}
                </motion.section>
            </motion.div>
        </div>
    );
}
