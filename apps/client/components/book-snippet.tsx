"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, BookOpen } from "lucide-react";

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

interface Book {
    id: string;
    title: string;
    genre: string;
    publication_year: number;
}

export function BookSnippet({ book }: { book: Book }) {
    return (
        <Link href={`/book/${book.id}`}>
            <motion.div
                className="p-5 rounded-xl border border-stone-200 bg-white hover:shadow-lg hover:border-orange-300 transition-all duration-300 cursor-pointer group"
                variants={itemVariants}
                whileHover={{ y: -2 }}
            >
                <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-orange-50 group-hover:bg-orange-100 transition-colors">
                        <BookOpen size={18} className="text-orange-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-gray-900 group-hover:text-orange-600 transition-colors line-clamp-2">
                            {book.title}
                        </h3>
                        <div className="flex items-center gap-2 mt-2">
                            <span className="inline-block px-2 py-1 text-xs font-medium bg-amber-50 text-amber-700 rounded">
                                {book.genre}
                            </span>
                            <span className="text-xs text-gray-500">{book.publication_year}</span>
                        </div>
                        <div className="flex items-center gap-1 mt-3 text-orange-600 opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-xs font-semibold uppercase tracking-wider">View Book</span>
                            <ArrowRight size={14} />
                        </div>
                    </div>
                </div>
            </motion.div>
        </Link>
    );
}
