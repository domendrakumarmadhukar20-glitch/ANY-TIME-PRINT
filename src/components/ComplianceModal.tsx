import React from 'react';
import { Shield, FileText, RotateCcw, Mail, Phone, MapPin, X, CheckCircle2 } from 'lucide-react';

export type PolicyTab = 'terms' | 'privacy' | 'refund' | 'contact';

interface ComplianceModalProps {
  initialTab?: PolicyTab;
  onClose: () => void;
}

export const ComplianceModal: React.FC<ComplianceModalProps> = ({ initialTab = 'terms', onClose }) => {
  const [activeTab, setActiveTab] = React.useState<PolicyTab>(initialTab);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">College Any Time Print (ATP)</h3>
              <p className="text-xs text-slate-400">Razorpay Merchant Compliance & Customer Service Policies</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-1 p-2 bg-slate-950 border-b border-slate-800 overflow-x-auto text-xs">
          {[
            { id: 'contact', label: 'Contact Us (संपर्क)', icon: Mail },
            { id: 'refund', label: 'Refund & Cancellation Policy', icon: RotateCcw },
            { id: 'privacy', label: 'Privacy Policy', icon: Shield },
            { id: 'terms', label: 'Terms & Conditions', icon: FileText },
          ].map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as PolicyTab)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  active
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs text-slate-300 leading-relaxed">
          {/* TAB 1: CONTACT US */}
          {activeTab === 'contact' && (
            <div className="space-y-4">
              <h4 className="text-base font-bold text-white flex items-center gap-2">
                <Mail className="w-4 h-4 text-indigo-400" />
                Contact Us & Merchant Details
              </h4>
              <p>
                College Any Time Print (ATP) operates self-service cloud print kiosks for students, faculty, and campus visitors. For any billing queries, payment failures, or print-related support, please contact us:
              </p>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3 font-mono text-xs">
                <div className="flex items-center gap-2.5">
                  <span className="text-slate-500 w-32 shrink-0">Business / Service:</span>
                  <span className="text-white font-bold">College Any Time Print (ATP)</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="text-slate-500 w-32 shrink-0">Operator / Merchant:</span>
                  <span className="text-emerald-400 font-bold">Domendra Kumar (Kiosk Admin)</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="text-slate-500 w-32 shrink-0">Official Email:</span>
                  <a href="mailto:domendrakumarmadhukar20@gmail.com" className="text-indigo-400 underline">
                    domendrakumarmadhukar20@gmail.com
                  </a>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="text-slate-500 w-32 shrink-0">Operating Hours:</span>
                  <span className="text-slate-200">24x7 Self-Service College Kiosk (Library & Admin Block)</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="text-slate-500 w-32 shrink-0">Hardware Station:</span>
                  <span className="text-slate-200">HP LaserJet Pro MFP M126nw High-Speed Laser Kiosk</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: REFUND POLICY */}
          {activeTab === 'refund' && (
            <div className="space-y-4">
              <h4 className="text-base font-bold text-white flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-emerald-400" />
                Refund & Cancellation Policy (रिफंड व रद्दीकरण नीति)
              </h4>
              <div className="bg-emerald-950/40 border border-emerald-800/60 p-3.5 rounded-xl text-emerald-200">
                <strong>100% Zero-Loss Guarantee:</strong> यदि छात्र का पेमेंट कट जाता है और प्रिंटर से किसी भी कारण (हार्डवेयर खराबी, पेपर समाप्त, बिजली या नेटवर्क कटने) से प्रिंट नहीं निकलता, तो छात्र का एक भी रुपया नुकसान नहीं होगा।
              </div>

              <div className="space-y-2.5">
                <h5 className="font-bold text-white">1. Automatic Reprinting</h5>
                <p>
                  यदि पेपर खत्म होने या पेपर जैम की समस्या आती है, तो ऑपरेटर द्वारा पेपर लोड करते ही या जैम क्लियर करते ही पेंडिंग प्रिंट जॉब स्वतः प्रिंटर से निकल जाती है।
                </p>

                <h5 className="font-bold text-white">2. Full Refund Processing</h5>
                <p>
                  यदि छात्र दोबारा प्रिंट नहीं लेना चाहता, तो वह एडमिन डेस्क या सपोर्ट ईमेल (<span className="text-indigo-400">domendrakumarmadhukar20@gmail.com</span>) पर अपना <strong>Job ID</strong> या <strong>Razorpay Payment ID</strong> भेजकर 100% रिफंड का अनुरोध कर सकता है। रिफंड 24 से 48 घंटे के भीतर उसी बैंक/UPI खाते में वापस क्रेडिट कर दिया जाता है।
                </p>

                <h5 className="font-bold text-white">3. Cancellation</h5>
                <p>
                  चूंकि यह एक स्वचालित ऑन-डिमांड प्रिंटिंग सेवा है, इसलिए एक बार जब प्रिंटर पर कागज प्रिंट होना शुरू हो जाता है, तो उस विशिष्ट शीट के लिए रद्दीकरण संभव नहीं है। भुगतान से पहले छात्र कभी भी ऑर्डर कैंसिल कर सकते हैं।
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: PRIVACY POLICY */}
          {activeTab === 'privacy' && (
            <div className="space-y-4">
              <h4 className="text-base font-bold text-white flex items-center gap-2">
                <Shield className="w-4 h-4 text-indigo-400" />
                Privacy & Data Shredding Policy
              </h4>
              <p>
                छात्रों और शिक्षकों के दस्तावेजों की पूर्ण गोपनीयता हमारी सर्वोच्च प्राथमिकता है:
              </p>
              <ul className="space-y-2 list-disc list-inside text-slate-300">
                <li>
                  <strong className="text-white">Temporary Storage:</strong> छात्र जो PDF या फाइल अपलोड करते हैं, वे केवल प्रिंटिंग के लिए सुरक्षित एनक्रिप्टेड स्टोरेज में अस्थाई रूप से रखी जाती हैं।
                </li>
                <li>
                  <strong className="text-white">Auto-Shredding:</strong> प्रिंट पूरा होने के बाद या 30 मिनट की समय-सीमा समाप्त होने पर फाइल सिस्टम से स्वतः हमेशा के लिए डिलीट (Shred) कर दी जाती है।
                </li>
                <li>
                  <strong className="text-white">Payment Security:</strong> आपके UPI, कार्ड या बैंकिंग विवरण हमारे सर्वर पर कभी स्टोर नहीं होते। समस्त लेन-देन सीधे RBI द्वारा अधिकृत <strong>Razorpay</strong> के 256-बिट SSL एनक्रिप्टेड गेटवे द्वारा संसाधित किए जाते हैं।
                </li>
              </ul>
            </div>
          )}

          {/* TAB 4: TERMS & CONDITIONS */}
          {activeTab === 'terms' && (
            <div className="space-y-4">
              <h4 className="text-base font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-400" />
                Terms and Conditions of Service
              </h4>
              <p>
                कॉलेज एनी टाइम प्रिंट (ATP) कियोस्क का उपयोग करने पर निम्नलिखित नियम लागू होते हैं:
              </p>
              <ul className="space-y-2 list-disc list-inside text-slate-300">
                <li>
                  <strong className="text-white">Pricing Rates:</strong> कॉलेज दिशा-निर्देशों के अनुसार सिंगल-साइड और बोथ-साइड A4 प्रिंट की निर्धारित दरें (जैसे ₹2.00 / ₹3.00) लागू होती हैं, जो प्रिंट से पहले स्क्रीन पर स्पष्ट दिखाई जाती हैं।
                </li>
                <li>
                  <strong className="text-white">Acceptable Use:</strong> छात्र केवल शैक्षणिक, व्यक्तिगत या आधिकारिक अध्ययन सामग्री ही प्रिंट करें। किसी भी प्रकार की आपत्तिजनक सामग्री प्रिंट करना प्रतिबंधित है।
                </li>
                <li>
                  <strong className="text-white">Payment Confirmation:</strong> भुगतान सफल होने के उपरांत ही प्रिंटर स्पूलर पर कमांड भेजी जाती है।
                </li>
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Compliant with Razorpay Merchant Policies</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs cursor-pointer"
          >
            I Understand (समझ गए)
          </button>
        </div>
      </div>
    </div>
  );
};
