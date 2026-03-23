"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Ellipsis, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
    Item,
    ItemActions,
    ItemContent,
    ItemDescription,
    ItemGroup,
    ItemMedia,
    ItemTitle,
} from "@/components/ui/item";
import { Label } from "@/components/ui/label";
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";
import { getAuthErrorMessage, api } from "@/lib/api";

const PER_PAGE = 20;
const MAX_VISIBLE_PAGE_LINKS = 5;
const SORT_OPTIONS = [
    { value: "created_desc", label: "Newest" },
    { value: "title_asc", label: "Title A-Z" },
] as const;
const GENRE_OPTIONS = [
    "Fiction",
    "Non-Fiction",
    "Science Fiction",
    "Fantasy",
    "Biography",
    "History",
    "Children's",
] as const;

type PaginationToken = number | "left-ellipsis" | "right-ellipsis";
type BookGenre = (typeof GENRE_OPTIONS)[number];
type SortValue = (typeof SORT_OPTIONS)[number]["value"];

type BookRecord = {
    id: string;
    title: string;
    genre: BookGenre;
    publication_year: number;
    created_at: Date;
};

type BooksResult = {
    books: BookRecord[];
    metadata: {
        hasNextPage: boolean;
        hasPreviousPage: boolean;
        nextPage: number | null;
        previousPage: number | null;
        totalItems: number;
        totalPages: number;
        currentPage: number;
        perPage: number;
    };
};

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

type BookFormState = {
    title: string;
    genre: BookGenre;
    publicationYear: string;
};

const getInitialBookForm = (): BookFormState => ({
    title: "",
    genre: "Fiction",
    publicationYear: String(new Date().getFullYear()),
});

