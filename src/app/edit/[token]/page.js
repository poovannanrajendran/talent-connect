import MultiStepForm from '@/components/MultiStepForm';

export const metadata = {
  title: 'Update Your Profile — Talent Connect',
};

export default function EditPage({ params }) {
  return (
    <main className="min-h-screen">
      {/* Header — update mode */}
      <div className="bg-gradient-to-br from-violet-700 via-violet-600 to-blue-700 text-white">
        <div className="max-w-4xl lg:max-w-6xl mx-auto px-6 py-12 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-sm font-medium mb-4 backdrop-blur-sm">
            ✏️ Editing your profile
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold mb-3">Update Your Profile</h1>
          <p className="text-violet-100 max-w-md mx-auto">
            Keep your skills and availability up to date so we can match you with the best projects.
          </p>
        </div>
      </div>

      <div className="w-full max-w-2xl sm:max-w-3xl lg:max-w-5xl xl:max-w-6xl mx-auto px-6 py-12">
        <MultiStepForm editToken={params.token} />
      </div>

      <footer className="border-t border-gray-100 mt-8 py-8 text-center text-sm text-gray-400">
        <p>Talent Connect &middot; Powered by <span className="text-blue-500 font-medium">Claude AI</span></p>
      </footer>
    </main>
  );
}
