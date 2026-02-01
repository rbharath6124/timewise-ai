"use client";

import { ChatInterface } from "@/components/chat-interface";

export default function ChatPage() {
    return (
        <div className="container mx-auto max-w-4xl p-6 md:p-8">
            <h1 className="mb-6 text-3xl font-bold tracking-tight">AI Assistant</h1>
            <ChatInterface />
        </div>
    );
}
