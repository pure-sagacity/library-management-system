"use client";

import { Suspense } from "react";
import { motion } from "framer-motion";
import { useParams } from "next/navigation";
import { LoanPrimarySection, LoanPrimarySectionSkeleton } from "@/components/loan-primary-section";
import { LoanHistorySection, LoanHistorySkeleton } from "@/components/loan-history-section";

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

export default function LoanDetail() {
    const params = useParams<{ id?: string | string[] }>();
    const id = Array.isArray(params.id) ? params.id[0] : params.id;

    if (!id) {
        return (
            <div className="min-h-screen px-6 py-16 bg-white">
                <p className="max-w-3xl mx-auto text-sm text-gray-600">
                    Loan ID is missing from the URL.
                </p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white">
            <motion.div
                className="max-w-6xl px-6 py-16 mx-auto"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
                    <div>
                        <Suspense fallback={<LoanPrimarySectionSkeleton />}>
                            <LoanPrimarySection id={id} />
                        </Suspense>
                    </div>

                    <motion.aside className="space-y-6 lg:pt-6">
                        <Suspense fallback={<LoanHistorySkeleton />}>
                            <LoanHistorySection id={id} />
                        </Suspense>
                    </motion.aside>
                </div>
            </motion.div>
        </div>
    );
}
