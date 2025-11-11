
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { extractTextFromFile } from "../services/fileService.js";
import { parseResumeWithGemini } from "../services/geminiService.js";
import { Resume } from "../models/Resume.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const ALLOWED_MIMETYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-word",
  "application/octet-stream", 
];

const safeUnlink = async (filePath) => {
  try {
    if (!filePath) return;
    await fs.unlink(filePath);
  } catch (err) {
    
    console.warn("File cleanup failed:", err?.message ?? err);
  }
};

const normalizeParsedForSave = (obj, rawText) => {
  const strData = obj.raw_response_text;
  const cleanJsonString = strData.replace(/^```json\n/, '').replace(/\n```$/, '');
  const parsed =  JSON.parse(cleanJsonString);
  return parsed;
  if (!Object.keys(parsed).length) {
    return {
      personal_information: {},
      career_summary: {},
      work_experience: [],
      education: [],
      skills: {
        clinical_skills: [],
        technical_skills: [],
        soft_skills: [],
        languages: [],
      },
      certifications_and_licenses: [],
      professional_associations: [],
      publications: [],
      awards_and_honors: [],
      volunteer_and_research_experience: [],
      meta: {},
      rawText,
    };
  }


  const normalized = {
    personal_information: parsed.personal_information ?? {},
    career_summary: parsed.career_summary ?? {},
    work_experience: Array.isArray(parsed.work_experience) ? parsed.work_experience : [],
    education: Array.isArray(parsed.education) ? parsed.education : [],
    skills: {
      clinical_skills: (parsed.skills && Array.isArray(parsed.skills.clinical_skills)) ? parsed.skills.clinical_skills : [],
      technical_skills: (parsed.skills && Array.isArray(parsed.skills.technical_skills)) ? parsed.skills.technical_skills : [],
      soft_skills: (parsed.skills && Array.isArray(parsed.skills.soft_skills)) ? parsed.skills.soft_skills : [],
      languages: (parsed.skills && Array.isArray(parsed.skills.languages)) ? parsed.skills.languages : [],
    },
    certifications_and_licenses: Array.isArray(parsed.certifications_and_licenses) ? parsed.certifications_and_licenses : [],
    professional_associations: Array.isArray(parsed.professional_associations) ? parsed.professional_associations : [],
    publications: Array.isArray(parsed.publications) ? parsed.publications : [],
    awards_and_honors: Array.isArray(parsed.awards_and_honors) ? parsed.awards_and_honors : [],
    volunteer_and_research_experience: Array.isArray(parsed.volunteer_and_research_experience) ? parsed.volunteer_and_research_experience : [],
    meta: parsed.meta ?? {},
    rawText,
  };

 
  for (const key of Object.keys(parsed)) {
    if (!Object.prototype.hasOwnProperty.call(normalized, key) && key !== "rawText" && key !== "meta") {
    
      normalized[key] = parsed[key];
    }
  }

  return normalized;
};

export const uploadResume = async (req, res) => {
 
  if (!req.file) {
    return res.status(400).json({ success: false, error: "No file uploaded. Use form-data key 'resume'." });
  }

  const filePath = req.file.path;
  const mimetype = req.file.mimetype || "";
  const originalName = req.file.originalname || "unknown";

 
  if (!ALLOWED_MIMETYPES.some((m) => mimetype.includes(m.split("/")[0]) || mimetype === m)) {
    console.warn("Uploaded file MIME type not recognized as standard resume type:", mimetype, "filename:", originalName);
  }

  const promptFileName = (req.query && req.query.prompt) ? String(req.query.prompt) : undefined;

  let text;
  try {
  
    text = await extractTextFromFile(filePath, mimetype);
    if (!text || String(text).trim().length === 0) {
      
      await safeUnlink(filePath);
      return res.status(422).json({ success: false, error: "Uploaded file contained no extractable text." });
    }
  } catch (err) {
    console.error("Text extraction failed:", err?.message ?? err);
    await safeUnlink(filePath);
    return res.status(500).json({ success: false, error: `Text extraction failed: ${err?.message ?? "unknown error"}` });
  }

  let parsed;
  try {

    parsed = await parseResumeWithGemini(text, promptFileName);
  } catch (err) {
    console.error("Parsing service failed:", err?.message ?? err);
  
    parsed = { meta: { parsing_error: err?.message ?? "parsing failed" } };
  }

  try {
    
    const docToSave = normalizeParsedForSave(parsed, text);

  
    const saved = await Resume.create(docToSave);

   
    await safeUnlink(filePath);

    
    return res.status(200).json({ success: true, data: saved });
  } catch (err) {
    console.error("DB save failed:", err?.message ?? err);
    
    await safeUnlink(filePath);
    return res.status(500).json({ success: false, error: `Failed to save parsed resume: ${err?.message ?? "DB error"}` });
  }
};

export default uploadResume;
