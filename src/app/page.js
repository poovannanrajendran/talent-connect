import MultiStepForm from '@/components/MultiStepForm';

export default function Home() {
  return (
    <main className="min-h-screen">
      {/* ── Hero header ── */}
      <div className="bg-gradient-to-br from-blue-700 via-blue-600 to-violet-700 text-white">
        <div className="max-w-4xl lg:max-w-6xl mx-auto px-6 py-16 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-sm font-medium mb-6 backdrop-blur-sm">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            Powered by Claude AI
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4 leading-tight">
            Join Our Global<br />Consulting Network
          </h1>
          <p className="text-lg text-blue-100 max-w-xl mx-auto leading-relaxed">
            Upload your resume and our AI will build your profile in seconds.
            We match part-time consultants with exciting projects across the{' '}
            <strong className="text-white">UK, Europe, USA, and Middle East</strong>.
          </p>

          {/* Trust indicators */}
          <div className="flex flex-wrap items-center justify-center gap-6 mt-10 text-blue-200 text-sm">
            {[
              { icon: '🌍', text: 'Fully remote, worldwide' },
              { icon: '⚡', text: 'AI-powered in seconds' },
              { icon: '🔒', text: 'Your data stays private' },
              { icon: '✏️', text: 'Edit anytime via email link' },
            ].map((item) => (
              <div key={item.text} className="flex items-center gap-2">
                <span>{item.icon}</span>
                <span>{item.text}</span>
              </div>
            ))}
          </div>

          {/* Credit */}
          <p className="mt-6 text-blue-300/70 text-xs tracking-wide">
            Created by <span className="text-white/80 font-medium">Poovannan Rajendran</span>
          </p>
        </div>
      </div>

      {/* ── Form ── */}
      <div className="w-full max-w-2xl sm:max-w-3xl lg:max-w-5xl xl:max-w-6xl mx-auto px-6 py-12">
        <MultiStepForm />
      </div>

      {/* ── Footer ── */}
      <footer className="border-t border-gray-100 mt-8 py-8 text-center text-sm text-gray-400">
        <p>Talent Connect &middot; Powered by <span className="text-blue-500 font-medium">Claude AI</span></p>
      </footer>
    </main>
  );
}
