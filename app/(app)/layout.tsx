import type { ReactNode } from "react"

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"
import { AuthGuard } from "@/components/auth-guard"
import { AppSidebar } from "@/components/app-sidebar"
import { DbSync } from "@/components/db-sync"
import { SessionBootstrap } from "@/components/session-bootstrap"
import { TopBar } from "@/components/top-bar"

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <TooltipProvider>
      <SidebarProvider>
        <AuthGuard />
        <SessionBootstrap />
        <DbSync />
        <AppSidebar />
        <SidebarInset className="min-w-0">
          <TopBar />
          <main className="flex-1 overflow-x-hidden p-4 md:p-6">{children}</main>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}
