"use client";

import { motion } from "framer-motion";
import { useSuspenseQuery } from "@tanstack/react-query";
import { AlertCircle, Calendar, Hash, Tag, User } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { api, getAuthErrorMessage } from "@/lib/api";
import { ActionButtons } from "@/components/action-buttons";
import { BookSnippet } from "@/components/book-snippet";
import { UserBorrowerSection } from "@/components/user-borrower-section";

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

const getStatusBadge = (status: string) => {
    switch (status) {
        case "active":
            return {
                bg: "bg-green-50",
                text: "text-green-700",
                border: "border-green-200",
                label: "Active",
            };
        case "overdue":
            return {
                bg: "bg-red-50",
                text: "text-red-700",
                border: "border-red-200",
                label: "Overdue",
            };
        case "returned":
            return {
                bg: "bg-gray-50",
                text: "text-gray-600",
                border: "border-gray-200",
                label: "Returned",
            };
        default:
            return {
                bg: "bg-gray-50",
                text: "text-gray-600",
                border: "border-gray-200",
                label: status,
            };
    }
};

const getDaysRemaining = (dueDate: Date | null) => {
    if (!dueDate) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);

    const daysMs = due.getTime() - today.getTime();
    const days = Math.ceil(daysMs / (1000 * 60 * 60 * 24));

    return days;
};

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

export function LoanPrimarySection({ id }: { id: string }) {
    const { data: result } = useSuspenseQuery({
        queryKey: ["loan", id],
        queryFn: async () => {
            const response = await api.loans({ id }).get();

            if (response.error) {
                return {
                    ok: false as const,
                    message: getAuthErrorMessage(
                        response.error.value ?? response.error,
                        "Failed to load loan details.",
                    ),
                };
            }

            if (!response.data?.data) {
                return {
                    ok: false as const,
                    message: "Loan not found.",
                };
            }

            return {
                ok: true as const,
                loan: response.data.data.loan,
                book: response.data.data.book,
                borrower: response.data.data.borrower,
            };
        },
    });

    if (!result.ok) {
        return (
            <motion.div variants={itemVariants}>
                <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <AlertCircle size={18} className="text-red-600" />
                    <p className="font-sans text-sm text-red-600">{result.message}</p>
                </div>
            </motion.div>
        );
    }

    const { loan, book, borrower } = result;
    const statusBadge = getStatusBadge(loan.status);
    const daysRemaining = getDaysRemaining(loan.due_date);

    return (
        <>
            <motion.div className="flex items-center gap-2 mb-6" variants={itemVariants}>
                <Tag size={14} className="text-orange-500" />
                <span className={`font-sans text-xs font-semibold tracking-widest uppercase px-2 py-1 rounded border ${statusBadge.bg} ${statusBadge.text} ${statusBadge.border}`}>
                    {statusBadge.label}
                </span>
            </motion.div>

            <motion.h1 className="mb-4 text-3xl font-bold leading-tight tracking-tight text-gray-900" variants={itemVariants}>
                Loan Details
            </motion.h1>

            <motion.div className="flex items-center gap-3 my-8" variants={itemVariants}>
                <div className="flex-1 h-px bg-gray-200" />
                <Calendar size={18} className="text-orange-400" />
                <div className="flex-1 h-px bg-gray-200" />
            </motion.div>

            {/* Main Loan Metadata */}
            <motion.div className="grid grid-cols-1 gap-6 mb-12 font-sans" variants={itemVariants}>
                <MetaItem
                    icon={<Hash size={15} className="text-orange-400" />}
                    label="Loan ID"
                    value={loan.id}
                />
                <MetaItem
                    icon={<Calendar size={15} className="text-orange-400" />}
                    label="Checkout Date"
                    value={formatDate(loan.checkout_date)}
                />
                <MetaItem
                    icon={<Calendar size={15} className="text-orange-400" />}
                    label="Due Date"
                    value={
                        daysRemaining && loan.status !== "returned"
                            ? `${formatDate(loan.due_date)} (${daysRemaining} days remaining)`
                            : formatDate(loan.due_date)
                    }
                />
                {loan.returned_at && (
                    <MetaItem
                        icon={<Calendar size={15} className="text-orange-400" />}
                        label="Returned Date"
                        value={formatDate(loan.returned_at)}
                    />
                )}
            </motion.div>

            {/* Book Snippet */}
            <motion.div variants={itemVariants}>
                <BookSnippet book={book} />
            </motion.div>

            {/* Borrower Info */}
            <motion.div className="mt-8" variants={itemVariants}>
                <UserBorrowerSection borrower={borrower} />
            </motion.div>

            {/* Action Buttons */}
            <motion.div className="mt-8" variants={itemVariants}>
                <ActionButtons loanId={id} borrowerId={borrower.id} loanStatus={loan.status} />
            </motion.div>
        </>
    );
}

export function LoanPrimarySectionSkeleton() {
    return (
        <div className="space-y-6">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-px w-full" />
            <div className="grid grid-cols-1 gap-6">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-5 w-40" />
                    </div>
                ))}
            </div>
            <div className="space-y-4 mt-8">
                <Skeleton className="h-40 w-full rounded-lg" />
            </div>
            <div className="space-y-4 mt-8">
                <Skeleton className="h-20 w-full rounded-lg" />
            </div>
        </div>
    );
}
