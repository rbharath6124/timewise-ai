import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

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
            const email = user.email.toLowerCase();
            const isGmail = email.endsWith("@gmail.com");
            if (!isGmail) {
                console.log("Access Denied: non-Gmail domain:", email);
                return false;
            }
            console.log("Access Granted (Gmail):", email);
            return true;
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
