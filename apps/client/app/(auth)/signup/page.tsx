"use client"

import { SignupForm } from "@/components/signup-form"
import { GalleryVerticalEndIcon } from "lucide-react"

export default function SignupPage() {
  return (
    <div className="flex flex-col items-center justify-center gap-6 p-6 min-h-svh bg-muted md:p-10">
      <div className="flex flex-col w-full max-w-sm gap-6">
        <a href="#" className="flex items-center self-center gap-2 font-medium">
          <div className="flex items-center justify-center rounded-md size-6 bg-primary text-primary-foreground">
            <GalleryVerticalEndIcon className="size-4" />
          </div>
          The Archive
        </a>
        <SignupForm />
      </div>
    </div>
  )
}
