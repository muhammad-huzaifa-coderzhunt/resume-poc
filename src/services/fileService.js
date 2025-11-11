import mammoth from "mammoth";
import pdfParse from "pdf-parse";
import fs from "fs/promises";


export const extractTextFromFile = async (filePath, mimetype) => {
const buffer = await fs.readFile(filePath);


if (mimetype.includes("pdf")) {
const data = await pdfParse(buffer);
return data.text;
} else if (mimetype.includes("word") || mimetype.includes("officedocument") || mimetype.includes("msword")) {
const result = await mammoth.extractRawText({ buffer });
return result.value;
} else {

return buffer.toString("utf-8");
}
};