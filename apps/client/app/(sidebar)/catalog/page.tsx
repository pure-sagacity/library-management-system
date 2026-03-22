"use client";

import debounce from "lodash.debounce";
import { useEffect, useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import BookCard from "@/components/book-card";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
const SEARCH_DEBOUNCE_MS = 450;
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
    const [searchInput, setSearchInput] = useState<string>("");
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState<string>("");

    const updateSearch = useMemo(
        () =>
            debounce((value: string) => {
                setDebouncedSearchQuery(value.trim());
                setPage(1);
            }, SEARCH_DEBOUNCE_MS),
        [],
    );

    useEffect(() => {
        return () => {
            updateSearch.cancel();
        };
    }, [updateSearch]);

    const { data, isError, error, isLoading, isFetching, refetch } = useQuery({
        queryKey: ["catalog-books", page, perPage, debouncedSearchQuery],
        placeholderData: keepPreviousData,
        queryFn: async () => {
            const hasSearchQuery = debouncedSearchQuery.length > 0;
            const response = hasSearchQuery
                ? await api.books.search.get({
                    query: {
                        q: debouncedSearchQuery,
                        page,
                        perPage,
                    },
                })
                : await api.books.get({
                    query: {
                        page,
                        perPage,
                    },
                });

            if (response.error) {
                throw new Error(
                    getAuthErrorMessage(
                        response.error.value ?? response.error,
                        "Failed to load catalog books.",
                    ),
                );
            }

            if (!response.data) {
                throw new Error("Catalog response was empty.");
            }

            return response.data;
        },
    });

    const books = data?.books ?? [];
    const metadata = data?.metadata;
    const totalItems = metadata?.totalItems ?? 0;
    const currentPage = metadata?.currentPage ?? page;
    const totalPages = Math.max(metadata?.totalPages ?? 1, 1);
    const hasPreviousPage = metadata?.hasPreviousPage ?? currentPage > 1;
    const hasNextPage = metadata?.hasNextPage ?? currentPage < totalPages;

    const visibleStart = totalItems === 0 ? 0 : (currentPage - 1) * perPage + 1;
    const visibleEnd = totalItems === 0 ? 0 : Math.min(currentPage * perPage, totalItems);
    const pageTokens = buildPageTokens(currentPage, totalPages);
    const hasSearch = debouncedSearchQuery.length > 0;

    const handleSearchChange = (value: string) => {
        setSearchInput(value);
        updateSearch(value);
    };

    const handleClearSearch = () => {
        setSearchInput("");
        setDebouncedSearchQuery("");
        setPage(1);
        updateSearch.cancel();
    };

    const handlePerPageChange = (value: number) => {
        setPerPage(value);
        setPage(1);
    };

    const handlePageChange = (nextPage: number) => {
        if (nextPage < 1 || nextPage > totalPages || nextPage === currentPage) {
            return;
        }

        setPage(nextPage);
    };

    return (
        <section className="flex flex-col gap-6">
            <div className="space-y-1">
                <h2 className="text-2xl font-bold tracking-tight">Catalog</h2>
                <p className="text-muted-foreground">
                    Browse all available books with paginated results and quick search.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Find Books</CardTitle>
                    <CardDescription>
                        Search by title or genre, choose page size, and navigate with pagination.
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-[1fr_auto]">
                    <div className="space-y-2">
                        <label htmlFor="catalog-search" className="text-sm font-medium">
                            Search books
                        </label>
                        <Input
                            id="catalog-search"
                            value={searchInput}
                            onChange={(event) => handleSearchChange(event.target.value)}
                            placeholder="Search by title or genre"
                        />
                    </div>

                    <div className="flex items-end gap-2">
                        <div className="space-y-2">
                            <label htmlFor="catalog-per-page" className="text-sm font-medium">
                                Books per page
                            </label>
                            <select
                                id="catalog-per-page"
                                className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
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

                        <Button
                            type="button"
                            variant="outline"
                            disabled={searchInput.length === 0}
                            onClick={handleClearSearch}
                        >
                            Clear
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-muted-foreground">
                    Showing {visibleStart}-{visibleEnd} of {totalItems} books
                </p>
                <p className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                    {isFetching && !isLoading ? " (updating...)" : ""}
                </p>
            </div>

            {isLoading ? (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {Array.from({ length: 6 }, (_, index) => (
                        <div key={`catalog-skeleton-${index}`} className="rounded-lg border p-4">
                            <Skeleton className="mb-3 h-6 w-3/4" />
                            <Skeleton className="h-4 w-1/2" />
                        </div>
                    ))}
                </div>
            ) : null}

            {isError ? (
                <Card>
                    <CardHeader>
                        <CardTitle>Couldn&apos;t load catalog</CardTitle>
                        <CardDescription>
                            {error instanceof Error
                                ? error.message
                                : "Something went wrong while loading books."}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button type="button" onClick={() => void refetch()}>
                            Try Again
                        </Button>
                    </CardContent>
                </Card>
            ) : null}

            {!isLoading && !isError && books.length === 0 ? (
                <Card>
                    <CardHeader>
                        <CardTitle>No books found</CardTitle>
                        <CardDescription>
                            {hasSearch
                                ? `No results matched "${debouncedSearchQuery}". Try a different keyword.`
                                : "There are no books in the catalog yet."}
                        </CardDescription>
                    </CardHeader>
                </Card>
            ) : null}

            {!isLoading && !isError && books.length > 0 ? (
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
            ) : null}
        </section>
    );
}