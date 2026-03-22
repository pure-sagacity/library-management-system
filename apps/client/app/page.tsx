"use client";

import Link from "next/link";
import { BookOpen, LayoutDashboard, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import SplashScreen from "@/components/splash-screen";
import { authClient } from "@/lib/auth-client";

export default function Home() {
  const { data: session } = authClient.useSession();

  return (
    <main className="px-6 py-12 min-h-svh bg-muted/40 md:px-10">
      <SplashScreen />
      <div className="flex flex-col w-full max-w-5xl gap-8 mx-auto">
        <header className="space-y-2">
          <p className="text-sm font-medium text-primary">Welcome to The Archive</p>
          <h1 className="text-3xl font-semibold leading-tight tracking-tight font-heading md:text-4xl">
            Manage your library with confidence
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground md:text-base">
            Jump into the catalog to browse books or sign in to access your
            dashboard and borrowing tools.
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-center mb-2 rounded-lg size-9 bg-primary/10 text-primary">
                <BookOpen className="size-4" />
              </div>
              <CardTitle>View Catalog</CardTitle>
              <CardDescription>
                Explore all available books, categories, and availability at a
                glance.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Perfect for quick discovery before borrowing.
              </p>
            </CardContent>
            <CardFooter>
              <Button asChild className="w-full" size="lg">
                <Link href="/catalog">Go to Catalog</Link>
              </Button>
            </CardFooter>
          </Card>

          {!session ? (<Card>
            <CardHeader>
              <div className="flex items-center justify-center mb-2 rounded-lg size-9 bg-primary/10 text-primary">
                <LogIn className="size-4" />
              </div>
              <CardTitle>Login</CardTitle>
              <CardDescription>
                Sign in to manage loans, track activity, and personalize your
                library experience.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Access your account and continue where you left off.
              </p>
            </CardContent>
            <CardFooter>
              <Button asChild className="w-full" variant="outline" size="lg">
                <Link href="/login">Go to Login</Link>
              </Button>
            </CardFooter>
          </Card>) : (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-center mb-2 rounded-lg size-9 bg-primary/10 text-primary">
                  <LayoutDashboard className="size-4" />
                </div>
                <CardTitle>Dashboard</CardTitle>
                <CardDescription>
                  Open your workspace to manage loans, review activity, and
                  monitor library operations.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Pick up where you left off with quick access to your tools.
                </p>
              </CardContent>
              <CardFooter>
                <Button asChild className="w-full" variant="outline" size="lg">
                  <Link href="/dashboard">Go to Dashboard</Link>
                </Button>
              </CardFooter>
            </Card>
          )}
        </section>
      </div>
    </main>
  );
}