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
            for (const version of VERSIONS) {
                try {
                    const model = genAI.getGenerativeModel(
                        {
                            model: modelName,
                            generationConfig: {
                                temperature: 0.1,
                                maxOutputTokens: 8192,
                                responseMimeType: "application/json",
                            }
                        },
                        { apiVersion: version as any }
                    );

                    const prompt = `
                        ACT AS A DATA EXTRACTION SPECIALIST. 
                        YOUR GOAL: Extract 100% of the classes from the provided academic timetable.
                        
                        SYSTEMATIC SCANNING PROTOCOL:
                        1. IDENTIFY ALL DAYS: Capture Monday, Tuesday, Wednesday, Thursday, and Friday.
                        2. SCAN THE FULL HORIZONTAL AXIS: From 09:00 AM till 04:10 PM.
                        3. CROSS THE LUNCH BARRIER: There is a vertical "Lunch Break" (12:40 - 01:40). YOU MUST SCAN TO THE RIGHT OF THIS BAR to extract the afternoon sessions.
                        4. AFTERNOON SLOTS (CRITICAL - DO NOT MISS):
                           - 01:40 - 02:30
                           - 02:30 - 03:20
                           - 03:20 - 04:10
                        5. MULTI-CODE EXPANSION: If a cell has multiple codes (e.g., CEDX 01/07), create a standalone JSON object for each code with the same time.
                        6. LEGEND MATCHING: Look up every code in the legend at the bottom to find the "Course Name", "Faculty/Teacher", and "Hall/Room".

                        JSON SCHEMA:
                        {
                          "monday": [
                            {
                              "code": "Subject Code",
                              "name": "Full Course Name from Legend",
                              "teacher": "Teacher Name from Legend",
                              "start": "HH:mm",
                              "end": "HH:mm",
                              "hall": "Room Number"
                            }
                          ],
                          "tuesday": [],
                          "wednesday": [],
                          "thursday": [],
                          "friday": []
                        }
                        
                        CRITICAL: Provide the complete data for ALL days and ALL time slots. Do not stop until the last slot (04:10) of Friday is processed.
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
                    const text = response.text().replace(/```json/g, "").replace(/```/g, "").trim();
                    const rawData = JSON.parse(text);

                    // --- STABILIZE & NORMALIZE TRANSFORMATION ---
                    const normalizeTime = (t: string) => {
                        if (!t) return "00:00";
                        const clean = t.replace(/\s/g, "").replace(/\./g, ":");
                        let [hStr, mStr] = clean.split(":");
                        let h = parseInt(hStr);
                        let m = parseInt(mStr) || 0;
                        if (isNaN(h)) return t;
                        // Convert 1:xx, 2:xx, 3:xx, 4:xx PM to 24h
                        if (h >= 1 && h <= 5) h += 12;
                        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
                    };

                    const daysMap: Record<string, string> = {
                        monday: "Monday", tuesday: "Tuesday", wednesday: "Wednesday", thursday: "Thursday", friday: "Friday"
                    };

                    const transformedData = Object.entries(rawData).map(([dayKey, periods]: [string, any]) => {
                        return {
                            day: daysMap[dayKey.toLowerCase()] || (dayKey.charAt(0).toUpperCase() + dayKey.slice(1)),
                            periods: (periods || []).map((p: any) => ({
                                id: Math.random().toString(36).substring(7),
                                subject: p.code,
                                courseName: p.name,
                                teacherName: p.teacher,
                                startTime: normalizeTime(p.start),
                                endTime: normalizeTime(p.end),
                                room: p.hall,
                                type: "Lecture"
                            })).sort((a: any, b: any) => a.startTime.localeCompare(b.startTime))
                        };
                    });

                    console.log(`✅ [PARSER] Success with ${modelName} (${version})`);
                    return { success: true, data: transformedData };
                } catch (error: any) {
                    console.warn(`⚠️ [PARSER] Failed with ${modelName} (${version}):`, error.message);
                    lastError = error;
                }
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
            for (const version of VERSIONS) {
                try {
                    const model = genAI.getGenerativeModel(
                        {
                            model: modelName,
                            generationConfig: {
                                temperature: 0.7,
                            }
                        },
                        { apiVersion: version as any }
                    );
                    const result = await model.generateContent([
                        { text: "You are TimeWise AI, a helpful assistant." },
                        { text: `Context: ${JSON.stringify(context)}\nUser: ${query}` }
                    ]);

                    const response = await result.response;
                    const text = response.text() || "I processed that.";
                    console.log(`✅ [CHAT] Success with ${modelName} (${version})`);
                    return { text };
                } catch (error: any) {
                    console.warn(`⚠️ [CHAT] Failed with ${modelName} (${version}):`, error.message);
                    lastError = error;
                }
            }
        }

        return { error: `Chat failed: ${lastError?.message || "No models available"}` };
    } catch (globalError: any) {
        return { error: globalError.message || "An unexpected chat error occurred." };
    }
}
