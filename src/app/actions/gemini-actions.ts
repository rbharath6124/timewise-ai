"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";

const VERSIONS = ["v1", "v1beta"];
const MODELS = [
    "gemini-1.5-flash-8b",
    "gemini-1.5-flash",
    "gemini-1.5-pro",
    "gemini-2.0-flash-exp",
    "gemini-pro" // old alias
];

export async function parseTimetableAction(base64Data: { data: string, mimeType: string }): Promise<any> {
    const apiKey = (process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || "").trim();
    if (!apiKey) throw new Error("GEMINI_API_KEY (Server) not found in environment variables.");

    console.log(`[NUCLEAR] Key length: ${apiKey.length}. Deployment: Production. Region: bom1`);

    const prompt = `
    Analyze this timetable image and extract the schedule into a strict JSON format.
    The JSON should be an array of objects, where each object represents a day.
    Format:
    [
      {
        "day": "Monday",
        "periods": [
          { "id": "uuid", "subject": "Math", "startTime": "09:00", "endTime": "10:00", "type": "Lecture", "room": "101" }
        ]
      }
    ]
    Use 24-hour format for time. If room or type is missing, omit or guess based on context if obvious.
    Return ONLY legitimate JSON, no markdown code fences.
  `;

    let lastError: any = null;

    // Try EVERY configuration
    for (const v of VERSIONS) {
        for (const m of MODELS) {
            try {
                console.log(`[NUCLEAR] Probing ${v}/${m}...`);

                // 1. Direct fetch probe (Quickest way to check 404/403)
                const probeUrl = `https://generativelanguage.googleapis.com/${v}/models/${m}?key=${apiKey}`;
                const probeRes = await fetch(probeUrl);

                if (probeRes.status !== 200) {
                    const probeData = await probeRes.json().catch(() => ({}));
                    console.warn(`[NUCLEAR] ${v}/${m} probe failed (${probeRes.status}):`, JSON.stringify(probeData));
                    continue;
                }

                console.log(`[NUCLEAR] Found active endpoint: ${v}/${m}. Processing...`);

                // 2. Manual fetch processing (to bypass SDK potential issues)
                const genUrl = `https://generativelanguage.googleapis.com/${v}/models/${m}:generateContent?key=${apiKey}`;
                const genRes = await fetch(genUrl, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        contents: [{
                            parts: [
                                { text: prompt },
                                { inlineData: { data: base64Data.data, mimeType: base64Data.mimeType } }
                            ]
                        }]
                    })
                });

                if (genRes.status !== 200) {
                    const errData = await genRes.json().catch(() => ({}));
                    throw new Error(`Manual fetch failed (${genRes.status}): ${JSON.stringify(errData)}`);
                }

                const result = await genRes.json();
                const text = result.candidates?.[0]?.content?.parts?.[0]?.text;

                if (!text) {
                    console.error("[NUCLEAR] Raw result:", JSON.stringify(result));
                    throw new Error("Empty response or blocked content");
                }

                const cleanText = text.replace(/```json/g, "").replace(/```/g, "").trim();
                console.log(`✅ [NUCLEAR] SUCCESS with ${v}/${m}`);
                return JSON.parse(cleanText);

            } catch (error: any) {
                console.error(`❌ [NUCLEAR] Error with ${v}/${m}:`, error.message);
                lastError = error;
            }
        }
    }

    throw new Error(`All Gemini endpoints returned 404 or refused access. Detailed error: ${lastError?.message || "Unknown"}`);
}

export async function chatWithAIAction(query: string, context: any): Promise<{ text: string, toolCalls?: any[] }> {
    const apiKey = (process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || "").trim();
    if (!apiKey) throw new Error("GEMINI_API_KEY (Server) not found.");

    let lastError: any = null;

    // Try Flash first as it's fastest
    for (const v of VERSIONS) {
        for (const m of ["gemini-1.5-flash", "gemini-1.5-pro"]) {
            try {
                const genUrl = `https://generativelanguage.googleapis.com/${v}/models/${m}:generateContent?key=${apiKey}`;
                const res = await fetch(genUrl, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        contents: [
                            { role: "user", parts: [{ text: "You are TimeWise AI, a helpful assistant." }] },
                            { role: "model", parts: [{ text: "Understood." }] },
                            { role: "user", parts: [{ text: `Context: ${JSON.stringify(context)}\nUser: ${query}` }] }
                        ]
                    })
                });

                if (res.status === 200) {
                    const data = await res.json();
                    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "I processed that.";
                    console.log(`✅ [NUCLEAR-CHAT] Success with ${v}/${m}`);
                    return { text };
                }
            } catch (error: any) {
                lastError = error;
            }
        }
    }

    throw new Error(`Chat failed: ${lastError?.message || "No endpoints reachable"}`);
}
