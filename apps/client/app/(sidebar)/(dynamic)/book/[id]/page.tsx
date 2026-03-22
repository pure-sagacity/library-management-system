"use client";

import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Calendar, Clock, Hash, Pencil, Tag } from "lucide-react";
import { useParams } from "next/navigation";
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
                ease: "easeOut",
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

    return (
        <div className="min-h-screen font-serif bg-white">
            {/* Top accent bar */}
            <div className="w-full h-1 bg-orange-500" />

            <motion.div className="max-w-3xl px-6 py-16 mx-auto" variants={containerVariants} initial="hidden" animate="visible">

                {/* Genre pill */}
                <motion.div className="flex items-center gap-2 mb-6" variants={itemVariants}>
                    <Tag size={14} className="text-orange-500" />
                    <span className="font-sans text-xs font-semibold tracking-widest text-orange-500 uppercase">
                        {book.genre}
                    </span>
                </motion.div>

                {/* Title */}
                <motion.h1 className="mb-4 text-6xl font-bold leading-tight tracking-tight text-gray-900" variants={itemVariants}>
                    {book.title}
                </motion.h1>

                {/* Divider */}
                <motion.div className="flex items-center gap-3 my-8" variants={itemVariants}>
                    <div className="flex-1 h-px bg-gray-200" />
                    <BookOpen size={18} className="text-orange-400" />
                    <div className="flex-1 h-px bg-gray-200" />
                </motion.div>

                {/* Metadata grid */}
                <motion.div className="grid grid-cols-2 gap-6 mb-12 font-sans" variants={itemVariants}>
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

            </motion.div>
        </div>
    );
};