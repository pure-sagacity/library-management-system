"use client";

import { motion } from "framer-motion";
import { User, Mail } from "lucide-react";

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

interface Borrower {
    id: string;
    name: string;
    email: string;
}

export function UserBorrowerSection({ borrower }: { borrower: Borrower }) {
    return (
        <motion.div variants={itemVariants}>
            <div className="p-4 rounded-xl border border-stone-200 bg-white">
                <h3 className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-4">
                    Borrower Information
                </h3>
                <div className="space-y-3">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-blue-50">
                            <User size={16} className="text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</p>
                            <p className="text-sm font-medium text-gray-900 truncate">{borrower.name}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-purple-50">
                            <Mail size={16} className="text-purple-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</p>
                            <p className="text-sm font-medium text-gray-900 truncate">{borrower.email}</p>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
