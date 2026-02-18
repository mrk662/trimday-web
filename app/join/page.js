"use client";
import React, { useState } from "react";
import { Camera, CheckCircle, AlertCircle, Loader2, Globe, Lock, MapPin, X, Maximize2, Minimize2 } from "lucide-react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

const STRIPE_LINK = "https://buy.stripe.com/test_14A00j5X14m4eMN9LNgUM00";
const SUCCESS_BASE_URL = "https://classy-genie-4399c8.netlify.app/success";

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
  const [shopName, setShopName] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [password, setPassword] = useState("");
  const [address, setAddress] = useState("");
  const [postcode, setPostcode] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [googleUrl, setGoogleUrl] = useState("");
  const [shopPhotoUrl, setShopPhotoUrl] = useState("");
  const [photoObjectFit, setPhotoObjectFit] = useState("cover"); // Default to Fill

  // VALIDATION
  const isNameValid = shopName.trim().length >= 3;
  const isPhoneValid = whatsappNumber.length === 11 && whatsappNumber.startsWith("0");
  const isPasswordValid = password.length >= 8;
  const isAddressValid = address.trim().length >= 5;
  const isPostcodeValid = ukPostcodeRegex.test(postcode.trim());

  const canGoStep2 = isNameValid && isPhoneValid && isPasswordValid;
  const canGoStep3 = isAddressValid && isPostcodeValid;

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

      const { error: uploadError } = await supabase.storage
        .from('shop-photos')
        .upload(filePath, file);

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
      const { error } = await supabase.from("shops").insert([{
        id: shopId,
        name: shopName.trim(),
        slug: `${slugify(shopName)}-${shopId.slice(0, 5)}`,
        whatsapp_number: whatsappNumber,
        password_hash: password,
        address: address.trim(),
        postcode: postcode.trim().toUpperCase(),
        website_url: websiteUrl.trim() || null,
        google_business_url: googleUrl.trim() || null,
        shop_photo_url: shopPhotoUrl || "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?q=80&w=1000&auto=format&fit=crop",
        photo_object_fit: photoObjectFit, // Saves the barber's preference
        is_open: true,
        is_active: false,
        subscription_status: "pending",
        created_at: new Date().toISOString()
      }]);

      if (error) throw error;

      const successUrl = `${SUCCESS_BASE_URL}?shop_id=${shopId}`;
      window.location.href = `${STRIPE_LINK}?client_reference_id=${shopId}&success_url=${encodeURIComponent(successUrl)}`;

    } catch (err) {
      alert("Error: " + err.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center py-12 px-4 font-sans text-slate-900">
      <div className="max-w-xl w-full bg-white rounded-[3rem] shadow-xl p-8 md:p-12 border border-slate-100">
        
        {/* Progress Bar */}
        <div className="flex gap-3 mb-10">
          {[1, 2, 3].map((i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${step >= i ? "bg-blue-600" : "bg-slate-100"}`} />
          ))}
        </div>

        {/* STEP 1: BASICS */}
        {step === 1 && (
          <div className="space-y-6">
            <h2 className="text-4xl font-black tracking-tight text-center md:text-left">The Basics.</h2>
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
                  placeholder="WhatsApp Number (07...)"
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(formatUKNumber(e.target.value))}
                  className={`w-full p-5 rounded-2xl border-2 bg-slate-50 outline-none transition-all text-lg font-semibold ${whatsappNumber.length > 0 && !isPhoneValid ? 'border-red-200' : 'border-slate-100'}`}
                />
                {!isPhoneValid && whatsappNumber.length > 0 && <p className="text-red-500 text-xs font-bold ml-2">Must be an 11-digit UK number</p>}
              </div>

              <div className="relative">
                <Lock className="absolute left-5 top-6 text-slate-400" size={20} />
                <input
                  type="password"
                  placeholder="Create Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-5 pl-14 rounded-2xl border-2 bg-slate-50 outline-none transition-all text-lg font-semibold border-slate-100 focus:border-blue-500"
                />
              </div>

              <button
                onClick={() => setStep(2)}
                disabled={!canGoStep2}
                className="w-full bg-black text-white font-bold py-5 rounded-2xl hover:bg-slate-800 disabled:opacity-20 transition-all text-lg"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: PREVIEW & DETAILS */}
        {step === 2 && (
          <div className="space-y-6">
            <h2 className="text-4xl font-black tracking-tight text-center md:text-left">Shop Preview.</h2>
            <div className="space-y-5">
              
              {/* ADVANCED PHOTO PREVIEW BOX WITH BLURRED BACKDROP */}
              <div className="relative w-full h-48 md:h-64 rounded-[2rem] overflow-hidden bg-slate-100 border-2 border-slate-100 shadow-inner group">
                {shopPhotoUrl ? (
                  <>
                    {/* Background Layer: Blurred and Scaled (only visible if using "contain") */}
                    {photoObjectFit === "contain" && (
                      <div 
                        className="absolute inset-0 bg-center bg-cover scale-125 blur-2xl opacity-40 transition-all duration-500"
                        style={{ backgroundImage: `url(${shopPhotoUrl})` }}
                      />
                    )}
                    
                    {/* Foreground Layer: Crisp Photo */}
                    <img 
                      src={shopPhotoUrl} 
                      alt="Preview" 
                      className={`relative w-full h-full z-10 transition-all duration-500 ${photoObjectFit === "cover" ? "object-cover" : "object-contain"}`} 
                    />

                    {/* Delete Control */}
                    <button 
                      onClick={() => setShopPhotoUrl("")}
                      className="absolute top-4 right-4 z-20 bg-white/90 backdrop-blur-sm p-2 rounded-full shadow-lg text-red-500 hover:bg-white"
                    >
                      <X size={18} />
                    </button>
                    
                    {/* Fit/Fill Toggles */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20 bg-white/90 backdrop-blur-sm p-1.5 rounded-full shadow-lg">
                      <button 
                        onClick={() => setPhotoObjectFit("cover")} 
                        className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${photoObjectFit === 'cover' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-200'}`}
                      >
                        <Maximize2 size={14}/> Full Banner
                      </button>
                      <button 
                        onClick={() => setPhotoObjectFit("contain")} 
                        className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${photoObjectFit === 'contain' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-200'}`}
                      >
                        <Minimize2 size={14}/> Blurred Frame
                      </button>
                    </div>
                  </>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer hover:bg-slate-50 transition-colors">
                    <Camera className="w-10 h-10 text-blue-600 mb-2" />
                    <p className="text-sm font-bold text-slate-500">{uploading ? "Uploading..." : "Click to add Shop Photo"}</p>
                    <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                  </label>
                )}
              </div>

              {/* WITTY PIXEL REQUIREMENT TEXT */}
              {photoObjectFit === "cover" && shopPhotoUrl && (
                <p className="text-[11px] font-bold text-slate-400 text-center px-4 leading-relaxed italic animate-in fade-in">
                  "Pro Tip: For a sharp Full Banner look, use **1200x480 pixels**. Keep your logo centered so it doesn't get a haircut on small phone screens!"
                </p>
              )}

              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Street Address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full p-5 rounded-2xl border-2 bg-slate-50 outline-none font-semibold border-slate-100 focus:border-blue-500"
                />
                <input
                  type="text"
                  placeholder="Postcode"
                  value={postcode}
                  onChange={(e) => setPostcode(e.target.value.toUpperCase())}
                  className="w-full p-5 rounded-2xl border-2 bg-slate-50 outline-none font-semibold border-slate-100 focus:border-blue-500"
                />
                
                {/* GOOGLE BUSINESS SECTION */}
                <div className="bg-slate-50 p-6 rounded-[2rem] border-2 border-slate-100 space-y-4">
                   <div className="relative">
                    <MapPin className="absolute left-0 top-1 text-red-500" size={18} />
                    <input
                      type="url"
                      placeholder="Paste Google Business Link (Optional)"
                      value={googleUrl}
                      onChange={(e) => setGoogleUrl(e.target.value)}
                      className="w-full pl-7 bg-transparent outline-none font-bold text-sm text-slate-700 placeholder:text-slate-400"
                    />
                  </div>
                  {googleUrl ? (
                    <div className="flex items-center gap-1.5 animate-in fade-in slide-in-from-top-2">
                       <div className="flex text-yellow-400 text-xs">★★★★★</div>
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Reviews Connected</span>
                    </div>
                  ) : (
                    <p className="text-[10px] font-bold text-slate-400 italic">No link? No problem. We'll hide the review section to keep your profile clean.</p>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setStep(1)} className="flex-1 bg-slate-100 text-slate-600 font-bold py-5 rounded-2xl">Back</button>
                <button
                  onClick={() => setStep(3)}
                  disabled={!canGoStep3 || uploading}
                  className="flex-[2] bg-black text-white font-bold py-5 rounded-2xl shadow-lg active:scale-95 transition-all"
                >
                  Verify Details
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: FINAL SUMMARY */}
        {step === 3 && (
          <div className="space-y-8 text-center">
            <div className="inline-flex p-4 bg-green-50 rounded-3xl"><CheckCircle className="w-10 h-10 text-green-600" /></div>
            <h2 className="text-4xl font-black tracking-tight tracking-tight">One Step Left.</h2>
            <div className="bg-slate-50 rounded-[2rem] p-6 text-left border border-slate-100 space-y-3 font-semibold text-slate-700">
              <div className="flex items-center gap-3"><CheckCircle size={18} className="text-green-500"/> Verified Business Account</div>
              <div className="flex items-center gap-3"><CheckCircle size={18} className="text-green-500"/> Shop Dashboard & Calendar</div>
              {googleUrl && <div className="flex items-center gap-3"><CheckCircle size={18} className="text-green-500"/> Google Business Verified</div>}
            </div>
            <button
              onClick={handleFinalSubmit}
              disabled={loading}
              className="w-full bg-blue-600 text-white font-black text-xl py-6 rounded-[2rem] shadow-xl hover:bg-blue-700 transition-all flex items-center justify-center gap-3"
            >
              {loading ? <Loader2 className="animate-spin" /> : "Pay £20 & Go Live"}
            </button>
            <button onClick={() => setStep(2)} className="text-slate-400 font-bold hover:text-slate-600 transition-colors">Edit Details</button>
          </div>
        )}
      </div>
    </div>
  );
}