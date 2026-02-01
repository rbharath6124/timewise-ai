"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger
} from "@/components/ui/sheet";
import {
    Menu,
    LayoutDashboard,
    ClipboardList,
    MessageSquare,
    LogOut,
    Bot,
    CalendarDays
} from "lucide-react";
import { ChatInterface } from "./chat-interface";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";

export function MobileNav() {
    const [isOpen, setIsOpen] = useState(false);
    const [showChat, setShowChat] = useState(false);
    const { data: session } = useSession();

    return (
        <div className="flex items-center gap-2">
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
                <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-10 w-10">
                        <Menu className="h-6 w-6" />
                    </Button>
                </SheetTrigger>
                <SheetContent side="left" className="flex w-[300px] flex-col p-0">
                    <SheetHeader className="border-b px-6 py-6 text-left">
                        <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                                <CalendarDays className="h-5 w-5 text-primary" />
                            </div>
                            <SheetTitle className="text-xl font-bold">TimeWise AI</SheetTitle>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {session?.user?.email}
                        </p>
                    </SheetHeader>

                    <div className="flex-1 overflow-y-auto px-4 py-6">
                        <nav className="flex flex-col gap-2">
                            <Link href="/" className="w-full" onClick={() => setIsOpen(false)}>
                                <Button
                                    variant="ghost"
                                    className="w-full justify-start gap-3 h-12 px-4"
                                >
                                    <LayoutDashboard className="h-5 w-5 text-muted-foreground" />
                                    <span>Dashboard</span>
                                </Button>
                            </Link>

                            <Link href="/attendance" className="w-full" onClick={() => setIsOpen(false)}>
                                <Button
                                    variant="ghost"
                                    className="w-full justify-start gap-3 h-12 px-4"
                                >
                                    <ClipboardList className="h-5 w-5 text-muted-foreground" />
                                    <span>My Attendance</span>
                                </Button>
                            </Link>

                            <Button
                                variant="secondary"
                                className="justify-start gap-3 h-12 px-4 text-primary mt-2"
                                onClick={() => {
                                    setShowChat(true);
                                    setIsOpen(false);
                                }}
                            >
                                <Bot className="h-5 w-5" />
                                <span className="font-semibold">TimeWise Assistant</span>
                            </Button>
                        </nav>
                    </div>

                    <div className="border-t p-4">
                        <Button
                            variant="ghost"
                            className="w-full justify-start gap-3 h-12 px-4 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => signOut()}
                        >
                            <LogOut className="h-5 w-5" />
                            <span>Sign Out</span>
                        </Button>
                    </div>
                </SheetContent>
            </Sheet>

            {/* Chatbot Overlay/Sheet */}
            <Sheet open={showChat} onOpenChange={setShowChat}>
                <SheetContent side="bottom" className="h-[90dvh] p-0 sm:max-w-full lg:max-w-md lg:side-right lg:h-full">
                    <div className="flex h-full flex-col">
                        <SheetHeader className="border-b p-4 flex flex-row items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Bot className="h-5 w-5 text-primary" />
                                <SheetTitle>TimeWise AI Assistant</SheetTitle>
                            </div>
                        </SheetHeader>
                        <div className="flex-1 overflow-hidden">
                            <ChatInterface />
                        </div>
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    );
}
