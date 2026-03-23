"use client";

import { motion } from "framer-motion";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Calendar, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { api, getAuthErrorMessage } from "@/lib/api";

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

const getStatusColor = (status: string) => {
    switch (status) {
        case "active":
            return "text-green-600 bg-green-50";
        case "overdue":
            return "text-red-600 bg-red-50";
        case "returned":
            return "text-gray-600 bg-gray-50";
        default:
            return "text-gray-600 bg-gray-50";
    }
};

export function LoanHistorySection({ id: loanId }: { id: string }) {
    const { data: loansResult } = useSuspenseQuery({
        queryKey: ["loan-with-history", loanId],
        queryFn: async () => {
            // First get the loan to find the book ID
            const loanResponse = await api.loans({ id: loanId }).get();

            if (loanResponse.error) {
                return {
                    ok: false as const,
                    message: getAuthErrorMessage(
                        loanResponse.error.value ?? loanResponse.error,
                        "Failed to load loan information.",
                    ),
                };
            }

            if (!loanResponse.data?.data?.book?.id) {
                return {
                    ok: false as const,
                    message: "Book information not found.",
                };
            }

            // Get book loans history
            const bookId = loanResponse.data.data.book.id;
            const historyResponse = await api.books({ id: bookId }).loans.get();

            if (historyResponse.error) {
                return {
                    ok: false as const,
                    message: getAuthErrorMessage(
                        historyResponse.error.value ?? historyResponse.error,
                        "Failed to load loan history.",
                    ),
                };
            }

            return {
                ok: true as const,
                loans: historyResponse.data ?? [],
            };
        },
    });

    if (!loansResult.ok) {
        return (
            <motion.div variants={itemVariants} className="text-sm text-gray-600">
                {loansResult.message}
            </motion.div>
        );
    }

    const { loans } = loansResult;

    return (
        <motion.div variants={itemVariants} className="space-y-4">
            <div className="flex items-center gap-2 mb-6">
                <Users size={18} className="text-orange-500" />
                <h2 className="text-xs font-semibold tracking-widest text-gray-400 uppercase">
                    Book Loan History
                </h2>
            </div>

            {loans.length === 0 ? (
                <p className="text-sm text-gray-500 italic">No loan history for this book yet.</p>
            ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                    {loans.map((loan, idx) => (
                        <motion.div
                            key={loan.id}
                            className="p-3 rounded-lg border border-stone-200 bg-white hover:shadow-sm transition-shadow"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            whileHover={{ y: -1 }}
                        >
                            <div className="flex items-start gap-3">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2 mb-2">
                                        <p className="text-xs font-semibold text-gray-600 truncate">
                                            Checkout: {formatDate(loan.checkout_date)}
                                        </p>
                                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${getStatusColor(loan.status)}`}>
                                            {loan.status.charAt(0).toUpperCase() + loan.status.slice(1)}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-500">
                                        Due: {formatDate(loan.due_date)}
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
        </motion.div>
    );
}

export function LoanHistorySkeleton() {
    return (
        <div className="space-y-4">
            <Skeleton className="h-6 w-48" />
            <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full rounded-lg" />
                ))}
            </div>
        </div>
    );
}
