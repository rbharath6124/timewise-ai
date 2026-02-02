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
1. FIRST extract the full TIME HEADER ROW as the canonical source of truth.
2. THEN for each day (row), map each detected class cell to the correct time slot
   based on column position, NOT visual proximity.
3. BREAK rows (Tea Break, Lunch Break, Prayer) MUST be ignored for class creation
   but MUST be counted for column alignment.
4. If a class spans multiple columns, duplicate the class entry for EACH covered
   time slot with the correct start/end time.
5. If a cell contains multiple course codes, expand them into multiple class entries.
6. Resolve course_name, faculty, and hall ONLY using the COURSE DETAILS table.
7. If a value cannot be resolved, leave it as an empty string — DO NOT guess.

OUTPUT REQUIREMENTS (STRICT):
- Output ONLY valid JSON.
- NO markdown.
- NO explanations.
- NO partial output.

SCHEMA (MUST MATCH EXACTLY):
{
  "monday": [
    {
      "start": "HH:MM",
      "end": "HH:MM",
      "course_code": "string",
      "course_name": "string",
      "faculty": "string",
      "hall": "string"
    }
  ],
  "tuesday": [],
  "wednesday": [],
  "thursday": [],
  "friday": []
}

VALIDATION RULES (MUST ENFORCE):
- start < end
- start/end must match EXACTLY one of the header time slots
- No overlapping classes in the same day/time
- No missing time slots unless the cell is truly empty
- Break periods must never appear as classes
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

                // Map to our internal array-based format
                const daysMap: Record<string, string> = {
                    monday: "Monday",
                    tuesday: "Tuesday",
                    wednesday: "Wednesday",
                    thursday: "Thursday",
                    friday: "Friday"
                };

                const transformedData = Object.entries(rawData).map(([dayKey, periods]: [string, any]) => {
                    return {
                        day: daysMap[dayKey.toLowerCase()] || (dayKey.charAt(0).toUpperCase() + dayKey.slice(1)),
                        periods: periods.map((p: any) => ({
                            id: Math.random().toString(36).substring(7),
                            subject: p.course_code,
                            courseName: p.course_name,
                            teacherName: p.faculty,
                            startTime: p.start,
                            endTime: p.end,
                            room: p.hall,
                            type: "Lecture"
                        }))
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
