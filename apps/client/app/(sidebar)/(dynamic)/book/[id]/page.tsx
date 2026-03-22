"use client";

import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { BookOpen, Calendar, Clock, Hash, Pencil, Tag } from "lucide-react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { api, getAuthErrorMessage } from "@/lib/api";

function MetaItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
    return (
        <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-gray-400 uppercase tracking-widest text-xs font-semibold">
                {icon}
                {label}
            </div>
            <p className="text-sm font-medium text-gray-800">{value}</p>
        </div>
    );
}

export default function Book() {
    const params = useParams<{ id?: string | string[] }>();
    const id = Array.isArray(params.id) ? params.id[0] : params.id;

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

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.15,
                delayChildren: 0.1,
            },
        },
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 24 },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                duration: 0.6,
                ease: "easeOut" as const,
            },
        },
    };

    const { data: book, isLoading, isError, error } = useQuery({
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

    const { data: summaryData, isLoading: summaryLoading } = useQuery({
        queryKey: ["book-summary", id],
        enabled: Boolean(id),
        queryFn: async () => {
            if (!id) {
                return {
                    source: null,
                    summary: null,
                };
            }

            const response = await api.books({ id }).summary.get();

            if (response.error) {
                return {
                    source: null,
                    summary: null,
                };
            }

            return response.data ?? {
                source: null,
                summary: null,
            };
        },
    });

    const {
        data: loanHistory,
        isLoading: loansLoading,
        isError: isLoansError,
    } = useQuery({
        queryKey: ["book-loans", id],
        enabled: Boolean(id),
        queryFn: async () => {
            if (!id) {
                return [];
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
                <p className="max-w-3xl mx-auto font-sans text-sm text-gray-600">
                    Book ID is missing from the URL.
                </p>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="min-h-screen px-6 py-16 bg-white">
                <Spinner className="w-8 h-8 mx-auto text-orange-500" />
            </div>
        );
    }

    if (isError || !book) {
        return (
            <div className="min-h-screen px-6 py-16 bg-white">
                <p className="max-w-3xl mx-auto font-sans text-sm text-red-600">
                    {error instanceof Error ? error.message : "Book not found."}
                </p>
            </div>
        );
    }

    const activeLoan = loanHistory?.find((entry) => entry.status === "active");
    const recentLoans = (loanHistory ?? []).slice(0, 3);

    return (
        <div className="min-h-screen font-serif bg-white">
            <motion.div className="max-w-6xl px-6 py-16 mx-auto" variants={containerVariants} initial="hidden" animate="visible">
                <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
                    <div>
                        {/* Genre pill */}
                        <motion.div className="flex items-center gap-2 mb-6" variants={itemVariants}>
                            <Tag size={14} className="text-orange-500" />
                            <span className="font-sans text-xs font-semibold tracking-widest text-orange-500 uppercase">
                                {book.genre}
                            </span>
                        </motion.div>

                        {/* Title */}
                        <motion.h1 className="mb-4 text-4xl font-bold leading-tight tracking-tight text-gray-900 sm:text-5xl lg:text-6xl" variants={itemVariants}>
                            {book.title}
                        </motion.h1>

                        {/* Divider */}
                        <motion.div className="flex items-center gap-3 my-8" variants={itemVariants}>
                            <div className="flex-1 h-px bg-gray-200" />
                            <BookOpen size={18} className="text-orange-400" />
                            <div className="flex-1 h-px bg-gray-200" />
                        </motion.div>

                        {/* Metadata grid */}
                        <motion.div className="grid grid-cols-1 gap-6 mb-12 font-sans sm:grid-cols-2" variants={itemVariants}>
                            <MetaItem
                                icon={<Hash size={15} className="text-orange-400" />}
                                label="Book ID"
                                value={book.id}
                            />
                            <MetaItem
                                icon={<Calendar size={15} className="text-orange-400" />}
                                label="Publication Year"
                                value={book.publication_year}
                            />
                            <MetaItem
                                icon={<Pencil size={15} className="text-orange-400" />}
                                label="Genre"
                                value={book.genre}
                            />
                        </motion.div>

                        {/* Summary section */}
                        <motion.div variants={itemVariants}>
                            <h2 className="mb-4 font-sans text-xs font-semibold tracking-widest text-gray-400 uppercase">
                                Summary{summaryData?.source ? ` (${summaryData.source})` : ""}
                            </h2>
                            <p className="pl-6 text-lg leading-relaxed text-gray-700 border-l-4 border-orange-400">
                                {summaryLoading
                                    ? "Loading summary..."
                                    : summaryData?.summary || "No summary available for this book."}
                            </p>
                        </motion.div>
                    </div>

                    <motion.aside className="space-y-6 lg:pt-6" variants={itemVariants}>
                        <motion.div className="p-6 border border-gray-200 rounded-2xl" variants={itemVariants}>
                            <h2 className="mb-4 font-sans text-xs font-semibold tracking-widest text-gray-400 uppercase">
                                Loan Details
                            </h2>

                            <div className="space-y-3 font-sans text-sm text-gray-700">
                                <div className="flex items-center justify-between gap-3">
                                    <span className="text-gray-500">Current Status</span>
                                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${activeLoan ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
                                        {activeLoan ? "Borrowed" : "Available"}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between gap-3">
                                    <span className="text-gray-500">Total Loans</span>
                                    <span className="font-semibold text-gray-900">{loanHistory?.length ?? 0}</span>
                                </div>
                                <div className="flex items-center justify-between gap-3">
                                    <span className="text-gray-500">Last Checkout</span>
                                    <span className="font-semibold text-gray-900">
                                        {loanHistory?.[0]?.checkout_date ? formatDate(loanHistory[0].checkout_date) : "-"}
                                    </span>
                                </div>
                            </div>

                            <Button type="button" className="w-full mt-5 font-sans">
                                Loan (Coming Soon)
                            </Button>

                            <Link
                                href={`/book/${id}/history`}
                                className="inline-flex mt-4 font-sans text-sm font-medium text-orange-600 transition-colors hover:text-orange-700"
                            >
                                View more
                            </Link>
                        </motion.div>
                    </motion.aside>
                </div>
            </motion.div>
        </div>
    );
};