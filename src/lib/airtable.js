/**
 * Airtable integration — all database operations for Talent Connect.
 * Uses Airtable's REST API directly (not the airtable npm package)
 * so we can use the newer attachment-upload endpoint.
 */

const BASE_URL    = 'https://api.airtable.com/v0';
const CONTENT_URL = 'https://content.airtable.com/v0';
const API_KEY    = process.env.AIRTABLE_API_KEY;
const BASE_ID    = process.env.AIRTABLE_BASE_ID;
const TABLE_NAME = process.env.AIRTABLE_TABLE_NAME || 'Talent Profiles';

const HEADERS = {
  Authorization: `Bearer ${API_KEY}`,
  'Content-Type': 'application/json',
};

function tableUrl() {
  return `${BASE_URL}/${BASE_ID}/${encodeURIComponent(TABLE_NAME)}`;
}

/**
 * Find a profile by email address.
 * Returns null if not found.
 */
export async function findByEmail(email) {
  const formula = encodeURIComponent(`{Email} = "${email}"`);
  const res = await fetch(`${tableUrl()}?filterByFormula=${formula}&maxRecords=1`, {
    headers: HEADERS,
  });
  if (!res.ok) throw new Error(`Airtable findByEmail failed [${res.status}]: ${await res.text()}`);
  const data = await res.json();
  const found = data.records?.[0] || null;
  console.log(`[airtable] findByEmail email="${email}" → ${found ? `found recordId=${found.id}` : 'not found'}`);
  return found;
}

/**
 * Find a profile by edit token.
 * Returns null if not found.
 */
export async function findByToken(token) {
  const formula = encodeURIComponent(`{Edit Token} = "${token}"`);
  const res = await fetch(`${tableUrl()}?filterByFormula=${formula}&maxRecords=1`, {
    headers: HEADERS,
  });
  if (!res.ok) throw new Error(`Airtable findByToken failed [${res.status}]: ${await res.text()}`);
  const data = await res.json();
  const found = data.records?.[0] || null;
  console.log(`[airtable] findByToken → ${found ? `found recordId=${found.id}` : 'not found'}`);
  return found;
}

/**
 * Create a new profile record (without attachment — file uploaded separately).
 */
export async function createProfile(fields) {
  console.log(`[airtable] createProfile — name="${fields.name}" email="${fields.email}"`);
  const res = await fetch(tableUrl(), {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({ fields: mapToAirtable(fields) }),
  });
  if (!res.ok) throw new Error(`Airtable createProfile failed [${res.status}]: ${await res.text()}`);
  const record = await res.json();
  console.log(`[airtable] createProfile ✓ recordId=${record.id}`);
  return record;
}

/**
 * Update an existing profile record.
 */
export async function updateProfile(recordId, fields) {
  console.log(`[airtable] updateProfile — recordId=${recordId} name="${fields.name}"`);
  const res = await fetch(`${tableUrl()}/${recordId}`, {
    method: 'PATCH',
    headers: HEADERS,
    body: JSON.stringify({ fields: mapToAirtable(fields) }),
  });
  if (!res.ok) throw new Error(`Airtable updateProfile failed [${res.status}]: ${await res.text()}`);
  const record = await res.json();
  console.log(`[airtable] updateProfile ✓ recordId=${record.id}`);
  return record;
}

/**
 * Upload a resume file to a record's attachment field.
 * Uses Airtable's content upload API (content.airtable.com).
 *
 * The endpoint expects a JSON body with base64-encoded file content —
 * NOT multipart/form-data. Body: { contentType, filename, file: "<base64>" }
 */
