/**
 * One-time setup script — run ONCE from your local terminal:
 *
 *   AIRTABLE_API_KEY=pat... AIRTABLE_BASE_ID=appXXX node scripts/setup-airtable.js
 *
 * Prerequisites:
 *   1. Create a base called "Talent Connect" in the Airtable UI.
 *   2. Copy its ID from the URL (e.g. airtable.com/appXXXXXXXXXXXXXX/...)
 *   3. Pass it as AIRTABLE_BASE_ID above.
 *
 * This script creates the "Talent Profiles" table with all required fields.
 * After it runs, add AIRTABLE_BASE_ID to your .env.local file.
 *
 * Token scopes needed: schema.bases:write, data.records:write, data.records:read
 */

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

if (!AIRTABLE_API_KEY) {
  console.error('❌  AIRTABLE_API_KEY is not set.');
  console.error('    Run:  AIRTABLE_API_KEY=pat... AIRTABLE_BASE_ID=appXXX node scripts/setup-airtable.js');
  process.exit(1);
}

if (!AIRTABLE_BASE_ID || !AIRTABLE_BASE_ID.startsWith('app')) {
  console.error('❌  AIRTABLE_BASE_ID is not set or looks wrong.');
  console.error('    It should start with "app", e.g. appXXXXXXXXXXXXXX');
  console.error('    Copy it from the Airtable URL after creating your "Talent Connect" base.');
  console.error('    Run:  AIRTABLE_API_KEY=pat... AIRTABLE_BASE_ID=appXXX node scripts/setup-airtable.js');
  process.exit(1);
}

const HEADERS = {
  Authorization: `Bearer ${AIRTABLE_API_KEY}`,
  'Content-Type': 'application/json',
};

async function createTable() {
  const body = {
    name: 'Talent Profiles',
    fields: [
      { name: 'Name',                type: 'singleLineText' },
      { name: 'Email',               type: 'email' },
      { name: 'Phone',               type: 'phoneNumber' },
      { name: 'LinkedIn',            type: 'url' },
      { name: 'Current Role',        type: 'singleLineText' },
      { name: 'Years of Experience', type: 'number',        options: { precision: 0 } },
      { name: 'Location',            type: 'singleLineText' },
      { name: 'Core Skills',         type: 'singleLineText' },
      { name: 'Secondary Skills',    type: 'multilineText' },
      { name: 'Domains',             type: 'multilineText' },
      { name: 'Languages',           type: 'multilineText' },
      { name: 'Weekday Hours',       type: 'number',        options: { precision: 1 } },
      { name: 'Weekend Hours',       type: 'number',        options: { precision: 1 } },
      { name: 'Bio',                 type: 'multilineText' },
      { name: 'Resume',              type: 'multipleAttachments' },
      { name: 'Edit Token',          type: 'singleLineText' },
      {
        name: 'Status',
        type: 'singleSelect',
        options: {
          choices: [
            { name: 'New',       color: 'blueLight2' },
            { name: 'Reviewed',  color: 'yellowLight2' },
            { name: 'Contacted', color: 'orangeLight2' },
            { name: 'Placed',    color: 'greenLight2' },
          ],
        },
      },
      {
        name: 'Submitted At',
        type: 'dateTime',
        options: {
          timeZone: 'utc',
          dateFormat: { name: 'iso' },
          timeFormat: { name: '24hour' },
        },
      },
    ],
  };

  const res = await fetch(
    `https://api.airtable.com/v0/meta/bases/${AIRTABLE_BASE_ID}/tables`,
    { method: 'POST', headers: HEADERS, body: JSON.stringify(body) }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to create table: ${err}`);
  }

  return await res.json();
}

async function main() {
  console.log('🚀  Setting up Talent Profiles table in Airtable...\n');
  console.log(`   Base ID : ${AIRTABLE_BASE_ID}\n`);

  try {
    const table = await createTable();

    console.log('✅  Success! "Talent Profiles" table created.\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   Table Name : ${table.name}`);
    console.log(`   Table ID   : ${table.id}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n📋  Add these to your .env.local file:\n');
    console.log(`   AIRTABLE_BASE_ID=${AIRTABLE_BASE_ID}`);
    console.log(`   AIRTABLE_TABLE_NAME=Talent Profiles`);
    console.log('\n🎉  You are ready to run:  npm run dev\n');
  } catch (err) {
    console.error('\n❌  Error:', err.message);
    console.error('\n   Make sure your Airtable token has these scopes:');
    console.error('     • schema.bases:write');
    console.error('     • data.records:write');
    console.error('     • data.records:read');
    console.error('\n   Update or create a token at: https://airtable.com/create/tokens\n');
    process.exit(1);
  }
}

main();
