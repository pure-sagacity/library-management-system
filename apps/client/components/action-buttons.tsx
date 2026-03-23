"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { RotateCcw, ArchiveRestore } from "lucide-react";
import { api } from "@/lib/api";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import * as TooltipUI from "@/components/ui/tooltip";

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

interface ActionButtonsProps {
    loanId: string;
    borrowerId: string;
    loanStatus: string;
}

export function ActionButtons({ loanId, borrowerId, loanStatus }: ActionButtonsProps) {
    const queryClient = useQueryClient();
    const [renewLoading, setRenewLoading] = useState(false);
    const [returnLoading, setReturnLoading] = useState(false);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    useEffect(() => {
        // Get current user from session
        const getUser = async () => {
            try {
                const session = await authClient.getSession();
                setCurrentUserId(session?.data?.user?.id ?? null);
            } catch (error) {
                console.error("Failed to get session", error);
                setCurrentUserId(null);
            }
        };
        getUser();
    }, []);

    const isOwner = currentUserId === borrowerId;
    const isReturned = loanStatus === "returned";

    const handleRenew = async () => {
        setRenewLoading(true);
        toast.promise(
            (async () => {
                const response = await api.loans({ id: loanId }).renew.post();
                if (response.error) {
                    throw new Error(response.error.value?.message || "Failed to renew loan");
                }
                if (!response.data?.ok) {
                    throw new Error(response.data?.message || "Failed to renew loan");
                }
                // Invalidate the loan query to refresh data
                await queryClient.invalidateQueries({ queryKey: ["loan", loanId] });
                return response.data;
            })(),
            {
                loading: "Renewing loan...",
                success: () => {
                    setRenewLoading(false);
                    return "Loan renewed successfully!";
                },
                error: (err) => {
                    setRenewLoading(false);
                    return err.message || "Failed to renew loan";
                },
            }
        );
    };

    const handleReturn = async () => {
        setReturnLoading(true);
        toast.promise(
            (async () => {
                // Get the book ID from the loan first
                const response = await api.loans({ id: loanId }).get();
                if (response.error || !response.data?.data?.book?.id) {
                    throw new Error("Could not get book information");
                }
                const bookId = response.data.data.book.id;

                const returnResponse = await api.loans({ id: bookId }).return.post();
                if (returnResponse.error) {
                    throw new Error(returnResponse.error.value?.message || "Failed to return book");
                }
                if (!returnResponse.data?.ok) {
                    throw new Error(returnResponse.data?.message || "Failed to return book");
                }
                // Invalidate the loan query to refresh data
                await queryClient.invalidateQueries({ queryKey: ["loan", loanId] });
                return returnResponse.data;
            })(),
            {
                loading: "Returning book...",
                success: () => {
                    setReturnLoading(false);
                    return "Book returned successfully!";
                },
                error: (err) => {
                    setReturnLoading(false);
                    return err.message || "Failed to return book";
                },
            }
        );
    };

    const renewDisabled = !isOwner || isReturned || renewLoading;
    const returnDisabled = !isOwner || isReturned || returnLoading;

    const renewTooltip = !isOwner
        ? "Only the borrower can renew this loan"
        : isReturned
            ? "Cannot renew a returned loan"
            : undefined;

    const returnTooltip = !isOwner
        ? "Only the borrower can return this loan"
        : isReturned
            ? "This loan has already been returned"
            : undefined;

    return (
        <motion.div className="space-y-3" variants={itemVariants}>
            <h3 className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-4">
                Actions
            </h3>
            <TooltipUI.TooltipProvider>
                <div className="grid grid-cols-2 gap-3">
                    <TooltipUI.Tooltip open={renewDisabled && renewTooltip ? undefined : false}>
                        <TooltipUI.TooltipTrigger asChild>
                            <button
                                onClick={handleRenew}
                                disabled={renewDisabled}
                                className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed bg-orange-100 text-orange-700 hover:bg-orange-200 active:scale-95"
                            >
                                <RotateCcw size={16} />
                                <span>Renew</span>
                            </button>
                        </TooltipUI.TooltipTrigger>
                        {renewTooltip && (
                            <TooltipUI.TooltipContent>{renewTooltip}</TooltipUI.TooltipContent>
                        )}
                    </TooltipUI.Tooltip>

                    <TooltipUI.Tooltip open={returnDisabled && returnTooltip ? undefined : false}>
                        <TooltipUI.TooltipTrigger asChild>
                            <button
                                onClick={handleReturn}
                                disabled={returnDisabled}
                                className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed bg-green-100 text-green-700 hover:bg-green-200 active:scale-95"
                            >
                                <ArchiveRestore size={16} />
                                <span>Return</span>
                            </button>
                        </TooltipUI.TooltipTrigger>
                        {returnTooltip && (
                            <TooltipUI.TooltipContent>{returnTooltip}</TooltipUI.TooltipContent>
                        )}
                    </TooltipUI.Tooltip>
                </div>
            </TooltipUI.TooltipProvider>
        </motion.div>
    );
}
