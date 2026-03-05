'use client';

import { useState, useEffect } from 'react';
import UploadStep      from './UploadStep';
import ProcessingStep  from './ProcessingStep';
import ReviewStep      from './ReviewStep';
import ThankYouStep    from './ThankYouStep';

const STEPS = { UPLOAD: 'upload', PROCESSING: 'processing', REVIEW: 'review', SUCCESS: 'success' };

const EMPTY_PROFILE = {
  name: '', email: '', phone: '', linkedin: '',
  currentRole: '', yearsOfExperience: '', location: '',
  coreSkills: [], secondarySkills: [],
  domains: [], languages: [],
  weekdayHours: '', weekendHours: '', bio: '',
};

export default function MultiStepForm({ editToken }) {
  const isEditMode = Boolean(editToken);

  const [step,        setStep]        = useState(isEditMode ? STEPS.REVIEW : STEPS.UPLOAD);
  const [profile,     setProfile]     = useState(EMPTY_PROFILE);
  const [resumeFile,  setResumeFile]  = useState(null);
  const [aiModel,     setAiModel]     = useState(null); // 'haiku' | 'sonnet'
  const [editToken_,  setEditToken_]  = useState(editToken || null);
  const [loadingEdit, setLoadingEdit] = useState(isEditMode);
  const [loadError,   setLoadError]   = useState(null);

  // ── Load existing profile when in edit mode ────────────────────────────────
  useEffect(() => {
    if (!isEditMode) return;

    async function loadProfile() {
      try {
        const res  = await fetch(`/api/profile/${editToken}`);
        const data = await res.json();

        if (!res.ok) throw new Error(data.error || 'Profile not found.');
        setProfile(data.profile);
      } catch (err) {
        setLoadError(err.message);
      } finally {
        setLoadingEdit(false);
      }
    }

    loadProfile();
  }, [editToken, isEditMode]);

  // ── Handle file upload → extraction ───────────────────────────────────────
  async function handleFileSelected(file) {
    setResumeFile(file);
    setStep(STEPS.PROCESSING);

    try {
      const form = new FormData();
      form.append('resume', file);

      const res  = await fetch('/api/extract', { method: 'POST', body: form });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Extraction failed.');

      setProfile(data.extracted);
      setAiModel(data.model);
      setStep(STEPS.REVIEW);
    } catch (err) {
      // Return to upload step with error
      setStep(STEPS.UPLOAD);
      alert(err.message || 'Could not process your resume. Please try again.');
    }
  }

  // ── Handle final form submission ───────────────────────────────────────────
  async function handleSubmit(updatedProfile) {
    const form = new FormData();

    // Attach all text fields
    Object.entries(updatedProfile).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        form.append(key, JSON.stringify(value));
      } else {
        form.append(key, value ?? '');
      }
    });

    // Attach file if available
    if (resumeFile) {
      form.append('resume', resumeFile);
    }

    if (isEditMode) {
      // UPDATE existing profile
      const res  = await fetch(`/api/update/${editToken_}`, { method: 'PUT', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Update failed.');
    } else {
      // CREATE new profile
      const res  = await fetch('/api/submit', { method: 'POST', body: form });
      const data = await res.json();

      if (res.status === 409 && data.duplicate) {
        // Profile already exists — redirect to edit
        const msg = `A profile with this email already exists.\n\nWould you like to go to your existing profile to update it?`;
        if (window.confirm(msg)) {
          window.location.href = `/edit/${data.editToken}`;
        }
        return;
      }

      if (!res.ok) throw new Error(data.error || 'Submission failed.');
      setEditToken_(data.editToken);
    }

    setStep(STEPS.SUCCESS);
  }

  // ── Loading state for edit mode ────────────────────────────────────────────
  if (loadingEdit) {
    return (
      <div className="card text-center py-16">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-500">Loading your profile…</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="card text-center py-16">
        <div className="text-5xl mb-4">🔗</div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Link not found</h2>
        <p className="text-gray-500 mb-6">{loadError}</p>
        <a href="/" className="btn-primary">Start a new profile</a>
      </div>
    );
  }

  // ── Step renderer ──────────────────────────────────────────────────────────
  return (
    <div className="animate-fade-in">
      {step === STEPS.UPLOAD && (
        <UploadStep onFileSelected={handleFileSelected} />
      )}
      {step === STEPS.PROCESSING && (
        <ProcessingStep />
      )}
      {step === STEPS.REVIEW && (
        <ReviewStep
          profile={profile}
          aiModel={aiModel}
          isEditMode={isEditMode}
          onSubmit={handleSubmit}
          onReupload={() => setStep(STEPS.UPLOAD)}
        />
      )}
      {step === STEPS.SUCCESS && (
        <ThankYouStep
          name={profile.name}
          isEditMode={isEditMode}
        />
      )}
    </div>
  );
}
