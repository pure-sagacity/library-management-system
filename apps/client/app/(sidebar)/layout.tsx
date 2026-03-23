"use client";

import { AppSidebar } from "@/components/app-sidebar"
import { Button } from "@/components/ui/button"
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
    SidebarInset,
    SidebarProvider,
    SidebarTrigger,
} from "@/components/ui/sidebar"
import { authClient } from "@/lib/auth-client"
import { useQueryClient, useQuery } from "@tanstack/react-query"
import { ShieldAlert } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

function Providers({ children }: { children: React.ReactNode }) {
    return (
        <>
            {children}
        </>
    );
}

export default function SidebarLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <Providers>
            <SidebarLayoutContent>{children}</SidebarLayoutContent>
        </Providers>
    );
}

function SidebarLayoutContent({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const queryClient = useQueryClient();

    const sessionQuery = useQuery({
        queryKey: ["sidebar-layout-session"],
        queryFn: async () => {
            const response = await authClient.getSession();
            return response.data;
        },
    });

    const isImpersonating = Boolean(sessionQuery.data?.session?.impersonatedBy);

    const handleStopImpersonating = async () => {
        await toast.promise(
            authClient.admin.stopImpersonating(),
            {
                loading: "Stopping impersonation...",
                success: "Returned to admin account.",
                error: "Failed to stop impersonation.",
            },
        );

        await queryClient.invalidateQueries({ queryKey: ["sidebar-layout-session"] });
        await queryClient.invalidateQueries({ queryKey: ["sidebar-session"] });
        await queryClient.invalidateQueries({ queryKey: ["admin-users-session"] });
        router.push("/admin/users");
    };

    return (
        <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
                {isImpersonating ? (
                    <div className="border-b border-amber-300 bg-amber-50 px-4 py-2">
                        <div className="flex flex-wrap items-center justify-between gap-2 text-amber-900">
                            <div className="flex items-center gap-2 text-sm font-medium">
                                <ShieldAlert className="size-4" />
                                You are currently impersonating a user.
                            </div>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => void handleStopImpersonating()}
                            >
                                Stop impersonating
                            </Button>
                        </div>
                    </div>
                ) : null}
                <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
                    <SidebarTrigger className="-ml-1" />
                    <Separator
                        orientation="vertical"
                        className="mr-2 data-[orientation=vertical]:h-4"
                    />
                </header>
                <div className="flex flex-1 flex-col gap-4 p-4">
                    {children}
                    <div className="min-h-screen flex-1 rounded-xl bg-muted/50 md:min-h-min" />
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}