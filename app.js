
/* ============================================================================
   REAL BACKEND — Supabase client + data layer
   ============================================================================
   Replaces the old window.storage/kv_store simulation entirely. Reads go
   straight to Supabase tables (protected by the RLS policies from Phase 1).
   Customer WRITES (booking, cancelling, rescheduling, waitlist, phone
   lookup) go through the "booking-api" Edge Function — the browser never
   writes to the bookings/customers/notifications tables directly.
   ============================================================================ */
const SUPABASE_URL = "https://possqyvufrubfixipwlm.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_7tLqOI1xA_Tq4lxOpbjs2w_PFuNiJZ_";
const BOOKING_API_URL = SUPABASE_URL + "/functions/v1/booking-api";
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function callBookingApi(action, payload) {
  try {
    const res = await fetch(BOOKING_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + SUPABASE_ANON_KEY, "apikey": SUPABASE_ANON_KEY },
      body: JSON.stringify(Object.assign({ action }, payload)),
    });
    return await res.json();
  } catch (e) {
    return { ok: false, message: "Network error — please check your connection and try again." };
  }
}

/* ---------- Language / RTL switching ---------- */
let currentLang = "en"; // English-only build — the Arabic toggle has been removed entirely, this never changes
const TRANSLATIONS = {
  en: {
    nav_home:"Home", nav_menu:"Beauty Menu", nav_house:"The House", nav_rituals:"Rituals", nav_visit:"Your Visit",
    nav_contact:"Contact", nav_manage:"Manage Booking", nav_book:'Book Appointment',
    hero_categories:"Hair · Makeup · Nails · Skin · Brows · Lashes",
    hero_cta:'Book Your Appointment <span class="arrow">→</span>',
    menu_eyebrow:"The Menu", menu_title:"Beauty Menu",
    tab_all:"All", tab_hair:"Hair", tab_skin:"Skin", tab_nails:"Nails", tab_brows:"Brows &amp; Lashes", tab_makeup:"Makeup", tab_bridal:"Bridal",
    rituals_eyebrow:"Signature", rituals_title:"Beauty Rituals",
    visit_eyebrow:"Before You Arrive", visit_title:"Your Visit",
    finalcta_eyebrow:"Reserve Your Time", finalcta_title:"The house is ready<br>whenever you are.",
    foot_visit:"Visit", foot_contact:"Contact", foot_follow:"Follow",
    foot_instagram:"Instagram", foot_whatsapp:"WhatsApp", foot_crafted:"Crafted with restraint", foot_privacy:"Privacy & Terms",
    step1_label:"01 — Choose Your Service", step1_title:"What would you like to experience?",
    step2_label:"02 — Choose Your Ritual",
    step3_label:"03 — With Whom", step3_title:"Choose your specialist",
    step4_label:"04 — Date &amp; Time", step4_title:"When would you like to visit us?",
    btn_join_waitlist:"Join Waitlist",
    step5_label:"05 — Your Details", step5_title:"Just a few details",
    field_fullname:"Full Name", ph_fullname:"Enter your name",
    field_phone:"Phone", field_email:"Email", field_bday:"Birthday (optional)",
    field_notes:"Special Requests (optional)", ph_notes:"Allergies, preferences, occasion...",
    step6_label:"06 — Review", step6_title:"Your reservation",
    confirm_title:"We look forward<br>to your visit.",
    btn_addcal:"Add to Calendar", btn_wa_confirm:"WhatsApp Confirmation",
    btn_cancel_this:"Cancel This Appointment", btn_return_home:"Return Home",
    btn_back:"← Back", btn_continue:"Continue", btn_confirm_reservation:"Confirm Reservation",
    manage_eyebrow:"Manage Your Booking", manage_title:"Find your reservation",
    manage_desc:"Your appointment history is always tied to your phone number, not this device — so it works here even if you're on a new phone or browser.",
    manage_phone_label:"Phone Number", btn_find_appts:"Find My Appointments",
    err_slot_taken:"This time was just reserved by another guest — please choose another slot.",
    select_treatment_default:"Select a treatment", select_treatment_prefix:"Select a", select_treatment_suffix:"ritual",
    summary_service:"Service", summary_ritual:"Ritual", summary_specialist:"Specialist", summary_date:"Date",
    summary_time:"Time", summary_duration:"Duration", summary_price:"Price",
    reservation_no:"Reservation No.",
    confirming:"Confirming...", cancelling:"Cancelling...", cancelled:"Cancelled",
    rescheduling:"Rescheduling...",
    no_preference:"No Preference",
    dow_sun:"Sun", dow_mon:"Mon", dow_tue:"Tue", dow_wed:"Wed", dow_thu:"Thu", dow_fri:"Fri", dow_sat:"Sat",
    err_lead_time:"Online booking closes {h} hours before an appointment — please choose a later time or call us directly for last-minute slots.",
    err_limit:"You already have {n} upcoming appointments with us. Please cancel or complete one before booking another.",
    err_generic_taken:"This time was just reserved by another guest — please choose another slot.",
    cancel_confirm_dialog:"Cancel this appointment?",
    appt_cancelled_msg:"This appointment has been cancelled. A confirmation has been sent to your phone.",
    appt_cancel_failed:"This appointment could not be cancelled — it may already be cancelled.",
    resched_lead_closed:"Online rescheduling closes {h} hours before an appointment.",
    resched_taken:"That time was just taken — please pick another.",
    resched_moved:"Moved to {date} at {time}. A confirmation has been sent to your phone.",
    manage_enter_phone:"Please enter the phone number you booked with.",
    manage_searching:"Searching…",
    manage_no_appts:"No upcoming appointments found for this number.",
    btn_cancel_appt:"Cancel Appointment", btn_reschedule:"Reschedule",
    waitlist_enter_phone:"Please enter a phone number.",
    waitlist_joined:"You're on the waitlist — we'll text this number if a spot opens on this date.",
    welcome_back:"Welcome back",
    welcome_back_msg:"— we've filled in your saved details. (Not on this device? You can always edit these, or look up your bookings by phone under Manage Booking.)",
    btn_reserve:"Reserve", rituals_suffix:"rituals", mb_ready:"Ready to begin?", mb_book:"Book Now",
  },
  ar: {
    nav_home:"الرئيسية", nav_menu:"قائمة الجمال", nav_house:"عن المكان", nav_rituals:"الطقوس", nav_visit:"زيارتك",
    nav_contact:"تواصل معنا", nav_manage:"إدارة الحجز", nav_book:"احجز موعدك",
    hero_categories:"شعر · مكياج · أظافر · بشرة · حواجب · رموش",
    hero_cta:'احجز موعدك <span class="arrow">→</span>',
    menu_eyebrow:"القائمة", menu_title:"قائمة الجمال",
    tab_all:"الكل", tab_hair:"شعر", tab_skin:"بشرة", tab_nails:"أظافر", tab_brows:"حواجب ورموش", tab_makeup:"مكياج", tab_bridal:"عروس",
    rituals_eyebrow:"مميز", rituals_title:"طقوس الجمال",
    visit_eyebrow:"قبل حضورك", visit_title:"زيارتك",
    finalcta_eyebrow:"احجز وقتك", finalcta_title:"المكان جاهز<br>حين تكون جاهزاً.",
    foot_visit:"الزيارة", foot_contact:"تواصل معنا", foot_follow:"تابعنا",
    foot_instagram:"إنستغرام", foot_whatsapp:"واتساب", foot_crafted:"صُنع بعناية", foot_privacy:"الخصوصية والشروط",
    step1_label:"٠١ — اختر الخدمة", step1_title:"ما الذي تودين تجربته؟",
    step2_label:"٠٢ — اختر الطقس",
    step3_label:"٠٣ — مع من", step3_title:"اختر المتخصص",
    step4_label:"٠٤ — التاريخ والوقت", step4_title:"متى تودين زيارتنا؟",
    btn_join_waitlist:"انضم لقائمة الانتظار",
    step5_label:"٠٥ — بياناتك", step5_title:"بعض التفاصيل",
    field_fullname:"الاسم الكامل", ph_fullname:"أدخل اسمك",
    field_phone:"رقم الهاتف", field_email:"البريد الإلكتروني", field_bday:"تاريخ الميلاد (اختياري)",
    field_notes:"طلبات خاصة (اختياري)", ph_notes:"حساسية، تفضيلات، مناسبة...",
    step6_label:"٠٦ — المراجعة", step6_title:"حجزك",
    confirm_title:"نتطلع لزيارتك<br>قريباً.",
    btn_addcal:"أضف إلى التقويم", btn_wa_confirm:"تأكيد عبر واتساب",
    btn_cancel_this:"إلغاء هذا الموعد", btn_return_home:"العودة للرئيسية",
    btn_back:"→ رجوع", btn_continue:"استمرار", btn_confirm_reservation:"تأكيد الحجز",
    manage_eyebrow:"إدارة حجزك", manage_title:"البحث عن حجزك",
    manage_desc:"سجل مواعيدك مرتبط برقم هاتفك دائماً، وليس بهذا الجهاز — فهو يعمل حتى لو كنت على هاتف أو متصفح جديد.",
    manage_phone_label:"رقم الهاتف", btn_find_appts:"البحث عن مواعيدي",
    err_slot_taken:"تم حجز هذا الوقت للتو من ضيف آخر — يرجى اختيار وقت آخر.",
    select_treatment_default:"اختر خدمة", select_treatment_prefix:"اختر طقس", select_treatment_suffix:"",
    summary_service:"الخدمة", summary_ritual:"الطقس", summary_specialist:"المتخصص", summary_date:"التاريخ",
    summary_time:"الوقت", summary_duration:"المدة", summary_price:"السعر",
    reservation_no:"رقم الحجز",
    confirming:"جارٍ التأكيد...", cancelling:"جارٍ الإلغاء...", cancelled:"تم الإلغاء",
    rescheduling:"جارٍ تعديل الموعد...",
    no_preference:"دون تفضيل",
    dow_sun:"أحد", dow_mon:"إثنين", dow_tue:"ثلاثاء", dow_wed:"أربعاء", dow_thu:"خميس", dow_fri:"جمعة", dow_sat:"سبت",
    err_lead_time:"يُغلق الحجز عبر الإنترنت قبل {h} ساعة من الموعد — يرجى اختيار وقت لاحق أو الاتصال بنا مباشرة للمواعيد العاجلة.",
    err_limit:"لديك بالفعل {n} مواعيد قادمة معنا. يرجى إلغاء أو إنهاء أحدها قبل حجز موعد آخر.",
    err_generic_taken:"تم حجز هذا الوقت للتو من ضيف آخر — يرجى اختيار وقت آخر.",
    cancel_confirm_dialog:"إلغاء هذا الموعد؟",
    appt_cancelled_msg:"تم إلغاء هذا الموعد. تم إرسال تأكيد إلى هاتفك.",
    appt_cancel_failed:"تعذر إلغاء هذا الموعد — قد يكون ملغى بالفعل.",
    resched_lead_closed:"يُغلق تعديل الموعد عبر الإنترنت قبل {h} ساعة من الموعد.",
    resched_taken:"تم حجز هذا الوقت للتو — يرجى اختيار وقت آخر.",
    resched_moved:"تم نقل الموعد إلى {date} في {time}. تم إرسال تأكيد إلى هاتفك.",
    manage_enter_phone:"يرجى إدخال رقم الهاتف الذي حجزت به.",
    manage_searching:"جارٍ البحث…",
    manage_no_appts:"لم يتم العثور على مواعيد قادمة لهذا الرقم.",
    btn_cancel_appt:"إلغاء الموعد", btn_reschedule:"تعديل الموعد",
    waitlist_enter_phone:"يرجى إدخال رقم الهاتف.",
    waitlist_joined:"تم تسجيلك في قائمة الانتظار — سنرسل رسالة إلى هذا الرقم إذا فتح وقت في هذا التاريخ.",
    welcome_back:"مرحباً بعودتك",
    welcome_back_msg:"— لقد قمنا بتعبئة بياناتك المحفوظة. (لست على هذا الجهاز؟ يمكنك دائماً تعديلها، أو البحث عن مواعيدك برقم الهاتف عبر إدارة الحجز.)",
    btn_reserve:"احجزي", rituals_suffix:"طقوس", mb_ready:"جاهزة للبدء؟", mb_book:"احجزي الآن",
  },
};
function t(key, vars) {
  let s = (TRANSLATIONS[currentLang] && TRANSLATIONS[currentLang][key]) || TRANSLATIONS.en[key] || key;
  if (vars) for (const k in vars) s = s.replace("{" + k + "}", vars[k]);
  return s;
}
function applyLanguage(lang) {
  currentLang = lang;
  localStorage.setItem("lume:lang", lang);
  document.documentElement.setAttribute("dir", lang === "ar" ? "rtl" : "ltr");
  document.documentElement.setAttribute("lang", lang);
  const dict = TRANSLATIONS[lang];
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    if (dict[key]) el.innerHTML = dict[key];
  });
  const btn = document.getElementById("langToggleBtn"); if (btn) btn.textContent = lang === "ar" ? "English" : "عربي";
  const btnM = document.getElementById("langToggleBtnMobile"); if (btnM) btnM.textContent = lang === "ar" ? "English" : "عربي";
  applyBusinessBranding(); // re-render business-settings-driven content in the new language
  // Re-render anything already on screen that shows catalog data or booking-flow
  // state, so switching language mid-browse (or mid-booking) updates immediately.
  if (typeof buildMenuTabs === "function" && categories.length) {
    const activeCat = document.querySelector(".menu-tab.active")?.dataset.cat || "all";
    buildMenuTabs();
    const reactivate = document.querySelector(`.menu-tab[data-cat="${activeCat}"]`);
    if (reactivate) { document.querySelectorAll(".menu-tab").forEach(x=>x.classList.remove("active")); reactivate.classList.add("active"); }
    buildMenuRail(activeCat);
    buildRitualRail();
    buildServiceGrid();
  }
  if (visitInfo.length) buildVisitAccordion();
  if (typeof showTesti === "function" && typeof testiIndex !== "undefined") showTesti(testiIndex);
  if (document.getElementById("bookOverlay")?.classList.contains("open")) {
    if (step===1) renderTreatList();
    if (step===2) buildSpecialistGrid();
    if (step===5) renderSummary();
    if (step===6) renderConfirm();
  }
}
function toggleLanguage() {
  applyLanguage(currentLang === "ar" ? "en" : "ar");
}

