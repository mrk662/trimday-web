export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-white py-24 px-6 font-sans text-slate-900">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-5xl font-black italic uppercase tracking-tighter mb-16 text-left">
          Terms of Service
        </h1>
        
        <div className="space-y-16 text-left">
          <section>
            <h2 className="text-blue-600 text-xs font-black uppercase tracking-[0.2em] mb-4 italic">
              01. Platform Usage
            </h2>
            <p className="font-black leading-tight uppercase italic text-xl">
              TrimDay is a booking platform. The Barber is solely responsible for the quality, safety, and delivery of the barbering services provided.
            </p>
          </section>

          <section>
            <h2 className="text-blue-600 text-xs font-black uppercase tracking-[0.2em] mb-4 italic">
              02. Subscription & Payments
            </h2>
            <p className="font-bold text-slate-500 leading-relaxed uppercase italic">
              Barber subscriptions are billed in advance. All payment processing is handled securely by our third-party partner. You may manage or cancel your plan through your secure billing portal.
            </p>
          </section>

          <section>
            <h2 className="text-blue-600 text-xs font-black uppercase tracking-[0.2em] mb-4 italic">
              03. Limitation of Liability
            </h2>
            <p className="font-bold text-slate-500 text-sm leading-relaxed uppercase italic">
              To the maximum extent permitted by UK law, TrimDay shall not be liable for any indirect or consequential damages resulting from the use of our platform. Usage constitutes acceptance of these terms.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}