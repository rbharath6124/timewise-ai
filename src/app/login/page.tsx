"use client";

import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, AlertCircle } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function LoginContent() {
    const searchParams = useSearchParams();
    const error = searchParams.get("error");

    const errorMessage = error === "AccessDenied"
        ? "Please sign in with a Gmail address (@gmail.com)."
        : "An error occurred during sign-in.";

    return (
        <div className="flex h-screen items-center justify-center bg-muted/40 p-4">
            <div className="w-full max-w-sm space-y-4">
                {error && (
                    <div className="flex items-center gap-3 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive animate-in fade-in slide-in-from-top-2">
                        <AlertCircle className="h-5 w-5" />
                        <div className="flex flex-col">
                            <span className="font-bold">Access Denied</span>
                            <span className="text-sm">{errorMessage}</span>
                        </div>
                    </div>
                )}
                <Card className="shadow-xl transition-all hover:shadow-2xl">
                    <CardHeader className="text-center">
                        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                            <CalendarDays className="h-6 w-6 text-primary" />
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight">TimeWise AI</h1>
                        <CardDescription>
                            Smart Academic Assistant
                            <br />
                            Sign in to access your dashboard
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button
                            className="w-full"
                            size="lg"
                            onClick={() => signIn("google", { callbackUrl: "/" })}
                        >
                            Sign in with Google
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className="flex h-screen items-center justify-center bg-muted/40">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            </div>
        }>
            <LoginContent />
        </Suspense>
    );
}