/* ---------- Business Settings (branding, contact, copy — all editable in admin) ---------- */
let BIZ = {
  business_name: "MAISON", tagline: "", logo_url: "", address: "", phone: "", email: "",
  whatsapp_number: "", instagram_url: "", facebook_url: "",
  hero_eyebrow: "Private Reservation House", hero_line1: "THE ART", hero_line2: "OF BEAUTY", hero_subtitle: "",
  about_title: "A private house, not a shop.", about_body_1: "", about_body_2: "", about_signature: "",
  visit_info: [], hours_display: "", default_language: "en", currency_symbol: "$",
  booking_lead_hours: 2, default_buffer_minutes: 15, max_active_bookings_per_phone: 3,
};
async function loadBusinessSettings() {
  try {
    const { data, error } = await sb.from("business_settings").select("*").eq("id", 1).maybeSingle();
    if (!error && data) BIZ = Object.assign({}, BIZ, data);
  } catch (e) { /* keep defaults */ }
}
function pickLang(field) {
  if (currentLang === "ar" && BIZ[field + "_ar"]) return BIZ[field + "_ar"];
  return BIZ[field];
}
function applyBusinessBranding() {
  document.title = BIZ.business_name + " — " + (BIZ.tagline || "");
  document.querySelectorAll(".brand-name").forEach(el => el.textContent = pickLang("business_name"));
  const heroEyebrow = document.querySelector(".hero .eyebrow"); if (heroEyebrow) heroEyebrow.textContent = pickLang("hero_eyebrow");
  const heroLine1 = document.querySelector(".hero h1 .line:nth-child(1) span"); if (heroLine1) heroLine1.textContent = pickLang("hero_line1");
  const heroLine2 = document.querySelector(".hero h1 .line:nth-child(2) span"); if (heroLine2) heroLine2.textContent = pickLang("hero_line2");
  const heroSub = document.querySelector(".hero p.sub"); if (heroSub && BIZ.hero_subtitle) heroSub.textContent = pickLang("hero_subtitle");
  const aboutTitle = document.querySelector(".house-text h2"); if (aboutTitle) aboutTitle.textContent = pickLang("about_title");
  const aboutPs = document.querySelectorAll(".house-text p");
  if (aboutPs[0] && BIZ.about_body_1) aboutPs[0].textContent = pickLang("about_body_1");
  if (aboutPs[1] && BIZ.about_body_2) aboutPs[1].textContent = pickLang("about_body_2");
  const sig = document.querySelector(".house-sig"); if (sig && BIZ.about_signature) sig.textContent = pickLang("about_signature");
  const footAddr = document.querySelectorAll("[data-field='address']"); footAddr.forEach(el=>el.textContent = pickLang("address"));
  const dirBtn = document.getElementById("directionsBtn");
  if (dirBtn) dirBtn.href = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(pickLang("address"));
  const footHours = document.querySelectorAll("[data-field='hours']"); footHours.forEach(el=>el.textContent = pickLang("hours_display"));
  const footPhone = document.querySelectorAll("[data-field='phone']"); footPhone.forEach(el=>{ el.textContent = BIZ.phone; el.href = "tel:" + BIZ.phone; });
  const footEmail = document.querySelectorAll("[data-field='email']"); footEmail.forEach(el=>{ el.textContent = BIZ.email; el.href = "mailto:" + BIZ.email; });
  if (BIZ.max_active_bookings_per_phone) MAX_ACTIVE_BOOKINGS = BIZ.max_active_bookings_per_phone;
  if (BIZ.booking_lead_hours) BOOKING_LEAD_HOURS = BIZ.booking_lead_hours;
  if (BIZ.default_buffer_minutes) BUFFER_MINUTES = BIZ.default_buffer_minutes;

  // Floating WhatsApp button — visible everywhere on the site if a
  // WhatsApp number is set, hidden entirely otherwise.
  const waFloat = document.getElementById("waFloatBtn");
  const waDigits = (BIZ.whatsapp_number || "").replace(/[^\d]/g, "");
  if (waFloat) {
    if (waDigits) {
      const text = `Hi ${BIZ.business_name || ""}, I'd like to book an appointment.`;
      waFloat.href = "https://wa.me/" + waDigits + "?text=" + encodeURIComponent(text);
      waFloat.style.display = "flex";
    } else {
      waFloat.style.display = "none";
    }
  }
  // Any inline WhatsApp links on the page (e.g. the Contact page card) get the same treatment
  document.querySelectorAll(".wa-inline-cta").forEach(el=>{
    if (waDigits) {
      const text = `Hi ${BIZ.business_name || ""}, I'd like to book an appointment.`;
      el.href = "https://wa.me/" + waDigits + "?text=" + encodeURIComponent(text);
      el.style.display = "";
    } else {
      el.style.display = "none";
    }
  });
}

