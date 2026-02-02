"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";

export async function parseTimetableAction(base64Data: { data: string, mimeType: string }): Promise<any> {
    const apiKey = (process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || "").trim();
    if (!apiKey) throw new Error("GEMINI_API_KEY not found in environment variables");

    console.log(`[Action] Starting parse. Key (first 7): ${apiKey.substring(0, 7)}`);

    // First, let's find what models are ACTUALLY available to this key
    let availableModels: string[] = [];
    try {
        const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
        const listRes = await fetch(listUrl);
        const listData = await listRes.json();

        if (listData.models) {
            availableModels = listData.models
                .filter((m: any) => m.supportedGenerationMethods.includes("generateContent"))
                .map((m: any) => m.name.replace("models/", ""));
            console.log("[Action] Available models for this key:", availableModels.join(", "));
        } else {
            console.error("[Action] Could not list models (check API key):", JSON.stringify(listData));
        }
    } catch (e: any) {
        console.error("[Action] ListModels failed:", e.message);
    }

    // Prioritize the models we want to use, but only if they are available
    const preference = ["gemini-1.5-flash", "gemini-1.5-flash-8b", "gemini-1.5-pro", "gemini-2.0-flash-exp"];
    const toTry = preference.filter(m => availableModels.includes(m));

    // If we couldn't list them, try a safe fallback list
    if (toTry.length === 0) {
        toTry.push("gemini-1.5-flash", "gemini-1.5-flash-8b");
    }

    console.log("[Action] Final plan: will try in order:", toTry.join(", "));

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

    for (const modelId of toTry) {
        // Try BOTH v1 and v1beta for each model
        for (const version of ["v1", "v1beta"]) {
            try {
                console.log(`[Action] Attempting ${version}/${modelId}...`);

                // Construct SDK with specific version
                // @ts-ignore
                const genAI = new GoogleGenerativeAI(apiKey, { apiVersion: version });
                const model = genAI.getGenerativeModel({ model: modelId });

                const result = await model.generateContent([
                    { text: prompt },
                    { inlineData: { data: base64Data.data, mimeType: base64Data.mimeType } }
                ]);

                const response = await result.response;
                const text = response.text();

                if (!text) throw new Error("Empty response from AI");

                const cleanText = text.replace(/```json/g, "").replace(/```/g, "").trim();
                console.log(`✅ [Action] SUCCESS with ${version}/${modelId}`);
                return JSON.parse(cleanText);
            } catch (error: any) {
                console.warn(`[Action] Refused ${version}/${modelId}:`, error.message);
                lastError = error;
                // If it's a 404, we immediately move to the next combination
            }
        }
    }

    // Clearer error for the UI
    const finalErrorMsg = lastError?.message || "All Gemini configurations failed.";
    console.error(`❌ [Action] FATAL: ${finalErrorMsg}`);
    throw new Error(`AI processing failed in production. Details: ${finalErrorMsg}`);
}

export async function chatWithAIAction(query: string, context: any): Promise<{ text: string, toolCalls?: any[] }> {
    const apiKey = (process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || "").trim();
    if (!apiKey) throw new Error("GEMINI_API_KEY not found in environment variables");

    const genAI = new GoogleGenerativeAI(apiKey);
    // Simple fallback logic for chat as well
    const models = ["gemini-1.5-flash", "gemini-1.5-pro"];
    let lastError: any = null;

    for (const modelId of models) {
        try {
            console.log(`[Chat Action] Trying model: ${modelId}`);
            const model = genAI.getGenerativeModel({ model: modelId });

            const chat = model.startChat({
                history: [
                    {
                        role: "user",
                        parts: [{ text: "You are TimeWise AI, a helpful academic assistant. You help students manage their timetable and attendance." }],
                    },
                    {
                        role: "model",
                        parts: [{ text: "Understood! I'm ready to help." }],
                    },
                ],
            });

            const result = await chat.sendMessage(`
                Context: ${JSON.stringify(context)}
                User Query: ${query}
            `);

            const response = await result.response;
            console.log(`✅ [Chat Action] Success with ${modelId}`);
            return {
                text: response.text(),
            };
        } catch (error: any) {
            console.warn(`[Chat Action] Fail with ${modelId}:`, error.message);
            lastError = error;
        }
    }

    throw new Error(`AI Chat failed: ${lastError?.message || "Unknown issue"}`);
}
