"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

export default function SplashScreen({ children }: { children?: React.ReactNode }) {
    const [done, setDone] = useState(false);

    // Total splash lifetime: ~2.4s visible, then exits
    useEffect(() => {
        const t = setTimeout(() => setDone(true), 2600);
        return () => clearTimeout(t);
    }, []);

    return (
        <>
            {/* Underlying page content — always mounted, revealed once splash exits */}
            <div>{children}</div>

            {/* Splash overlay */}
            <AnimatePresence>
                {!done && (
                    <motion.div
                        key="splash"
                        className="fixed inset-0 z-[9999] flex items-center justify-center bg-white"
                        initial={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.5, ease: "easeInOut" }}
                    >
                        <motion.div
                            className="flex p-2 select-none items-between"
                            /* Step 2: whole line floats up and fades */
                            animate={{
                                y: [0, 0, -40],
                                opacity: [0, 1, 1, 0],
                            }}
                            transition={{
                                times: [0, 0.15, 0.72, 1],
                                duration: 2.2,
                                ease: "easeInOut",
                            }}
                        >
                            {/* "The" — stays black */}
                            <span
                                style={{
                                    fontFamily: "'Playfair Display', Georgia, serif",
                                    fontWeight: 400,
                                    fontSize: "clamp(2.5rem, 8vw, 6rem)",
                                    color: "#0a0a0a",
                                    letterSpacing: "-0.01em",
                                    lineHeight: 1,
                                }}
                            >
                                The
                            </span>

                            {/* "Archive" — fades from black → orange */}
                            <motion.span
                                style={{
                                    fontFamily: "Roboto, Helvetica, Arial, sans-serif",
                                    paddingLeft: "10px",
                                    fontWeight: 700,
                                    fontSize: "clamp(2.5rem, 8vw, 6rem)",
                                    letterSpacing: "-0.02em",
                                    lineHeight: 1,
                                }}
                                animate={{
                                    color: ["#0a0a0a", "#0a0a0a", "#e85d04"],
                                }}
                                transition={{
                                    times: [0, 0.4, 0.75],
                                    duration: 2.2,
                                    ease: "easeInOut",
                                }}
                            >
                                Archive
                            </motion.span>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}