/* ---------- Catalog (categories, services, specialists, holidays) ---------- */
let categories = [], treatments = {}, specialists = [{ n: "No Preference", s: "Any available specialist" }], holidays = [];

async function loadCatalog() {
  try {
    const { data: cats } = await sb.from("categories").select("*");
    const { data: svcs } = await sb.from("services").select("*");
    categories = cats || [];
    treatments = {};
    categories.forEach(c => treatments[c.id] = []);
    (svcs || []).forEach(s => {
      if (!treatments[s.category_id]) treatments[s.category_id] = [];
      treatments[s.category_id].push({
        id: s.id, n: s.name, n_ar: s.name_ar || "", d: s.duration_minutes + " min", p: s.price,
        desc: s.description || "", desc_ar: s.description_ar || "",
        img: s.image_url || "", catId: s.category_id, onlineBookable: s.online_bookable, depositRequired: s.deposit_required,
        prepMinutes: s.prep_minutes, bufferMinutes: s.buffer_minutes,
      });
    });
  } catch (e) { categories = []; treatments = {}; }

  try {
    const { data: sps } = await sb.from("specialists").select("*");
    specialists = [{ n: "No Preference", s: "Any available specialist" }].concat(
      (sps || []).map(s => ({ id: s.id, n: s.name, n_ar: s.name_ar || "", s: s.title || "", s_ar: s.title_ar || "", capableCategories: s.capable_categories || [], workingDays: s.working_days || [], vacationDates: s.vacation_dates || [] }))
    );
  } catch (e) { specialists = [{ n: "No Preference", s: "Any available specialist" }]; }

  try {
    const { data: hols } = await sb.from("holidays").select("*");
    holidays = (hols || []).map(h => ({ date: h.date, label: h.label, label_ar: h.label_ar || "" }));
  } catch (e) { holidays = []; }
}
function isHoliday(dateStr) { return holidays.some(h => h.date === dateStr); }
function holidayLabel(dateStr) { const h = holidays.find(x => x.date === dateStr); if(!h) return null; return (currentLang==="ar" && h.label_ar) ? h.label_ar : h.label; }
function dn(obj){ return (obj && currentLang==="ar" && obj.n_ar) ? obj.n_ar : (obj ? obj.n : ""); } // display name, language-aware
function dt(obj){ return (obj && currentLang==="ar" && obj.s_ar) ? obj.s_ar : (obj ? obj.s : ""); } // display title/subtitle, language-aware
function dd(obj){ return (obj && currentLang==="ar" && obj.desc_ar) ? obj.desc_ar : (obj ? obj.desc : ""); } // display description, language-aware
function dcat(c){ return (c && currentLang==="ar" && c.name_ar) ? c.name_ar : (c ? c.name : ""); } // category display name, language-aware (categories use .name/.name_ar, not .n/.n_ar)

/* Editorial fallback photography, shown whenever a service has no image_url set in the admin dashboard */
const CATEGORY_FALLBACK_IMAGES = {
  hair: "images/ritual-hair-treatment.jpg",
  skin: "images/ritual-skin-treatment.jpg",
  nails: "images/ritual-nails-treatment.jpg",
  brows: "images/gallery-lash-detail.jpg",
  makeup: "images/ritual-makeup-treatment.jpg",
  bridal: "images/ritual-bridal-treatment.jpg",
  spa: "images/house-spa-details.jpg",
};
/* More specific photo, chosen by service name, used before falling back to the category image above.
   Order matters — more specific terms are checked before the broad "treatment" catch-all. */
const KEYWORD_IMAGES = [
  { test:/henna/i, img:"images/gallery-henna-bridal.jpg" },
  { test:/lash/i, img:"images/gallery-lash-detail.jpg" },
  { test:/brow/i, img:"images/ritual-makeup-treatment.jpg" },
  { test:/colou?r|dye|highlight|balayage/i, img:"images/gallery-hair-color.jpg" },
  { test:/spa/i, img:"images/house-spa-details.jpg" },
  { test:/make-?up|glam/i, img:"images/ritual-makeup-treatment.jpg" },
  { test:/skin/i, img:"images/ritual-skin-treatment.jpg" },
  { test:/treatment|wash|shampoo|scalp/i, img:"images/ritual-hair-treatment.jpg" },
];
function ritualImage(svc){
  if (svc && svc.img) return svc.img;
  const name = (svc && svc.n) ? svc.n : "";
  for (const k of KEYWORD_IMAGES){ if (k.test.test(name)) return k.img; }
  return CATEGORY_FALLBACK_IMAGES[svc && svc.catId] || "images/ritual-skin-treatment.jpg";
}
function specialistsFor(categoryId) {
  const capable = specialists.filter(s => s.n === "No Preference" || (s.capableCategories || []).includes(categoryId));
  return capable.length ? capable : specialists;
}
function specialistWorks(specialistName, dateStr) {
  if (specialistName === "No Preference" || !specialistName) return true;
  const sp = specialists.find(s => s.n === specialistName);
  if (!sp) return true;
  const dow = new Date(dateStr + "T00:00:00").getDay();
  if (sp.workingDays && sp.workingDays.length && !sp.workingDays.includes(dow)) return false;
  if ((sp.vacationDates || []).includes(dateStr)) return false;
  return true;
}
function specialistIdByName(name) { const sp = specialists.find(s => s.n === name); return sp && sp.id ? sp.id : null; }
function specialistNameById(id) { if (!id) return "No Preference"; const sp = specialists.find(s => s.id === id); return sp ? sp.n : "No Preference"; }

