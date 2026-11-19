// Ilustrasi kartun (SVG inline) — ringan, tanpa file gambar, tanpa request jaringan.
export default function LoginArt({ className = '' }) {
  return (
    <svg viewBox="0 0 600 520" className={className} preserveAspectRatio="xMidYMax slice" role="img" aria-label="Ilustrasi siswa, masjid, dan kegiatan belajar">
      <defs>
        <linearGradient id="dome" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#34D399"/><stop offset="1" stopColor="#059669"/></linearGradient>
        <linearGradient id="hill1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#6EE7B7"/><stop offset="1" stopColor="#34D399"/></linearGradient>
      </defs>
      <circle cx="500" cy="95" r="40" fill="#F5D76E" opacity=".95"/>
      <circle cx="500" cy="95" r="58" fill="#F5D76E" opacity=".18"/>
      <g fill="#fff" opacity=".9"><ellipse cx="120" cy="150" rx="46" ry="15"/><ellipse cx="148" cy="138" rx="30" ry="14"/><ellipse cx="430" cy="190" rx="40" ry="12"/><ellipse cx="455" cy="180" rx="24" ry="11"/></g>
      <g fill="#F5D76E"><path d="M60 60l4 10 10 4-10 4-4 10-4-10-10-4 10-4z"/><path d="M250 40l3 8 8 3-8 3-3 8-3-8-8-3 8-3z"/><path d="M380 110l3 8 8 3-8 3-3 8-3-8-8-3 8-3z"/><path d="M560 200l3 8 8 3-8 3-3 8-3-8-8-3 8-3z"/></g>
      <g transform="translate(70 70)"><path d="M0 22L40 4l40 18-40 18z" fill="#064E3B"/><path d="M18 32v16q22 12 44 0V32L40 42z" fill="#065F46"/><path d="M76 24v22" stroke="#D4AF37" strokeWidth="3" strokeLinecap="round"/><circle cx="76" cy="50" r="4" fill="#D4AF37"/></g>
      <path d="M0 395Q150 335 300 385T600 365V520H0Z" fill="url(#hill1)"/>
      <path d="M0 440Q200 392 380 438T600 430V520H0Z" fill="#10B981"/>
      <g>
        <rect x="160" y="245" width="28" height="170" rx="4" fill="#F0FDF4"/><path d="M154 248L174 208l20 40z" fill="#10B981"/><circle cx="174" cy="200" r="5" fill="#D4AF37"/><rect x="168" y="270" width="12" height="22" rx="6" fill="#6EE7B7"/>
        <rect x="412" y="245" width="28" height="170" rx="4" fill="#F0FDF4"/><path d="M406 248L426 208l20 40z" fill="#10B981"/><circle cx="426" cy="200" r="5" fill="#D4AF37"/><rect x="420" y="270" width="12" height="22" rx="6" fill="#6EE7B7"/>
        <rect x="190" y="300" width="220" height="115" fill="#F0FDF4"/>
        <path d="M212 300A88 88 0 0 1 388 300Z" fill="url(#dome)"/>
        <path d="M300 214V188" stroke="#D4AF37" strokeWidth="4" strokeLinecap="round"/>
        <path d="M309 185.3A14 14 0 1 0 309 206.7A11 11 0 0 1 309 185.3Z" fill="#D4AF37"/>
        <path d="M278 415V368a22 22 0 0 1 44 0V415Z" fill="#087F5B"/><path d="M286 415V370a14 14 0 0 1 28 0V415Z" fill="#064E3B"/>
        <path d="M208 415v-36a14 14 0 0 1 28 0v36z" fill="#6EE7B7"/><path d="M364 415v-36a14 14 0 0 1 28 0v36z" fill="#6EE7B7"/>
        <rect x="170" y="412" width="260" height="10" rx="3" fill="#D1FAE5"/>
      </g>
      <path d="M0 470Q300 440 600 470V520H0Z" fill="#064E3B"/>
      <path d="M235 492h130l22 24H213z" fill="#0F766E"/><path d="M248 496h104l14 16H234z" fill="none" stroke="#D4AF37" strokeWidth="3"/>
      <g>
        <rect x="94" y="458" width="15" height="28" rx="5" fill="#1F2937"/><rect x="113" y="458" width="15" height="28" rx="5" fill="#1F2937"/>
        <rect x="86" y="388" width="48" height="76" rx="16" fill="#fff"/>
        <circle cx="110" cy="360" r="24" fill="#F6C9A0"/>
        <path d="M86 354a24 22 0 0 1 48 0v-6a24 12 0 0 0-48 0z" fill="#111827"/><rect x="87" y="333" width="46" height="17" rx="7" fill="#111827"/>
        <circle cx="101" cy="362" r="2.6" fill="#111827"/><circle cx="119" cy="362" r="2.6" fill="#111827"/><path d="M102 371q8 7 16 0" fill="none" stroke="#9A3412" strokeWidth="2.4" strokeLinecap="round"/>
        <rect x="98" y="408" width="38" height="28" rx="4" fill="#D4AF37"/><path d="M104 416h26M104 423h20" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"/>
        <circle cx="98" cy="426" r="6" fill="#F6C9A0"/><circle cx="138" cy="426" r="6" fill="#F6C9A0"/>
      </g>
      <g>
        <rect x="474" y="458" width="15" height="28" rx="5" fill="#374151"/><rect x="493" y="458" width="15" height="28" rx="5" fill="#374151"/>
        <rect x="466" y="392" width="50" height="72" rx="16" fill="#A7F3D0"/>
        <circle cx="491" cy="362" r="30" fill="#0F766E"/><circle cx="491" cy="366" r="20" fill="#F6C9A0"/>
        <path d="M462 384Q491 414 520 384v18Q491 420 462 402z" fill="#0F766E"/>
        <circle cx="484" cy="367" r="2.6" fill="#111827"/><circle cx="499" cy="367" r="2.6" fill="#111827"/><path d="M485 375q6 6 12 0" fill="none" stroke="#9A3412" strokeWidth="2.4" strokeLinecap="round"/>
        <rect x="470" y="410" width="30" height="34" rx="4" fill="#064E3B" stroke="#D4AF37" strokeWidth="2.5"/><circle cx="485" cy="427" r="6" fill="none" stroke="#D4AF37" strokeWidth="2"/>
        <circle cx="474" cy="430" r="6" fill="#F6C9A0"/><circle cx="502" cy="430" r="6" fill="#F6C9A0"/>
      </g>
    </svg>
  );
}