"use client";

import { Suspense, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useSuspenseQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowRight, BookOpen, Calendar, Hash, Pencil, Tag } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api, getAuthErrorMessage } from "@/lib/api";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";

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

    if (!id) {
        return (
            <div className="min-h-screen px-6 py-16 bg-white">
                <p className="max-w-3xl mx-auto font-sans text-sm text-gray-600">
                    Book ID is missing from the URL.
                </p>
            </div>
        );
    }

    return (
        <div className="min-h-screen font-serif bg-white">
            <motion.div className="max-w-6xl px-6 py-16 mx-auto" variants={containerVariants} initial="hidden" animate="visible">
                <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
                    <div>
                        <Suspense fallback={<BookPrimarySectionSkeleton />}>
                            <BookPrimarySection id={id} />
                        </Suspense>
                    </div>

                    <motion.aside className="space-y-6 lg:pt-6" variants={itemVariants}>
                        <Suspense fallback={<LoanDetailsSkeleton />}>
                            <LoanDetailsSection id={id} />
                        </Suspense>
                    </motion.aside>
                </div>
            </motion.div>
        </div>
    );
}

function BookPrimarySection({ id }: { id: string }) {
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
                <p className="max-w-3xl mx-auto font-sans text-sm text-red-600">{result.message}</p>
            </motion.div>
        );
    }

    const { book } = result;

    return (
        <>
            <motion.div className="flex items-center gap-2 mb-6" variants={itemVariants}>
                <Tag size={14} className="text-orange-500" />
                <span className="font-sans text-xs font-semibold tracking-widest text-orange-500 uppercase">
                    {book.genre}
                </span>
            </motion.div>

            <motion.h1 className="mb-4 text-4xl font-bold leading-tight tracking-tight text-gray-900 sm:text-5xl lg:text-6xl" variants={itemVariants}>
                {book.title}
            </motion.h1>

            <motion.div className="flex items-center gap-3 my-8" variants={itemVariants}>
                <div className="flex-1 h-px bg-gray-200" />
                <BookOpen size={18} className="text-orange-400" />
                <div className="flex-1 h-px bg-gray-200" />
            </motion.div>

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

            <motion.div variants={itemVariants}>
                <Suspense fallback={<SummarySkeleton />}>
                    <SummarySection id={id} />
                </Suspense>
            </motion.div>
        </>
    );
}

function SummarySection({ id }: { id: string }) {
    const { data: summaryData } = useSuspenseQuery({
        queryKey: ["book-summary", id],
        queryFn: async () => {
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

    return (
        <>
            <h2 className="mb-4 font-sans text-xs font-semibold tracking-widest text-gray-400 uppercase">
                Summary{summaryData?.source ? ` (${summaryData.source})` : ""}
            </h2>
            <p className="pl-6 text-lg leading-relaxed text-gray-700 border-l-4 border-orange-400">
                {summaryData?.summary || "No summary available for this book."}
            </p>
        </>
    );
}

function LoanDetailsSection({ id }: { id: string }) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    useEffect(() => {
        const getCurrentUser = async () => {
            try {
                const session = await authClient.getSession();
                setCurrentUserId(session?.data?.user?.id ?? null);
            } catch (error) {
                console.error("Failed to get current user session", error);
                setCurrentUserId(null);
            }
        };

        getCurrentUser();
    }, []);

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

    function loanBook(book_id: string) {
        setLoading(true);
        toast.promise(
            api.loans({ id }).borrow.post({ params: { book_id } }),
            {
                loading: "Processing loan...",
                success: (data) => {
                    switch (data.data?.ok) {
                        case true: {
                            router.push(`/loan/${data.data.id}`);
                            return data.data.message;
                        }
                        case false: {
                            return data.data.message;
                        }
                    }
                },
                error: (err) => getAuthErrorMessage(
                    err.value ?? err,
                    "Failed to loan this book.",
                ),
                finally: () => setLoading(false)
            }
        )
    }

    if (!result.ok) {
        return (
            <motion.div className="p-6 border border-gray-200 rounded-2xl" variants={itemVariants}>
                <h2 className="mb-4 font-sans text-xs font-semibold tracking-widest text-gray-400 uppercase">
                    Loan Details
                </h2>
                <p className="font-sans text-sm text-red-600">{result.message}</p>
            </motion.div>
        );
    }

    const activeLoan = result.loans.find((entry) => entry.status === "active");
    const isCurrentUsersActiveLoan = activeLoan?.user_id === currentUserId;

    return (
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
                    <span className="font-semibold text-gray-900">{result.loans.length}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                    <span className="text-gray-500">Last Checkout</span>
                    <span className="font-semibold text-gray-900">
                        {result.loans[0]?.checkout_date ? formatDate(result.loans[0].checkout_date) : "-"}
                    </span>
                </div>
            </div>

            <div className="flex flex-row justify-between gap-4">
                <Button size="lg" type="button" disabled={loading || Boolean(activeLoan)} onClick={() => loanBook(id)} className="mt-5 font-sans hover:bg-orange-600 transition-colors duration-250 hover:cursor-pointer">
                    {loading ? <Spinner /> : activeLoan ? isCurrentUsersActiveLoan ? "You Borrowed This Book" : "Currently Unavailable" : "Borrow this Book"}
                </Button>

                <Link
                    href={`/book/${id}/history`}
                    className="flex w-full mt-4 font-sans items-center gap-1 justify-end text-sm font-medium text-orange-600 transition-colors hover:text-orange-700"
                >
                    View History
                    <ArrowRight size={14} aria-hidden="true" />
                </Link>
            </div>
        </motion.div>
    );
}

function BookPrimarySectionSkeleton() {
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-12 w-4/5" />
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                {Array.from({ length: 3 }, (_, index) => (
                    <div key={`book-meta-skeleton-${index}`} className="space-y-2">
                        <Skeleton className="h-3 w-20" />
                        <Skeleton className="h-4 w-28" />
                    </div>
                ))}
            </div>
            <SummarySkeleton />
        </div>
    );
}

function SummarySkeleton() {
    return (
        <div className="space-y-3">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-20 w-full" />
        </div>
    );
}

function LoanDetailsSkeleton() {
    return (
        <div className="p-6 border border-gray-200 rounded-2xl space-y-4">
            <Skeleton className="h-3 w-24" />
            {Array.from({ length: 3 }, (_, index) => (
                <div key={`loan-detail-skeleton-${index}`} className="flex items-center justify-between gap-3">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-20" />
                </div>
            ))}
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-4 w-24" />
        </div>
    );
}