let visitInfo = [];
let visitInfoAr = []; // Arabic counterparts, matched to visitInfo by index — no admin UI to edit these yet, DB-only for now
const testimonials = [
  {q:"The most unhurried, considered experience I've had in the city.",n:"Lea K.",q_ar:"التجربة الأكثر هدوءاً واهتماماً بالتفاصيل التي عايشتها في المدينة.",n_ar:"ليا ك."},
  {q:"Booking felt like reserving a table at a favourite restaurant — effortless.",n:"Nour A.",q_ar:"شعرت بأن الحجز سهل تماماً، كحجز طاولة في مطعمي المفضل.",n_ar:"نور أ."},
  {q:"Quiet luxury, exactly as promised. My hair has never looked better.",n:"Yasmine H.",q_ar:"رفاهية هادئة، تماماً كما وُعدت. شعري لم يكن بهذا الجمال من قبل.",n_ar:"ياسمين ه."},
];

/* ---------- Loader ---------- */
window.addEventListener("load",()=>{
  setTimeout(()=>document.getElementById("loader").classList.add("hide"),1300);
});

/* ---------- Custom cursor ---------- */
const cdot=document.getElementById("cdot"), cring=document.getElementById("cring");
let mx=0,my=0,rx=0,ry=0;
window.addEventListener("mousemove",e=>{mx=e.clientX;my=e.clientY;cdot.style.left=mx+"px";cdot.style.top=my+"px";});
function ringLoop(){rx+=(mx-rx)*0.18;ry+=(my-ry)*0.18;cring.style.left=rx+"px";cring.style.top=ry+"px";requestAnimationFrame(ringLoop);}
ringLoop();
document.querySelectorAll("a,button,.choice,.treat-row,.spec-card,.time-slot,.date-pill").forEach(el=>{
  el.addEventListener("mouseenter",()=>cring.classList.add("grow"));
  el.addEventListener("mouseleave",()=>cring.classList.remove("grow"));
});

/* ---------- Header scroll state ---------- */
const header=document.getElementById("siteHeader");
window.addEventListener("scroll",()=>{
  header.classList.toggle("scrolled",window.scrollY>40);
});

/* ---------- Mobile nav drawer (shown under 900px, where the inline nav hides) ---------- */
function toggleMobileNav(){
  document.getElementById("mobileNav").classList.toggle("open");
  document.getElementById("navScrim").classList.toggle("open");
}
function closeMobileNav(){
  document.getElementById("mobileNav").classList.remove("open");
  document.getElementById("navScrim").classList.remove("open");
}

/* ---------- Menu links: scroll to the right section, accounting for the
   fixed header's height so the section title isn't hidden underneath it ---------- */
document.querySelectorAll('a.nav-link[href^="#"]').forEach(link=>{
  link.addEventListener("click", function(e){
    const id=this.getAttribute("href").slice(1);
    const target = id ? document.getElementById(id) : null;
    if(!target) return; // e.g. Manage Booking's href="#" — its own onclick handles it
    e.preventDefault();
    const headerH = header.offsetHeight;
    const y = target.getBoundingClientRect().top + window.pageYOffset - headerH - 12;
    window.scrollTo({top:y, behavior:"smooth"});
    closeMobileNav();
  });
});

/* ---------- Scroll reveal ---------- */
const io=new IntersectionObserver((entries)=>{
  entries.forEach(en=>{ if(en.isIntersecting) en.target.classList.add("in"); });
},{threshold:.15});
document.querySelectorAll(".reveal").forEach(el=>io.observe(el));

/* ---------- Build Beauty Menu rail + tabs (both driven by the live catalog) ---------- */
function buildMenuRail(cat){
  const rail=document.getElementById("menuRail");
  if(!rail) return;
  rail.innerHTML="";
  let list;
  if (cat==="all"){
    // On the "All" tab, show one service per distinct photo so the grid doesn't repeat
    // the same image on multiple cards (each category tab still shows its full list).
    const seenImages = new Set();
    list = [];
    Object.values(treatments).flat().forEach(svc=>{
      const img = ritualImage(svc);
      if (!seenImages.has(img)){
        seenImages.add(img);
        list.push(svc);
      }
    });
  } else {
    list = treatments[cat] || [];
  }
  list.forEach(svc=>{
    const card=document.createElement("div");
    card.className="ritual-card";
    card.innerHTML=`
      <div class="ritual-img"><img src="${ritualImage(svc)}" alt="${dn(svc)}" loading="lazy"></div>
      <div class="ritual-body">
        <h3>${dn(svc)}</h3>
        <div class="ritual-meta">${dd(svc)}</div>
        <div class="ritual-row">
          <span class="ritual-price">$${svc.p}</span>
          <a href="#" class="reserve-link" onclick="openBooking();return false;">${t("btn_reserve")}</a>
        </div>
      </div>`;
    rail.appendChild(card);
  });
}
function buildMenuTabs(){
  const wrap=document.querySelector(".menu-tabs");
  if(!wrap) return;
  wrap.innerHTML = `<button class="menu-tab active" data-cat="all">${t("tab_all")}</button>` +
    categories.map(c=>`<button class="menu-tab" data-cat="${c.id}">${dcat(c)}</button>`).join("");
  wrap.querySelectorAll(".menu-tab").forEach(tab=>{
    tab.addEventListener("click",()=>{
      wrap.querySelectorAll(".menu-tab").forEach(t=>t.classList.remove("active"));
      tab.classList.add("active");
      buildMenuRail(tab.dataset.cat);
    });
  });
}

/* ---------- Rituals rail (curated) ---------- */
const ritualRail=document.getElementById("ritualRail");
function buildRitualRail(){
  if(!ritualRail) return;
  ritualRail.innerHTML="";
  const picks=[treatments.skin&&treatments.skin[1], treatments.hair&&treatments.hair[1], treatments.nails&&treatments.nails[2]].filter(Boolean);
  picks.forEach(svc=>{
    const card=document.createElement("div");
    card.className="ritual-card";
    card.innerHTML=`<div class="ritual-img"><img src="${ritualImage(svc)}" alt="${dn(svc)}" loading="lazy"></div>
      <div class="ritual-body"><h3>${dn(svc)}</h3><div class="ritual-meta">${dd(svc)}</div>
      <div class="ritual-row"><span class="ritual-price">$${svc.p}</span><a href="#" class="reserve-link" onclick="openBooking();return false;">${t("btn_reserve")}</a></div></div>`;
    ritualRail.appendChild(card);
  });
}

/* ---------- Your Visit accordion (built from Business Settings, once loaded) ---------- */
const visitWrap=document.getElementById("visitAccordion");
function buildVisitAccordion(){
  if(!visitWrap) return;
  visitWrap.innerHTML="";
  visitInfo.forEach((item,i)=>{
    const arItem = (currentLang==="ar" && visitInfoAr[i]) ? visitInfoAr[i] : null;
    const q = arItem && arItem.q ? arItem.q : item.q;
    const a = arItem && arItem.a ? arItem.a : item.a;
    const el=document.createElement("div");
    el.className="visit-item";
    el.innerHTML=`
      <button class="visit-q" onclick="toggleVisit(this)">
        <span class="num">0${i+1}</span><h3>${q}</h3><span class="plus"></span>
      </button>
      <div class="visit-a"><p>${a}</p></div>`;
    visitWrap.appendChild(el);
  });
}
function toggleVisit(btn){
  const item=btn.parentElement;
  const wasOpen=item.classList.contains("open");
  document.querySelectorAll(".visit-item").forEach(v=>{v.classList.remove("open");v.querySelector(".visit-a").style.maxHeight=null;});
  if(!wasOpen){ item.classList.add("open"); const a=item.querySelector(".visit-a"); a.style.maxHeight=a.scrollHeight+"px"; }
}

