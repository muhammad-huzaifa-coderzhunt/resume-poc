import mongoose from "mongoose";

const workExperienceSchema = new mongoose.Schema({
  title: String,
  organization: String,
  location: String,
  start_date: String,
  end_date: String,
  description: String,
  key_achievements: String,
});

const educationSchema = new mongoose.Schema({
  degree: String,
  field_of_study: String,
  institution: String,
  location: String,
  start_year: Number,
  end_year: Number,
});

const certificationSchema = new mongoose.Schema({
  name: String,
  issuer: String,
  year: Number,
  license_id: String,
});

const resumeSchema = new mongoose.Schema({
  personal_information: Object,
  career_summary: Object,
  work_experience: [workExperienceSchema],
  education: [educationSchema],
  skills: Object,
  certifications_and_licenses: [certificationSchema],
  professional_associations: [Object],
  publications: [Object],
  awards_and_honors: [Object],
  volunteer_and_research_experience: [Object],
  rawText: String,
  meta: Object,
  createdAt: { type: Date, default: Date.now },
});

export const Resume = mongoose.model("Resume", resumeSchema);