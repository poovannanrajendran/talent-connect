'use client';

export default function ThankYouStep({ name, isEditMode }) {
  const firstName = name?.split(' ')[0] || 'there';

  if (isEditMode) {
    return (
      <div className="card text-center py-16 animate-slide-up">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Profile updated!</h2>
        <p className="text-gray-500 max-w-sm mx-auto">
          Your changes have been saved. A confirmation has been sent to your email.
        </p>
      </div>
    );
  }

  return (
    <div className="animate-slide-up space-y-5">
      {/* Main success card */}
      <div className="card text-center py-12 bg-gradient-to-br from-blue-50 to-violet-50 border-blue-100">
        {/* Success icon */}
        <div className="relative w-20 h-20 mx-auto mb-6">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-violet-600 rounded-full flex items-center justify-center shadow-lg shadow-blue-200">
            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          {/* Confetti dots */}
          {['top-0 -right-1', '-top-1 left-2', 'top-1 -left-3', '-bottom-1 right-3'].map((pos, i) => (
            <div key={i} className={`absolute ${pos} w-3 h-3 rounded-full ${['bg-yellow-400','bg-pink-400','bg-green-400','bg-orange-400'][i]}`} />
          ))}
        </div>

        <h2 className="text-3xl font-extrabold text-gray-900 mb-2">
          Welcome to the network, {firstName}! 🎉
        </h2>
        <p className="text-gray-500 max-w-sm mx-auto text-base leading-relaxed">
          Your profile has been saved. Our consulting partners will reach out when a project matches your skills.
        </p>
      </div>

      {/* What happens next */}
      <div className="card">
        <p className="section-title">What happens next</p>
        <div className="space-y-4">
          {[
            {
              icon: '📬',
              title: 'Check your inbox',
              desc: 'We\'ve sent a confirmation email with your personal edit link — save it!',
            },
            {
              icon: '🔍',
              title: 'Profile review',
              desc: 'Our team reviews your profile and matches it against active client opportunities.',
            },
            {
              icon: '🤝',
              title: 'Project match',
              desc: 'When a match is found across UK, Europe, USA, or Middle East, we\'ll reach out directly.',
            },
            {
              icon: '✏️',
              title: 'Keep your profile fresh',
              desc: 'Learned something new? Updated your availability? Use the link in your email to edit anytime.',
            },
          ].map((item) => (
            <div key={item.title} className="flex items-start gap-4">
              <div className="text-2xl">{item.icon}</div>
              <div>
                <p className="font-semibold text-gray-800">{item.title}</p>
                <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AI showcase badge */}
      <div className="card bg-gradient-to-r from-slate-900 to-slate-800 border-slate-700 text-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-violet-500 rounded-xl flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-sm">Powered by Claude AI</p>
            <p className="text-slate-400 text-xs">Your profile was intelligently extracted from your resume using Anthropic's Claude Haiku 4.5 model.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