/* ---------- Testimonials ---------- */
let testiIndex=0;
const testiText=document.getElementById("testiText"), testiName=document.getElementById("testiName"), testiDots=document.getElementById("testiDots");
if(testiDots){
  testimonials.forEach((_,i)=>{
    const d=document.createElement("span"); if(i===0)d.classList.add("active");
    d.onclick=()=>showTesti(i); testiDots.appendChild(d);
  });
}
function showTesti(i){
  if(!testiText||!testiName||!testiDots) return;
  testiIndex=i;
  testiText.style.opacity=0;
  setTimeout(()=>{
    const item=testimonials[i];
    testiText.textContent="“"+(currentLang==="ar"&&item.q_ar?item.q_ar:item.q)+"”";
    testiName.textContent=currentLang==="ar"&&item.n_ar?item.n_ar:item.n;
    testiText.style.opacity=1;
    [...testiDots.children].forEach((d,j)=>d.classList.toggle("active",j===i));
  },300);
}
if(testiText){
  testiText.style.transition="opacity .4s ease";
  showTesti(0);
  setInterval(()=>showTesti((testiIndex+1)%testimonials.length),5500);
}

/* ============ BOOKING FLOW LOGIC ============ */
const state={service:null,treatment:null,specialist:specialists[0].n,date:null,time:null,lastPhone:null};
let step=0;
const totalSteps=7;

function openBooking(){
  document.getElementById("bookOverlay").classList.add("open");
  document.body.style.overflow="hidden";
  step=0; renderStep();
}
function closeBooking(){
  document.getElementById("bookOverlay").classList.remove("open");
  document.body.style.overflow="";
}

/* Steps indicator */
const stepsWrap=document.getElementById("bookSteps");
for(let i=0;i<totalSteps-1;i++){ const s=document.createElement("div"); s.className="seg"; stepsWrap.appendChild(s); }

function updateStepsUI(){
  [...stepsWrap.children].forEach((seg,i)=>{
    seg.classList.toggle("done", i<step);
    seg.classList.toggle("current", i===step);
  });
}

/* Build service grid */
const serviceGrid=document.getElementById("serviceGrid");
function buildServiceGrid(){
  serviceGrid.innerHTML="";
  categories.forEach(c=>{
    const el=document.createElement("div");
    el.className="choice"; el.dataset.id=c.id;
    el.innerHTML=`<h3>${dcat(c)}</h3><span>${(treatments[c.id]||[]).length} ${t("rituals_suffix")}</span>`;
    el.onclick=()=>{ state.service=c.id; state.treatment=null; state.time=null;
      [...serviceGrid.children].forEach(x=>x.classList.remove("selected"));
      el.classList.add("selected"); updateNextEnabled(); };
    serviceGrid.appendChild(el);
  });
}

/* Build treatment list (depends on service) */
function renderTreatList(){
  const list=document.getElementById("treatList");
  const cat = state.service ? categories.find(c=>c.id===state.service) : null;
  const catName = cat ? (currentLang==="ar" && cat.name_ar ? cat.name_ar : cat.name) : "";
  document.getElementById("treatHeading").textContent = state.service
    ? (currentLang==="ar" ? (t("select_treatment_prefix")+" "+catName) : (t("select_treatment_prefix")+" "+catName.toLowerCase()+" "+t("select_treatment_suffix")))
    : t("select_treatment_default");
  list.innerHTML="";
  const items = state.service ? treatments[state.service] : [];
  items.forEach(svc=>{
    const row=document.createElement("div");
    row.className="treat-row";
    row.innerHTML=`<div><div class="treat-name">${dn(svc)}</div><div class="treat-meta">${svc.d} · ${dd(svc)}</div></div><div class="treat-price">$${svc.p}</div>`;
    row.onclick=()=>{ if(state.treatment!==svc){ state.time=null; } state.treatment=svc;
      [...list.children].forEach(x=>x.classList.remove("selected"));
      row.classList.add("selected"); updateNextEnabled(); };
    list.appendChild(row);
  });
}

/* Build specialists — filtered to whoever can actually perform the chosen service */
const specialistGrid=document.getElementById("specialistGrid");
function buildSpecialistGrid(){
  specialistGrid.innerHTML="";
  const list = state.service ? specialistsFor(state.service) : specialists;
  if(state.specialist && !list.some(s=>s.n===state.specialist)) state.specialist=list[0].n;
  list.forEach(s=>{
    const el=document.createElement("div");
    el.className="spec-card"; if(state.specialist ? state.specialist===s.n : s.n==="No Preference") el.classList.add("selected");
    el.innerHTML=`<div class="avatar"></div><h3>${s.n==="No Preference"?t("no_preference"):dn(s)}</h3><span>${s.n==="No Preference"?"":dt(s)}</span>`;
    el.onclick=()=>{ if(state.specialist!==s.n){ state.time=null; } state.specialist=s.n;
      [...specialistGrid.children].forEach(x=>x.classList.remove("selected"));
      el.classList.add("selected"); };
    specialistGrid.appendChild(el);
  });
}

/* ---------- Shared real-time availability (window.storage, shared across all visitors) ----------
   Availability is now duration-aware and per-specialist:
   - Each treatment's duration (plus a fixed buffer) determines how many
     consecutive 30-minute slots a booking occupies.
   - Two different specialists CAN share the same time — only bookings with
     the SAME specialist conflict. "No Preference" is treated as its own
     bookable lane. This is a reasonable prototype approximation of real
     staff-capacity scheduling, not a true resource-assignment engine — a
     production system would assign "No Preference" against actual staff
     rosters and real working-hour/day-off data per employee.
   - Admin-blocked time (breaks, meetings, maintenance) is stored as a
     special booking with status "blocked" and no specialist, so it blocks
     every specialist. */

let ALL_SLOTS=["09:00","09:30","10:00","10:30","11:00","11:30","12:00","12:30","13:00","13:30","14:00","14:30","15:00","15:30","16:00","16:30","17:00","17:30"];
// Rebuilds the bookable slot grid from Business Settings' configurable daily
// break (if one is turned on) — replaces the old hardcoded gaps that had no
// admin control. Called once Business Settings has loaded.
function computeAllSlots(){
  const base=["09:00","09:30","10:00","10:30","11:00","11:30","12:00","12:30","13:00","13:30","14:00","14:30","15:00","15:30","16:00","16:30","17:00","17:30"];
  if(!BIZ.break_enabled || !BIZ.break_start) return base;
  const [bh,bm]=BIZ.break_start.split(":").map(Number);
  const breakStartMin=bh*60+bm;
  const breakEndMin=breakStartMin+(BIZ.break_duration_minutes||60);
  return base.filter(t=>{
    const [h,m]=t.split(":").map(Number);
    const mins=h*60+m;
    return !(mins>=breakStartMin && mins<breakEndMin);
  });
}
let BUFFER_MINUTES=15;
let BOOKING_LEAD_HOURS=2;       // can't book within this many hours of now
let MAX_ACTIVE_BOOKINGS=3;      // per phone number

function dateKey(d){ return d.toISOString().slice(0,10); }
function slotIndex(time){ return ALL_SLOTS.indexOf(time); }
function durationMinutes(label){ const m=/(\d+)/.exec(label||""); return m?parseInt(m[1],10):30; }

function requiredSlotsFor(time, durationLabel, bufferOverride){
  const startIdx=slotIndex(time);
  if(startIdx===-1) return null;
  const buffer = (bufferOverride===null||bufferOverride===undefined) ? BUFFER_MINUTES : bufferOverride;
  const totalMin=durationMinutes(durationLabel)+buffer;
  const count=Math.ceil(totalMin/30);
  const out=[];
  for(let i=0;i<count;i++){
    const idx=startIdx+i;
    if(idx>=ALL_SLOTS.length) return null;
    if(i>0){
      const [ph,pm]=ALL_SLOTS[idx-1].split(":").map(Number);
      const [ch,cm]=ALL_SLOTS[idx].split(":").map(Number);
      if((ch*60+cm)-(ph*60+pm)!==30) return null;
    }
    out.push(ALL_SLOTS[idx]);
  }
  return out;
}

