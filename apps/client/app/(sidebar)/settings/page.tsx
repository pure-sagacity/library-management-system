"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
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
    DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { api, getAuthErrorMessage } from "@/lib/api";
import { authClient } from "@/lib/auth-client";

type SessionResponse = NonNullable<Awaited<ReturnType<typeof authClient.getSession>>["data"]>;
type SessionItem = SessionResponse["session"];

type LinkedAccount = {
    id: string;
    accountId: string;
    providerId: string;
    createdAt?: string | Date;
};

type Passkey = {
    id: string;
    name?: string;
    deviceType?: string;
    backedUp?: boolean;
    createdAt?: string | Date;
};

const formatDateTime = (value?: string | Date | null) => {
    if (!value) {
        return "-";
    }

    const date = value instanceof Date ? value : new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "-";
    }

    return date.toLocaleString();
};

const initialsFromName = (name?: string | null) => {
    if (!name) {
        return "U";
    }

    const initials = name
        .split(" ")
        .map((chunk) => chunk[0])
        .filter(Boolean)
        .join("")
        .slice(0, 2)
        .toUpperCase();

    return initials || "U";
};

const parseUserAgent = (ua?: string | null) => {
    if (!ua) {
        return "Unknown device";
    }

    if (ua.includes("Macintosh")) {
        return "Mac";
    }

    if (ua.includes("Windows")) {
        return "Windows";
    }

    if (ua.includes("iPhone") || ua.includes("iPad")) {
        return "iOS";
    }

    if (ua.includes("Android")) {
        return "Android";
    }

    if (ua.includes("Linux")) {
        return "Linux";
    }

    return "Unknown device";
};

const isCredentialProvider = (providerId: string) => providerId === "credential";

