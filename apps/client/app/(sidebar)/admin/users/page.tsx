"use client";

import { useMemo, useState } from "react";
import {
    keepPreviousData,
    useQuery,
    useQueryClient,
} from "@tanstack/react-query";
import {
    Ban,
    Ellipsis,
    ShieldAlert,
    ShieldCheck,
    UserRound,
    UserRoundCog,
} from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { authClient } from "@/lib/auth-client";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const DEFAULT_USER_IMAGE = "https://upload.wikimedia.org/wikipedia/commons/0/03/Twitter_default_profile_400x400.png";
const PER_PAGE_OPTIONS = [10, 20, 50] as const;
const MAX_VISIBLE_PAGE_LINKS = 5;

type PaginationToken = number | "left-ellipsis" | "right-ellipsis";

type ManagedUser = {
    id: string;
    name: string;
    email: string;
    image?: string | null;
    role?: string | null;
    banned?: boolean | null;
    banReason?: string | null;
    banExpires?: string | Date | null;
    createdAt?: string | Date | null;
};

type UsersResult = {
    users: ManagedUser[];
    total: number;
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

const getInitials = (name?: string | null) => {
    if (!name) {
        return "U";
    }

    const initials = name
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();

    return initials || "U";
};

const formatDate = (value?: string | Date | null) => {
    if (!value) {
        return "-";
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return "-";
    }

    return date.toISOString().slice(0, 10);
};

const getBanStatusLabel = (user: ManagedUser) => {
    if (!user.banned) {
        return "Active";
    }

    if (user.banExpires) {
        return `Banned until ${formatDate(user.banExpires)}`;
    }

    return "Banned";
};

const copyToClipboard = async (text: string) => {
    try {
        await navigator.clipboard.writeText(text);
        toast.success("Copied to clipboard");
    } catch (error) {
        toast.error("Failed to copy");
    }
}

export default function AdminUsersPage() {
    const queryClient = useQueryClient();

    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState<number>(20);
    const [searchValue, setSearchValue] = useState("");

    const [banDialogOpen, setBanDialogOpen] = useState(false);
    const [userToBan, setUserToBan] = useState<ManagedUser | null>(null);
    const [banReason, setBanReason] = useState("");
    const [banExpiresAt, setBanExpiresAt] = useState("");

    const [activeUserId, setActiveUserId] = useState<string | null>(null);

    const usersQuery = useQuery({
        queryKey: ["admin-users", page, perPage, searchValue],
        placeholderData: keepPreviousData,
        queryFn: async (): Promise<UsersResult> => {
            const offset = (page - 1) * perPage;
            const response = await authClient.admin.listUsers({
                query: {
                    limit: perPage,
                    offset,
                    searchField: "email",
                    searchValue: searchValue.trim() || undefined,
                    sortBy: "createdAt",
                    sortDirection: "desc",
                },
            });

            if (response.error) {
                throw new Error(response.error.message || "Failed to load users.");
            }

            return {
                users: (response.data?.users ?? []) as ManagedUser[],
                total: Number(response.data?.total ?? 0),
            };
        },
    });

    const sessionQuery = useQuery({
        queryKey: ["admin-users-session"],
        queryFn: async () => {
            const response = await authClient.getSession();
            return response.data;
        },
    });

    const users = usersQuery.data?.users ?? [];
    const totalUsers = usersQuery.data?.total ?? 0;
    const totalPages = Math.max(Math.ceil(totalUsers / perPage), 1);
    const currentPage = Math.min(page, totalPages);
    const pageTokens = buildPageTokens(currentPage, totalPages);
    const currentAdminId = sessionQuery.data?.user?.id ?? null;

    const stats = useMemo(() => {
        const total = totalUsers;
        const banned = users.filter((user) => user.banned).length;
        const admins = users.filter((user) => user.role === "admin").length;
        return { total, banned, admins };
    }, [totalUsers, users]);

    const resetBanDialog = () => {
        setBanDialogOpen(false);
        setUserToBan(null);
        setBanReason("");
        setBanExpiresAt("");
    };

    const invalidateUsers = async () => {
        await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
        await queryClient.invalidateQueries({ queryKey: ["admin-users-session"] });
        await queryClient.invalidateQueries({ queryKey: ["sidebar-session"] });
    };

    const handleRoleToggle = async (user: ManagedUser) => {
        const nextRole = user.role === "admin" ? "user" : "admin";
        setActiveUserId(user.id);

        try {
            await toast.promise(
                authClient.admin.setRole({
                    userId: user.id,
                    role: nextRole,
                }),
                {
                    loading: nextRole === "admin" ? "Promoting user..." : "Demoting user...",
                    success: nextRole === "admin" ? "User promoted to admin." : "User demoted to user.",
                    error: "Failed to update user role.",
                },
            );
            await invalidateUsers();
        } finally {
            setActiveUserId(null);
        }
    };

    const handleUnban = async (user: ManagedUser) => {
        setActiveUserId(user.id);

        try {
            await toast.promise(
                authClient.admin.unbanUser({
                    userId: user.id,
                }),
                {
                    loading: "Unbanning user...",
                    success: "User unbanned.",
                    error: "Failed to unban user.",
                },
            );
            await invalidateUsers();
        } finally {
            setActiveUserId(null);
        }
    };

    const openBanDialog = (user: ManagedUser) => {
        setUserToBan(user);
        setBanDialogOpen(true);
    };

    const handleBanSubmit = async () => {
        if (!userToBan || !banReason.trim()) {
            return;
        }

        const expiresDate = banExpiresAt ? new Date(banExpiresAt) : null;
        const banExpiresIn = expiresDate
            ? Math.max(Math.floor((expiresDate.getTime() - Date.now()) / 1000), 0)
            : undefined;

        setActiveUserId(userToBan.id);

        try {
            await toast.promise(
                authClient.admin.banUser({
                    userId: userToBan.id,
                    banReason: banReason.trim(),
                    banExpiresIn,
                }),
                {
                    loading: "Banning user...",
                    success: "User banned.",
                    error: "Failed to ban user.",
                },
            );
            await invalidateUsers();
            resetBanDialog();
        } finally {
            setActiveUserId(null);
        }
    };

    const handleImpersonate = async (user: ManagedUser) => {
        setActiveUserId(user.id);

        try {
            await toast.promise(
                authClient.admin.impersonateUser({
                    userId: user.id,
                }),
                {
                    loading: "Starting impersonation...",
                    success: "Now impersonating user.",
                    error: "Failed to impersonate user.",
                },
            );

            await invalidateUsers();
            window.location.href = "/dashboard";
        } finally {
            setActiveUserId(null);
        }
    };

    const handlePageChange = (nextPage: number) => {
        if (nextPage < 1 || nextPage > totalPages || nextPage === currentPage) {
            return;
        }

        setPage(nextPage);
    };

    return (
        <section className="flex min-h-screen flex-col gap-6">
            <div className="space-y-1">
                <h2 className="text-2xl font-bold tracking-tight">User Administration</h2>
                <p className="text-muted-foreground">
                    View users, inspect roles, and perform account-level admin actions.
                </p>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Total Users</CardDescription>
                        <CardTitle>{stats.total}</CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Admins (current page)</CardDescription>
                        <CardTitle>{stats.admins}</CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Banned (current page)</CardDescription>
                        <CardTitle>{stats.banned}</CardTitle>
                    </CardHeader>
                </Card>
            </div>

            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div className="w-full max-w-sm space-y-2">
                    <Label htmlFor="search-users">Search users</Label>
                    <Input
                        id="search-users"
                        value={searchValue}
                        placeholder="Search by email"
                        onChange={(event) => {
                            setSearchValue(event.target.value);
                            setPage(1);
                        }}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="per-page">Users per page</Label>
                    <select
                        id="per-page"
                        className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
                        value={perPage}
                        onChange={(event) => {
                            setPerPage(Number(event.target.value));
                            setPage(1);
                        }}
                    >
                        {PER_PAGE_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                                {option}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {usersQuery.isError ? (
                <Card>
                    <CardHeader>
                        <CardTitle>Couldn&apos;t load users</CardTitle>
                        <CardDescription>
                            {usersQuery.error instanceof Error
                                ? usersQuery.error.message
                                : "An unexpected error occurred while loading users."}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button type="button" onClick={() => void usersQuery.refetch()}>
                            Try Again
                        </Button>
                    </CardContent>
                </Card>
            ) : usersQuery.isPending ? (
                <Card>
                    <CardHeader>
                        <CardTitle>Loading users...</CardTitle>
                    </CardHeader>
                </Card>
            ) : users.length === 0 ? (
                <Card>
                    <CardHeader>
                        <CardTitle>No users found</CardTitle>
                        <CardDescription>
                            No users match your current search criteria.
                        </CardDescription>
                    </CardHeader>
                </Card>
            ) : (
                <>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm text-muted-foreground">
                            Showing {(currentPage - 1) * perPage + 1}-
                            {Math.min(currentPage * perPage, totalUsers)} of {totalUsers} users
                        </p>
                        <p className="text-sm text-muted-foreground">
                            Page {currentPage} of {totalPages}
                            {usersQuery.isFetching ? " (updating...)" : ""}
                        </p>
                    </div>

                    <ItemGroup>
                        {users.map((user) => {
                            const isPendingRowAction = activeUserId === user.id;
                            const isSelf = user.id === currentAdminId;
                            const roleLabel = user.role === "admin" ? "Admin" : "User";

                            return (
                                <Item key={user.id} variant="outline">
                                    <ItemMedia variant="image">
                                        <Avatar size="lg" className="size-10">
                                            <AvatarImage src={user.image || DEFAULT_USER_IMAGE} alt={user.name} />
                                            <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                                        </Avatar>
                                    </ItemMedia>

                                    <ItemContent className="min-w-0 gap-1">
                                        <ItemTitle>{user.name}</ItemTitle>
                                        <ItemDescription className="truncate">{user.email}</ItemDescription>
                                    </ItemContent>

                                    <div className="ml-auto flex min-w-70 flex-wrap items-center justify-end gap-2">
                                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${user.role === "admin"
                                            ? "border-amber-200 bg-amber-50 text-amber-700"
                                            : "border-slate-200 bg-slate-50 text-slate-700"
                                            }`}>
                                            {roleLabel}
                                        </span>
                                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${user.banned
                                            ? "border-red-200 bg-red-50 text-red-700"
                                            : "border-emerald-200 bg-emerald-50 text-emerald-700"
                                            }`}>
                                            {getBanStatusLabel(user)}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            Joined {formatDate(user.createdAt)}
                                        </span>
                                    </div>

                                    <ItemActions>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button
                                                    size="icon-sm"
                                                    variant="ghost"
                                                    disabled={isPendingRowAction}
                                                    aria-label={`Manage ${user.name}`}
                                                >
                                                    <Ellipsis className="size-4" />
                                                </Button>
                                            </DropdownMenuTrigger>

                                            <DropdownMenuContent align="end" className="w-52 min-w-52">
                                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    disabled={isPendingRowAction}
                                                    onClick={() => void handleImpersonate(user)}
                                                >
                                                    <UserRoundCog />
                                                    Impersonate user
                                                </DropdownMenuItem>

                                                {user.banned ? (
                                                    <DropdownMenuItem
                                                        disabled={isPendingRowAction}
                                                        onClick={() => void handleUnban(user)}
                                                    >
                                                        <ShieldCheck />
                                                        Unban user
                                                    </DropdownMenuItem>
                                                ) : (
                                                    <DropdownMenuItem
                                                        disabled={isPendingRowAction}
                                                        onClick={() => openBanDialog(user)}
                                                        variant="destructive"
                                                    >
                                                        <Ban />
                                                        Ban user
                                                    </DropdownMenuItem>
                                                )}

                                                <DropdownMenuItem
                                                    disabled={isPendingRowAction || isSelf}
                                                    onClick={() => void handleRoleToggle(user)}
                                                >
                                                    {user.role === "admin" ? <ShieldAlert /> : <ShieldCheck />}
                                                    {user.role === "admin" ? "Demote to user" : "Promote to admin"}
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <Tooltip>
                                                    <TooltipTrigger>
                                                        <DropdownMenuItem onClick={() => void copyToClipboard(user.id)}>
                                                            <UserRound />
                                                            <span>User ID: {user.id.slice(0, 8)}...</span>
                                                        </DropdownMenuItem>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p className="text-sm">Click to copy ID to clipboard</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </ItemActions>
                                </Item>
                            );
                        })}
                    </ItemGroup>

                    <Pagination>
                        <PaginationContent>
                            <PaginationItem>
                                <PaginationLink
                                    disabled={currentPage === 1}
                                    onClick={() => handlePageChange(1)}
                                >
                                    First
                                </PaginationLink>
                            </PaginationItem>
                            <PaginationItem>
                                <PaginationPrevious
                                    disabled={currentPage === 1}
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
                                    disabled={currentPage === totalPages}
                                    onClick={() => handlePageChange(currentPage + 1)}
                                />
                            </PaginationItem>
                            <PaginationItem>
                                <PaginationLink
                                    disabled={currentPage === totalPages}
                                    onClick={() => handlePageChange(totalPages)}
                                >
                                    Last
                                </PaginationLink>
                            </PaginationItem>
                        </PaginationContent>
                    </Pagination>
                </>
            )}

            <Dialog open={banDialogOpen} onOpenChange={setBanDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Ban user</DialogTitle>
                        <DialogDescription>
                            {userToBan
                                ? `Ban ${userToBan.name}. A reason is required.`
                                : "A reason is required to ban a user."}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3">
                        <div className="space-y-1.5">
                            <Label htmlFor="ban-reason">Ban reason</Label>
                            <Input
                                id="ban-reason"
                                value={banReason}
                                placeholder="Reason for ban"
                                onChange={(event) => setBanReason(event.target.value)}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="ban-expiry">Ban expiry (optional)</Label>
                            <Input
                                id="ban-expiry"
                                type="datetime-local"
                                value={banExpiresAt}
                                onChange={(event) => setBanExpiresAt(event.target.value)}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={resetBanDialog}>Cancel</Button>
                        <Button
                            variant="destructive"
                            onClick={() => void handleBanSubmit()}
                            disabled={!banReason.trim() || !userToBan || activeUserId === userToBan?.id}
                        >
                            Ban user
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </section>
    );
}
