/**
 * ReviewStep component — the final form for reviewing and editing profile data.
 *
 * This is a client-side React component that displays the extracted/initial profile
 * and allows users to:
 * - Review and edit all personal, professional, skills, domain, and language data
 * - Add/remove domains and languages with comma-separated input (press Enter or comma to add)
 * - Use drag-and-drop to organize core vs secondary skills
 * - Validate email format and phone number before submission
 * - Submit the final profile for creation or update
 *
 * Props:
 *   - profile: Initial profile data (from CV extraction or edit fetch)
 *   - aiModel: Which Claude model was used for extraction ('haiku' or 'sonnet')
 *   - isEditMode: Boolean — if true, shows "Save Changes" button; if false, shows "Submit My Profile"
 *   - onSubmit: Callback when form is submitted with validated profile data
 *   - onReupload: Callback to go back and re-upload a different resume
 */

'use client';

import { useState } from 'react';
import SkillsDndSection from './SkillsDndSection';

// Display labels and styling for different Claude models
const MODEL_LABELS = {
  haiku:  { label: 'Claude Haiku 4.5', color: 'bg-green-100 text-green-700 border-green-200' },
  sonnet: { label: 'Claude Sonnet 4.5', color: 'bg-violet-100 text-violet-700 border-violet-200' },
};

// Pre-populated domain/industry suggestions for quick selection
const DOMAIN_SUGGESTIONS = [
  'FinTech', 'Healthcare', 'E-commerce', 'SaaS', 'Cloud Infrastructure',
  'Cybersecurity', 'Data & Analytics', 'AI/ML', 'Digital Marketing',
  'Supply Chain', 'HR Tech', 'EdTech', 'Legal Tech', 'PropTech',
];

