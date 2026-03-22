"use client";

import { BookOpen, Calendar, Clock, Hash, Tag } from "lucide-react";
import { useParams } from "next/navigation";

interface Props {
    book: {
        id: string;
        title: string;
        genre: string;
        publication_year: number;
    };
    summary: string | null;
}

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

export default async function Book({ book, summary }: Props) {
    const { id } = await useParams();

    return (
        <div className="min-h-screen font-serif bg-white">
            {/* Top accent bar */}
            <div className="w-full h-1 bg-orange-500" />

            <div className="max-w-3xl px-6 py-16 mx-auto">

                {/* Genre pill */}
                <div className="flex items-center gap-2 mb-6">
                    <Tag size={14} className="text-orange-500" />
                    <span className="font-sans text-xs font-semibold tracking-widest text-orange-500 uppercase">
                        {book.genre}
                    </span>
                </div>

                {/* Title */}
                <h1 className="mb-4 text-6xl font-bold leading-tight tracking-tight text-gray-900">
                    {book.title}
                </h1>

                {/* Divider */}
                <div className="flex items-center gap-3 my-8">
                    <div className="flex-1 h-px bg-gray-200" />
                    <BookOpen size={18} className="text-orange-400" />
                    <div className="flex-1 h-px bg-gray-200" />
                </div>

                {/* Metadata grid */}
                <div className="grid grid-cols-2 gap-6 mb-12 font-sans">
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
                        icon={<Clock size={15} className="text-orange-400" />}
                        label="Published On"
                        value={book.publication_year}
                    />
                </div>

                {/* Summary section */}
                <div>
                    <h2 className="mb-4 font-sans text-xs font-semibold tracking-widest text-gray-400 uppercase">
                        Summary
                    </h2>
                    <p className="pl-6 text-lg leading-relaxed text-gray-700 border-l-4 border-orange-400">
                        {summary || "No summary available for this book."}
                    </p>
                </div>

            </div>
        </div>
    );
};