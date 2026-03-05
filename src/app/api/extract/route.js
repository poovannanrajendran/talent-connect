/**
 * API Route: POST /api/extract
 *
 * Extracts profile data from a resume (PDF or Word document) using Claude AI.
 * 1. Validates file type (PDF/DOCX) and size (≤10 MB)
 * 2. Converts file to text (DOCX→text via conversion, PDF→binary)
 * 3. Sends to Claude for structured extraction
 * 4. Splits skills into Core (top 3) and Secondary
 * 5. Returns extracted profile with model used (haiku/sonnet)
 *
 * Response: { name, email, phone, linkedin, location, currentRole, yearsOfExperience, bio, skills, coreSkills, secondarySkills, extractedModel }
 */

import { NextResponse } from 'next/server';
import { extractResumeData } from '@/lib/claude';

// Vercel: allow up to 60 seconds for Claude AI extraction
export const maxDuration = 60;

// Supported file types
const ALLOWED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/msword', // .doc
];

// Maximum file size: 10 MB
const MAX_SIZE_BYTES = 10 * 1024 * 1024;

export async function POST(request) {
  console.log('[extract] POST /api/extract — request received');
  try {
    const formData = await request.formData();
    const file     = formData.get('resume');

    if (!file) {
      console.warn('[extract] Rejected — no file uploaded [400]');
      return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 });
    }

    console.log(`[extract] File received — name="${file.name}" size=${file.size} type="${file.type}"`);

    // Validate size
    if (file.size > MAX_SIZE_BYTES) {
      console.warn(`[extract] Rejected — file too large (${file.size} bytes) [400]`);
      return NextResponse.json(
        { error: 'File is too large. Please upload a file under 10 MB.' },
        { status: 400 }
      );
    }

    // Validate type
    const mimeType = file.type;
    const isDocx   = mimeType.includes('wordprocessingml') || mimeType.includes('msword') || file.name?.endsWith('.docx') || file.name?.endsWith('.doc');
    const isPdf    = mimeType === 'application/pdf' || file.name?.endsWith('.pdf');

    if (!isPdf && !isDocx) {
      console.warn(`[extract] Rejected — unsupported type "${mimeType}" [400]`);
      return NextResponse.json(
        { error: 'Unsupported file type. Please upload a PDF or Word document (.docx).' },
        { status: 400 }
      );
    }

    console.log(`[extract] File type OK — ${isPdf ? 'PDF' : 'DOCX'}`);

    // Read file into buffer
    const arrayBuffer = await file.arrayBuffer();
    let fileBuffer    = Buffer.from(arrayBuffer);
    let claudeMime    = 'application/pdf';

    // Convert DOCX → plain text for Claude
    if (isDocx) {
      console.log('[extract] Converting DOCX → plain text via mammoth');
      const mammoth = await import('mammoth');
      const result  = await mammoth.extractRawText({ buffer: fileBuffer });
      if (!result.value || result.value.trim().length < 50) {
        console.warn('[extract] DOCX appears empty or unreadable [422]');
        return NextResponse.json(
          { error: 'This Word document appears to be empty or unreadable. Please upload a valid resume file.' },
          { status: 422 }
        );
      }
      fileBuffer = Buffer.from(result.value, 'utf-8');
      claudeMime = 'text/plain';
      console.log(`[extract] DOCX → text conversion complete ✓ (${fileBuffer.length} chars)`);
    }

    // Sanity-check PDF isn't obviously corrupted
    if (isPdf && fileBuffer.length < 200) {
      console.warn(`[extract] Rejected — PDF too small (${fileBuffer.length} bytes), likely corrupted [422]`);
      return NextResponse.json(
        { error: 'This PDF appears to be corrupted or empty. Please upload a valid resume file.' },
        { status: 422 }
      );
    }

    // Extract data via Claude (Haiku → Sonnet fallback)
    console.log(`[extract] Starting Claude extraction — mime="${claudeMime}" bufferSize=${fileBuffer.length}`);
    const { data, model } = await extractResumeData(fileBuffer, claudeMime, file.name);
    console.log(`[extract] Extraction complete ✓ model=${model} name="${data.name}" email="${data.email}" skills=${data.skills?.length ?? 0}`);

    // Split skills: first 3 → core, rest → secondary
    const allSkills       = Array.isArray(data.skills) ? data.skills : [];
    const coreSkills      = allSkills.slice(0, 3);
    const secondarySkills = allSkills.slice(3);

    console.log(`[extract] Done ✓ [200] core=${coreSkills.length} secondary=${secondarySkills.length}`);
    return NextResponse.json({
      success:   true,
      model,                   // 'haiku' or 'sonnet' — shown in UI as AI badge
      extracted: {
        name:               data.name           || '',
        email:              data.email          || '',
        phone:              data.phone          || '',
        linkedin:           data.linkedin       || '',
        currentRole:        data.currentRole    || '',
        yearsOfExperience:  data.yearsOfExperience ?? '',
        location:           data.location       || '',
        coreSkills,
        secondarySkills,
        domains:            Array.isArray(data.domains)   ? data.domains   : [],
        languages:          Array.isArray(data.languages) ? data.languages : [],
        bio:                data.bio            || '',
        weekdayHours:       '',
        weekendHours:       '',
      },
    });
  } catch (err) {
    console.error('[extract] Unhandled error [500]:', err.message);

    // Friendly message for corrupted/unreadable files
    if (err.message?.includes('Could not extract') || err.message?.includes('JSON')) {
      return NextResponse.json(
        { error: 'We could not read this file. Please make sure it is a valid, non-password-protected PDF or .docx resume and try again.' },
        { status: 422 }
      );
    }

    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
