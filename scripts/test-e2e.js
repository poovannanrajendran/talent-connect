#!/usr/bin/env node
/**
 * Talent Connect — End-to-End Test Script
 *
 * Tests the full candidate submission and update flow:
 *   1. POST /api/extract  — upload a mock resume PDF and extract profile data
 *   2. POST /api/submit   — submit the profile and get an edit token
 *   3. GET  /api/profile/[token] — verify the saved profile
 *   4. PUT  /api/update/[token] — update a field and verify the change
 *   5. Cleanup — delete the test Airtable record directly via the REST API
 *
 * Usage:
 *   node scripts/test-e2e.js
 *   BASE_URL=https://your-deployment.vercel.app node scripts/test-e2e.js
 *
 * Requires Node 18+ (uses native fetch, FormData, Blob — no extra packages).
 * Reads AIRTABLE_API_KEY, AIRTABLE_BASE_ID, and AIRTABLE_TABLE_NAME from .env.local.
 */

'use strict';

const fs   = require('fs');
const path = require('path');

// ── Load .env.local ──────────────────────────────────────────────────────────
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq  = t.indexOf('=');
    if (eq === -1) continue;
    const key = t.slice(0, eq).trim();
    const val = t.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[key]) process.env[key] = val;
  }
}

const BASE_URL       = process.env.BASE_URL || 'http://localhost:3000';
const AIRTABLE_KEY   = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE  = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_TABLE = encodeURIComponent(process.env.AIRTABLE_TABLE_NAME || 'Talent Profiles');

// ── Colour helpers ───────────────────────────────────────────────────────────
const c = {
  reset:  '\x1b[0m',
  green:  '\x1b[32m',
  red:    '\x1b[31m',
  yellow: '\x1b[33m',
  cyan:   '\x1b[36m',
  bold:   '\x1b[1m',
  dim:    '\x1b[2m',
};

let passed = 0;
let failed = 0;
const errors = [];

function ok(label) {
  passed++;
  console.log(`  ${c.green}✔${c.reset} ${label}`);
}
function fail(label, detail) {
  failed++;
  console.log(`  ${c.red}✘${c.reset} ${label}${detail ? ` — ${c.dim}${detail}${c.reset}` : ''}`);
  errors.push(`${label}${detail ? ': ' + detail : ''}`);
}
function assert(condition, label, detail) {
  if (condition) ok(label);
  else fail(label, detail);
}

// ── Minimal valid PDF ────────────────────────────────────────────────────────
// A tiny but structurally valid PDF with readable text content.
function buildMockPdf() {
  const name  = 'Test Candidate';
  const email = 'test.e2e@talentconnect.invalid';

  const stream = [
    'BT',
    '/F1 12 Tf',
    '72 720 Td',
    `(${name}) Tj`,
    '0 -20 Td',
    `(${email}) Tj`,
    '0 -20 Td',
    '(Senior Product Manager | 8 years of experience) Tj',
    '0 -20 Td',
    '(Skills: Product Strategy, Roadmapping, Agile, Stakeholder Management) Tj',
    '0 -20 Td',
    '(Languages: English Native, French Conversational) Tj',
    '0 -20 Td',
    '(Location: London UK) Tj',
    '0 -20 Td',
    '(Availability: 10 hours per week on weekdays) Tj',
    'ET',
  ].join('\n');

  const streamLen = Buffer.byteLength(stream, 'utf-8');

  const objects = [
    `1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj`,
    `2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj`,
    `3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<</Font<</F1<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>>>>>/Contents 4 0 R>>endobj`,
    `4 0 obj\n<<\n/Length ${streamLen}\n>>\nstream\n${stream}\nendstream\nendobj`,
  ];

  let offset = 9; // %PDF-1.4\n
  const offsets = [];
  const body = objects.map((obj, i) => {
    offsets.push(offset);
    offset += Buffer.byteLength(obj + '\n', 'utf-8');
    return obj;
  }).join('\n');

  const xrefOffset = 9 + Buffer.byteLength(body + '\n', 'utf-8');

  const xref = [
    'xref',
    `0 ${objects.length + 1}`,
    '0000000000 65535 f ',
    ...offsets.map(o => `${String(o).padStart(10, '0')} 00000 n `),
  ].join('\n');

  const pdf = `%PDF-1.4\n${body}\n${xref}\ntrailer<</Size ${objects.length + 1}/Root 1 0 R>>\nstartxref\n${xrefOffset}\n%%EOF`;

  return { buffer: Buffer.from(pdf, 'utf-8'), name, email };
}

