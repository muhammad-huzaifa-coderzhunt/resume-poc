import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
// Ensure dotenv is loaded (in case this module is imported before server.js)
dotenv.config();
const API_KEY = process.env.GEMINI_API_KEY;
// Valid Gemini model names: gemini-2.5-pro, gemini-2.5-flash, gemini-2.5-pro-latest (as of November 2025)
const MODEL ="gemini-2.5-flash";
const DEFAULT_BASE = "https://generativelanguage.googleapis.com/v1beta";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const readPromptTemplate = async (fileName = "medical_resume_llm_prompt.txt") => {
  try {
    const promptPath = path.join(__dirname, "../prompts", fileName);
    const content = await fs.readFile(promptPath, "utf-8");
    return content;
  } catch (err) {
    console.error(`Failed to read prompt template ${fileName}:`, err.message);
    throw new Error(`Prompt template not found: ${fileName}`);
  }
};
const parseApiResponseForText = (json) => {
if (!json) return null;
if (json.candidates && Array.isArray(json.candidates) && json.candidates[0] && json.candidates[0].content) {
return json.candidates[0].content;
}
if (json.output && Array.isArray(json.output) && json.output[0] && json.output[0].content) {
return json.output[0].content;
}
if (json.results && json.results[0] && json.results[0].content) {
return json.results[0].content;
}
if (typeof json === "string") return json;
const search = (obj) => {
if (!obj || typeof obj !== "object") return null;
if (obj.text && typeof obj.text === "string") return obj.text;
for (const k of Object.keys(obj)) {
const v = obj[k];
if (typeof v === "string" && v.length > 0) return v;
if (typeof v === "object") {
const r = search(v);
if (r) return r;
}
}
return null;
};
return search(json);
};
export const parseResumeWithGemini = async (resumeText, promptFileName = "medical_resume_llm_prompt.txt") => {
  // Validate API key exists
  if (!API_KEY || API_KEY.trim() === "") {
    throw new Error("GEMINI_API_KEY is not set in .env file. Please add your Gemini API key.");
  }
  const promptTemplate = await readPromptTemplate(promptFileName);
  const finalPrompt = `${promptTemplate}\n\n---\nRESUME TEXT:\n${resumeText}`;
  // Construct URL without API key query param (use header instead)
  // Ensure model name is correct format (should already include "gemini-" prefix)
  let modelName = MODEL.trim();
 
  // If model doesn't start with "gemini-", add it (but warn)
  if (!modelName.startsWith("gemini-")) {
    console.warn(`Model name "${modelName}" doesn't start with "gemini-". Adding prefix...`);
    modelName = `gemini-${modelName}`;
  }
 
  // Normalize base URL to use v1beta (not v1beta2)
  let baseUrl = DEFAULT_BASE.trim();
  if (baseUrl.includes("/v1beta2")) {
    baseUrl = baseUrl.replace("/v1beta2", "/v1beta");
    console.warn(`Base URL changed from v1beta2 to v1beta: ${baseUrl}`);
  }
  if (!baseUrl.endsWith("/v1beta")) {
    baseUrl = baseUrl.replace(/\/v1beta\/?$/, "") + "/v1beta";
  }
 
  const url = `${baseUrl}/models/${modelName}:generateContent`;
 
  console.log(`Calling Gemini API - Model: ${modelName}, Base URL: ${baseUrl}`);
  const body = {
    contents: [{
      parts: [{
        text: finalPrompt
      }]
    }],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 4096
    }
  };
  try {
    // Debug: Log API key status (first 10 chars only for security)
    if (API_KEY) {
      console.log(`Using Gemini API key: ${API_KEY.substring(0, 10)}...`);
    }
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": API_KEY // Use header for API key authentication
      },
      body: JSON.stringify(body),
    });
    if (!resp.ok) {
      const errorText = await resp.text();
      console.error(`Gemini API Error Details:`, {
        status: resp.status,
        statusText: resp.statusText,
        url,
        error: errorText
      });
      throw new Error(`Gemini API error (${resp.status}): ${errorText}`);
    }
    const json = await resp.json();
  
    let text = null;
    if (json.candidates && json.candidates[0] && json.candidates[0].content) {
      const content = json.candidates[0].content;
      if (content.parts && content.parts[0] && content.parts[0].text) {
        text = content.parts[0].text;
      }
    }
    if (!text) {
      text = parseApiResponseForText(json);
    }
    if (!text) {
      return { raw_response: json, rawText: resumeText };
    }
    // The model should return JSON string — try to parse
    try {
      const parsed = JSON.parse(text);
      return parsed;
    } catch (err) {
      // If not JSON, return raw text in a field
      return { raw_response_text: text, rawText: resumeText };
    }
  } catch (err) {
    console.error("Gemini API error:", err.message);
    return { error: err.message, rawText: resumeText };
  }
};