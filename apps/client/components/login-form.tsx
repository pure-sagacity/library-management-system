"use client";

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator
} from "@/components/ui/field"
import { Spinner } from "./ui/spinner";
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { getAuthErrorMessage } from "@/lib/api";
import { Key } from "lucide-react";

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [emailLoading, setEmailLoading] = useState<boolean>(false);
  const [passkeyLoading, setPasskeyLoading] = useState<boolean>(false);

  const router = useRouter();


  async function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    setEmailLoading(true);

    try {
      const response = await authClient.signIn.email({
        email,
        password,
      })

      if (response.error) {
        const message = getAuthErrorMessage(response.error, "Login failed. Please try again.");
        toast.error(message);
        console.error("Login error:", {
          status: response.error.status,
          statusText: response.error.statusText,
          message,
        });
        return;
      }

      router.push("/dashboard");
    } catch (error) {
      const message = getAuthErrorMessage(error, "Login failed. Please try again.");
      toast.error(message);
      console.error("Login error:", { message });
    } finally {
      setEmailLoading(false);
    }
  }

  async function handlePasskey() {
    setPasskeyLoading(true);

    try {
      const response = await authClient.signIn.passkey();

      if (response.error) {
        const message = getAuthErrorMessage(response.error, "Passkey login failed. Please try again.");
        toast.error(message);
        console.error("Passkey login error:", {
          status: response.error.status,
          statusText: response.error.statusText,
          message,
        });
        return;
      }

      router.push("/dashboard");
    } catch (error) {
      const message = getAuthErrorMessage(error, "Passkey login failed. Please try again.");
      toast.error(message);
      console.error("Passkey login error:", { message });
    } finally {
      setPasskeyLoading(false);
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Welcome back</CardTitle>
          <CardDescription>
            Login with your Apple or Google account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field>
              <Button variant="outline" type="button" onClick={handlePasskey} disabled={emailLoading} className="w-full">
                <Key size={16} className="mr-2" />
                {passkeyLoading ? <Spinner /> : "Continue with Passkey"}
              </Button>
            </Field>
            <FieldSeparator className="*:data-[slot=field-separator-content]:bg-card">
              Or continue with
            </FieldSeparator>
          </FieldGroup>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="m@example.com"
                  required
                />
              </Field>
              <Field>
                <div className="flex items-center">
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <Link
                    href="/forgot-password"
                    className="ml-auto text-sm underline-offset-4 hover:underline"
                  >
                    Forgot your password?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </Field>
              <Field>
                <Button type="submit" disabled={emailLoading}>
                  {emailLoading ? <Spinner /> : "Login"}
                </Button>
                <FieldDescription className="text-center">
                  Don&apos;t have an account? <Link href="/signup">Sign up</Link>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
      <FieldDescription className="px-6 text-center">
        By clicking continue, you agree to our Terms of Service and Privacy Policy.
      </FieldDescription>
    </div>
  )
}
