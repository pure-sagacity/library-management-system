import { GalleryVerticalEnd, LibraryBig, ShieldCheck } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"

export default function ForgotPasswordPage() {
    return (
        <div className="flex flex-col items-center justify-center gap-6 p-6 min-h-svh bg-orange-500/10 md:p-10">
            <div className="flex flex-col w-full max-w-sm gap-6">
                <a href="#" className="flex items-center self-center gap-2 font-medium">
                    <div className="flex items-center justify-center rounded-md size-6 bg-primary text-primary-foreground">
                        <GalleryVerticalEnd className="size-4" />
                    </div>
                    The Archive
                </a>

                <Card>
                    <CardHeader className="text-center">
                        <div className="flex items-center justify-center mx-auto mb-2 rounded-full size-10 bg-primary/10 text-primary">
                            <ShieldCheck className="size-5" />
                        </div>
                        <CardTitle className="text-xl">Account Recovery Assistance</CardTitle>
                        <CardDescription>
                            Password recovery is handled by your library team to protect account security.
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-5 text-sm text-muted-foreground">
                        <p>
                            For password assistance, please contact your librarian, who can verify
                            your membership details and help restore access to your account.
                        </p>

                        <div className="p-3 border rounded-lg bg-muted/40">
                            <div className="flex items-start gap-2">
                                <LibraryBig className="mt-0.5 size-4 text-foreground" />
                                <p className="leading-relaxed text-foreground/90">
                                    If you are currently at a branch, a librarian can usually assist you
                                    right away.
                                </p>
                            </div>
                        </div>

                        <Button asChild className="w-full">
                            <Link href="/login">Return to login</Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
