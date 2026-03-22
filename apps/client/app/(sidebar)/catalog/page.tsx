"use client";

import { Suspense, useState } from "react";
import { keepPreviousData, useSuspenseQuery } from "@tanstack/react-query";

import BookCard from "@/components/book-card";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardDescription,
    CardHeader,
    CardTitle,
    CardContent
} from "@/components/ui/card";
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { api, getAuthErrorMessage } from "@/lib/api";

const PER_PAGE_OPTIONS = [10, 20, 50] as const;
const MAX_VISIBLE_PAGE_LINKS = 5;

type PaginationToken = number | "left-ellipsis" | "right-ellipsis";

const buildPageTokens = (
    currentPage: number,
    totalPages: number,
): PaginationToken[] => {
    if (totalPages <= 1) {
        return [1];
    }

    if (totalPages <= MAX_VISIBLE_PAGE_LINKS + 2) {
        return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    const tokens: PaginationToken[] = [1];
    const halfWindow = Math.floor(MAX_VISIBLE_PAGE_LINKS / 2);

    let start = Math.max(2, currentPage - halfWindow);
    let end = start + MAX_VISIBLE_PAGE_LINKS - 1;

    if (end > totalPages - 1) {
        end = totalPages - 1;
        start = Math.max(2, end - MAX_VISIBLE_PAGE_LINKS + 1);
    }

    if (start > 2) {
        tokens.push("left-ellipsis");
    }

    for (let pageNumber = start; pageNumber <= end; pageNumber += 1) {
        tokens.push(pageNumber);
    }

    if (end < totalPages - 1) {
        tokens.push("right-ellipsis");
    }

    tokens.push(totalPages);
    return tokens;
};

export default function Catalog() {
    const [page, setPage] = useState<number>(1);
    const [perPage, setPerPage] = useState<number>(20);

    const handlePerPageChange = (value: number) => {
        setPerPage(value);
        setPage(1);
    };

    return (
        <section className="flex flex-col min-h-screen gap-6">
            <div className="space-y-1">
                <h2 className="text-2xl font-bold tracking-tight">Catalog</h2>
                <p className="text-muted-foreground">
                    Browse all available books with paginated results.
                </p>
            </div>

            <div className="flex items-center justify-between">
                <div>
                    <label htmlFor="catalog-per-page" className="text-sm font-medium">
                        Books per page
                    </label>
                    <select
                        id="catalog-per-page"
                        className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm ml-2"
                        value={perPage}
                        onChange={(event) => handlePerPageChange(Number(event.target.value))}
                    >
                        {PER_PAGE_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                                {option}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <Suspense fallback={<CatalogResultsSkeleton />}>
                <CatalogResults page={page} perPage={perPage} onPageChange={setPage} />
            </Suspense>
        </section>
    );
}

type CatalogResultsProps = {
    page: number;
    perPage: number;
    onPageChange: (page: number) => void;
};

function CatalogResults({ page, perPage, onPageChange }: CatalogResultsProps) {
    const { data: result, isFetching, refetch } = useSuspenseQuery({
        queryKey: ["catalog-books", page, perPage],
        placeholderData: keepPreviousData,
        queryFn: async () => {
            const response = await api.books.get({
                query: {
                    page,
                    perPage,
                },
            });

            if (response.error) {
                return {
                    ok: false as const,
                    message: getAuthErrorMessage(
                        response.error.value ?? response.error,
                        "Failed to load catalog books.",
                    ),
                };
            }

            if (!response.data) {
                return {
                    ok: false as const,
                    message: "Catalog response was empty.",
                };
            }

            return {
                ok: true as const,
                data: response.data,
            };
        },
    });

    if (!result.ok) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Couldn&apos;t load catalog</CardTitle>
                    <CardDescription>{result.message}</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button type="button" onClick={() => void refetch()}>
                        Try Again
                    </Button>
                </CardContent>
            </Card>
        );
    }

    const books = result.data.books;
    const metadata = result.data.metadata;
    const totalItems = metadata?.totalItems ?? 0;
    const currentPage = metadata?.currentPage ?? page;
    const totalPages = Math.max(metadata?.totalPages ?? 1, 1);
    const hasPreviousPage = metadata?.hasPreviousPage ?? currentPage > 1;
    const hasNextPage = metadata?.hasNextPage ?? currentPage < totalPages;

    const visibleStart = totalItems === 0 ? 0 : (currentPage - 1) * perPage + 1;
    const visibleEnd = totalItems === 0 ? 0 : Math.min(currentPage * perPage, totalItems);
    const pageTokens = buildPageTokens(currentPage, totalPages);

    const handlePageChange = (nextPage: number) => {
        if (nextPage < 1 || nextPage > totalPages || nextPage === currentPage) {
            return;
        }

        onPageChange(nextPage);
    };

    return (
        <>
            <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-muted-foreground">
                    Showing {visibleStart}-{visibleEnd} of {totalItems} books
                </p>
                <p className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                    {isFetching ? " (updating...)" : ""}
                </p>
            </div>

            {books.length === 0 ? (
                <Card>
                    <CardHeader>
                        <CardTitle>No books found</CardTitle>
                        <CardDescription>
                            There are no books in the catalog yet.
                        </CardDescription>
                    </CardHeader>
                </Card>
            ) : (
                <>
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        {books.map((book) => (
                            <BookCard key={book.id} book={book} />
                        ))}
                    </div>

                    <Pagination>
                        <PaginationContent>
                            <PaginationItem>
                                <PaginationLink
                                    disabled={!hasPreviousPage}
                                    onClick={() => handlePageChange(1)}
                                >
                                    First
                                </PaginationLink>
                            </PaginationItem>
                            <PaginationItem>
                                <PaginationPrevious
                                    disabled={!hasPreviousPage}
                                    onClick={() => handlePageChange(currentPage - 1)}
                                />
                            </PaginationItem>

                            {pageTokens.map((token) => {
                                if (typeof token !== "number") {
                                    return (
                                        <PaginationItem key={token}>
                                            <PaginationEllipsis />
                                        </PaginationItem>
                                    );
                                }

                                return (
                                    <PaginationItem key={token}>
                                        <PaginationLink
                                            isActive={token === currentPage}
                                            onClick={() => handlePageChange(token)}
                                        >
                                            {token}
                                        </PaginationLink>
                                    </PaginationItem>
                                );
                            })}

                            <PaginationItem>
                                <PaginationNext
                                    disabled={!hasNextPage}
                                    onClick={() => handlePageChange(currentPage + 1)}
                                />
                            </PaginationItem>
                            <PaginationItem>
                                <PaginationLink
                                    disabled={!hasNextPage}
                                    onClick={() => handlePageChange(totalPages)}
                                >
                                    Last
                                </PaginationLink>
                            </PaginationItem>
                        </PaginationContent>
                    </Pagination>
                </>
            )}
        </>
    );
}

function CatalogResultsSkeleton() {
    return (
        <>
            <div className="flex flex-wrap items-center justify-between gap-2">
                <Skeleton className="h-4 w-52" />
                <Skeleton className="h-4 w-28" />
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }, (_, index) => (
                    <div key={`catalog-skeleton-${index}`} className="p-4 border rounded-lg">
                        <Skeleton className="w-3/4 h-6 mb-3" />
                        <Skeleton className="w-1/2 h-4" />
                    </div>
                ))}
            </div>
        </>
    );
}