// Pulls the real, live availability for one date from the database via the
// public_availability RPC (Phase 1) — returns which time ranges are taken
// and by which specialist lane, WITHOUT exposing any customer details.
// Converts each taken range into the same discrete-slot shape the rest of
// the booking UI already expects, so slotsFree() below barely changed.
async function loadDayBookings(dateStr){
  try{
    const { data, error } = await sb.rpc("public_availability", { p_date: dateStr, p_specialist_id: null });
    if(error || !data) return [];
    return data.map(row=>{
      const slots=[];
      let idx=slotIndex(row.start_time.slice(0,5));
      const endIdx=slotIndex(row.end_time.slice(0,5));
      if(idx===-1) return null;
      if(endIdx===-1){ // end time runs past the last defined slot start — just take from idx to the end of the day
        for(let i=idx;i<ALL_SLOTS.length;i++) slots.push(ALL_SLOTS[i]);
      } else {
        for(let i=idx;i<endIdx;i++) slots.push(ALL_SLOTS[i]);
      }
      return { specialist: specialistNameById(row.specialist_id), slots, status: row.status };
    }).filter(Boolean);
  }catch(e){ return []; }
}

function specialistLane(specialist){ return specialist || "No Preference"; }

// Is this exact set of slots free for this specialist on this date?
function slotsFree(dayList, specialist, slots, excludeId){
  return !dayList.some(b=>{
    if(b.id===excludeId) return false;
    if(specialistLane(b.specialist)!==specialistLane(specialist)) return false;
    return (b.slots||[]).some(s=>slots.includes(s));
  });
}

function isWithinLeadTime(dateStr, time){
  const apptTime=new Date(dateStr+"T"+time+":00");
  return (apptTime-new Date())/3600000 < BOOKING_LEAD_HOURS;
}

/* ---------- Booking actions — all customer-facing writes go through the
   booking-api Edge Function, which re-validates everything server-side and
   relies on a real Postgres constraint to make double-booking physically
   impossible, not just unlikely. ---------- */

async function claimSlot(d, time, bookingDetails){
  const dateStr=dateKey(d);
  const res = await callBookingApi("create_booking", {
    service_id: bookingDetails.serviceId,
    specialist_id: specialistIdByName(bookingDetails.specialist),
    date: dateStr, time,
    name: bookingDetails.name, phone: bookingDetails.phone, email: bookingDetails.email,
    notes: bookingDetails.notes, deposit: bookingDetails.deposit,
  });
  if(res.ok){ rememberMyDetails(bookingDetails); }
  return res.ok ? {ok:true, id:res.booking_id} : {ok:false, reason:res.reason||"taken", message:res.message};
}

async function cancelBookingByIds(dateStr, id, phone){
  return await callBookingApi("cancel_booking", { booking_id:id, phone });
}

async function rescheduleBookingApi(id, phone, newDateStr, newTime){
  return await callBookingApi("reschedule_booking", { booking_id:id, phone, new_date:newDateStr, new_time:newTime });
}

async function joinWaitlist(dateStr, specialist, details){
  return await callBookingApi("join_waitlist", {
    date: dateStr, specialist_id: specialistIdByName(specialist), phone: details.phone, name: details.name, treatment: details.treatment,
  });
}

async function lookupMyBookingsApi(phone){
  return await callBookingApi("lookup_by_phone", { phone });
}

/* ---------- Returning-visitor convenience (this device only — never a
   substitute for the phone-based Manage Booking lookup, which works from
   any device). Plain localStorage, no server round-trip. ---------- */
function rememberMyDetails(d){
  try{ localStorage.setItem("lume:my-details", JSON.stringify({name:d.name, phone:d.phone, email:d.email})); }catch(e){}
}
async function tryPrefillReturningCustomer(){
  if(document.getElementById("fName").value.trim()) return;
  try{
    const raw=localStorage.getItem("lume:my-details");
    if(!raw) return;
    const mine=JSON.parse(raw);
    document.getElementById("fName").value=mine.name||"";
    document.getElementById("fPhone").value=mine.phone||"";
    document.getElementById("fEmail").value=mine.email||"";
    updateNextEnabled();
    const note=document.getElementById("returningNote");
    note.textContent = t("welcome_back")+(mine.name?", "+mine.name:"")+" "+t("welcome_back_msg");
    note.style.display="block";
  }catch(e){}
}

/* ---------- Manage Booking overlay ---------- */
function openManage(){
  document.getElementById("manageOverlay").classList.add("open");
  document.body.style.overflow="hidden";
}
function closeManage(){
  document.getElementById("manageOverlay").classList.remove("open");
  document.body.style.overflow="";
}
async function lookupMyBookings(){
  const phone=document.getElementById("managePhone").value.trim();
  const results=document.getElementById("manageResults");
  if(!phone){ results.innerHTML="<p style='color:var(--espresso-45);font-size:13px;'>"+t("manage_enter_phone")+"</p>"; return; }
  results.innerHTML="<p style='color:var(--espresso-45);font-size:13px;'>"+t("manage_searching")+"</p>";
  const res = await lookupMyBookingsApi(phone);
  if(!res.ok || !res.bookings || !res.bookings.length){
    results.innerHTML="<p style='color:var(--espresso-45);font-size:13px;'>"+t("manage_no_appts")+"</p>";
    return;
  }
  results.innerHTML="";
  res.bookings.forEach(h=>{
    const row=document.createElement("div");
    row.className="summary-box";
    row.style.marginBottom="14px";
    row.innerHTML=`
      <div class="summary-row"><span class="k">${t("summary_service")}</span><span class="v">${h.treatment_name||"—"}</span></div>
      <div class="summary-row"><span class="k">${t("summary_date")}</span><span class="v">${h.booking_date}</span></div>
      <div class="summary-row"><span class="k">${t("summary_time")}</span><span class="v">${h.start_time.slice(0,5)}</span></div>
      <div style="margin-top:16px;display:flex;gap:10px;flex-wrap:wrap;">
        <button class="ghost-btn cancel-btn">${t("btn_cancel_appt")}</button>
        <button class="ghost-btn reschedule-btn">${t("btn_reschedule")}</button>
      </div>
      <div class="reschedule-panel" style="display:none;margin-top:18px;padding-top:18px;border-top:1px solid var(--line);">
        <div class="date-rail resched-dates" style="margin-bottom:14px;"></div>
        <div class="time-grid resched-times"></div>
        <div class="resched-status" style="margin-top:10px;font-size:12px;color:var(--olive-deep);"></div>
      </div>`;
    row.querySelector(".cancel-btn").onclick=async (ev)=>{
      if(!confirm(t("cancel_confirm_dialog"))) return;
      ev.target.textContent=t("cancelling");
      ev.target.disabled=true;
      const r=await cancelBookingByIds(h.booking_date, h.id, phone);
      if(r.ok){ row.style.opacity=.5; ev.target.textContent=t("cancelled"); }
      else{ ev.target.textContent=t("btn_cancel_appt"); ev.target.disabled=false; }
    };
    row.querySelector(".reschedule-btn").onclick=()=>{
      const panel=row.querySelector(".reschedule-panel");
      const isOpen = panel.style.display==="block";
      panel.style.display = isOpen ? "none" : "block";
      if(!isOpen) buildRescheduleUI(row, h, phone);
    };
    results.appendChild(row);
  });
}

