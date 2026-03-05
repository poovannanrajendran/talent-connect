import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const HAIKU_MODEL  = 'claude-haiku-4-5-20251001';
const SONNET_MODEL = 'claude-sonnet-4-5-20250929';

const EXTRACTION_PROMPT = `You are a professional resume parser. Extract structured information from the resume and return ONLY a valid JSON object — no markdown, no code fences, no explanation.

Return this exact shape:
{
  "name": "Full Name",
  "email": "email@example.com",
  "phone": "+44 7700 000000",
  "linkedin": "https://linkedin.com/in/...",
  "currentRole": "Senior Software Engineer",
  "yearsOfExperience": 8,
  "location": "London, UK",
  "skills": ["Python", "AWS", "React", "Node.js", "SQL", "Docker"],
  "domains": ["FinTech", "E-commerce", "SaaS"],
  "languages": ["English - Native", "French - Conversational"],
  "bio": "2–3 sentence professional summary written in third person, based on the resume content."
}

Rules:
- skills: list ALL skills found, most prominent/frequently mentioned first. The first 3 will automatically become "Core Skills". Include at least 5 if possible.
- domains: industry or domain areas (e.g. FinTech, Healthcare, E-commerce, Cloud Infrastructure). 1–4 items.
- languages: only include if explicitly mentioned in the resume.
- yearsOfExperience: whole number, calculated from earliest job to present. Use 0 if unclear.
- bio: write from the resume content, do NOT invent facts.
- If a field is not found, use null (not empty string).
- Return ONLY the JSON object. No other text whatsoever.`;

/**
 * Extract structured profile data from a resume buffer.
 * Tries Haiku 4.5 first; falls back to Sonnet 4.5 on failure or weak output.
 *
 * @param {Buffer} fileBuffer  - Raw file bytes
 * @param {string} mimeType    - 'application/pdf' | 'text/plain'
 * @param {string} fileName    - Original filename (for logging)
 * @returns {{ data: object, model: string }}
 */
export async function extractResumeData(fileBuffer, mimeType, fileName) {
  // Try Haiku first
  try {
    const result = await callClaude(HAIKU_MODEL, fileBuffer, mimeType);
    if (isValidExtraction(result)) {
      console.log(`[claude] Extraction succeeded with ${HAIKU_MODEL}`);
      return { data: result, model: 'haiku' };
    }
    console.warn(`[claude] Haiku returned weak output for "${fileName}", falling back to Sonnet`);
  } catch (err) {
    console.warn(`[claude] Haiku failed for "${fileName}": ${err.message}. Falling back to Sonnet`);
  }

  // Fallback to Sonnet
  const result = await callClaude(SONNET_MODEL, fileBuffer, mimeType);
  if (!isValidExtraction(result)) {
    throw new Error('Could not extract meaningful data from this resume. Please ensure the file is a readable PDF or Word document.');
  }
  console.log(`[claude] Extraction succeeded with ${SONNET_MODEL} (fallback)`);
  return { data: result, model: 'sonnet' };
}

async function callClaude(model, fileBuffer, mimeType) {
  const base64Data = fileBuffer.toString('base64');

  let messageContent;

  if (mimeType === 'application/pdf') {
    // Claude natively reads PDFs
    messageContent = [
      {
        type: 'document',
        source: {
          type: 'base64',
          media_type: 'application/pdf',
          data: base64Data,
        },
      },
      { type: 'text', text: EXTRACTION_PROMPT },
    ];
  } else {
    // Plain text (converted from DOCX by mammoth)
    const textContent = fileBuffer.toString('utf-8');
    messageContent = [
      { type: 'text', text: `RESUME CONTENT:\n\n${textContent}\n\n---\n\n${EXTRACTION_PROMPT}` },
    ];
  }

  const response = await client.messages.create({
    model,
    max_tokens: 1500,
    messages: [{ role: 'user', content: messageContent }],
  });

  const raw = response.content[0]?.text?.trim() || '';

  // Strip any accidental markdown fences
  const cleaned = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();

  return JSON.parse(cleaned);
}

function isValidExtraction(data) {
  if (!data || typeof data !== 'object') return false;
  // Must have at least name OR email, plus at least 2 skills
  const hasIdentity = data.name || data.email;
  const hasSkills   = Array.isArray(data.skills) && data.skills.length >= 2;
  return hasIdentity && hasSkills;
}
