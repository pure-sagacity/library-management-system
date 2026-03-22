"use client";

import { api } from "@/lib/api";
import { authClient } from "@/lib/auth-client";
import { StatSkeleton } from "@/components/stat-skeleton";
import { useSuspenseQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen, Clock, RotateCcw, Sparkles } from "lucide-react";

const loans = [
  { id: 1, title: "The Ministry for the Future", author: "Kim Stanley Robinson", coverClass: "bg-amber-700", dueDate: "2026-03-24", daysLeft: 2, genre: "Climate Fiction", canRenew: false },
  { id: 2, title: "Intermezzo", author: "Sally Rooney", coverClass: "bg-emerald-700", dueDate: "2026-03-27", daysLeft: 5, genre: "Literary Fiction", canRenew: true },
  { id: 3, title: "Creation Lake", author: "Rachel Kushner", coverClass: "bg-slate-500", dueDate: "2026-04-01", daysLeft: 10, genre: "Thriller", canRenew: true },
  { id: 4, title: "James", author: "Percival Everett", coverClass: "bg-fuchsia-700", dueDate: "2026-04-08", daysLeft: 17, genre: "Historical Fiction", canRenew: true },
];

const getDueBadge = (daysLeft: number) => {
  if (daysLeft <= 2) return { label: "Due soon", bg: "bg-red-100", text: "text-red-700" };
  if (daysLeft <= 7) return { label: `${daysLeft} days`, bg: "bg-amber-100", text: "text-amber-700" };
  return { label: `${daysLeft} days`, bg: "bg-emerald-100", text: "text-emerald-700" };
};

type SessionResponse = Awaited<ReturnType<typeof authClient.getSession>>;
type SessionUser = NonNullable<SessionResponse["data"]>["user"];