export default function AdminBooks() {
    const queryClient = useQueryClient();

    const [page, setPage] = useState(1);
    const [searchInput, setSearchInput] = useState("");
    const [searchValue, setSearchValue] = useState("");
    const [genreFilter, setGenreFilter] = useState<string>("all");
    const [yearFilter, setYearFilter] = useState("");
    const [sort, setSort] = useState<SortValue>("title_asc");

    const [formDialogOpen, setFormDialogOpen] = useState(false);
    const [formMode, setFormMode] = useState<"create" | "edit">("create");
    const [editingBook, setEditingBook] = useState<BookRecord | null>(null);
    const [bookForm, setBookForm] = useState<BookFormState>(getInitialBookForm());

    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [bookToDelete, setBookToDelete] = useState<BookRecord | null>(null);
    const [deleteAcknowledge, setDeleteAcknowledge] = useState(false);

    const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
    const [bulkAcknowledge, setBulkAcknowledge] = useState(false);
    const [selectedBookIds, setSelectedBookIds] = useState<string[]>([]);

    const booksQuery = useQuery({
        queryKey: ["admin-books", page, searchValue, genreFilter, yearFilter, sort],
        placeholderData: keepPreviousData,
        queryFn: async (): Promise<BooksResult> => {
            const response = await api.books.get({
                query: {
                    page,
                    perPage: PER_PAGE,
                    q: searchValue.trim() || undefined,
                    genre: genreFilter === "all" ? undefined : (genreFilter as BookGenre),
                    publicationYear: yearFilter.trim() ? Number(yearFilter) : undefined,
                    sort,
                },
            });

            if (!response.data) {
                throw new Error("Failed to fetch books.");
            }

            return response.data as BooksResult;
        },
    });

    const books = booksQuery.data?.books ?? [];
    const totalItems = booksQuery.data?.metadata.totalItems ?? 0;
    const totalPages = Math.max(booksQuery.data?.metadata.totalPages ?? 1, 1);
    const currentPage = Math.min(page, totalPages);
    const pageTokens = buildPageTokens(currentPage, totalPages);

    const selectedBooks = books.filter((book) => selectedBookIds.includes(book.id));
    const allVisibleSelected = books.length > 0 && books.every((book) => selectedBookIds.includes(book.id));

    const stats = useMemo(() => {
        const byGenre = books.reduce<Record<string, number>>((acc, book) => {
            acc[book.genre] = (acc[book.genre] ?? 0) + 1;
            return acc;
        }, {});

        return {
            total: totalItems,
            topGenre: Object.entries(byGenre).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "-",
            visible: books.length,
        };
    }, [books, totalItems]);

    const invalidateBooks = async () => {
        await queryClient.invalidateQueries({ queryKey: ["admin-books"] });
        await queryClient.invalidateQueries({ queryKey: ["books"] });
        await queryClient.invalidateQueries({ queryKey: ["sidebar-session"] });
    };

    const createBookMutation = useMutation({
        mutationFn: async (payload: { title: string; genre: BookGenre; publication_year: number }) => {
            const response = await api.books.post(payload);
            if (!response.data?.ok) {
                throw new Error(response.data?.message ?? "Failed to add book.");
            }
            return response.data;
        },
        onSuccess: async (result) => {
            toast.success(result.message);
            await invalidateBooks();
            setFormDialogOpen(false);
        },
        onError: (error) => {
            toast.error(getAuthErrorMessage(error, "Failed to add book."));
        },
    });

    const updateBookMutation = useMutation({
        mutationFn: async ({ id, payload }: { id: string; payload: { title: string; genre: BookGenre; publication_year: number } }) => {
            const response = await api.books({ id }).put(payload);
            if (!response.data?.ok) {
                throw new Error(response.data?.message ?? "Failed to update book.");
            }
            return response.data;
        },
        onSuccess: async (result) => {
            toast.success(result.message);
            await invalidateBooks();
            setFormDialogOpen(false);
            setEditingBook(null);
        },
        onError: (error) => {
            toast.error(getAuthErrorMessage(error, "Failed to update book."));
        },
    });

    const purgeBookMutation = useMutation({
        mutationFn: async (id: string) => {
            const response = await api.books({ id }).purge.delete();
            if (!response.data?.ok) {
                throw new Error(response.data?.message ?? "Failed to delete book.");
            }
            return response.data;
        },
        onSuccess: async (result) => {
            toast.success(result.message);
            await invalidateBooks();
            setDeleteDialogOpen(false);
            setDeleteAcknowledge(false);
            setBookToDelete(null);

            if (books.length === 1 && page > 1) {
                setPage((prev) => Math.max(prev - 1, 1));
            }
        },
        onError: (error) => {
            toast.error(getAuthErrorMessage(error, "Failed to delete book."));
        },
    });

    const bulkDeleteMutation = useMutation({
        mutationFn: async (ids: string[]) => {
            let successCount = 0;
            let failureCount = 0;

            for (const id of ids) {
                try {
                    const response = await api.books({ id }).purge.delete();
                    if (response.data?.ok) {
                        successCount += 1;
                    } else {
                        failureCount += 1;
                    }
                } catch {
                    failureCount += 1;
                }
            }

            return { successCount, failureCount };
        },
        onSuccess: async ({ successCount, failureCount }) => {
            toast.success(`Bulk delete complete. Success: ${successCount}, Failed: ${failureCount}.`);
            await invalidateBooks();
            setSelectedBookIds([]);
            setBulkDialogOpen(false);
            setBulkAcknowledge(false);

            if (successCount > 0 && books.length === successCount && page > 1) {
                setPage((prev) => Math.max(prev - 1, 1));
            }
        },
        onError: (error) => {
            toast.error(getAuthErrorMessage(error, "Bulk delete failed."));
        },
    });

    const openCreateDialog = () => {
        setFormMode("create");
        setEditingBook(null);
        setBookForm(getInitialBookForm());
        setFormDialogOpen(true);
    };

    const openEditDialog = (book: BookRecord) => {
        setFormMode("edit");
        setEditingBook(book);
        setBookForm({
            title: book.title,
            genre: book.genre,
            publicationYear: String(book.publication_year),
        });
        setFormDialogOpen(true);
    };

    const openDeleteDialog = (book: BookRecord) => {
        setBookToDelete(book);
        setDeleteAcknowledge(false);
        setDeleteDialogOpen(true);
    };

    const handlePageChange = (nextPage: number) => {
        if (nextPage < 1 || nextPage > totalPages || nextPage === currentPage) {
            return;
        }
        setPage(nextPage);
    };

    const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setPage(1);
        setSearchValue(searchInput);
    };

    const handleResetFilters = () => {
        setPage(1);
        setSearchInput("");
        setSearchValue("");
        setGenreFilter("all");
        setYearFilter("");
        setSort("title_asc");
    };

    const handleBookFormSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const publication_year = Number(bookForm.publicationYear);
        if (!bookForm.title.trim() || Number.isNaN(publication_year)) {
            toast.error("Title and publication year are required.");
            return;
        }

        if (publication_year < 0 || publication_year > new Date().getFullYear()) {
            toast.error("Publication year is out of range.");
            return;
        }

        const payload = {
            title: bookForm.title.trim(),
            genre: bookForm.genre,
            publication_year,
        };

        if (formMode === "create") {
            createBookMutation.mutate(payload);
            return;
        }

        if (!editingBook) {
            return;
        }

        updateBookMutation.mutate({
            id: editingBook.id,
            payload,
        });
    };

    const toggleBookSelection = (id: string) => {
        setSelectedBookIds((prev) =>
            prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id],
        );
    };

    const toggleSelectVisible = () => {
        if (allVisibleSelected) {
            setSelectedBookIds((prev) => prev.filter((id) => !books.some((book) => book.id === id)));
            return;
        }

        setSelectedBookIds((prev) => {
            const merged = new Set(prev);
            for (const book of books) {
                merged.add(book.id);
            }
            return Array.from(merged);
        });
    };

    return (
        <section className="space-y-6 p-4 md:p-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-xl font-semibold md:text-2xl">Books Admin Panel</h1>
                    <p className="text-sm text-muted-foreground">
                        Manage books metadata, catalog quality, and destructive cleanup operations.
                    </p>
                </div>

                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setBulkDialogOpen(true)} disabled={selectedBookIds.length === 0}>
                        <Trash2 className="size-4" />
                        Delete Selected ({selectedBookIds.length})
                    </Button>
                    <Button onClick={openCreateDialog}>
                        <Plus className="size-4" />
                        Add Book
                    </Button>
                </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Total books</CardDescription>
                        <CardTitle className="text-2xl">{stats.total}</CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Top genre (visible)</CardDescription>
                        <CardTitle className="text-2xl">{stats.topGenre}</CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Visible results</CardDescription>
                        <CardTitle className="text-2xl">{stats.visible}</CardTitle>
                    </CardHeader>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Filters</CardTitle>
                    <CardDescription>Search by title with optional genre and year constraints.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form className="grid gap-3 md:grid-cols-5" onSubmit={handleSearchSubmit}>
                        <div className="md:col-span-2">
                            <Label htmlFor="books-search">Title</Label>
                            <Input
                                id="books-search"
                                value={searchInput}
                                onChange={(event) => setSearchInput(event.target.value)}
                                placeholder="Search title"
                            />
                        </div>
                        <div>
                            <Label htmlFor="books-genre">Genre</Label>
                            <select
                                id="books-genre"
                                className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"
                                value={genreFilter}
                                onChange={(event) => {
                                    setPage(1);
                                    setGenreFilter(event.target.value);
                                }}
                            >
                                <option value="all">All genres</option>
                                {GENRE_OPTIONS.map((genre) => (
                                    <option key={genre} value={genre}>
                                        {genre}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <Label htmlFor="books-year">Publication year</Label>
                            <Input
                                id="books-year"
                                value={yearFilter}
                                onChange={(event) => {
                                    setPage(1);
                                    setYearFilter(event.target.value);
                                }}
                                placeholder="e.g. 2024"
                                inputMode="numeric"
                            />
                        </div>
                        <div>
                            <Label htmlFor="books-sort">Sort</Label>
                            <select
                                id="books-sort"
                                className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"
                                value={sort}
                                onChange={(event) => {
                                    setPage(1);
                                    setSort(event.target.value as SortValue);
                                }}
                            >
                                {SORT_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="md:col-span-5 flex gap-2">
                            <Button type="submit">Apply</Button>
                            <Button type="button" variant="outline" onClick={handleResetFilters}>
                                Reset
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Books</CardTitle>
                    <CardDescription>
                        Hard-delete removes the book and all related loan history records.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b text-left text-muted-foreground">
                                    <th className="py-2 pr-2">
                                        <input type="checkbox" checked={allVisibleSelected} onChange={toggleSelectVisible} />
                                    </th>
                                    <th className="py-2 pr-2">Title</th>
                                    <th className="py-2 pr-2">Genre</th>
                                    <th className="py-2 pr-2">Year</th>
                                    <th className="py-2 pr-2">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {books.map((book) => (
                                    <tr key={book.id} className="border-b last:border-0">
                                        <td className="py-3 pr-2 align-middle">
                                            <input
                                                type="checkbox"
                                                checked={selectedBookIds.includes(book.id)}
                                                onChange={() => toggleBookSelection(book.id)}
                                            />
                                        </td>
                                        <td className="py-3 pr-2 font-medium">{book.title}</td>
                                        <td className="py-3 pr-2">{book.genre}</td>
                                        <td className="py-3 pr-2">{book.publication_year}</td>
                                        <td className="py-3 pr-2">
                                            <div className="flex items-center gap-2">
                                                <Button asChild size="sm" variant="outline">
                                                    <Link href={`/book/${book.id}/history`}>View details/history</Link>
                                                </Button>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button size="icon" variant="ghost">
                                                            <Ellipsis className="size-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem onClick={() => openEditDialog(book)}>
                                                            <Pencil className="size-4" />
                                                            Edit metadata
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            className="text-destructive"
                                                            onClick={() => openDeleteDialog(book)}
                                                        >
                                                            <Trash2 className="size-4" />
                                                            Delete + purge loans
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="md:hidden">
                        <ItemGroup>
                            {books.map((book) => (
                                <Item key={book.id}>
                                    <ItemMedia variant="icon">
                                        <BookOpen className="size-4" />
                                    </ItemMedia>
                                    <ItemContent>
                                        <ItemTitle>{book.title}</ItemTitle>
                                        <ItemDescription>
                                            {book.genre} · {book.publication_year}
                                        </ItemDescription>
                                    </ItemContent>
                                    <ItemActions>
                                        <input
                                            type="checkbox"
                                            checked={selectedBookIds.includes(book.id)}
                                            onChange={() => toggleBookSelection(book.id)}
                                            aria-label={`Select ${book.title}`}
                                        />
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button size="icon" variant="ghost">
                                                    <Ellipsis className="size-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem asChild>
                                                    <Link href={`/book/${book.id}/history`}>View details/history</Link>
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => openEditDialog(book)}>
                                                    Edit metadata
                                                </DropdownMenuItem>
                                                <DropdownMenuItem className="text-destructive" onClick={() => openDeleteDialog(book)}>
                                                    Delete + purge loans
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </ItemActions>
                                </Item>
                            ))}
                        </ItemGroup>
                    </div>

                    {books.length === 0 && !booksQuery.isLoading ? (
                        <p className="text-sm text-muted-foreground">No books match the current filters.</p>
                    ) : null}

                    <Pagination>
                        <PaginationContent>
                            <PaginationItem>
                                <PaginationPrevious
                                    onClick={(event) => {
                                        event.preventDefault();
                                        handlePageChange(currentPage - 1);
                                    }}
                                />
                            </PaginationItem>

                            {pageTokens.map((token, index) => {
                                if (token === "left-ellipsis" || token === "right-ellipsis") {
                                    return (
                                        <PaginationItem key={`${token}-${index}`}>
                                            <PaginationEllipsis />
                                        </PaginationItem>
                                    );
                                }

                                return (
                                    <PaginationItem key={token}>
                                        <PaginationLink
                                            isActive={token === currentPage}
                                            onClick={(event) => {
                                                event.preventDefault();
                                                handlePageChange(token);
                                            }}
                                        >
                                            {token}
                                        </PaginationLink>
                                    </PaginationItem>
                                );
                            })}

                            <PaginationItem>
                                <PaginationNext
                                    onClick={(event) => {
                                        event.preventDefault();
                                        handlePageChange(currentPage + 1);
                                    }}
                                />
                            </PaginationItem>
                        </PaginationContent>
                    </Pagination>
                </CardContent>
            </Card>

            <Dialog open={formDialogOpen} onOpenChange={setFormDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{formMode === "create" ? "Add Book" : "Edit Book"}</DialogTitle>
                        <DialogDescription>
                            Maintain title, genre, and publication year metadata.
                        </DialogDescription>
                    </DialogHeader>

                    <form className="space-y-3" onSubmit={handleBookFormSubmit}>
                        <div className="space-y-2">
                            <Label htmlFor="book-title">Title</Label>
                            <Input
                                id="book-title"
                                value={bookForm.title}
                                onChange={(event) => setBookForm((prev) => ({ ...prev, title: event.target.value }))}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="book-genre">Genre</Label>
                            <select
                                id="book-genre"
                                className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"
                                value={bookForm.genre}
                                onChange={(event) => setBookForm((prev) => ({ ...prev, genre: event.target.value as BookGenre }))}
                            >
                                {GENRE_OPTIONS.map((genre) => (
                                    <option key={genre} value={genre}>
                                        {genre}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="book-year">Publication year</Label>
                            <Input
                                id="book-year"
                                type="number"
                                min={0}
                                max={new Date().getFullYear()}
                                value={bookForm.publicationYear}
                                onChange={(event) =>
                                    setBookForm((prev) => ({ ...prev, publicationYear: event.target.value }))
                                }
                                required
                            />
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setFormDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={createBookMutation.isPending || updateBookMutation.isPending}>
                                {formMode === "create" ? "Add" : "Save"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete book and loan history?</DialogTitle>
                        <DialogDescription>
                            This will permanently delete "{bookToDelete?.title}" and all related loan records.
                        </DialogDescription>
                    </DialogHeader>

                    <label className="flex items-center gap-2 text-sm">
                        <input
                            type="checkbox"
                            checked={deleteAcknowledge}
                            onChange={(event) => setDeleteAcknowledge(event.target.checked)}
                        />
                        I understand this operation is destructive and irreversible.
                    </label>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            disabled={!deleteAcknowledge || !bookToDelete || purgeBookMutation.isPending}
                            onClick={() => {
                                if (!bookToDelete) {
                                    return;
                                }
                                purgeBookMutation.mutate(bookToDelete.id);
                            }}
                        >
                            Delete book
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Bulk delete selected books?</DialogTitle>
                        <DialogDescription>
                            You are deleting {selectedBookIds.length} selected books and all related loan history.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="max-h-40 overflow-y-auto rounded-md border p-2 text-sm">
                        {selectedBooks.length === 0 ? (
                            <p className="text-muted-foreground">No selected books on this page.</p>
                        ) : (
                            <ul className="space-y-1">
                                {selectedBooks.map((book) => (
                                    <li key={book.id}>{book.title}</li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <label className="flex items-center gap-2 text-sm">
                        <input
                            type="checkbox"
                            checked={bulkAcknowledge}
                            onChange={(event) => setBulkAcknowledge(event.target.checked)}
                        />
                        I understand this operation is destructive and irreversible.
                    </label>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setBulkDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            disabled={!bulkAcknowledge || selectedBookIds.length === 0 || bulkDeleteMutation.isPending}
                            onClick={() => bulkDeleteMutation.mutate(selectedBookIds)}
                        >
                            Delete selected
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </section>
    );
}