// Builds a compact date/time picker inside a Manage Booking result row so a
// customer can reschedule without going back through the full flow.
function buildRescheduleUI(row, h, phone){
  const dateWrap=row.querySelector(".resched-dates");
  const timeWrap=row.querySelector(".resched-times");
  const status=row.querySelector(".resched-status");
  let chosenDate=null;
  const dowNamesLocal=[t("dow_sun"),t("dow_mon"),t("dow_tue"),t("dow_wed"),t("dow_thu"),t("dow_fri"),t("dow_sat")];

  async function paintTimes(){
    timeWrap.innerHTML="";
    if(!chosenDate) return;
    const dateStr=dateKey(chosenDate);
    const bookings = await loadDayBookings(dateStr);
    ALL_SLOTS.forEach(startTime=>{
      const el=document.createElement("div");
      el.className="time-slot";
      const withinLead=isWithinLeadTime(dateStr, startTime);
      const overlap = bookings.some(b=> specialistLane(b.specialist)===specialistLane(null) ? false : (b.slots||[]).includes(startTime));
      const unavailable = withinLead || overlap;
      if(unavailable) el.classList.add("unavailable");
      el.textContent=startTime;
      el.onclick=async ()=>{
        if(unavailable) return;
        status.textContent=t("rescheduling");
        const r=await rescheduleBookingApi(h.id, phone, dateStr, startTime);
        if(r.ok){
          status.style.color="var(--olive-deep)";
          status.textContent=t("resched_moved",{date:dateStr,time:startTime});
        }else{
          status.style.color="#A3503F";
          status.textContent = r.reason==="lead-time"
            ? t("resched_lead_closed",{h:BOOKING_LEAD_HOURS})
            : (r.message || t("resched_taken"));
        }
      };
      timeWrap.appendChild(el);
    });
  }

  dateWrap.innerHTML="";
  const today=new Date();
  for(let i=0;i<7;i++){
    const d=new Date(today); d.setDate(today.getDate()+i);
    const el=document.createElement("div");
    el.className="date-pill"; if(i===0){ el.classList.add("selected"); chosenDate=d; }
    el.innerHTML=`<div class="dow">${dowNamesLocal[d.getDay()]}</div><div class="dnum">${d.getDate()}</div>`;
    el.onclick=()=>{ chosenDate=d; [...dateWrap.children].forEach(x=>x.classList.remove("selected")); el.classList.add("selected"); paintTimes(); };
    dateWrap.appendChild(el);
  }
  paintTimes();
}

async function cancelMyJustBookedAppointment(){
  if(!state.date || !state.time || !lastConfirmNum || !state.lastPhone) return;
  if(!confirm(t("cancel_confirm_dialog"))) return;
  const btn=document.getElementById("cancelMineBtn");
  btn.textContent=t("cancelling");
  const r=await cancelBookingByIds(dateKey(state.date), lastConfirmNum, state.lastPhone);
  const status=document.getElementById("cancelStatus");
  if(r.ok){
    btn.style.display="none";
    status.style.color="#A3503F";
    status.textContent=t("appt_cancelled_msg");
  }else{
    status.style.color="#A3503F";
    status.textContent=r.message||t("appt_cancel_failed");
    btn.textContent=t("btn_cancel_this");
  }
}

const dateRail=document.getElementById("dateRail");
const dowNames=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"]; // ALL_SLOTS-adjacent calendar labels — kept short/Latin for date-grid legibility in both languages
function renderDates(){
  dateRail.innerHTML="";
  const today=new Date();
  for(let i=0;i<7;i++){
    const d=new Date(today); d.setDate(today.getDate()+i);
    const el=document.createElement("div");
    el.className="date-pill"; if(i===0) el.classList.add("selected");
    el.innerHTML=`<div class="dow">${dowNames[d.getDay()]}</div><div class="dnum">${d.getDate()}</div>`;
    el.onclick=()=>{ state.date=d; state.time=null;
      [...dateRail.children].forEach(x=>x.classList.remove("selected"));
      el.classList.add("selected"); renderTimes(); updateNextEnabled(); };
    dateRail.appendChild(el);
    if(i===0) state.date=d;
  }
}

let timeGridRequestId=0;
async function renderTimes(){
  const grid=document.getElementById("timeGrid");
  if(!state.date) return;
  const thisRequest=++timeGridRequestId;
  grid.classList.add("loading");
  const dateStr=dateKey(state.date);
  const bookings = await loadDayBookings(dateStr);
  if(thisRequest!==timeGridRequestId) return; // a newer request superseded this one
  grid.classList.remove("loading");

  const durationLabel = state.treatment ? state.treatment.d : "30 min";
  const bufferOverride = state.treatment ? state.treatment.bufferMinutes : null;
  let stillFree=false;

  // Whole-day blockers: a holiday, or this specific specialist being off/on vacation.
  const dayClosed = isHoliday(dateStr);
  const specialistOff = !dayClosed && !specialistWorks(state.specialist, dateStr);
  const dayNote=document.getElementById("dayClosedNote");
  if(dayClosed){ dayNote.style.display="block"; dayNote.textContent=`Closed — ${holidayLabel(dateStr)||"holiday"}. Please choose another date.`; }
  else if(specialistOff){ dayNote.style.display="block"; dayNote.textContent=`${state.specialist} isn't working this day. Choose another date or specialist.`; }
  else{ dayNote.style.display="none"; }

  grid.innerHTML="";
  ALL_SLOTS.forEach(startTime=>{
    const required = requiredSlotsFor(startTime, durationLabel, bufferOverride);
    const withinLead = isWithinLeadTime(dateStr, startTime);
    const unavailable = dayClosed || specialistOff || withinLead || !required || !slotsFree(bookings, state.specialist, required, null);
    if(!unavailable && state.time===startTime) stillFree=true;

    const el=document.createElement("div");
    el.className="time-slot";
    if(unavailable) el.classList.add("unavailable");
    if(state.time===startTime) el.classList.add("selected");
    el.textContent=startTime;
    el.onclick=()=>{
      if(unavailable) return;
      state.time=startTime;
      [...grid.children].forEach(x=>x.classList.remove("selected"));
      el.classList.add("selected"); updateNextEnabled(); document.getElementById("waitlistRow").style.display="none";
    };
    grid.appendChild(el);
  });

  document.getElementById("waitlistRow").style.display="none";
  // if the currently selected time just got taken by someone else, clear it
  if(state.time && !stillFree) state.time=null;

  updateNextEnabled();
}

// Poll for other customers' bookings while the date/time step is open, so slots
// go red for everyone in near real time without needing a manual refresh.
// (Real push updates aren't available in this environment — this is polling,
// same honest limitation as the rest of this project's real-time features.)
setInterval(()=>{
  if(document.getElementById("bookOverlay").classList.contains("open") && step===3){
    renderTimes();
  }
},5000);
document.addEventListener("visibilitychange",()=>{
  if(!document.hidden && document.getElementById("bookOverlay").classList.contains("open") && step===3){
    renderTimes();
  }
});

/* Deposit toggle */
let depositOn=false;
function toggleDeposit(){
  depositOn=!depositOn;
  document.getElementById("depositSwitch").classList.toggle("on",depositOn);
}

/* Summary */
function renderSummary(){
  const box=document.getElementById("summaryBox");
  const svcName = state.service ? (categories.find(c=>c.id===state.service)||{}).name||"—" : "—";
  const dateStr = state.date ? state.date.toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric'}) : "—";
  box.innerHTML=`
    <div class="summary-row"><span class="k">${t("summary_service")}</span><span class="v">${svcName}</span></div>
    <div class="summary-row"><span class="k">${t("summary_ritual")}</span><span class="v">${state.treatment?state.treatment.n:"—"}</span></div>
    <div class="summary-row"><span class="k">${t("summary_specialist")}</span><span class="v">${state.specialist==="No Preference"?t("no_preference"):state.specialist}</span></div>
    <div class="summary-row"><span class="k">${t("summary_date")}</span><span class="v">${dateStr}</span></div>
    <div class="summary-row"><span class="k">${t("summary_time")}</span><span class="v">${state.time||"—"}</span></div>
    <div class="summary-row"><span class="k">${t("summary_duration")}</span><span class="v">${state.treatment?state.treatment.d:"—"}</span></div>
    <div class="summary-row"><span class="k">${t("summary_price")}</span><span class="v">${state.treatment?BIZ.currency_symbol+state.treatment.p:"—"}</span></div>`;
}

