"use client";

import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { CalendarDays, LogOut } from "lucide-react";
import { MobileNav } from "@/components/mobile-nav";
import { signOut } from "next-auth/react";

export function Header() {
    const { data: session } = useSession();

    return (
        <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex h-16 items-center justify-between px-6 lg:px-8">
                <div className="flex items-center gap-4">
                    <MobileNav />
                    <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                            <CalendarDays className="h-5 w-5 text-primary" />
                        </div>
                        <h1 className="text-lg font-bold tracking-tight sm:text-xl">TimeWise AI</h1>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="hidden items-center gap-3 sm:flex">
                        <span className="text-sm font-medium text-muted-foreground">
                            {session?.user?.name || "Student"}
                        </span>
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold">
                            {session?.user?.name?.substring(0, 1) || "S"}
                        </div>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => signOut()}
                    >
                        <span className="hidden sm:inline">Sign Out</span>
                        <LogOut className="h-4 w-4 sm:ml-2" />
                    </Button>
                </div>
            </div>
        </header>
    );
}