export default function LibraryDashboard() {
  return (
    <div className="min-h-screen">
      <div className="max-w-6xl px-6 py-8 mx-auto">
        <div className="mb-8">
          <p className="mb-1 text-xs font-medium tracking-wider uppercase">Good evening</p>
          <Suspense fallback={<DashboardGreetingSkeleton />}>
            <DashboardGreeting />
          </Suspense>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <Suspense fallback={<StatSkeleton />}>
            <BooksReadStat />
          </Suspense>

          <Suspense fallback={<StatSkeleton />}>
            <ActiveLoansStat />
          </Suspense>
        </div>

        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-stone-900">Current Loans</h2>
              <span className="text-xs text-stone-500">Sorted by due date</span>
            </div>
            <div className="flex flex-col gap-3">
              {loans.map((book) => {
                const badge = getDueBadge(book.daysLeft);
                return (
                  <motion.div
                    key={book.id}
                    whileHover={{ y: -2, boxShadow: "0 8px 24px rgba(0,0,0,0.10)" }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="flex items-center gap-4 p-4 bg-white border rounded-xl border-stone-200"
                  >
                    <div className={`w-2 rounded min-h-16 opacity-85 ${book.coverClass}`} />
                    <div className="flex-1 min-w-0">
                      <div>
                        <p className="text-base font-bold leading-tight text-stone-900">{book.title}</p>
                        <p className="mt-0.5 text-xs text-stone-500">{book.author}</p>
                      </div>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-stone-400">{book.genre}</span>
                        <span className="text-xs text-stone-400">Due {new Date(book.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                      </div>
                    </div>
                    <span className={`${badge.bg} ${badge.text} inline-flex items-center self-center text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap`}>
                      {badge.label}
                    </span>
                    <div className="flex gap-2">
                      <button className="flex items-center gap-1 rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-600 transition-colors hover:bg-amber-50">
                        <RotateCcw size={12} /> Renew
                      </button>
                      <button className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-400 transition-colors hover:bg-stone-50">
                        Return
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <div className="p-5 rounded-xl bg-linear-to-br from-stone-700 to-stone-900">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={14} className="text-amber-400" />
                <span className="text-xs font-bold tracking-wider uppercase text-amber-400">Just for You</span>
              </div>
              <p className="text-lg italic font-bold leading-tight text-amber-50">"Demon Copperhead"</p>
              <p className="mt-1 text-xs text-stone-400">Barbara Kingsolver</p>
              <p className="mt-2 text-xs leading-relaxed text-stone-400">Based on your love of literary fiction and historical narratives. Pulitzer Prize winner.</p>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className="w-full px-4 py-2 mt-3 text-xs font-bold rounded-lg bg-amber-400 text-stone-900"
              >
                Place Hold
              </motion.button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function useDashboardSession() {
  return useSuspenseQuery({
    queryKey: ["dashboard-session"],
    queryFn: async () => {
      try {
        const session = await authClient.getSession();
        return {
          user: session?.data?.user ?? null,
          hasSessionError: false,
        };
      } catch (error) {
        console.error("Failed to load dashboard session", error);
        return {
          user: null,
          hasSessionError: true,
        };
      }
    },
  });
}

function DashboardGreeting() {
  const { data: sessionState } = useDashboardSession();

  return (
    <h1 className="text-4xl font-bold transition-colors hover:text-orange-500">
      {sessionState.user?.name ?? "Guest Reader"}
    </h1>
  );
}

function BooksReadStat() {
  const { data: sessionState } = useDashboardSession();
  const user = sessionState.user;

  const { data } = useSuspenseQuery({
    queryKey: ["totalBooksRead", user?.id],
    queryFn: async () => {
      if (!user?.id) {
        return null;
      }

      const response = await api.loans.users({ user_id: user.id })["total-books"].get();

      if (response.error) {
        console.error("Failed to fetch total books read", response.error);
        return null;
      }

      if (response.data?.ok) {
        return response.data.totalBooks;
      }

      if (response.data && !response.data.ok) {
        console.error("API error fetching total books read", response.data.message);
      }

      return null;
    },
  });

  if (!user) {
    return (
      <div className="px-5 py-4 bg-white border rounded-xl border-stone-200">
        <div className="flex items-center gap-2 mb-2 text-stone-500">
          <BookOpen size={16} />
          <span className="text-xs font-medium tracking-wide uppercase">Books Read</span>
        </div>
        <p className="text-xs text-stone-500">
          {sessionState.hasSessionError
            ? "Could not reach auth service."
            : "Log in to view your stats."}
        </p>
      </div>
    );
  }

  return (
    <div className="px-5 py-4 bg-white border rounded-xl border-stone-200">
      <div className="flex items-center gap-2 mb-2 text-stone-500">
        <BookOpen size={16} />
        <span className="text-xs font-medium tracking-wide uppercase">Books Read</span>
      </div>
      <div className="flex items-end gap-1">
        <span className="text-3xl font-bold text-stone-900">{data ?? "-"}</span>
        <span className="mb-1 text-xs text-stone-400">all time</span>
      </div>
    </div>
  );
}

function ActiveLoansStat() {
  const { data: sessionState } = useDashboardSession();
  const user = sessionState.user;

  const { data } = useSuspenseQuery({
    queryKey: ["activeLoans", user?.id],
    queryFn: async () => {
      if (!user?.id) {
        return null;
      }

      const response = await api.loans.users({ user_id: user.id })["active-count"].get();

      if (response.error) {
        console.error("Failed to fetch total books read", response.error);
        return null;
      }

      if (response.data?.ok) {
        return response.data.activeLoans;
      }

      if (response.data && !response.data.ok) {
        console.error("API error fetching total books read", response.data.message);
      }

      return null;
    },
  });

  if (!user) {
    return (
      <div className="px-5 py-4 bg-white border rounded-xl border-stone-200">
        <div className="flex items-center gap-2 mb-2 text-stone-500">
          <Clock size={16} />
          <span className="text-xs font-medium tracking-wide uppercase">Active Loans</span>
        </div>
        <p className="text-xs text-stone-500">
          {sessionState.hasSessionError
            ? "Could not reach auth service."
            : "Log in to view your stats."}
        </p>
      </div>
    );
  }

  return (
    <div className="px-5 py-4 bg-white border rounded-xl border-stone-200">
      <div className="flex items-center gap-2 mb-2 text-stone-500">
        <Clock size={16} />
        <span className="text-xs font-medium tracking-wide uppercase">Active Loans</span>
      </div>
      <div className="flex items-end gap-1">
        <span className="text-3xl font-bold text-stone-900">{data ?? "-"}</span>
        <span className="mb-1 text-xs text-stone-400">currently</span>
      </div>
    </div>
  );
}

function CurrentLoans() {
  const { data: sessionState } = useDashboardSession();
  const user = sessionState.user;

  const { data } = useSuspenseQuery({
    queryKey: ["currentLoans", user?.id],
    queryFn: async () => {
      if (!user?.id) {
        return [];
      }

      const response = await api.loans.users({ user_id: user.id }).current.get();

      if (response.error) {
        console.error("Failed to fetch current loans", response.error);
        return [];
      }

      if (response.data?.ok) {
        const loansWithBooks = await Promise.all(
          response.data.loans.map(async (loan) => {
            const bookResponse = await api.books({ id: loan.book_id }).get();

            if (bookResponse.error || !bookResponse.data) {
              return {
                ...loan,
                book: null,
              };
            }

            return {
              ...loan,
              book: bookResponse.data,
            };
          })
        );

        return loansWithBooks;
      }

      if (response.data && !response.data.ok) {
        console.error("API error fetching current loans", response.data.message);
      }

      return [];
    },
  });

  if (!user) {
    return (
      <p className="text-sm text-stone-500">
        {sessionState.hasSessionError
          ? "Could not reach auth service."
          : "Log in to view your current loans."}
      </p>
    );
  }

  if (data.length === 0) {
    return (
      <p className="text-sm text-stone-500">
        You have no active loans. Time to find your next read!
      </p>
    );
  }

  return data.map((loan) => {
    const daysLeft = Math.ceil(
      (new Date(loan.due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    const coverClass = "bg-stone-500";
    const bookGenre = loan.book?.genre ?? loan.genre;

    const badge = getDueBadge(daysLeft);

    return (
      <motion.div
        key={loan.loan_id}
        whileHover={{ y: -2, boxShadow: "0 8px 24px rgba(0,0,0,0.10)" }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="flex items-center gap-4 p-4 bg-white border rounded-xl border-stone-200"
      >
        <div className={`w-2 rounded min-h-16 opacity-85 ${coverClass}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mt-2">
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-stone-400">{bookGenre}</span>
            <span className="text-xs text-stone-400">Due {new Date(loan.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
          </div>
        </div>
        <span className={`${badge.bg} ${badge.text} inline-flex items-center self-center text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap`}>
          {badge.label}
        </span>
        <div className="flex gap-2">
          <button className="flex items-center gap-1 rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-600 transition-colors hover:bg-amber-50">
            <RotateCcw size={12} /> Renew
          </button>
          <button className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-400 transition-colors hover:bg-stone-50">
            Return
          </button>
        </div>
      </motion.div>
    );
  });
}

function DashboardGreetingSkeleton() {
  return (
    <Skeleton className="w-64 h-10" />
  );
}