/* Confirmation */
let lastConfirmNum="";
// Generates a real, downloadable calendar file (.ics) for the confirmed
// appointment — works with Apple Calendar, Google Calendar, Outlook, and
// most other calendar apps, entirely client-side, no server involved.
function downloadICS(){
  if(!state.date || !state.time || !lastConfirmNum) return;
  const dateStr=dateKey(state.date);
  const durationMin = state.treatment ? durationMinutes(state.treatment.d) : 30;
  const startDate=new Date(dateStr+"T"+state.time+":00");
  const endDate=new Date(startDate.getTime()+durationMin*60000);

  const pad=n=>String(n).padStart(2,"0");
  const fmt=d=>d.getFullYear()+pad(d.getMonth()+1)+pad(d.getDate())+"T"+pad(d.getHours())+pad(d.getMinutes())+"00";
  const escapeICS=s=>String(s||"").replace(/[\\,;]/g,m=>"\\"+m).replace(/\n/g,"\\n");

  const summary=(state.treatment?state.treatment.n:"Appointment")+" — "+(BIZ.business_name||"");
  const location=BIZ.address||"";
  const description="Reservation No. "+lastConfirmNum+(BIZ.phone?"\n"+BIZ.phone:"");

  const ics=[
    "BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//"+(BIZ.business_name||"Booking")+"//Booking//EN",
    "BEGIN:VEVENT",
    "UID:"+lastConfirmNum+"@booking",
    "DTSTAMP:"+fmt(new Date()),
    "DTSTART:"+fmt(startDate),
    "DTEND:"+fmt(endDate),
    "SUMMARY:"+escapeICS(summary),
    "DESCRIPTION:"+escapeICS(description),
    "LOCATION:"+escapeICS(location),
    "END:VEVENT","END:VCALENDAR",
  ].join("\r\n");

  const blob=new Blob([ics], {type:"text/calendar;charset=utf-8"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url; a.download="appointment.ics";
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
function renderConfirm(){
  document.getElementById("confirmNum").textContent=t("reservation_no")+" "+lastConfirmNum;
  const waBtn=document.getElementById("waConfirmBtn");
  const waDigits=(BIZ.whatsapp_number||"").replace(/[^\d]/g,"");
  if(waDigits){
    const dateStr = state.date ? state.date.toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric'}) : "";
    const text = `Hi ${BIZ.business_name||""}, I'd like to confirm my reservation ${lastConfirmNum} — ${state.treatment?state.treatment.n:""} on ${dateStr} at ${state.time||""}.`;
    waBtn.href = "https://wa.me/"+waDigits+"?text="+encodeURIComponent(text);
    waBtn.style.display="";
  } else {
    waBtn.style.display="none"; // no WhatsApp number set in Business Settings yet
  }
}

/* Panel navigation */
const nextBtn=document.getElementById("nextBtn"), backBtn=document.getElementById("backBtn"), bookNav=document.getElementById("bookNav");
function renderStep(){
  document.querySelectorAll(".book-panel").forEach(p=>{ p.classList.remove("active","show"); });
  const panel=document.querySelector(`.book-panel[data-step="${step}"]`);
  panel.classList.add("active");
  requestAnimationFrame(()=>panel.classList.add("show"));
  updateStepsUI();
  backBtn.style.visibility = step===0 ? "hidden" : "visible";
  bookNav.style.display = step===6 ? "none" : "flex";

  if(step===1) renderTreatList();
  if(step===2) buildSpecialistGrid();
  if(step===3){ renderDates(); renderTimes(); }
  if(step===4){
    document.getElementById("returningNote").style.display="none";
    tryPrefillReturningCustomer();
  }
  if(step===5) renderSummary();
  if(step===6) renderConfirm();

  updateNextEnabled();
  nextBtn.textContent = step===5 ? t("btn_confirm_reservation") : t("btn_continue");
  document.querySelector(".book-body").scrollTop=0;
}
function updateNextEnabled(){
  let ok=true;
  if(step===0) ok=!!state.service;
  if(step===1) ok=!!state.treatment;
  if(step===3) ok=!!(state.date && state.time);
  if(step===4) ok = document.getElementById("fName").value.trim() && document.getElementById("fPhone").value.trim();
  nextBtn.disabled=!ok;
}
document.getElementById("fName").addEventListener("input",updateNextEnabled);
document.getElementById("fPhone").addEventListener("input",updateNextEnabled);

async function nextStep(){
  if(step===5){
    // Basic spam defense: a bot that blindly fills every field will also
    // fill this hidden one — quietly stop here, no error shown, so it
    // doesn't learn what tripped it.
    if(document.getElementById("fWebsite").value.trim()){ return; }
    // Final confirm: the booking-api Edge Function re-validates everything
    // (availability, lead time, booking limits) and relies on a real
    // Postgres constraint to make double-booking physically impossible —
    // not just a JS check-then-write.
    nextBtn.disabled=true;
    nextBtn.textContent=t("confirming");
    document.getElementById("slotError").classList.remove("show");

    const name = document.getElementById("fName").value.trim();
    const phone = document.getElementById("fPhone").value.trim();
    const email = document.getElementById("fEmail").value.trim();
    const notes = document.getElementById("fNotes").value.trim();

    const claimed = await claimSlot(state.date, state.time, {
      serviceId: state.treatment ? state.treatment.id : null,
      specialist: state.specialist,
      name, phone, email, notes,
      deposit: depositOn,
    });

    if(!claimed.ok){
      const err=document.getElementById("slotError");
      if(claimed.reason==="lead-time"){
        err.textContent=t("err_lead_time",{h:BOOKING_LEAD_HOURS});
      }else if(claimed.reason==="limit"){
        err.textContent=t("err_limit",{n:MAX_ACTIVE_BOOKINGS});
      }else{
        err.textContent=claimed.message || t("err_generic_taken");
      }
      err.classList.add("show");
      state.time=null;
      step=3; renderStep();
      return;
    }

    lastConfirmNum=claimed.id;
    state.lastPhone=phone;
    document.getElementById("cancelStatus").textContent="";
    document.getElementById("cancelMineBtn").style.display="";
    document.getElementById("cancelMineBtn").textContent=t("btn_cancel_this");
    step=6; renderStep();
    return;
  }
  if(step<6){ step++; renderStep(); }
}
function prevStep(){
  if(step>0){ step--; renderStep(); }
}

/* Join the waitlist for the currently selected treatment/specialist/date */
async function joinCurrentWaitlist(){
  if(!state.date){ return; }
  const phone=document.getElementById("waitlistPhone").value.trim();
  const status=document.getElementById("waitlistStatus");
  if(!phone){ status.textContent=t("waitlist_enter_phone"); return; }
  await joinWaitlist(dateKey(state.date), state.specialist, {
    phone, treatment: state.treatment?state.treatment.n:state.service
  });
  status.textContent=t("waitlist_joined");
}

/* ---------- Bootstrap: load business settings + the shared catalog, then render everything that depends on them ---------- */
async function initApp(){
  applyLanguage(currentLang); // apply saved/default language to static UI immediately, before data loads
  await loadBusinessSettings();
  ALL_SLOTS = computeAllSlots();
  applyBusinessBranding();
  visitInfo = (BIZ.visit_info && BIZ.visit_info.length) ? BIZ.visit_info : visitInfo;
  visitInfoAr = (BIZ.visit_info_ar && BIZ.visit_info_ar.length) ? BIZ.visit_info_ar : [];
  buildVisitAccordion();

  await loadCatalog();
  buildMenuTabs();
  buildMenuRail("all");
  buildRitualRail();
  buildServiceGrid();
  buildSpecialistGrid();
}
initApp();
// Catalog and branding can change from the admin dashboard at any time —
// pick up edits (new services, specialist changes, holidays, business
// settings) without needing a hard refresh. Polling, not push — see the
// note near the availability engine above for why.
setInterval(async ()=>{
  await loadBusinessSettings();
  ALL_SLOTS = computeAllSlots();
  applyBusinessBranding();
  await loadCatalog();
  const activeCat=document.querySelector(".menu-tab.active")?.dataset.cat || "all";
  buildMenuTabs();
  const tabToReactivate=document.querySelector(`.menu-tab[data-cat="${activeCat}"]`);
  if(tabToReactivate){ document.querySelectorAll(".menu-tab").forEach(t=>t.classList.remove("active")); tabToReactivate.classList.add("active"); }
  buildMenuRail(activeCat);
  buildRitualRail();
  if(!document.getElementById("bookOverlay").classList.contains("open")) buildServiceGrid();
}, 15000);
