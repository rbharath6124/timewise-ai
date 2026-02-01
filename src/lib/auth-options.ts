import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { AUTHORIZED_EMAILS } from "@/config/auth-whitelist";

export const authOptions: NextAuthOptions = {
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID || "",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
        }),
    ],
    callbacks: {
        async signIn({ user }) {
            console.log("Sign-in attempt:", user.email);

            if (!user.email) return false;

            const isAuthorized = AUTHORIZED_EMAILS.some(email =>
                email.toLowerCase() === user.email?.toLowerCase()
            );

            if (isAuthorized) {
                console.log("Access Granted");
                return true;
            }

            console.log("Access Denied for:", user.email);
            console.log("Authorized list:", AUTHORIZED_EMAILS);
            return false;
        },
    },
    pages: {
        signIn: "/login",
        error: "/login?error=AccessDenied",
    },
    session: {
        strategy: "jwt",
    },
};
