export default function CookiePolicy() {
  return (
    <div className="min-h-screen bg-white py-24 px-6 font-sans text-slate-900">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-5xl font-black italic uppercase tracking-tighter mb-16 text-left">
          Cookie Policy
        </h1>
        
        <div className="space-y-16 text-left">
          <section>
            <h2 className="text-blue-600 text-xs font-black uppercase tracking-[0.2em] mb-4">
              01. Necessary Cookies
            </h2>
            <p className="text-slate-700 font-medium leading-relaxed text-lg">
              We use essential cookies to maintain secure sessions and keep you logged into your dashboard. These are mandatory for the application to function.
            </p>
          </section>

          <section>
            <h2 className="text-blue-600 text-xs font-black uppercase tracking-[0.2em] mb-4">
              02. User Preferences
            </h2>
            <p className="text-slate-600 font-medium leading-relaxed">
              Cookies are used to remember your interface preferences, such as your chosen notification sounds and volume settings, to ensure a consistent experience.
            </p>
          </section>

          <section>
            <h2 className="text-blue-600 text-xs font-black uppercase tracking-[0.2em] mb-4">
              03. Data Security
            </h2>
            <p className="text-slate-600 font-medium leading-relaxed text-sm">
              We do not use tracking or advertising cookies. Our cookies are utilized purely for security, system functionality, and essential service delivery.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}