export async function uploadResume(recordId, fileBuffer, fileName, mimeType) {
  try {
    // Step 1: Resolve the "Resume" field ID from the table schema
    const schemaRes = await fetch(`${BASE_URL}/meta/bases/${BASE_ID}/tables`, {
      headers: HEADERS,
    });
    if (!schemaRes.ok) {
      console.warn('[airtable] Could not fetch schema, skipping file upload');
      return;
    }
    const schema = await schemaRes.json();
    const table  = schema.tables?.find((t) => t.name === TABLE_NAME);
    const field  = table?.fields?.find((f) => f.name === 'Resume');

    if (!field?.id) {
      console.warn('[airtable] Resume field not found in schema, skipping file upload');
      return;
    }

    console.log(`[airtable] Uploading resume to field ${field.id}…`);

    // Step 2: POST JSON with base64-encoded file — this is what the API actually expects
    const uploadRes = await fetch(
      `${CONTENT_URL}/${BASE_ID}/${recordId}/${field.id}/uploadAttachment`,
      {
        method: 'POST',
        headers: {
          Authorization:  `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contentType: mimeType,
          filename:    fileName,
          file:        fileBuffer.toString('base64'),
        }),
      }
    );

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      console.warn(`[airtable] File upload warning (non-fatal): ${errText}`);
    } else {
      console.log(`[airtable] Resume "${fileName}" uploaded successfully`);
    }
  } catch (err) {
    // File upload failure is non-fatal — the profile record is already saved
    console.warn(`[airtable] File upload warning (non-fatal): ${err.message}`);
  }
}

/**
 * Map app field names → Airtable field names.
 */
function mapToAirtable(fields) {
  const mapped = {};

  if (fields.name             != null) mapped['Name']                    = fields.name;
  if (fields.email            != null) mapped['Email']                   = fields.email;
  if (fields.phone            != null) mapped['Phone']                   = fields.phone;
  if (fields.linkedin         != null) mapped['LinkedIn']                = fields.linkedin;
  if (fields.currentRole      != null) mapped['Current Role']            = fields.currentRole;
  if (fields.yearsOfExperience != null) mapped['Years of Experience']    = Number(fields.yearsOfExperience) || 0;
  if (fields.location         != null) mapped['Location']                = fields.location;
  if (fields.coreSkills       != null) mapped['Core Skills']             = Array.isArray(fields.coreSkills) ? fields.coreSkills.join(', ') : fields.coreSkills;
  if (fields.secondarySkills  != null) mapped['Secondary Skills']        = Array.isArray(fields.secondarySkills) ? fields.secondarySkills.join(', ') : fields.secondarySkills;
  if (fields.domains          != null) mapped['Domains']                 = Array.isArray(fields.domains) ? fields.domains.join(', ') : fields.domains;
  if (fields.languages        != null) mapped['Languages']               = Array.isArray(fields.languages) ? fields.languages.join('\n') : fields.languages;
  if (fields.weekdayHours     != null) mapped['Weekday Hours']           = Number(fields.weekdayHours) || 0;
  if (fields.weekendHours     != null) mapped['Weekend Hours']           = Number(fields.weekendHours) || 0;
  if (fields.bio              != null) mapped['Bio']                     = fields.bio;
  if (fields.editToken        != null) mapped['Edit Token']              = fields.editToken;
  if (fields.status           != null) mapped['Status']                  = fields.status;
  if (fields.submittedAt      != null) mapped['Submitted At']            = fields.submittedAt;

  return mapped;
}

/**
 * Map Airtable record → app field names (for the edit flow).
 */
export function mapFromAirtable(record) {
  const f = record.fields;
  return {
    id:                   record.id,
    name:                 f['Name']                  || '',
    email:                f['Email']                 || '',
    phone:                f['Phone']                 || '',
    linkedin:             f['LinkedIn']              || '',
    currentRole:          f['Current Role']          || '',
    yearsOfExperience:    f['Years of Experience']   ?? '',
    location:             f['Location']              || '',
    coreSkills:           f['Core Skills']           ? f['Core Skills'].split(',').map((s) => s.trim()).filter(Boolean) : [],
    secondarySkills:      f['Secondary Skills']      ? f['Secondary Skills'].split(',').map((s) => s.trim()).filter(Boolean) : [],
    domains:              f['Domains']               ? f['Domains'].split(',').map((s) => s.trim()).filter(Boolean) : [],
    languages:            f['Languages']             ? f['Languages'].split('\n').map((s) => s.trim()).filter(Boolean) : [],
    weekdayHours:         f['Weekday Hours']         ?? '',
    weekendHours:         f['Weekend Hours']         ?? '',
    bio:                  f['Bio']                   || '',
    editToken:            f['Edit Token']            || '',
    status:               f['Status']?.name          || 'New',
  };
}
