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
                        TASK: Convert the Academic Timetable image into structured JSON.
                        
                        1. CANONICAL TIMES (Reference these for all classes):
                           - Slots: 09:00-09:50, 09:50-10:40, 11:00-11:50, 11:50-12:40, 01:40-02:30, 02:30-03:20, 03:20-04:10.
                           - VERTICAL BREAKS: 10:40-11:00 (Tea) and 12:40-01:40 (Lunch). IGNORE THESE.
                        
                        2. SCANNING LOGIC:
                           - For each Day row (Mon-Fri), find every class cell.
                           - Identify the START and END time for each cell based on the header.
                           - IMPORTANT: If a cell spans multiple slots (e.g. 11:00 to 12:40), capture the full start/end.
                           - MULTI-SUBJECT CELLS: If a cell contains multiple codes (e.g. "CEDX 01/07" or "SSDX 11/12/13/14"), you MUST create a SEPARATE JSON object for each code.
                        
                        3. LEGEND MATCHING:
                           - Use the Course Details table (bottom) to look up every Course Code.
                           - Assign the correct "Course Name", "Faculty/Teacher", and "Hall/Room".
                        
                        4. OUTPUT SCHEMA:
                        {
                          "monday": [
                            {
                              "code": "CEDX 01",
                              "name": "Full Name from Legend",
                              "teacher": "Teacher from Legend",
                              "start": "09:00",
                              "end": "09:50",
                              "hall": "ES 001"
                            },
                            {
                              "code": "CEDX 07",
                              "name": "Full Name from Legend (Matched for 07)",
                              "teacher": "Teacher from Legend (Matched for 07)",
                              "start": "09:00",
                              "end": "09:50",
                              "hall": "ES 001"
                            }
                          ],
                          "tuesday": [], ...
                        }

                        CRITICAL: Use 24-hour format (HH:mm) if possible, or standard labels. I will stabilize them in code.
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
                            }))
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
