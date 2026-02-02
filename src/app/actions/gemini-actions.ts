"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";

const VERSIONS = ["v1", "v1beta"];

const MODELS = [
    "gemini-2.0-flash",
    "gemini-1.5-flash",
    "gemini-2.0-flash-exp",
    "gemini-1.5-pro"
];

export async function parseTimetableAction(base64Data: { data: string, mimeType: string }): Promise<any> {
    try {
        const apiKey = (process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || "").trim();
        if (!apiKey) {
            return { error: "GEMINI_API_KEY not found. Please set it in Vercel Environment Variables." };
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        let lastError: any = null;

        for (const modelName of MODELS) {
            try {
                const model = genAI.getGenerativeModel({
                    model: modelName,
                    generationConfig: {
                        temperature: 0.1,
                        maxOutputTokens: 8192,
                        responseMimeType: "application/json",
                    }
                });
                const prompt = `
I am using Google Gemini Vision to extract a FULL weekly academic timetable from an image.
The app is fully AI-only (no manual editing allowed).

CURRENT PROBLEMS:
1. Some class time slots are mismatched (wrong start/end time).
2. Some classes are missing entirely.
3. Break rows (Tea Break, Lunch Break, Prayer) disrupt time alignment.
4. Merged cells cause later columns to shift incorrectly.
5. Afternoon sessions are more likely to be skipped or mis-timed.

IMAGE CHARACTERISTICS:
- A fixed time header row with these exact slots (left to right):
  09:00–09:50
  09:50–10:40
  10:40–11:00 (Tea Break)
  11:00–11:50
  11:50–12:40
  12:40–01:40 (Lunch Break)
  01:40–02:30
  02:30–03:20
  03:20–04:10
- Rows for Monday to Friday.
- Cells may span multiple columns.
- Some cells contain multiple course codes (e.g. SSDX 11/12/13/14).
- A separate COURSE DETAILS table maps:
    Course Code → Course Name → Faculty → Hall.

GOAL:
Fix the parsing so that:
- EVERY time slot is aligned EXACTLY to the header time.
- NO classes are skipped.
- NO time guessing or inference occurs.
- Afternoon sessions are handled as reliably as morning sessions.

MANDATORY EXTRACTION STRATEGY:
1. DEFINE COLUMNS (1-9):
   1: 09:00-09:50 | 2: 09:50-10:40 | 3: [TEA BREAK] | 4: 11:00-11:50 | 5: 11:50-12:40 | 6: [LUNCH BREAK] | 7: 01:40-02:30 | 8: 02:30-03:20 | 9: 03:20-04:10

2. EXTRACTION RULES:
   - For every class, identify the START COLUMN and END COLUMN.
   - Example: A class from 11:00 to 12:40 has col_start: 4 and col_end: 5.
   - Example: A morning class has col_start: 1 and col_end: 1.
   - IGNORE Slot 3 and Slot 6.
   - You MUST look past the vertical "Lunch Break" (Col 6) to find Col 7, 8, 9.

3. LEGEND LOOKUP:
   - Map every short code (e.g. SSDX 11) to its full name and faculty from the bottom table.
   - If a cell has multiple codes (CEDX 01/07), return them as a single string "CEDX 01/07".

OUTPUT REQUIREMENTS (STRICT):
- Output ONLY valid JSON.
- NO markdown.
- NO explanations.
- NO partial output.

SCHEMA:
{
  "monday": [
    { "col_start": 4, "col_end": 5, "course_code": "CED 3202", "course_name": "...", "faculty": "...", "hall": "..." }
  ],
  "tuesday": [],
  "wednesday": [],
  "thursday": [],
  "friday": []
}
                `;

                const result = await model.generateContent([
                    {
                        inlineData: {
                            data: base64Data.data,
                            mimeType: base64Data.mimeType
                        }
                    },
                    { text: prompt }
                ]);

                const response = await result.response;
                const text = response.text();

                // Raw data in day-keyed object format
                const rawData = JSON.parse(text);

                // Start/End Mapping
                const colToStart: Record<number, string> = { 1: "09:00", 2: "09:50", 4: "11:00", 5: "11:50", 7: "13:40", 8: "14:30", 9: "15:20" };
                const colToEnd: Record<number, string> = { 1: "09:50", 2: "10:40", 4: "11:50", 5: "12:40", 7: "14:30", 8: "15:20", 9: "16:10" };

                // Map to our internal array-based format
                const daysMap: Record<string, string> = {
                    monday: "Monday", tuesday: "Tuesday", wednesday: "Wednesday", thursday: "Thursday", friday: "Friday"
                };

                const transformedData = Object.entries(rawData).map(([dayKey, periods]: [string, any]) => {
                    const dayName = daysMap[dayKey.toLowerCase()] || (dayKey.charAt(0).toUpperCase() + dayKey.slice(1));

                    const cleanPeriods = (periods || []).flatMap((p: any) => {
                        const startTime = colToStart[p.col_start];
                        const endTime = colToEnd[p.col_end];
                        if (!startTime || !endTime) return [];

                        // Split multi-codes (e.g. CEDX 01/07)
                        const rawCodes = p.course_code.split(/[\/\+]/);
                        const prefix = p.course_code.match(/^[A-Z]+/)?.[0] || "";

                        return rawCodes.map((code: string, idx: number) => {
                            let cleanCode = code.trim();
                            if (idx > 0 && !cleanCode.match(/^[A-Z]/) && prefix) cleanCode = `${prefix} ${cleanCode}`;

                            return {
                                id: Math.random().toString(36).substring(7),
                                subject: cleanCode,
                                courseName: p.course_name,
                                teacherName: p.faculty,
                                startTime,
                                endTime,
                                room: p.hall,
                                type: "Lecture"
                            };
                        });
                    });

                    return {
                        day: dayName,
                        periods: cleanPeriods
                    };
                });

                console.log(`✅ [PARSER] Success with ${modelName}`);
                return { success: true, data: transformedData };
            } catch (error: any) {
                console.warn(`⚠️ [PARSER] Failed with ${modelName}:`, error.message);
                lastError = error;
            }
        }

        return { error: `Parsing failed after trying all models: ${lastError?.message || "No models available"}` };

    } catch (error: any) {
        console.error("Gemini Parsing Action Global Error:", error);
        return { error: error.message || "An unexpected error occurred during parsing." };
    }
}

export async function chatWithAIAction(query: string, context: any): Promise<{ text?: string, error?: string, toolCalls?: any[] }> {
    try {
        const apiKey = (process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || "").trim();
        if (!apiKey) return { error: "GEMINI_API_KEY not found." };

        const genAI = new GoogleGenerativeAI(apiKey);
        let lastError: any = null;

        for (const modelName of MODELS) {
            try {
                const model = genAI.getGenerativeModel({
                    model: modelName,
                    generationConfig: {
                        temperature: 0.7,
                    }
                });
                const result = await model.generateContent([
                    { text: "You are TimeWise AI, a helpful assistant." },
                    { text: `Context: ${JSON.stringify(context)}\nUser: ${query}` }
                ]);

                const response = await result.response;
                const text = response.text() || "I processed that.";
                console.log(`✅ [CHAT] Success with ${modelName}`);
                return { text };
            } catch (error: any) {
                console.warn(`⚠️ [CHAT] Failed with ${modelName}:`, error.message);
                lastError = error;
            }
        }

        return { error: `Chat failed: ${lastError?.message || "No models available"}` };
    } catch (globalError: any) {
        return { error: globalError.message || "An unexpected chat error occurred." };
    }
}
