"use client"

import * as React from "react"
import { Suspense } from "react"
import { useSuspenseQuery } from "@tanstack/react-query"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarFooter
} from "@/components/ui/sidebar"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Book, CircleHelp, ShieldAlert, SquareArrowRightEnter } from "lucide-react"
import { authClient } from "@/lib/auth-client"
import { NavUser } from "./nav-user"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { api } from "@/lib/api"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();

  const { data: isAdmin } = useSuspenseQuery({
    queryKey: ["sidebar-is-admin"],
    queryFn: async () => {
      try {
        const session = await authClient.getSession();
        if (!session?.data?.user?.id) {
          return false;
        }

        const response = await api.user({ id: session.data.user.id }).isAdmin.get();

        if (response.error) {
          console.error("Failed to check admin status", response.error);
          return false;
        }

        const data = response.data;
        return data.isAdmin ?? false;
      } catch (error) {
        console.error("Error checking admin status", error);
        return false;
      }
    },
  });

  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/">
                <div className="flex items-center justify-center bg-orange-500 rounded-lg aspect-square size-8 text-sidebar-primary-foreground">
                  <Book className="size-4" />
                </div>
                <div className="grid flex-1 text-sm leading-tight text-left">
                  <span className="font-medium truncate">The Archive</span>
                  <Suspense fallback={<SidebarEmailSkeleton />}>
                    <SidebarUserEmail />
                  </Suspense>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>

        <SidebarGroup>
          <SidebarGroupLabel>Books</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/dashboard"}>
                  <Link href="/dashboard">Dashboard</Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/catalog"}>
                  <Link href="/catalog">Catalog</Link>
                </SidebarMenuButton>
                <SidebarMenuButton asChild isActive={pathname === "/search"}>
                  <Link href="/search">Search</Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Loans</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/loans"}>
                  <Link href="/loans">My Loans</Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/history"}>
                  <Link href="/history">Loan History</Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {isAdmin ? (
          <SidebarGroup>
            <SidebarGroupLabel className="flex items-center gap-2 text-gray-700/75 dark:text-amber-300">
              Admin
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="transition-colors rounded-sm text-amber-700 hover:text-amber-900 dark:text-amber-300 dark:hover:text-amber-100"
                    aria-label="Why can I see this admin panel?"
                  >
                    <CircleHelp className="size-3.5" aria-hidden="true" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" align="start" className="max-w-52">
                  You can see this panel because your account has the admin role.
                </TooltipContent>
              </Tooltip>
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === "/admin/users"}
                    className="data-[active=true]:bg-amber-100 data-[active=true]:text-amber-900 dark:data-[active=true]:bg-amber-500/20 dark:data-[active=true]:text-amber-100"
                  >
                    <Link href="/admin/users" className="flex items-center gap-2">
                      Users
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === "/admin/books"}
                    className="data-[active=true]:bg-amber-100 data-[active=true]:text-amber-900 dark:data-[active=true]:bg-amber-500/20 dark:data-[active=true]:text-amber-100"
                  >
                    <Link href="/admin/books" className="flex items-center gap-2">
                      Books
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === "/admin/loans"}
                    className="data-[active=true]:bg-amber-100 data-[active=true]:text-amber-900 dark:data-[active=true]:bg-amber-500/20 dark:data-[active=true]:text-amber-100"
                  >
                    <Link href="/admin/loans" className="flex items-center gap-2">
                      Loans
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : null}
      </SidebarContent>
      <SidebarFooter>
        <Suspense fallback={<SidebarFooterSkeleton />}>
          <SidebarAccountFooter />
        </Suspense>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

function useSidebarSession() {
  return useSuspenseQuery({
    queryKey: ["sidebar-session"],
    queryFn: async () => {
      try {
        const session = await authClient.getSession();
        return session?.data ?? null;
      } catch (error) {
        console.error("Failed to load sidebar session", error);
        return null;
      }
    },
  });
}

function SidebarUserEmail() {
  const { data: session } = useSidebarSession();

  if (!session?.user?.email) {
    return null;
  }

  return <span className="text-xs truncate text-muted-foreground">{session.user.email}</span>;
}

function SidebarAccountFooter() {
  const { data: session } = useSidebarSession();

  if (session?.user) {
    return <NavUser user={session.user} />;
  }

  return (
    <SidebarMenuButton
      size="lg"
      asChild
    >
      <Link href="/login">
        <div className="flex items-center justify-center bg-orange-500 rounded-lg aspect-square size-8 text-sidebar-primary-foreground">
          <SquareArrowRightEnter className="size-4" />
        </div>
        <span className="text-sm font-medium">Login</span>
      </Link>
    </SidebarMenuButton>
  );
}

function SidebarEmailSkeleton() {
  return <Skeleton className="h-3 mt-1 w-28" />;
}

function SidebarFooterSkeleton() {
  return (
    <div className="flex items-center gap-3 px-2 py-1.5">
      <Skeleton className="w-8 h-8 rounded-lg" />
      <div className="space-y-1">
        <Skeleton className="w-24 h-3" />
        <Skeleton className="w-20 h-3" />
      </div>
    </div>
  );
}

function AdminModeBadge() {
  return (
    <span className="mt-1 inline-flex w-fit items-center gap-1 rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/20 dark:text-amber-100">
      <ShieldAlert className="size-3" aria-hidden="true" />
      Admin Mode
    </span>
  );
}