export default function Settings() {
    const queryClient = useQueryClient();

    const [fullName, setFullName] = useState("");
    const [imageUrl, setImageUrl] = useState("");
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [newPasskeyName, setNewPasskeyName] = useState("");
    const [deactivationText, setDeactivationText] = useState("");

    const passkeysState = authClient.useListPasskeys();

    const sessionQuery = useQuery({
        queryKey: ["settings", "session"],
        queryFn: async () => {
            const response = await authClient.getSession();

            if (response.error) {
                throw new Error(getAuthErrorMessage(response.error, "Failed to load your session."));
            }

            return response.data;
        },
    });

    const user = sessionQuery.data?.user;

    const sessionsQuery = useQuery({
        queryKey: ["settings", "sessions"],
        enabled: Boolean(user),
        queryFn: async () => {
            const response = await authClient.listSessions();

            if (response.error) {
                throw new Error(getAuthErrorMessage(response.error, "Failed to load sessions."));
            }

            return (response.data ?? []) as SessionItem[];
        },
    });

    const linkedAccountsQuery = useQuery({
        queryKey: ["settings", "linked-accounts"],
        enabled: Boolean(user),
        queryFn: async () => {
            const response = await authClient.listAccounts();

            if (response.error) {
                throw new Error(getAuthErrorMessage(response.error, "Failed to load linked login methods."));
            }

            return (response.data ?? []) as LinkedAccount[];
        },
    });

    const profileMutation = useMutation({
        mutationFn: async () => {
            const response = await authClient.updateUser({
                name: fullName,
                image: imageUrl.trim() ? imageUrl.trim() : null,
            });

            if (response.error) {
                throw new Error(getAuthErrorMessage(response.error, "Failed to update profile."));
            }
        },
        onSuccess: async () => {
            toast.success("Profile updated.");
            await queryClient.invalidateQueries({ queryKey: ["settings", "session"] });
            await queryClient.invalidateQueries({ queryKey: ["sidebar-session"] });
        },
        onError: (error) => {
            toast.error(getAuthErrorMessage(error, "Failed to update profile."));
        },
    });

    const changePasswordMutation = useMutation({
        mutationFn: async () => {
            const response = await authClient.changePassword({
                currentPassword,
                newPassword,
                revokeOtherSessions: true,
            });

            if (response.error) {
                throw new Error(getAuthErrorMessage(response.error, "Failed to change password."));
            }
        },
        onSuccess: async () => {
            toast.success("Password changed. Other sessions were signed out.");
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
            await queryClient.invalidateQueries({ queryKey: ["settings", "sessions"] });
        },
        onError: (error) => {
            toast.error(getAuthErrorMessage(error, "Failed to change password."));
        },
    });

    const revokeSessionMutation = useMutation({
        mutationFn: async (token: string) => {
            const response = await authClient.revokeSession({ token });

            if (response.error) {
                throw new Error(getAuthErrorMessage(response.error, "Failed to revoke session."));
            }
        },
        onSuccess: async () => {
            toast.success("Session revoked.");
            await queryClient.invalidateQueries({ queryKey: ["settings", "sessions"] });
        },
        onError: (error) => {
            toast.error(getAuthErrorMessage(error, "Failed to revoke session."));
        },
    });

    const revokeOthersMutation = useMutation({
        mutationFn: async () => {
            const response = await authClient.revokeOtherSessions();

            if (response.error) {
                throw new Error(getAuthErrorMessage(response.error, "Failed to revoke other sessions."));
            }
        },
        onSuccess: async () => {
            toast.success("All other sessions were revoked.");
            await queryClient.invalidateQueries({ queryKey: ["settings", "sessions"] });
        },
        onError: (error) => {
            toast.error(getAuthErrorMessage(error, "Failed to revoke other sessions."));
        },
    });

    const unlinkAccountMutation = useMutation({
        mutationFn: async ({ providerId, accountId }: { providerId: string; accountId?: string }) => {
            const response = await authClient.unlinkAccount({ providerId, accountId });

            if (response.error) {
                throw new Error(getAuthErrorMessage(response.error, "Failed to unlink account."));
            }
        },
        onSuccess: async () => {
            toast.success("Login method unlinked.");
            await queryClient.invalidateQueries({ queryKey: ["settings", "linked-accounts"] });
        },
        onError: (error) => {
            toast.error(getAuthErrorMessage(error, "Failed to unlink account."));
        },
    });

    const addPasskeyMutation = useMutation({
        mutationFn: async () => {
            const response = await authClient.passkey.addPasskey({
                name: newPasskeyName.trim() || undefined,
            });

            if (response.error) {
                throw new Error(getAuthErrorMessage(response.error, "Failed to add passkey."));
            }
        },
        onSuccess: async () => {
            toast.success("Passkey added.");
            setNewPasskeyName("");
            await passkeysState.refetch();
        },
        onError: (error) => {
            toast.error(getAuthErrorMessage(error, "Failed to add passkey."));
        },
    });

    const deletePasskeyMutation = useMutation({
        mutationFn: async (id: string) => {
            const response = await authClient.$fetch<{ status: boolean }>("/passkey/delete-passkey", {
                method: "POST",
                body: {
                    id,
                },
            });

            if (response.error) {
                throw new Error(getAuthErrorMessage(response.error, "Failed to delete passkey."));
            }
        },
        onSuccess: async () => {
            toast.success("Passkey removed.");
            await passkeysState.refetch();
        },
        onError: (error) => {
            toast.error(getAuthErrorMessage(error, "Failed to delete passkey."));
        },
    });

    const deactivateMutation = useMutation({
        mutationFn: async () => {
            const response = await api.account.deactivate.post();

            if (response.error || !response.data?.status) {
                throw new Error(getAuthErrorMessage(response.error, response.data?.message ?? "Failed to deactivate account."));
            }

            const signOutResponse = await authClient.signOut();
            if (signOutResponse.error) {
                throw new Error(getAuthErrorMessage(signOutResponse.error, "Account was deactivated but sign-out failed."));
            }
        },
        onSuccess: () => {
            toast.success("Account deactivated. You have been signed out.");
            window.location.href = "/login";
        },
        onError: (error) => {
            toast.error(getAuthErrorMessage(error, "Failed to deactivate account."));
        },
    });

    const isSessionLoading = sessionQuery.isPending;
    const currentSessionToken = sessionQuery.data?.session.token;
    const sessions = sessionsQuery.data ?? [];
    const linkedAccounts = linkedAccountsQuery.data ?? [];
    const passkeys = (passkeysState.data ?? []) as Passkey[];

    useEffect(() => {
        if (user?.name && fullName === "") {
            setFullName(user.name);
        }

        if (user?.image && imageUrl === "") {
            setImageUrl(user.image);
        }
    }, [fullName, imageUrl, user]);

    const disableDeactivateButton = deactivationText !== "DEACTIVATE" || deactivateMutation.isPending;

    const sortedSessions = useMemo(() => {
        return [...sessions].sort((a, b) => {
            const aDate = new Date(a.updatedAt).getTime();
            const bDate = new Date(b.updatedAt).getTime();
            return bDate - aDate;
        });
    }, [sessions]);

    if (isSessionLoading) {
        return (
            <div className="min-h-screen px-6 py-12">
                <div className="mx-auto flex max-w-5xl items-center justify-center gap-2 py-20 text-sm text-muted-foreground">
                    <Spinner />
                    <span>Loading settings...</span>
                </div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="min-h-screen px-6 py-12">
                <div className="mx-auto max-w-2xl rounded-xl border bg-card p-6 text-sm text-muted-foreground">
                    Your session is unavailable. Please sign in again to access settings.
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen px-6 py-10">
            <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
                <div>
                    <h1 className="text-2xl font-semibold">Settings</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Manage your profile, account security, active sessions, and login methods.
                    </p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Account Basics</CardTitle>
                        <CardDescription>
                            Update how your name and avatar appear across the app.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="mb-5 flex items-center gap-3">
                            <Avatar className="size-12">
                                <AvatarImage src={imageUrl || user.image || undefined} />
                                <AvatarFallback>{initialsFromName(fullName || user.name)}</AvatarFallback>
                            </Avatar>
                            <div className="text-sm text-muted-foreground">
                                Joined {formatDateTime(user.createdAt)}
                            </div>
                        </div>

                        <FieldGroup>
                            <Field>
                                <FieldLabel htmlFor="fullName">Full name</FieldLabel>
                                <Input
                                    id="fullName"
                                    value={fullName}
                                    onChange={(event) => setFullName(event.target.value)}
                                />
                            </Field>
                            <Field>
                                <FieldLabel htmlFor="imageUrl">Avatar URL</FieldLabel>
                                <Input
                                    id="imageUrl"
                                    type="url"
                                    placeholder="https://..."
                                    value={imageUrl}
                                    onChange={(event) => setImageUrl(event.target.value)}
                                />
                            </Field>
                        </FieldGroup>
                    </CardContent>
                    <CardFooter className="justify-end gap-2">
                        <Button
                            onClick={() => profileMutation.mutate()}
                            disabled={profileMutation.isPending || fullName.trim().length === 0}
                        >
                            {profileMutation.isPending ? <Spinner /> : null}
                            Save Profile
                        </Button>
                    </CardFooter>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Password & Security</CardTitle>
                        <CardDescription>
                            Change your password and sign out all other active devices.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <FieldGroup>
                            <Field>
                                <FieldLabel htmlFor="currentPassword">Current password</FieldLabel>
                                <Input
                                    id="currentPassword"
                                    type="password"
                                    value={currentPassword}
                                    onChange={(event) => setCurrentPassword(event.target.value)}
                                />
                            </Field>
                            <Field>
                                <FieldLabel htmlFor="newPassword">New password</FieldLabel>
                                <Input
                                    id="newPassword"
                                    type="password"
                                    value={newPassword}
                                    onChange={(event) => setNewPassword(event.target.value)}
                                />
                            </Field>
                            <Field>
                                <FieldLabel htmlFor="confirmPassword">Confirm new password</FieldLabel>
                                <Input
                                    id="confirmPassword"
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(event) => setConfirmPassword(event.target.value)}
                                />
                                <FieldDescription>
                                    Changing your password will revoke your other active sessions.
                                </FieldDescription>
                            </Field>
                        </FieldGroup>
                    </CardContent>
                    <CardFooter className="justify-end gap-2">
                        <Button
                            onClick={() => {
                                if (newPassword !== confirmPassword) {
                                    toast.error("New password and confirmation do not match.");
                                    return;
                                }
                                changePasswordMutation.mutate();
                            }}
                            disabled={
                                changePasswordMutation.isPending ||
                                !currentPassword ||
                                !newPassword ||
                                !confirmPassword
                            }
                        >
                            {changePasswordMutation.isPending ? <Spinner /> : null}
                            Change Password
                        </Button>
                    </CardFooter>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Active Sessions</CardTitle>
                        <CardDescription>
                            Review devices where your account is currently signed in.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {sessionsQuery.isPending ? (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Spinner />
                                <span>Loading sessions...</span>
                            </div>
                        ) : sortedSessions.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No active sessions found.</p>
                        ) : (
                            sortedSessions.map((session) => {
                                const isCurrentSession = session.token === currentSessionToken;

                                return (
                                    <div
                                        key={session.id}
                                        className="rounded-lg border px-3 py-2 text-sm"
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="font-medium">
                                                {parseUserAgent(session.userAgent)}
                                                {isCurrentSession ? (
                                                    <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                                                        Current
                                                    </span>
                                                ) : null}
                                            </div>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                disabled={isCurrentSession || revokeSessionMutation.isPending}
                                                onClick={() => revokeSessionMutation.mutate(session.token)}
                                            >
                                                Revoke
                                            </Button>
                                        </div>
                                        <div className="mt-1 text-xs text-muted-foreground">
                                            Last active: {formatDateTime(session.updatedAt)}
                                        </div>
                                        <div className="mt-1 text-xs text-muted-foreground">
                                            IP: {session.ipAddress ?? "Unknown"}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </CardContent>
                    <CardFooter className="justify-end">
                        <Button
                            variant="outline"
                            onClick={() => revokeOthersMutation.mutate()}
                            disabled={revokeOthersMutation.isPending || sortedSessions.length <= 1}
                        >
                            {revokeOthersMutation.isPending ? <Spinner /> : null}
                            Revoke Other Sessions
                        </Button>
                    </CardFooter>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Linked Login Methods</CardTitle>
                        <CardDescription>
                            View and unlink methods currently tied to your account.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {linkedAccountsQuery.isPending ? (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Spinner />
                                <span>Loading linked methods...</span>
                            </div>
                        ) : linkedAccounts.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No linked methods found.</p>
                        ) : (
                            linkedAccounts.map((account) => (
                                <div key={account.id} className="flex items-center justify-between rounded-lg border px-3 py-2">
                                    <div>
                                        <p className="text-sm font-medium">{account.providerId}</p>
                                        <p className="text-xs text-muted-foreground">
                                            Added: {formatDateTime(account.createdAt)}
                                        </p>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={
                                            unlinkAccountMutation.isPending ||
                                            isCredentialProvider(account.providerId)
                                        }
                                        onClick={() =>
                                            unlinkAccountMutation.mutate({
                                                providerId: account.providerId,
                                                accountId: account.accountId,
                                            })
                                        }
                                    >
                                        Unlink
                                    </Button>
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Passkeys</CardTitle>
                        <CardDescription>
                            Register and manage passkeys for passwordless sign-in.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                            <Field className="flex-1">
                                <FieldLabel htmlFor="passkeyName">New passkey name (optional)</FieldLabel>
                                <Input
                                    id="passkeyName"
                                    placeholder="MacBook Touch ID"
                                    value={newPasskeyName}
                                    onChange={(event) => setNewPasskeyName(event.target.value)}
                                />
                            </Field>
                            <Button
                                onClick={() => addPasskeyMutation.mutate()}
                                disabled={addPasskeyMutation.isPending}
                            >
                                {addPasskeyMutation.isPending ? <Spinner /> : null}
                                Add Passkey
                            </Button>
                        </div>

                        {passkeysState.isPending ? (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Spinner />
                                <span>Loading passkeys...</span>
                            </div>
                        ) : passkeys.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No passkeys registered.</p>
                        ) : (
                            <div className="space-y-2">
                                {passkeys.map((passkey) => (
                                    <div key={passkey.id} className="flex items-center justify-between rounded-lg border px-3 py-2">
                                        <div>
                                            <p className="text-sm font-medium">{passkey.name || "Unnamed passkey"}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {passkey.deviceType || "Unknown type"} • Added {formatDateTime(passkey.createdAt)}
                                            </p>
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={deletePasskeyMutation.isPending}
                                            onClick={() => deletePasskeyMutation.mutate(passkey.id)}
                                        >
                                            Remove
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Danger Zone</CardTitle>
                        <CardDescription>
                            Deactivate your account to block access and sign out all active sessions.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button variant="destructive">Deactivate Account</Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Deactivate account</DialogTitle>
                                    <DialogDescription>
                                        Type <strong>DEACTIVATE</strong> to confirm. You will be signed out immediately.
                                    </DialogDescription>
                                </DialogHeader>

                                <Input
                                    value={deactivationText}
                                    onChange={(event) => setDeactivationText(event.target.value)}
                                    placeholder="DEACTIVATE"
                                />

                                <DialogFooter>
                                    <Button
                                        variant="destructive"
                                        disabled={disableDeactivateButton}
                                        onClick={() => deactivateMutation.mutate()}
                                    >
                                        {deactivateMutation.isPending ? <Spinner /> : null}
                                        Confirm Deactivation
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}