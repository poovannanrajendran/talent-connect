/**
 * API Route: GET /api/profile/[token]
 *
 * Fetches an existing profile by edit token for the edit form.
 * 1. Validates token
 * 2. Looks up profile in Airtable
 * 3. Converts Airtable fields to app format
 * 4. Returns profile data to pre-populate edit form
 *
 * Response: { profile data with all fields }
 */

import { NextResponse } from 'next/server';
import { findByToken, mapFromAirtable } from '@/lib/airtable';

export async function GET(request, { params }) {
  const { token } = params;
  console.log(`[profile] GET /api/profile/${token} — request received`);
  try {
    if (!token) {
      console.warn('[profile] Rejected — missing token [400]');
      return NextResponse.json({ error: 'Token is required.' }, { status: 400 });
    }

    console.log(`[profile] Looking up record — token=${token}`);
    const record = await findByToken(token);

    if (!record) {
      console.warn(`[profile] Not found — token=${token} [404]`);
      return NextResponse.json(
        { error: 'Profile not found. This link may be invalid or expired.' },
        { status: 404 }
      );
    }

    console.log(`[profile] Found ✓ recordId=${record.id} [200]`);
    return NextResponse.json({ success: true, profile: mapFromAirtable(record) });
  } catch (err) {
    console.error('[profile] Unhandled error [500]:', err.message);
    return NextResponse.json({ error: 'Failed to load profile.' }, { status: 500 });
  }
}
