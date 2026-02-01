"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";

const MODELS_TO_TRY = [
    "gemini-1.5-flash-latest",
    "gemini-2.0-flash-exp",
    "gemini-1.5-flash",
    "gemini-1.5-pro-latest"
];

export async function parseTimetableAction(base64Data: { data: string, mimeType: string }): Promise<any> {
    const apiKey = (process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || "").trim();
    if (!apiKey) throw new Error("GEMINI_API_KEY not found in environment variables");

    console.log("[Server Action] Starting parse with key prefix:", apiKey.substring(0, 8));

    const genAI = new GoogleGenerativeAI(apiKey);
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

    for (const modelId of MODELS_TO_TRY) {
        try {
            console.log(`[Server Action] Trying model: ${modelId}`);
            const model = genAI.getGenerativeModel({ model: modelId });

            const result = await model.generateContent([prompt, { inlineData: base64Data }]);
            const response = await result.response;
            const text = response.text();

            const cleanText = text.replace(/```json/g, "").replace(/```/g, "").trim();
            console.log(`✅ [Server Action] Success with ${modelId}`);
            return JSON.parse(cleanText);
        } catch (error: any) {
            console.error(`❌ [Server Action] Fail with ${modelId}:`, error.message);
            lastError = error;
        }
    }

    throw lastError || new Error("All Gemini models failed in server action.");
}
