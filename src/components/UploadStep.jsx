'use client';

import { useState, useRef } from 'react';

const ACCEPTED = '.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export default function UploadStep({ onFileSelected }) {
  const [dragging, setDragging]   = useState(false);
  const [error,    setError]      = useState('');
  const inputRef                  = useRef(null);

  function validate(file) {
    const name = file.name.toLowerCase();
    const ok   = name.endsWith('.pdf') || name.endsWith('.doc') || name.endsWith('.docx');
    if (!ok) {
      setError('Please upload a PDF or Word document (.docx).');
      return false;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('File is too large. Please upload a file under 10 MB.');
      return false;
    }
    setError('');
    return true;
  }

  function handleFile(file) {
    if (file && validate(file)) onFileSelected(file);
  }

  function onDrop(e) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  return (
    <div className="animate-slide-up">
      <div className="card mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Upload your resume</h2>
        <p className="text-gray-500 mb-6">Our AI will extract your details in seconds — no manual typing needed.</p>

        {/* Drop zone */}
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-200
            ${dragging
              ? 'border-blue-500 bg-blue-50 scale-[1.01]'
              : 'border-gray-200 bg-gray-50 hover:border-blue-400 hover:bg-blue-50/50'
            }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED}
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />

          {/* Icon */}
          <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          </div>

          <p className="text-lg font-semibold text-gray-700 mb-1">
            {dragging ? 'Drop it here!' : 'Click to browse or drag and drop'}
          </p>
          <p className="text-sm text-gray-400">PDF or Word document · Max 10 MB</p>
        </div>

        {error && (
          <div className="mt-3 flex items-center gap-2 text-red-600 text-sm">
            <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
            </svg>
            {error}
          </div>
        )}
      </div>

      {/* How it works */}
      <div className="card bg-gradient-to-br from-slate-50 to-blue-50/30 border-blue-100">
        <p className="section-title">How it works</p>
        <div className="space-y-3">
          {[
            { step: '1', title: 'Upload your resume', desc: 'PDF or Word, any format.' },
            { step: '2', title: 'AI reads it instantly', desc: 'Claude AI extracts your name, skills, experience, and more.' },
            { step: '3', title: 'Review and tweak', desc: 'Drag skills between Core and Secondary, fill in availability.' },
            { step: '4', title: 'You\'re in the network!', desc: 'We\'ll reach out when a project matches your profile.' },
          ].map((item) => (
            <div key={item.step} className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                {item.step}
              </div>
              <div>
                <p className="font-medium text-gray-800 text-sm">{item.title}</p>
                <p className="text-gray-400 text-sm">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