export default function ReviewStep({ profile: initialProfile, aiModel, isEditMode, onSubmit, onReupload }) {
  // Form state
  const [form,        setForm]        = useState(initialProfile);
  const [submitting,  setSubmitting]  = useState(false);
  const [error,       setError]       = useState('');
  const [domainInput, setDomainInput] = useState('');
  const [langInput,   setLangInput]   = useState('');

  const modelInfo = aiModel ? MODEL_LABELS[aiModel] : null;

  // Generic field update handler
  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  // Toggle a domain on/off from the list
  function toggleDomain(domain) {
    const current = form.domains || [];
    if (current.includes(domain)) {
      update('domains', current.filter((d) => d !== domain));
    } else {
      update('domains', [...current, domain]);
    }
  }

  // Add one or more domains from the custom input field
  function addCustomDomains(raw) {
    const incoming = raw.split(',').map((s) => s.trim()).filter(Boolean);
    if (!incoming.length) return;
    const existing = form.domains || [];
    const merged = [...existing];
    for (const d of incoming) {
      if (!merged.includes(d)) merged.push(d);
    }
    update('domains', merged);
    setDomainInput('');
  }

  function handleDomainInputKeyDown(e) {
    if (e.key === 'Enter') { e.preventDefault(); addCustomDomains(domainInput); }
    if (e.key === ',')     { e.preventDefault(); addCustomDomains(domainInput); }
  }

  function handleDomainInputChange(e) {
    const val = e.target.value;
    // Auto-add when user types a comma
    if (val.endsWith(',')) {
      addCustomDomains(val.slice(0, -1));
    } else {
      setDomainInput(val);
    }
  }

  // Add one or more languages from the custom input field
  function addLanguages(raw) {
    const incoming = raw.split(',').map((s) => s.trim()).filter(Boolean);
    if (!incoming.length) return;
    const existing = form.languages || [];
    const merged = [...existing];
    for (const l of incoming) {
      if (!merged.includes(l)) merged.push(l);
    }
    update('languages', merged);
    setLangInput('');
  }

  function handleLangInputKeyDown(e) {
    if (e.key === 'Enter') { e.preventDefault(); addLanguages(langInput); }
    if (e.key === ',')     { e.preventDefault(); addLanguages(langInput); }
  }

  function handleLangInputChange(e) {
    const val = e.target.value;
    if (val.endsWith(',')) {
      addLanguages(val.slice(0, -1));
    } else {
      setLangInput(val);
    }
  }

  function handleSkillsChange({ coreSkills, secondarySkills }) {
    update('coreSkills',     coreSkills);
    update('secondarySkills', secondarySkills);
  }

  // Validation patterns
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // Basic email format check
  const PHONE_RE = /^\+?[\d\s\-(). ]{7,25}$/;  // Phone: optional +, digits, spaces, dashes, parens (7-25 chars)

  /**
   * Form submission with validation.
   * Checks all required fields and formats before calling onSubmit.
   * Shows validation errors in the error banner.
   */
  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    // Validate required fields and formats
    if (!form.name?.trim())  { setError('Name is required.'); return; }

    if (!form.email?.trim()) { setError('Email is required.'); return; }
    if (!EMAIL_RE.test(form.email.trim())) { setError('Please enter a valid email address (e.g. jane@example.com).'); return; }

    if (!form.phone?.trim()) { setError('Phone number is required.'); return; }
    if (!PHONE_RE.test(form.phone.trim())) { setError('Please enter a valid phone number (e.g. +44 7700 000 000).'); return; }

    // At least one skill is required
    if (form.coreSkills?.length === 0 && form.secondarySkills?.length === 0) {
      setError('Please add at least one skill.'); return;
    }

    setSubmitting(true);
    try {
      await onSubmit(form);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 animate-slide-up">

      {/* AI badge + reupload */}
      {!isEditMode && (
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            {modelInfo && (
              <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full border ${modelInfo.color}`}>
                ✦ Extracted by {modelInfo.label}
              </span>
            )}
            <span className="text-sm text-gray-400">Review and adjust below</span>
          </div>
          <button type="button" onClick={onReupload} className="text-sm text-blue-600 hover:underline">
            ↩ Re-upload resume
          </button>
        </div>
      )}

      {/* ── Personal Info ── */}
      <div className="card">
        <p className="section-title">Personal Information</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
            <input className="input-field" value={form.name || ''} onChange={(e) => update('name', e.target.value)} placeholder="Jane Smith" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <input className="input-field" type="email" value={form.email || ''} onChange={(e) => update('email', e.target.value)} placeholder="jane@example.com" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
            <input className="input-field" value={form.phone || ''} onChange={(e) => update('phone', e.target.value)} placeholder="+44 7700 000 000" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">LinkedIn URL</label>
            <input className="input-field" value={form.linkedin || ''} onChange={(e) => update('linkedin', e.target.value)} placeholder="https://linkedin.com/in/..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location / Timezone</label>
            <input className="input-field" value={form.location || ''} onChange={(e) => update('location', e.target.value)} placeholder="London, UK · GMT+0" />
          </div>
        </div>
      </div>

      {/* ── Professional ── */}
      <div className="card">
        <p className="section-title">Professional Background</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="sm:col-span-2 lg:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Current / Most Recent Role</label>
            <input className="input-field" value={form.currentRole || ''} onChange={(e) => update('currentRole', e.target.value)} placeholder="Senior Product Manager" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Years of Experience</label>
            <input className="input-field" type="number" min="0" max="50" value={form.yearsOfExperience || ''} onChange={(e) => update('yearsOfExperience', e.target.value)} placeholder="8" />
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Professional Bio</label>
          <textarea
            className="input-field"
            rows={6}
            value={form.bio || ''}
            onChange={(e) => update('bio', e.target.value)}
            placeholder="A brief overview of your professional background and what you bring to the table…"
          />
        </div>
      </div>

      {/* ── Skills ── */}
      <div className="card">
        <p className="section-title mb-4">Skills</p>
        <SkillsDndSection
          coreSkills={form.coreSkills || []}
          secondarySkills={form.secondarySkills || []}
          onChange={handleSkillsChange}
        />
      </div>

      {/* ── Domains ── */}
      <div className="card">
        <p className="section-title">Industry / Domain</p>
        <p className="text-sm text-gray-400 mb-3">Select presets or add your own</p>

        {/* Preset chips */}
        <div className="flex flex-wrap gap-2 mb-3">
          {DOMAIN_SUGGESTIONS.map((domain) => {
            const active = (form.domains || []).includes(domain);
            return (
              <button
                key={domain}
                type="button"
                onClick={() => toggleDomain(domain)}
                className={`text-sm px-3 py-1.5 rounded-full border transition-all ${
                  active
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-600'
                }`}
              >
                {domain}
              </button>
            );
          })}
        </div>

        {/* Selected custom domains as removable chips */}
        {(form.domains || []).filter((d) => !DOMAIN_SUGGESTIONS.includes(d)).length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {(form.domains || []).filter((d) => !DOMAIN_SUGGESTIONS.includes(d)).map((d) => (
              <span key={d} className="inline-flex items-center gap-1 text-sm bg-blue-50 border border-blue-200 text-blue-700 px-3 py-1 rounded-full">
                {d}
                <button type="button" onClick={() => update('domains', (form.domains || []).filter((x) => x !== d))} className="ml-0.5 text-blue-400 hover:text-blue-700 font-bold leading-none">×</button>
              </span>
            ))}
          </div>
        )}

        {/* Custom domain input + Add button */}
        <div className="flex gap-2">
          <input
            className="input-field text-sm flex-1"
            placeholder="Add domain… (press Enter or comma to add)"
            value={domainInput}
            onChange={handleDomainInputChange}
            onKeyDown={handleDomainInputKeyDown}
          />
          <button
            type="button"
            onClick={() => addCustomDomains(domainInput)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors whitespace-nowrap"
          >
            + Add
          </button>
        </div>
      </div>

      {/* ── Languages ── */}
      <div className="card">
        <p className="section-title">Languages</p>
        <p className="text-sm text-gray-400 mb-3">Add languages you speak — press Enter or comma to add each one</p>

        {/* Language chips */}
        {(form.languages || []).length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {(form.languages || []).map((lang) => (
              <span key={lang} className="inline-flex items-center gap-1 text-sm bg-violet-50 border border-violet-200 text-violet-700 px-3 py-1 rounded-full">
                {lang}
                <button type="button" onClick={() => update('languages', (form.languages || []).filter((l) => l !== lang))} className="ml-0.5 text-violet-400 hover:text-violet-700 font-bold leading-none">×</button>
              </span>
            ))}
          </div>
        )}

        {/* Language input + Add button */}
        <div className="flex gap-2">
          <input
            className="input-field text-sm flex-1"
            placeholder='e.g. "English - Native" (press Enter or comma to add)'
            value={langInput}
            onChange={handleLangInputChange}
            onKeyDown={handleLangInputKeyDown}
          />
          <button
            type="button"
            onClick={() => addLanguages(langInput)}
            className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-xl transition-colors whitespace-nowrap"
          >
            + Add
          </button>
        </div>
      </div>

      {/* ── Availability ── */}
      <div className="card">
        <p className="section-title">Availability</p>
        <p className="text-sm text-gray-400 mb-4">All roles are fully remote. How many hours per week can you dedicate?</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Weekday hours/week</label>
            <input
              className="input-field"
              type="number"
              min="0"
              max="60"
              step="1"
              value={form.weekdayHours || ''}
              onChange={(e) => update('weekdayHours', e.target.value)}
              placeholder="10"
            />
            <p className="text-xs text-gray-400 mt-1">Mon – Fri total</p>
          </div>
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Weekend hours/week</label>
            <input
              className="input-field"
              type="number"
              min="0"
              max="24"
              step="1"
              value={form.weekendHours || ''}
              onChange={(e) => update('weekendHours', e.target.value)}
              placeholder="5"
            />
            <p className="text-xs text-gray-400 mt-1">Sat – Sun total</p>
          </div>
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
          </svg>
          {error}
        </div>
      )}

      {/* ── Submit ── */}
      <button type="submit" disabled={submitting} className="btn-primary w-full text-base py-4">
        {submitting
          ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving…</>
          : isEditMode
          ? '✓ Save Changes'
          : '🚀 Submit My Profile'}
      </button>

      <p className="text-center text-xs text-gray-400 pb-2">
        By submitting, you agree your profile may be shared with our consulting partners for part-time project matching.
      </p>
    </form>
  );
}
