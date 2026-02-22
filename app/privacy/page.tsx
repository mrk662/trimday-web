export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-white py-24 px-6 font-sans text-slate-900">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-5xl font-black italic uppercase tracking-tighter mb-16 text-left">
          Privacy Policy
        </h1>
        
        <div className="space-y-16 text-left">
          <section>
            <h2 className="text-blue-600 text-xs font-black uppercase tracking-[0.2em] mb-4">
              01. Data Controller
            </h2>
            <p className="text-slate-700 font-medium leading-relaxed text-lg">
              TrimDay is the data controller for the information you provide. We are committed to protecting your privacy in line with UK GDPR and the Data Protection Act 2018.
            </p>
          </section>

          <section>
            <h2 className="text-blue-600 text-xs font-black uppercase tracking-[0.2em] mb-4">
              02. Security & Encryption
            </h2>
            <p className="text-slate-600 font-medium leading-relaxed">
              Your data is encrypted both in transit and at rest. We utilize advanced Row Level Security (RLS) to ensure that barbers can only ever access their own shop records, and clients only see their own specific appointments.
            </p>
          </section>

          <section>
            <h2 className="text-blue-600 text-xs font-black uppercase tracking-[0.2em] mb-4">
              03. Third-Party Data Processing
            </h2>
            <p className="text-slate-600 font-medium leading-relaxed text-sm">
              To provide our booking service, we securely share necessary information with integrated partners solely for essential functions including payment processing, transactional emails, and system notifications. All providers are vetted for GDPR compliance and are contractually restricted from using your data for other purposes.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}