// ── HTTP helpers using native fetch + FormData ───────────────────────────────
async function postForm(url, formData) {
  const res  = await fetch(url, { method: 'POST', body: formData });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

async function putForm(url, formData) {
  const res  = await fetch(url, { method: 'PUT', body: formData });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

async function getJson(url) {
  const res  = await fetch(url);
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

// ── Build a native FormData with all profile fields ──────────────────────────
function buildProfileForm(profile, pdfBuffer) {
  const form = new FormData();
  form.append('name',              profile.name              || '');
  form.append('email',             profile.email             || '');
  form.append('phone',             profile.phone             || '');
  form.append('linkedin',          profile.linkedin          || '');
  form.append('currentRole',       profile.currentRole       || '');
  form.append('yearsOfExperience', String(profile.yearsOfExperience || 0));
  form.append('location',          profile.location          || '');
  form.append('coreSkills',        JSON.stringify(profile.coreSkills      || []));
  form.append('secondarySkills',   JSON.stringify(profile.secondarySkills || []));
  form.append('domains',           JSON.stringify(profile.domains         || []));
  form.append('languages',         JSON.stringify(profile.languages       || []));
  form.append('weekdayHours',      String(profile.weekdayHours || 0));
  form.append('weekendHours',      String(profile.weekendHours || 0));
  form.append('bio',               profile.bio || '');
  if (pdfBuffer) {
    const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
    form.append('resume', blob, 'test-resume.pdf');
  }
  return form;
}

// ── Airtable cleanup ──────────────────────────────────────────────────────────
async function deleteAirtableRecord(recordId) {
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE}/${AIRTABLE_TABLE}/${recordId}`;
  const res  = await fetch(url, {
    method:  'DELETE',
    headers: { Authorization: `Bearer ${AIRTABLE_KEY}` },
  });
  return res.ok;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function run() {
  console.log('');
  console.log(`${c.bold}${c.cyan}╔══════════════════════════════════════════╗${c.reset}`);
  console.log(`${c.bold}${c.cyan}║   Talent Connect — E2E Test Suite        ║${c.reset}`);
  console.log(`${c.bold}${c.cyan}╚══════════════════════════════════════════╝${c.reset}`);
  console.log(`${c.dim}  Base URL : ${BASE_URL}${c.reset}`);
  console.log(`${c.dim}  Airtable : ${AIRTABLE_BASE}${c.reset}`);
  console.log('');

  // ── [0] Preflight ────────────────────────────────────────────────────────
  console.log(`${c.bold}[0] Preflight${c.reset}`);
  assert(!!AIRTABLE_KEY,  'AIRTABLE_API_KEY is set');
  assert(!!AIRTABLE_BASE, 'AIRTABLE_BASE_ID is set');

  try {
    const ping = await fetch(BASE_URL);
    assert(ping.status < 500, 'App is reachable', `HTTP ${ping.status}`);
  } catch (e) {
    fail('App is reachable', `${e.message} — make sure the dev server is running`);
    return summary();
  }

  // ── [1] Extract ──────────────────────────────────────────────────────────
  console.log('');
  console.log(`${c.bold}[1] POST /api/extract — AI profile extraction${c.reset}`);

  const { buffer: pdfBuffer, name: testName, email: testEmail } = buildMockPdf();

  const extractForm = new FormData();
  const pdfBlob     = new Blob([pdfBuffer], { type: 'application/pdf' });
  extractForm.append('resume', pdfBlob, 'test-resume.pdf');

  let extractedProfile = null;

  try {
    const { status, body } = await postForm(`${BASE_URL}/api/extract`, extractForm);
    assert(status === 200,               'Status 200',                  `got ${status}: ${JSON.stringify(body)}`);
    assert(!!body.profile,               'Response has .profile object', JSON.stringify(body).slice(0, 120));
    assert(!!body.profile?.name,         'Extracted name is non-empty',  body.profile?.name);
    assert(!!body.profile?.email,        'Extracted email is non-empty', body.profile?.email);
    assert(Array.isArray(body.profile?.coreSkills), 'coreSkills is an array');
    extractedProfile = body.profile;
    console.log(`  ${c.dim}→ model: ${body.model || 'unknown'}, name: "${extractedProfile?.name}", email: "${extractedProfile?.email}"${c.reset}`);
  } catch (e) {
    fail('Extract request completed', e.message);
    return summary();
  }

  // ── [2] Submit ───────────────────────────────────────────────────────────
  console.log('');
  console.log(`${c.bold}[2] POST /api/submit — profile submission${c.reset}`);

  const submitProfile = {
    name:              testName,
    email:             testEmail,
    phone:             extractedProfile.phone            || '',
    linkedin:          extractedProfile.linkedin         || '',
    currentRole:       extractedProfile.currentRole      || 'Senior Product Manager',
    yearsOfExperience: extractedProfile.yearsOfExperience || 8,
    location:          extractedProfile.location         || 'London, UK',
    coreSkills:        extractedProfile.coreSkills?.length ? extractedProfile.coreSkills : ['Product Strategy', 'Agile'],
    secondarySkills:   extractedProfile.secondarySkills  || ['Stakeholder Management'],
    domains:           extractedProfile.domains          || ['SaaS'],
    languages:         extractedProfile.languages        || ['English - Native'],
    weekdayHours:      10,
    weekendHours:      5,
    bio:               'E2E test profile — safe to delete.',
  };

  let editToken  = null;
  let airtableId = null;

  try {
    const form = buildProfileForm(submitProfile, pdfBuffer);
    const { status, body } = await postForm(`${BASE_URL}/api/submit`, form);

    if (status === 409 && body.duplicate) {
      console.log(`  ${c.yellow}⚠ Duplicate — using existing token for cleanup${c.reset}`);
      editToken = body.editToken;
      ok('Submit returned existing token (duplicate from previous run)');
    } else {
      assert(status === 200,   'Status 200',           `got ${status}: ${JSON.stringify(body)}`);
      assert(!!body.success,   'Response success=true');
      assert(!!body.editToken, 'Response has editToken');
      editToken = body.editToken;
    }
    console.log(`  ${c.dim}→ editToken: ${editToken}${c.reset}`);
  } catch (e) {
    fail('Submit request completed', e.message);
    return summary();
  }

  // ── [3] Read profile ─────────────────────────────────────────────────────
  console.log('');
  console.log(`${c.bold}[3] GET /api/profile/[token] — profile retrieval${c.reset}`);

  try {
    const { status, body } = await getJson(`${BASE_URL}/api/profile/${editToken}`);
    assert(status === 200,                              'Status 200',               `got ${status}`);
    assert(!!body.success,                              'Response success=true');
    assert(!!body.profile,                              'Response has .profile');
    assert(body.profile.email === testEmail,            'Email matches',            body.profile.email);
    assert(body.profile.name  === testName,             'Name matches',             body.profile.name);
    assert(Array.isArray(body.profile.coreSkills),      'coreSkills is array');
    assert((body.profile.coreSkills || []).length > 0,  'coreSkills is non-empty');
    assert(Number(body.profile.weekdayHours) === 10,    'weekdayHours saved as 10', String(body.profile.weekdayHours));
    airtableId = body.profile.id;
    console.log(`  ${c.dim}→ Airtable record ID: ${airtableId}${c.reset}`);
  } catch (e) {
    fail('Profile GET completed', e.message);
  }

  // ── [4] Update profile ───────────────────────────────────────────────────
  console.log('');
  console.log(`${c.bold}[4] PUT /api/update/[token] — profile update${c.reset}`);

  const updatedRole = 'Principal Product Manager (e2e-updated)';

  try {
    const updateProfile = {
      ...submitProfile,
      currentRole:       updatedRole,
      yearsOfExperience: 9,
      weekdayHours:      15,
      weekendHours:      0,
      coreSkills:        ['Product Strategy', 'Agile', 'OKRs'],
      domains:           ['SaaS', 'FinTech'],
      bio:               'Updated bio — E2E test.',
    };
    const form = buildProfileForm(updateProfile, null); // no file re-upload
    const { status, body } = await putForm(`${BASE_URL}/api/update/${editToken}`, form);
    assert(status === 200, 'Status 200',           `got ${status}: ${JSON.stringify(body)}`);
    assert(!!body.success, 'Response success=true');
  } catch (e) {
    fail('Update request completed', e.message);
  }

  // Verify update persisted
  console.log(`  ${c.dim}Verifying update was saved…${c.reset}`);
  try {
    const { status, body } = await getJson(`${BASE_URL}/api/profile/${editToken}`);
    assert(status === 200,                                     'GET after update: 200');
    assert(body.profile?.currentRole === updatedRole,          'currentRole updated',       body.profile?.currentRole);
    assert(Number(body.profile?.yearsOfExperience) === 9,      'yearsOfExperience → 9',     String(body.profile?.yearsOfExperience));
    assert(Number(body.profile?.weekdayHours) === 15,          'weekdayHours → 15',         String(body.profile?.weekdayHours));
    assert((body.profile?.coreSkills || []).includes('OKRs'),  'new skill OKRs persisted');
  } catch (e) {
    fail('Update verification completed', e.message);
  }

  // ── [5] Cleanup ──────────────────────────────────────────────────────────
  console.log('');
  console.log(`${c.bold}[5] Cleanup — delete test record from Airtable${c.reset}`);

  // If airtableId wasn't captured above, look it up now
  if (!airtableId) {
    try {
      const { body } = await getJson(`${BASE_URL}/api/profile/${editToken}`);
      airtableId = body.profile?.id;
    } catch (_) {}
  }

  if (airtableId && AIRTABLE_KEY && AIRTABLE_BASE) {
    try {
      const deleted = await deleteAirtableRecord(airtableId);
      assert(deleted, `Deleted Airtable record ${airtableId}`);
    } catch (e) {
      fail('Delete Airtable record', e.message);
    }
  } else {
    fail('Delete Airtable record', `Missing airtableId=${airtableId} or credentials`);
  }

  // Confirm deletion — should now 404
  console.log(`  ${c.dim}Confirming deletion…${c.reset}`);
  try {
    const { status } = await getJson(`${BASE_URL}/api/profile/${editToken}`);
    assert(status === 404, 'Profile returns 404 after deletion', `got ${status}`);
  } catch (e) {
    fail('Deletion confirmation completed', e.message);
  }

  summary();
}

function summary() {
  const total = passed + failed;
  console.log('');
  console.log(`${c.bold}──────────────────────────────────────────────${c.reset}`);
  if (failed === 0) {
    console.log(`${c.bold}${c.green}  ✔ All ${total} tests passed!${c.reset}`);
  } else {
    console.log(`${c.bold}  ${c.green}✔ ${passed} passed${c.reset}  ${c.bold}${c.red}✘ ${failed} failed${c.reset}  (${total} total)`);
    if (errors.length) {
      console.log('');
      console.log(`${c.red}Failed:${c.reset}`);
      errors.forEach(e => console.log(`  ${c.red}•${c.reset} ${e}`));
    }
  }
  console.log('');
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => {
  console.error(`\n${c.red}Unexpected error:${c.reset}`, err);
  process.exit(1);
});
