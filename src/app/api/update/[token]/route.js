/**
 * API Route: PUT /api/update/[token]
 *
 * Updates an existing profile using an edit token (from confirmation email).
 * 1. Validates and looks up profile by edit token
 * 2. Parses updated form data
 * 3. Updates Airtable record with new fields
 * 4. Uploads new resume if provided
 * 5. Sends update confirmation email
 * 6. Returns updated record ID
 *
 * Response: { recordId }
 */

import { NextResponse }  from 'next/server';
import { findByToken, updateProfile, uploadResume } from '@/lib/airtable';
import { sendUpdateConfirmationEmail }               from '@/lib/email';

// Vercel: allow up to 60 seconds for file upload and email send
export const maxDuration = 60;

export async function PUT(request, { params }) {
  const { token } = params;
  console.log(`[update] PUT /api/update/${token} — request received`);
  try {
    if (!token) {
      console.warn('[update] Rejected — missing token [400]');
      return NextResponse.json({ error: 'Token is required.' }, { status: 400 });
    }

    console.log(`[update] Looking up profile — token=${token}`);
    const record = await findByToken(token);
    if (!record) {
      console.warn(`[update] Profile not found — token=${token} [404]`);
      return NextResponse.json({ error: 'Profile not found.' }, { status: 404 });
    }
    console.log(`[update] Profile found ✓ recordId=${record.id}`);

    const formData = await request.formData();

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

    console.log(`[update] Parsed form — name="${profile.name}" email="${profile.email}"`);

    console.log(`[update] Updating Airtable record — recordId=${record.id}`);
    await updateProfile(record.id, profile);
    console.log(`[update] Airtable record updated ✓ recordId=${record.id}`);

    // Upload new resume if provided
    const resumeFile = formData.get('resume');
    if (resumeFile && resumeFile.size > 0) {
      console.log(`[update] Uploading new resume — file="${resumeFile.name}" size=${resumeFile.size}`);
      const buffer = Buffer.from(await resumeFile.arrayBuffer());
      await uploadResume(record.id, buffer, resumeFile.name || 'resume.pdf', resumeFile.type || 'application/pdf');
      console.log('[update] Resume upload complete ✓');
    } else {
      console.log('[update] No new resume — skipping upload');
    }

    // Send update confirmation
    console.log(`[update] Sending update confirmation email → ${profile.email}`);
    try {
      await sendUpdateConfirmationEmail({ name: profile.name, email: profile.email, editToken: token });
      console.log('[update] Update confirmation email sent ✓');
    } catch (emailErr) {
      console.warn('[update] Email send failed (non-fatal):', emailErr.message);
    }

    console.log(`[update] Done ✓ [200] recordId=${record.id}`);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(`[update] Unhandled error [500]:`, err.message, err.stack);
    return NextResponse.json({ error: 'Failed to update profile.' }, { status: 500 });
  }
}
