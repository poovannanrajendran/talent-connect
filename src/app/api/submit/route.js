/**
 * API Route: POST /api/submit
 *
 * Submits a new profile to the database.
 * 1. Parses form data (profile fields + resume file)
 * 2. Checks for duplicate email
 * 3. Generates unique edit token (UUID)
 * 4. Creates Airtable record
 * 5. Uploads resume as attachment (base64 to content.airtable.com)
 * 6. Sends confirmation email with edit link
 * 7. Returns record ID and edit token
 *
 * Response: { recordId, editToken }
 */

import { NextResponse } from 'next/server';
import { v4 as uuidv4 }  from 'uuid';
import { findByEmail, createProfile, updateProfile, uploadResume } from '@/lib/airtable';
import { sendConfirmationEmail } from '@/lib/email';

// Vercel: allow up to 60 seconds for file upload and email send
export const maxDuration = 60;

export async function POST(request) {
  console.log('[submit] POST /api/submit — request received');
  try {
    const formData = await request.formData();

    // ── Profile fields ─────────────────────────────────────────────────────────
    const profile = {
      name:              formData.get('name')              || '',
      email:             formData.get('email')             || '',
      phone:             formData.get('phone')             || '',
      linkedin:          formData.get('linkedin')          || '',
      currentRole:       formData.get('currentRole')       || '',
      yearsOfExperience: formData.get('yearsOfExperience') || 0,
      location:          formData.get('location')          || '',
      coreSkills:        JSON.parse(formData.get('coreSkills')      || '[]'),
      secondarySkills:   JSON.parse(formData.get('secondarySkills') || '[]'),
      domains:           JSON.parse(formData.get('domains')         || '[]'),
      languages:         JSON.parse(formData.get('languages')       || '[]'),
      weekdayHours:      formData.get('weekdayHours')  || 0,
      weekendHours:      formData.get('weekendHours')  || 0,
      bio:               formData.get('bio')           || '',
    };

    const resumeFile = formData.get('resume'); // may be null if not re-uploaded on edit

    console.log(`[submit] Parsed form — name="${profile.name}" email="${profile.email}" resumeSize=${resumeFile?.size ?? 0}`);

    if (!profile.email) {
      console.warn('[submit] Rejected — missing email [400]');
      return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
    }
    if (!profile.name) {
      console.warn('[submit] Rejected — missing name [400]');
      return NextResponse.json({ error: 'Name is required.' }, { status: 400 });
    }

    // ── Duplicate check ────────────────────────────────────────────────────────
    console.log(`[submit] Checking for duplicate — email="${profile.email}"`);
    const existing = await findByEmail(profile.email);
    if (existing) {
      const existingToken = existing.fields?.['Edit Token'];
      console.warn(`[submit] Duplicate found — recordId=${existing.id} [409]`);
      return NextResponse.json(
        {
          duplicate:  true,
          editToken:  existingToken,
          message:    'A profile with this email already exists. Use your edit link to update it.',
        },
        { status: 409 }
      );
    }
    console.log('[submit] No duplicate found ✓');

    // ── Create new record ──────────────────────────────────────────────────────
    const editToken = uuidv4();
    console.log(`[submit] Creating Airtable record — editToken=${editToken}`);
    const record    = await createProfile({
      ...profile,
      editToken,
      status:      'New',
      submittedAt: new Date().toISOString(),
    });
    console.log(`[submit] Airtable record created ✓ recordId=${record.id}`);

    // ── Upload resume file (non-fatal) ─────────────────────────────────────────
    if (resumeFile && resumeFile.size > 0) {
      console.log(`[submit] Uploading resume — file="${resumeFile.name}" size=${resumeFile.size}`);
      const buffer = Buffer.from(await resumeFile.arrayBuffer());
      await uploadResume(record.id, buffer, resumeFile.name || 'resume.pdf', resumeFile.type || 'application/pdf');
      console.log('[submit] Resume upload complete ✓');
    } else {
      console.log('[submit] No resume file — skipping upload');
    }

    // ── Send confirmation email ────────────────────────────────────────────────
    console.log(`[submit] Sending confirmation email → ${profile.email}`);
    try {
      await sendConfirmationEmail({ name: profile.name, email: profile.email, editToken });
      console.log('[submit] Confirmation email sent ✓');
    } catch (emailErr) {
      // Email failure is non-fatal — profile was saved successfully
      console.warn('[submit] Email send failed (non-fatal):', emailErr.message);
    }

    console.log(`[submit] Done ✓ [200] recordId=${record.id}`);
    return NextResponse.json({ success: true, editToken });
  } catch (err) {
    console.error('[submit] Error:', err);
    return NextResponse.json({ error: 'Failed to save your profile. Please try again.' }, { status: 500 });
  }
}
