"use client";
import React, { useState } from 'react';
import { Scissors, Camera, Phone, MapPin, CreditCard, CheckCircle } from 'lucide-react';

export default function JoinPlatform() {
  const [step, setStep] = useState(1);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center py-20 px-4">
      <div className="max-w-xl w-full bg-white rounded-[2.5rem] shadow-2xl p-10 border border-slate-100">
        
        {/* Progress Bar */}
        <div className="flex gap-2 mb-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className={`h-2 flex-1 rounded-full ${step >= i ? 'bg-blue-600' : 'bg-slate-100'}`} />
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-6">
            <h2 className="text-3xl font-black text-slate-900">List your shop.</h2>
            <p className="text-slate-500 font-medium">Be the first barber people see when they need a trim in your area.</p>
            <div className="space-y-4 pt-4">
              <input type="text" placeholder="Shop Name" className="w-full p-4 rounded-2xl border bg-slate-50 outline-none focus:ring-2 ring-blue-500" />
              <div className="flex gap-2">
                <div className="bg-slate-100 p-4 rounded-2xl text-slate-500 font-bold">+44</div>
                <input type="text" placeholder="WhatsApp Number" className="flex-1 p-4 rounded-2xl border bg-slate-50 outline-none focus:ring-2 ring-blue-500" />
              </div>
              <button onClick={() => setStep(2)} className="w-full bg-black text-white font-bold py-5 rounded-2xl shadow-lg hover:scale-[1.02] transition-transform">
                Next: Shop Details
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <h2 className="text-3xl font-black text-slate-900">Shop Identity.</h2>
            <div className="space-y-4">
              <div className="aspect-video border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center text-slate-400 hover:bg-slate-50 cursor-pointer">
                <Camera className="w-10 h-10 mb-2" />
                <p className="text-sm font-bold">Upload Shop Front Photo</p>
              </div>
              <textarea placeholder="Full Shop Address & Postcode" className="w-full p-4 rounded-2xl border bg-slate-50 h-32 outline-none focus:ring-2 ring-blue-500" />
              <button onClick={() => setStep(3)} className="w-full bg-black text-white font-bold py-5 rounded-2xl shadow-lg">
                Continue to Payment
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 text-center">
            <div className="bg-blue-50 text-blue-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <CreditCard className="w-8 h-8" />
            </div>
            <h2 className="text-3xl font-black text-slate-900">Secure your spot.</h2>
            <div className="bg-slate-50 p-6 rounded-3xl text-left">
              <div className="flex justify-between items-center mb-4">
                <span className="font-bold text-slate-600">Monthly Plan</span>
                <span className="text-2xl font-black">£20.00</span>
              </div>
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-sm text-slate-600"><CheckCircle className="w-4 h-4 text-green-500" /> Live Status Toggle</li>
                <li className="flex items-center gap-2 text-sm text-slate-600"><CheckCircle className="w-4 h-4 text-green-500" /> WhatsApp Direct Messaging</li>
                <li className="flex items-center gap-2 text-sm text-slate-600"><CheckCircle className="w-4 h-4 text-green-500" /> Rank #1 in your Town</li>
              </ul>
            </div>
            <button 
              onClick={() => window.location.href = 'YOUR_STRIPE_LINK'} 
              className="w-full bg-blue-600 text-white font-bold py-5 rounded-2xl shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all"
            >
              Start Subscription
            </button>
          </div>
        )}
      </div>
    </div>
  );
}