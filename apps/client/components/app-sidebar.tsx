"use client"

import * as React from "react"

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

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const { data: session } = authClient.useSession();

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
                  {session?.user?.email ? (
                    <span className="text-xs truncate text-muted-foreground">{session.user.email}</span>
                  ) : null}
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
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        {session?.user ? <NavUser user={session.user} /> : (
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
        )}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
