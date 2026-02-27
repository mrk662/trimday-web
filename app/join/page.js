"use client";
import React, { useState } from "react";
import { 
  Camera, CheckCircle, Loader2, Lock, 
  MapPin, X, Maximize2, Minimize2, Eye, EyeOff, Info, Globe, ShieldCheck,
  LayoutDashboard, Users, Bell, BarChart3, Scissors, Mail
} from "lucide-react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

const STRIPE_SOLO_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_SOLO; 
const STRIPE_PRO_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PRO; 

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://trimday.co.uk"; 

// --- HELPERS ---
const ukPostcodeRegex = /^([A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}|GIR ?0AA)$/i;

const slugify = (str) =>
  String(str || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const formatUKNumber = (input) => {
  let digits = String(input || "").replace(/\D/g, "");
  if (digits.startsWith("44")) {
    digits = "0" + digits.slice(2);
  }
  if (digits.length > 0 && !digits.startsWith("0")) {
    digits = "0" + digits;
  }
  return digits.slice(0, 11);
};

export default function JoinPlatform() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Form State
  const [selectedPlan, setSelectedPlan] = useState("solo"); 
  const [shopName, setShopName] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [email, setEmail] = useState(""); // 🔥 NEW: Email State
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [address, setAddress] = useState("");
  const [postcode, setPostcode] = useState("");
  const [googleUrl, setGoogleUrl] = useState("");
  const [shopPhotoUrl, setShopPhotoUrl] = useState("");
  const [photoObjectFit, setPhotoObjectFit] = useState("cover");
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // --- VALIDATION ---
  const isNameValid = shopName.trim().length >= 3;
  const isPhoneValid = whatsappNumber.length === 11 && whatsappNumber.startsWith("0");
  const isEmailValid = email.includes("@") && email.includes("."); // 🔥 NEW: Email Validation
  const isPasswordValid = password.length >= 8;
  const passwordsMatch = password === confirmPassword && password.length > 0;
  const isAddressValid = address.trim().length >= 5;
  const isPostcodeValid = ukPostcodeRegex.test(postcode.trim());

  // 🔥 UPDATED: Added isEmailValid to Step 1
  const canGoStep2 = isNameValid && isPhoneValid && isEmailValid && isPasswordValid && passwordsMatch;
  const canGoStep3 = isAddressValid && isPostcodeValid && agreedToTerms;

  const handleFileUpload = async (event) => {
    try {
      const file = event.target.files[0];
      if (!file) return;
      if (file.size > 2 * 1024 * 1024) {
        alert("Photo is too heavy! Please keep it under 2MB.");
        return;
      }
      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}-${Date.now()}.${fileExt}`;
      const filePath = `shop-previews/${fileName}`;
      const { error: uploadError } = await supabase.storage.from('shop-photos').upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('shop-photos').getPublicUrl(filePath);
      setShopPhotoUrl(data.publicUrl);
    } catch (error) {
      alert('Upload failed: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleFinalSubmit = async () => {
    setLoading(true);
    const shopId = crypto.randomUUID();

    try {
      const geoResponse = await fetch(`https://api.postcodes.io/postcodes/${postcode.trim().replace(/\s/g, "")}`);
      const geoData = await geoResponse.json();
      
      let lat = null;
      let lng = null;
      if (geoData.status === 200) {
        lat = geoData.result.latitude;
        lng = geoData.result.longitude;
      }

      // 🔥 Send email to Supabase along with shop data
      const { error } = await supabase.from("shops").insert([{
        id: shopId,
        name: shopName.trim(),
        slug: `${slugify(shopName)}-${shopId.slice(0, 5)}`,
        whatsapp_number: whatsappNumber,
        email: email.trim().toLowerCase(), 
        password_hash: password,
        address: address.trim(),
        postcode: postcode.trim().toUpperCase(),
        lat: lat,
        lng: lng,
        google_review_url: googleUrl.trim() || null,
        shop_photo_url: shopPhotoUrl || "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?q=80&w=1000&auto=format&fit=crop",
        photo_object_fit: photoObjectFit,
        is_open: true,
        is_active: false,
        subscription_status: "pending",
        subscription_tier: selectedPlan,
        created_at: new Date().toISOString()
      }]);

      // 🔥 The actual duplicate number fix
      if (error) {
        if (error.code === '23505') {
          alert("This mobile number is already registered to an account. Please log in.");
          setLoading(false);
          return;
        }
        throw error;
      }

      const targetPriceId = selectedPlan === 'pro' ? STRIPE_PRO_PRICE_ID : STRIPE_SOLO_PRICE_ID;

      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId: targetPriceId,
          shopId: shopId
        })
      });

      const { url } = await res.json();
      if (url) {
        window.location.href = url;
      } else {
        throw new Error("Could not generate payment link.");
      }

    } catch (err) {
      alert("Error: " + err.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center py-12 px-4 font-sans text-slate-900 text-left">
      
      <div className="max-w-xl w-full text-center mb-12">
        <div className="bg-black text-white p-3 rounded-2xl inline-flex mb-6 shadow-xl rotate-3">
          <Scissors size={24} />
        </div>
        <h1 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter mb-4 leading-none">
          The Future of <br/><span className="text-blue-600 underline">Your Shop.</span>
        </h1>
        <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.2em] mb-10 italic">
          Automate your booking flow in 60 seconds.
        </p>

        <div className="grid grid-cols-2 gap-3 text-left mb-8">
          <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
            <LayoutDashboard className="text-blue-500 mb-2" size={20} />
            <p className="text-[10px] font-black uppercase italic text-slate-400">Live Dashboard</p>
            <p className="text-xs font-bold leading-tight">Track every trim as it happens.</p>
          </div>
          <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
            <Users className="text-purple-500 mb-2" size={20} />
            <p className="text-[10px] font-black uppercase italic text-slate-400">Team Sync</p>
            <p className="text-xs font-bold leading-tight">Separate schedules for every chair.</p>
          </div>
          <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
            <Bell className="text-orange-500 mb-2" size={20} />
            <p className="text-[10px] font-black uppercase italic text-slate-400">Instant Pings</p>
            <p className="text-xs font-bold leading-tight">New bookings sent to your phone.</p>
          </div>
          <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
            <BarChart3 className="text-green-500 mb-2" size={20} />
            <p className="text-[10px] font-black uppercase italic text-slate-400">Growth Stats</p>
            <p className="text-xs font-bold leading-tight">See your daily and weekly revenue.</p>
          </div>
        </div>
      </div>

      <div className="max-w-xl w-full bg-white rounded-[3rem] shadow-xl p-8 md:p-12 border border-slate-100">
        
        <div className="flex gap-3 mb-10">
          {[1, 2, 3].map((i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${step >= i ? "bg-blue-600" : "bg-slate-100"}`} />
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-6">
            <h2 className="text-4xl font-black tracking-tight italic uppercase">The Basics.</h2>

            <div className="grid grid-cols-2 gap-3 mb-6">
               <button 
                  onClick={() => setSelectedPlan('solo')}
                  className={`p-4 rounded-2xl border-2 text-left transition-all ${selectedPlan === 'solo' ? 'border-blue-600 bg-blue-50' : 'border-slate-100 bg-white hover:border-slate-300'}`}
               >
                  <p className="font-black uppercase italic text-sm text-slate-900">Solo Pack</p>
                  <p className="text-[10px] font-bold text-slate-500">1 Barber</p>
               </button>
               <button 
                  onClick={() => setSelectedPlan('pro')}
                  className={`p-4 rounded-2xl border-2 text-left transition-all ${selectedPlan === 'pro' ? 'border-blue-600 bg-blue-50' : 'border-slate-100 bg-white hover:border-slate-300'}`}
               >
                  <p className="font-black uppercase italic text-sm text-slate-900">Pro Pack</p>
                  <p className="text-[10px] font-bold text-slate-500">Multi-Chair</p>
               </button>
            </div>

            <div className="space-y-4">
              <input 
                type="text" 
                placeholder="Shop Name" 
                value={shopName} 
                onChange={(e) => setShopName(e.target.value)} 
                className="w-full p-5 rounded-2xl border-2 bg-slate-50 outline-none transition-all text-lg font-semibold border-slate-100 focus:border-blue-500" 
              />
              
              <div className="space-y-1">
                <input 
                  type="tel" 
                  placeholder="Login / Contact Number (07...)" 
                  value={whatsappNumber} 
                  onChange={(e) => setWhatsappNumber(formatUKNumber(e.target.value))} 
                  className={`w-full p-5 rounded-2xl border-2 bg-slate-50 outline-none transition-all text-lg font-semibold ${whatsappNumber.length > 0 && !isPhoneValid ? 'border-red-200' : 'border-slate-100 focus:border-blue-500'}`} 
                />
                {!isPhoneValid && whatsappNumber.length > 0 && <p className="text-red-500 text-xs font-bold ml-2 uppercase">Must be an 11-digit UK number</p>}
              </div>

              {/* 🔥 NEW ADMIN EMAIL FIELD */}
              <div className="relative">
                <Mail className="absolute left-5 top-6 text-slate-400" size={20} />
                <input 
                  type="email" 
                  placeholder="Admin Email (For Password Resets)" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  className={`w-full p-5 pl-14 rounded-2xl border-2 bg-slate-50 outline-none transition-all text-lg font-semibold ${email.length > 0 && !isEmailValid ? 'border-red-200' : 'border-slate-100 focus:border-blue-500'}`} 
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-5 top-6 text-slate-400" size={20} />
                <input 
                  type={showPassword ? "text" : "password"} 
                  placeholder="Create Dashboard Password" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  className="w-full p-5 pl-14 pr-14 rounded-2xl border-2 bg-slate-50 outline-none transition-all text-lg font-semibold border-slate-100 focus:border-blue-500" 
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-5 top-6 text-slate-400 hover:text-blue-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>

              <div className="relative">
                <Lock className={`absolute left-5 top-6 ${passwordsMatch ? 'text-green-500' : 'text-slate-400'}`} size={20} />
                <input 
                  type={showPassword ? "text" : "password"} 
                  placeholder="Confirm Password" 
                  value={confirmPassword} 
                  onChange={(e) => setConfirmPassword(e.target.value)} 
                  className={`w-full p-5 pl-14 rounded-2xl border-2 bg-slate-50 outline-none transition-all text-lg font-semibold ${
                    confirmPassword.length > 0 
                      ? (passwordsMatch ? "border-green-200 focus:border-green-500" : "border-red-100 focus:border-red-400") 
                      : "border-slate-100 focus:border-blue-500"
                  }`}
                />
              </div>

              <button onClick={() => setStep(2)} disabled={!canGoStep2} className="w-full bg-black text-white font-black py-5 rounded-2xl hover:bg-slate-800 disabled:opacity-20 transition-all text-lg uppercase italic">Continue</button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <h2 className="text-4xl font-black tracking-tight italic uppercase">Shop Preview.</h2>
            <div className="space-y-5">
              <div className="relative w-full h-48 md:h-64 rounded-[2rem] overflow-hidden bg-slate-100 border-2 border-slate-100 shadow-inner group">
                {shopPhotoUrl ? (
                  <>
                    {photoObjectFit === "contain" && (
                      <div className="absolute inset-0 bg-center bg-cover scale-125 blur-2xl opacity-40" style={{ backgroundImage: `url(${shopPhotoUrl})` }} />
                    )}
                    <img src={shopPhotoUrl} alt="Preview" className={`relative w-full h-full z-10 ${photoObjectFit === "cover" ? "object-cover" : "object-contain"}`} />
                    <button onClick={() => setShopPhotoUrl("")} className="absolute top-4 right-4 z-20 bg-white/90 backdrop-blur-sm p-2 rounded-full shadow-lg text-red-500 hover:bg-white"><X size={18} /></button>
                  </>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer hover:bg-slate-50 transition-colors">
                    <Camera className="w-10 h-10 text-blue-600 mb-2" />
                    <p className="text-sm font-bold text-slate-500 uppercase">{uploading ? "Uploading..." : "Add Shop Photo"}</p>
                    <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                  </label>
                )}
              </div>
              <div className="space-y-4">
                <input type="text" placeholder="Street Address" value={address} onChange={(e) => setAddress(e.target.value)} className="w-full p-5 rounded-2xl border-2 bg-slate-50 outline-none font-semibold border-slate-100 focus:border-blue-500" />
                <input type="text" placeholder="Postcode" value={postcode} onChange={(e) => setPostcode(e.target.value.toUpperCase())} className="w-full p-5 rounded-2xl border-2 bg-slate-50 outline-none font-semibold border-slate-100 focus:border-blue-500" />
                
                <div className="relative">
                  <Globe className="absolute left-5 top-6 text-slate-400" size={20} />
                  <input 
                    type="url" 
                    placeholder="Google Review Link (Optional)" 
                    value={googleUrl} 
                    onChange={(e) => setGoogleUrl(e.target.value)} 
                    className="w-full p-5 pl-14 rounded-2xl border-2 bg-slate-50 outline-none transition-all text-lg font-semibold border-slate-100 focus:border-blue-500" 
                  />
                </div>

                <div className="flex gap-4 p-5 bg-slate-50 rounded-2xl border-2 border-slate-100">
                  <input 
                    type="checkbox" 
                    checked={agreedToTerms} 
                    onChange={() => setAgreedToTerms(!agreedToTerms)} 
                    className="w-6 h-6 mt-0.5 accent-blue-600" 
                  />
                  <p className="text-[11px] font-bold text-slate-500 leading-tight uppercase">
                    I agree to the <span className="text-slate-900 underline">Terms of Service</span> and acknowledge I am selecting a monthly subscription plan.
                  </p>
                </div>

                <div className="bg-blue-50 p-6 rounded-[2rem] border-2 border-blue-100 flex items-start gap-4">
                  <Info className="text-blue-600 shrink-0" size={20} />
                  <p className="text-[11px] font-bold text-blue-900 leading-tight">
                    <span className="uppercase block mb-1">Tip: Skip for now</span>
                    You can leave the Google link blank and add it later from your dashboard settings.
                  </p>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setStep(1)} className="flex-1 bg-slate-100 text-slate-600 font-bold py-5 rounded-2xl uppercase text-xs">Back</button>
                <button onClick={() => setStep(3)} disabled={!canGoStep3 || uploading} className="flex-[2] bg-black text-white font-black py-5 rounded-2xl shadow-lg active:scale-95 transition-all uppercase italic">Verify Details</button>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-8 text-center">
            <div className="inline-flex p-4 bg-green-50 rounded-3xl"><CheckCircle className="w-10 h-10 text-green-600" /></div>
            <h2 className="text-4xl font-black tracking-tight italic uppercase">One Step Left.</h2>
            <p className="text-slate-400 font-bold text-sm uppercase tracking-widest -mt-4">Finalizing your shop account</p>
            
            <div className="bg-slate-50 rounded-[2rem] p-6 text-left border border-slate-100 space-y-3 font-semibold text-slate-700">
              <div className="flex items-center gap-3"><ShieldCheck size={18} className="text-green-500"/> Geo-Location Calibrated</div>
              <div className="flex items-center gap-3"><ShieldCheck size={18} className="text-green-500"/> Dashboard Access Ready</div>
              <div className="flex items-center gap-3"><ShieldCheck size={18} className="text-green-500"/> Booking Page Created</div>
            </div>

            <button onClick={handleFinalSubmit} disabled={loading} className="w-full bg-blue-600 text-white font-black text-xl py-6 rounded-[2rem] shadow-xl hover:bg-blue-700 transition-all flex items-center justify-center gap-3 uppercase italic">
              {loading ? <Loader2 className="animate-spin" /> : `Checkout (${selectedPlan === 'pro' ? 'Pro' : 'Solo'})`}
            </button>
            <button onClick={() => setStep(2)} className="text-slate-400 font-bold hover:text-slate-600 transition-colors uppercase text-[10px] tracking-widest">Edit Details</button>
          </div>
        )}
      </div>
    </div>
  );
}