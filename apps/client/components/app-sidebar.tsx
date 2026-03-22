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
import { Book, SquareArrowRightEnter } from "lucide-react"
import { authClient } from "@/lib/auth-client"
import { NavUser } from "./nav-user"
import { Skeleton } from "@/components/ui/skeleton"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();

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
                <SidebarMenuButton asChild isActive={pathname === "/create"}>
                  <Link href="/create">Create New</Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
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
  return <Skeleton className="h-3 w-28 mt-1" />;
}

function SidebarFooterSkeleton() {
  return (
    <div className="flex items-center gap-3 px-2 py-1.5">
      <Skeleton className="h-8 w-8 rounded-lg" />
      <div className="space-y-1">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
  );
}
