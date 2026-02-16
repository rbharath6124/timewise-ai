import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize inside functions to ensure env vars are fresh

const MODELS_TO_TRY = [
  "gemini-2.5-flash",
  "gemini-flash-latest",
  "gemini-2.5-pro",
  "gemini-pro-latest",
  "gemini-2.0-flash"
];

const API_VERSIONS = ["v1beta"];

export async function parseTimetableImage(file: File): Promise<any> {
  const apiKey = (process.env.NEXT_PUBLIC_GEMINI_API_KEY || "").trim();
  if (!apiKey) throw new Error("Gemini API Key not set in environment");

  console.log("--- DEBUG: Gemini Parsing ---");
  console.log("API Key Prefix:", apiKey.substring(0, 8));
  console.log("API Key Length:", apiKey.length);

  const base64Data = await fileToGenerativePart(file);
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

  for (const version of API_VERSIONS) {
    for (const modelId of MODELS_TO_TRY) {
      try {
        console.log(`Trying ${version} with model: ${modelId}`);
        // @ts-ignore - version is supported but type definitions might lag
        const genAI = new GoogleGenerativeAI(apiKey, { apiVersion: version });
        const model = genAI.getGenerativeModel({ model: modelId });

        const result = await model.generateContent([prompt, base64Data]);
        const response = await result.response;
        const text = response.text();

        const cleanText = text.replace(/```json/g, "").replace(/```/g, "").trim();
        console.log(`✅ SUCCESS [${version}/${modelId}]`);
        return JSON.parse(cleanText);
      } catch (error: any) {
        console.warn(`❌ FAIL [${version}/${modelId}]:`, error.message);
        lastError = error;
        // Continue loop
      }
    }
  }

  throw lastError || new Error("No available Gemini models found for parsing.");
}

export async function chatWithAI(query: string, context: any): Promise<{ text: string, toolCalls?: any[] }> {
  const apiKey = (process.env.NEXT_PUBLIC_GEMINI_API_KEY || "").trim();
  if (!apiKey) throw new Error("Gemini API Key not set in environment");

  let lastError: any = null;

  for (const version of API_VERSIONS) {
    for (const modelId of MODELS_TO_TRY) {
      try {
        console.log(`Trying ${version} chat with: ${modelId}`);
        // @ts-expect-error - version type may lag behind SDK updates
        const genAI = new GoogleGenerativeAI(apiKey, { apiVersion: version });
        const model = genAI.getGenerativeModel({ model: modelId });

        const tools = [
          {
            functionDeclarations: [
              {
                name: "reschedule_class",
                description: "Reschedule a class period from one day to another.",
                parameters: {
                  type: "OBJECT",
                  properties: {
                    subject: { type: "STRING", description: "The name of the subject/class to move." },
                    fromDay: { type: "STRING", enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"], description: "The current day of the class." },
                    toDay: { type: "STRING", enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"], description: "The day to move the class to." }
                  },
                  required: ["subject", "fromDay", "toDay"]
                }
              }
            ]
          }
        ];

        const chat = model.startChat({
          history: [
            {
              role: "user",
              parts: [{ text: "You are TimeWise AI, a helpful academic assistant. You help students manage their timetable and attendance. You can answer questions about their schedule and also take actions like rescheduling classes using tools. When rescheduling, confirm the details with the user." }],
            },
            {
              role: "model",
              parts: [{ text: "Understood! I'm ready to help you manage my schedule. How can I assist you today?" }],
            },
          ],
          // Tool calling works in v1beta for supported models
          tools: version === "v1beta" ? (tools as any) : undefined,
        });

        const result = await chat.sendMessage(`
                    Context: ${JSON.stringify(context)}
                    User Query: ${query}
                `);

        const response = await result.response;
        const toolCalls = version === "v1beta" ? response.functionCalls() : undefined;

        console.log(`✅ SUCCESS [${version}/${modelId}]`);
        return {
          text: response.text(),
          toolCalls: toolCalls
        };
      } catch (error: any) {
        console.warn(`❌ FAIL [${version}/${modelId}]:`, error.message);
        lastError = error;
      }
    }
  }

  throw lastError || new Error("No available Gemini models found for chatting.");
}

async function fileToGenerativePart(file: File) {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
  return {
    inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
  };
}
