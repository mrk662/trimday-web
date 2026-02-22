"use client";
import React, { useState, useEffect } from 'react';
import { 
  LifeBuoy, ShieldCheck, CreditCard, Scissors, 
  ChevronDown, Mail, Lock, Globe, MessageCircle,
  Users, Clock
} from 'lucide-react';
import Link from 'next/link';

export default function SupportPage() {
  const [openFaq, setOpenFaq] = useState(null);
  const [isBarber, setIsBarber] = useState(false);

  // Check if the visitor is a logged-in barber
  useEffect(() => {
    const shopId = localStorage.getItem("barberShopId");
    if (shopId) setIsBarber(true);
  }, []);

  const faqData = [
    {
      category: "Billing & Subscriptions",
      icon: <CreditCard size={20} />,
      barberOnly: true, // Mark this for barbers only
      questions: [
        { 
          id: 1,
          q: "How do I manage or end my subscription?", 
          a: "Barbers can click the 'Billing' button in their dashboard. This opens the secure Stripe Customer Portal where you can update payment methods, download invoices, or cancel your plan instantly." 
        },
        { 
          id: 2,
          q: "Is my payment information safe?", 
          a: "Yes. We never store your card details. All payments are processed by Stripe, which is a PCI Service Provider Level 1—the highest grade of security in the industry." 
        }
      ]
    },
    {
      category: "Barber Dashboard & Team",
      icon: <Users size={20} />,
      barberOnly: true, // Mark this for barbers only
      questions: [
        { 
          id: 3,
          q: "How do I add or manage team members?", 
          a: "In your dashboard, click the 'Team' button. Here you can add new barbers, update their names, or toggle their availability. Added team members will immediately appear in your shop's booking modal." 
        },
        { 
          id: 4,
          q: "How do I assign jobs to team members?", 
          a: "Appointments are assigned based on the barber selected by the client during the booking process. If 'Any Barber' is chosen, the job is visible to the whole shop for the first available professional." 
        }
      ]
    },
    {
      category: "Booking & Clients",
      icon: <Clock size={20} />,
      barberOnly: false, // Everyone can see this
      questions: [
        { 
          id: 5,
          q: "Why do I need to verify my email?", 
          a: "To prevent spam and 'ghost' bookings, new clients must verify their email once. After your first confirmed appointment, you are 'Safe Listed' and can book instantly in the future." 
        },
        { 
          id: 6,
          q: "Do clients get a final confirmation?", 
          a: "Yes. Once the barber hits 'Accept' in the dashboard, our system automatically sends the client a professional confirmation email via Resend with the date, time, and shop location." 
        }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
      <div className="bg-white border-b border-slate-200 py-16 px-6 text-center">
        <div className="max-w-3xl mx-auto">
          <div className="bg-blue-100 text-blue-600 w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <LifeBuoy size={32} />
          </div>
          <h1 className="text-5xl font-black tracking-tighter italic uppercase mb-4 text-slate-900">Support Center</h1>
          <p className="text-slate-500 font-bold text-lg italic uppercase">Everything you need to manage your TrimDay experience.</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 -mt-8 grid gap-8">
        
        {/* Help Cards */}
        <div className={`grid gap-4 ${isBarber ? 'md:grid-cols-2' : 'grid-cols-1'}`}>
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
            <Mail className="text-blue-600 mb-4" size={28} />
            <h3 className="font-black text-xl mb-2 text-left text-slate-900 uppercase italic leading-none">Email Support</h3>
            <p className="text-sm text-slate-500 font-bold mb-4 text-left uppercase">Need a human? We aim to respond within 24 hours.</p>
            <a href="mailto:support@trimday.com" className="text-blue-600 font-black hover:underline underline-offset-4 block text-left uppercase italic">support@trimday.com</a>
          </div>
          
          {/* ONLY SHOWN TO LOGGED IN BARBERS */}
          {isBarber && (
            <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-xl border-4 border-slate-800">
              <CreditCard className="text-blue-400 mb-4" size={28} />
              <h3 className="font-black text-xl mb-2 text-white text-left uppercase italic leading-none">Billing & Subs</h3>
              <p className="text-sm text-slate-400 font-bold mb-4 text-left uppercase">Manage your barber subscription or update payment methods via Stripe.</p>
              <Link href="/dashboard" className="bg-white text-slate-900 px-6 py-3 rounded-2xl font-black text-xs uppercase inline-block italic">Go to Billing</Link>
            </div>
          )}
        </div>

        {/* FAQ Section */}
        <section className="space-y-6">
          <h2 className="text-2xl font-black uppercase italic tracking-tighter mb-6 flex items-center gap-3 text-slate-900">
            <MessageCircle className="text-blue-600" /> Frequent Questions
          </h2>
          
          {faqData.map((section, sIdx) => {
            // Filter out barber sections if user is a regular client
            if (section.barberOnly && !isBarber) return null;

            return (
              <div key={sIdx} className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100">
                <div className="flex items-center gap-3 mb-6 text-blue-600">
                  {section.icon}
                  <h2 className="font-black uppercase tracking-widest text-xs italic">{section.category}</h2>
                </div>
                
                <div className="divide-y divide-slate-50">
                  {section.questions.map((faq) => (
                    <div key={faq.id} className="py-2">
                      <button 
                        onClick={() => setOpenFaq(openFaq === faq.id ? null : faq.id)}
                        className="w-full py-4 text-left flex justify-between items-center hover:bg-slate-50 rounded-xl px-2 transition-all group"
                      >
                        <span className="font-black text-slate-800 group-hover:text-blue-600 uppercase italic tracking-tight">{faq.q}</span>
                        <ChevronDown className={`transition-transform duration-300 ${openFaq === faq.id ? 'rotate-180 text-blue-600' : 'text-slate-300'}`} size={20} />
                      </button>
                      
                      <div 
                        className={`overflow-hidden transition-all duration-300 ease-in-out ${
                          openFaq === faq.id ? 'max-h-[300px] opacity-100 mb-4' : 'max-h-0 opacity-0'
                        }`}
                      >
                        <p className="px-2 pt-2 text-slate-500 font-bold text-sm leading-relaxed border-t border-slate-50 uppercase italic">
                          {faq.a}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </section>

        {/* Security Section (Visible to Everyone) */}
        <section className="bg-blue-600 text-white rounded-[3rem] p-10 shadow-2xl relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <ShieldCheck size={32} />
              <h2 className="text-2xl font-black uppercase italic tracking-tighter">Security & Privacy</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-8 text-sm font-bold">
              <div className="space-y-4 text-left uppercase italic">
                <div className="flex gap-4">
                  <Lock className="shrink-0 text-blue-200" size={20} />
                  <p>All data is encrypted via SSL/TLS. We use Supabase RLS to ensure your data stays private.</p>
                </div>
                <div className="flex gap-4">
                  <Globe className="shrink-0 text-blue-200" size={20} />
                  <p>Fully GDPR Compliant. We do not sell your data. Request data deletion at any time.</p>
                </div>
              </div>
              <div className="bg-blue-700/50 p-6 rounded-[2rem] border border-blue-400/30 text-left uppercase italic">
                <p className="text-xs italic text-blue-100 leading-relaxed">
                  "We hold booking data for a maximum of 6 years to comply with UK financial regulations, after which it is securely purged."
                </p>
              </div>
            </div>
          </div>
          <ShieldCheck size={200} className="absolute -bottom-10 -right-10 text-white/5 rotate-12" />
        </section>

        <div className="text-center">
          <Link href="/" className="text-slate-400 font-black text-xs uppercase tracking-widest hover:text-slate-900 transition-colors italic">← Back to Home</Link>
        </div>
      </div>
    </div>
  );
}