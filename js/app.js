/* Sri Vinayaga storefront. All money, points and role logic lives in the database; this file only displays and calls it. */
(function () {
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const sb = window.supabase.createClient(SV.url, SV.key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } });

/* ---------- small helpers ---------- */
const store = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
};
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const inr = n => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
/* price block: selling price, crossed-out MRP and the red "Save" ribbon (only when the MRP is higher) */
const priceHtml = v => {
  const off = +v.mrp - +v.price; if (!(off > 0)) return `<span class="now">${inr(v.price)}</span>`;
  const pct = Math.round(off / +v.mrp * 100);
  return `<span class="now">${inr(v.price)}</span><s class="mrp">${inr(v.mrp)}</s><span class="save"><span class="sv-t"><span>${esc(t('saveAmt', inr(off)))}</span>${pct >= 1 ? `<i></i><b>${esc(t('offPct', pct))}</b>` : ''}</span></span>`;
};
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let lang = store.get('sv_lang') || ((navigator.language || '').toLowerCase().startsWith('ta') ? 'ta' : 'en');
const L = (en, ta) => (lang === 'ta' && ta) ? ta : en;
const pick = (o, f) => lang === 'ta' && o[f + '_ta'] ? o[f + '_ta'] : o[f + '_en'];

const T = {
  addToCart: ['Add to cart', 'கார்ட்டில் சேர்'],
  saveAmt: ['Save %1', '%1 சேமிப்பு'],
  offPct: ['%1% OFF', '%1% தள்ளுபடி'],
  added: ['Added to cart', 'கார்ட்டில் சேர்க்கப்பட்டது'],
  outOfStock: ['Out of stock', 'இருப்பு இல்லை'],
  signature: ['Signature', 'சிறப்பு'],
  tinBulk: ['Need more than %1 tins, or buying every month?', '%1 டின்களுக்கு மேல், அல்லது மாதம் தோறும் வாங்குகிறீர்களா?'],
  tinBulkLink: ['Send a bulk enquiry', 'மொத்த ஆர்டர் விசாரணை அனுப்பு'],
  tinMax: ['Online orders are limited to %1 tins. For more, send a bulk enquiry.', 'ஆன்லைனில் %1 டின் வரை மட்டுமே. அதற்கு மேல் மொத்த ஆர்டர் விசாரணை அனுப்பவும்.'],
  deliveryNote: ['Delivery is %1, free on orders of %2 and above.', 'விநியோகக் கட்டணம் %1; %2 மற்றும் அதற்கு மேல் இலவசம்.'],
  cart: ['Your cart', 'உங்கள் கார்ட்'],
  cartEmpty: ['Your cart is empty', 'கார்ட் காலியாக உள்ளது'],
  cartEmptyHint: ['Add an oil from the shelf and it will show up here.', 'எண்ணெயைச் சேர்த்தால் இங்கே தெரியும்.'],
  remove: ['Remove', 'நீக்கு'],
  subtotal: ['Subtotal', 'கூட்டுத்தொகை'],
  pointsUsed: ['Points used', 'பயன்படுத்திய புள்ளிகள்'],
  delivery: ['Delivery', 'விநியோகம்'],
  free: ['Free', 'இலவசம்'],
  total: ['Total', 'மொத்தம்'],
  freeAway: ['Add %1 more for free delivery.', 'இலவச விநியோகத்துக்கு இன்னும் %1 சேர்க்கவும்.'],
  freeYes: ['You get free delivery.', 'உங்களுக்கு இலவச விநியோகம்.'],
  redeemTitle: ['Use your points', 'புள்ளிகளைப் பயன்படுத்து'],
  redeemHint: ['You have %1 points (1 point = ₹1). Minimum %2 to redeem.', 'உங்களிடம் %1 புள்ளிகள் (1 புள்ளி = ₹1). குறைந்தது %2 தேவை.'],
  redeemLow: ['You need at least %1 points to redeem. You have %2.', 'பயன்படுத்த குறைந்தது %1 புள்ளிகள் தேவை. உங்களிடம் %2.'],
  useMax: ['Use maximum', 'அதிகபட்சம்'],
  apply: ['Apply', 'பயன்படுத்து'],
  promoTitle: ['Have a promo code?', 'ப்ரோமோ குறியீடு உள்ளதா?'],
  promoPh: ['Enter code', 'குறியீட்டை உள்ளிடவும்'],
  promoLine: ['Promo %1', 'ப்ரோமோ %1'],
  promoOk: ['%1 applied', '%1 பயன்படுத்தப்பட்டது'],
  promoFree: ['Free delivery on this order', 'இந்த ஆர்டருக்கு இலவச டெலிவரி'],
  promoSave: ['You save %1', 'நீங்கள் சேமிப்பது %1'],
  promoRm: ['Remove', 'நீக்கு'],
  promoDropped: ['The promo code no longer applies to this cart.', 'இந்த கார்ட்டுக்கு ப்ரோமோ குறியீடு இனி பொருந்தாது.'],
  clear: ['Clear', 'நீக்கு'],
  deliverTo: ['Delivery details', 'விநியோக விவரம்'],
  name: ['Full name', 'முழு பெயர்'],
  mobile: ['Mobile number', 'மொபைல் எண்'],
  address: ['Delivery address', 'முகவரி'],
  pin: ['Pincode', 'அஞ்சல் குறியீடு'],
  notes: ['Notes for the mill (optional)', 'குறிப்பு (விருப்பம்)'],
  payHow: ['How would you like to pay?', 'எப்படி செலுத்த விரும்புகிறீர்கள்?'],
  payOnline: ['Pay online', 'ஆன்லைனில் செலுத்த'],
  payOnlineSub: ['Your order is placed now, and we will call you to complete the payment.', 'ஆர்டர் இப்போதே பதிவாகும்; பணம் செலுத்த நாங்கள் உங்களை அழைப்போம்.'],
  payOffline: ['Pay offline', 'நேரடியாக செலுத்த'],
  payOfflineSub: ['Your order is placed now.', 'ஆர்டர் இப்போதே பதிவாகும்.'],
  place: ['Place order', 'ஆர்டர் செய்'],
  placing: ['Placing order…', 'ஆர்டர் செய்கிறது…'],
  signInToOrder: ['Sign in or create an account to place your order.', 'ஆர்டர் செய்ய உள்நுழையவும் அல்லது கணக்கு உருவாக்கவும்.'],
  placed: ['Order placed', 'ஆர்டர் பதிவாகிவிட்டது'],
  guestPerk: ['Create an account to earn reward points on this order, track it and reorder in one tap.', 'கணக்கு உருவாக்கினால் இந்த ஆர்டருக்கு பரிசுப் புள்ளிகள் கிடைக்கும்; ஆர்டரைக் கண்காணிக்கவும், ஒரே தொடுதலில் மீண்டும் வாங்கவும் முடியும்.'],
  guestBtn: ['Continue as guest', 'விருந்தினராகத் தொடர'],
  guestNote: ['Ordering as a guest. No points on this order unless you sign up with the same mobile number later.', 'விருந்தினராக ஆர்டர் செய்கிறீர்கள். பின்னர் இதே மொபைல் எண்ணில் கணக்கு உருவாக்கினால் மட்டுமே இந்த ஆர்டரின் புள்ளிகள் கிடைக்கும்.'],
  guestHave: ['Have an account? Sign in', 'கணக்கு உள்ளதா? உள்நுழை'],
  polLine: ['I have read the <a href="policies.html#returns" target="_blank" rel="noopener">return &amp; refund</a>, <a href="policies.html#shipping" target="_blank" rel="noopener">shipping</a> and <a href="policies.html#terms" target="_blank" rel="noopener">other policies</a>.', 'நான் <a href="policies.html#returns" target="_blank" rel="noopener">திரும்பப்பெறல்</a>, <a href="policies.html#shipping" target="_blank" rel="noopener">ஷிப்பிங்</a> மற்றும் <a href="policies.html#terms" target="_blank" rel="noopener">பிற கொள்கைகளை</a> படித்துவிட்டேன்.'],
  polNeed: ['Please tick that you have read the policies.', 'கொள்கைகளைப் படித்ததாக டிக் செய்யவும்.'],
  waOrder: ['Order on WhatsApp', 'வாட்ஸ்அப்பில் ஆர்டர் செய்'],
  waSendTitle: ['One more tap: send this order on WhatsApp', 'இன்னும் ஒரு தொடுதல்: இந்த ஆர்டரை வாட்ஸ்அப்பில் அனுப்புங்கள்'],
  waSend: ['Send on WhatsApp', 'வாட்ஸ்அப்பில் அனுப்பு'],
  waSent: ['Your order is already saved with us. WhatsApp just lets you talk to us directly.', 'உங்கள் ஆர்டர் ஏற்கனவே எங்களிடம் பதிவாகிவிட்டது. வாட்ஸ்அப் மூலம் நேரடியாகப் பேசலாம்.'],
  trackThis: ['Track this order', 'ஆர்டரைக் கண்காணி'],
  guestDoneHead: ['Earn points on this order', 'இந்த ஆர்டருக்கு புள்ளிகள் பெறுங்கள்'],
  guestDoneBody: ['Sign up with the same mobile number and this order is added to your account automatically.', 'இதே மொபைல் எண்ணில் கணக்கு உருவாக்கினால் இந்த ஆர்டர் தானாகவே உங்கள் கணக்கில் சேரும்.'],
  createAcct: ['Create account', 'கணக்கு உருவாக்கு'],
  stickOrder: ['View cart', 'கார்ட்டைப் பார்'],
  stickItems: ['%1 items', '%1 பொருட்கள்'],
  stickItem: ['1 item', '1 பொருள்'],
  onlyLeft: ['Only %1 left', 'இன்னும் %1 மட்டுமே உள்ளன'],
  reorder: ['Buy again', 'மீண்டும் வாங்கு'],
  knowMore: ['Know more', 'மேலும் அறிய'],
  placedOnlineQr: ['Thank you. Your order is placed. Please pay with the QR code below and we will confirm once the payment is received.', 'நன்றி. உங்கள் ஆர்டர் பதிவாகிவிட்டது. கீழே உள்ள QR குறியீடு மூலம் பணம் செலுத்துங்கள்; பணம் கிடைத்ததும் உறுதிப்படுத்துவோம்.'],
  invDl: ['Download invoice', 'இன்வாய்ஸ் பதிவிறக்கு'], invTa: ['Tamil invoice', 'தமிழ் இன்வாய்ஸ்'], invAsk: ['Which language?', 'எந்த மொழியில்?'],
  invBusy: ['Preparing…', 'தயாராகிறது…'], invFail: ['Could not make the invoice. Please try again.', 'இன்வாய்ஸ் உருவாக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்.'],
  reorderDone: ['Added to your cart.', 'கார்ட்டில் சேர்க்கப்பட்டது.'],
  reorderSkip: ['Not available now: %1', 'இப்போது கிடைக்காதவை: %1'],
  reorderNone: ['None of those items are available right now.', 'அந்தப் பொருட்கள் எதுவும் இப்போது கிடைக்கவில்லை.'],
  upiTitle: ['Pay %1 by UPI', 'UPI மூலம் %1 செலுத்துங்கள்'],
  upiHowMob: ['Tap Pay with UPI app. The amount and order number are filled in for you. You can also scan this QR from another phone.', 'UPI செயலியில் செலுத்து பொத்தானைத் தட்டுங்கள். தொகையும் ஆர்டர் எண்ணும் தானாக நிரப்பப்படும். வேறு போனிலிருந்தும் இந்த QR ஐ ஸ்கேன் செய்யலாம்.'],
  upiHowDesk: ['Scan this QR with any UPI app on your phone. The amount and order number are filled in for you.', 'உங்கள் போனில் எந்த UPI செயலியிலும் இந்த QR ஐ ஸ்கேன் செய்யுங்கள். தொகையும் ஆர்டர் எண்ணும் தானாக நிரப்பப்படும்.'],
  upiOpen: ['Pay with UPI app', 'UPI செயலியில் செலுத்து'],
  upiCopy: ['Copy UPI ID', 'UPI ஐடியை நகலெடு'],
  upiCopied: ['UPI ID copied', 'UPI ஐடி நகலெடுக்கப்பட்டது'],
  upiNote: ['Paid already? No need to do anything else. We confirm the payment and call you.', 'செலுத்திவிட்டீர்களா? வேறு எதுவும் தேவையில்லை. பணம் வந்ததை உறுதிசெய்து அழைப்போம்.'],
  upiAmount: ['Amount', 'தொகை'],
  placedOnline: ['Thank you. You will get a call from us shortly for the payment.', 'நன்றி. பணம் செலுத்த விரைவில் நாங்கள் உங்களை அழைப்போம்.'],
  placedOffline: ['Thank you. Your order is placed.', 'நன்றி. உங்கள் ஆர்டர் பதிவாகிவிட்டது.'],
  willEarn: ['You will earn about %1 points once this order is delivered.', 'இந்த ஆர்டர் டெலிவரி ஆனதும் சுமார் %1 புள்ளிகள் கிடைக்கும்.'],
  willEarnNow: ['You earned about %1 points on this order.', 'இந்த ஆர்டரில் சுமார் %1 புள்ளிகள் கிடைத்தன.'],
  viewOrders: ['View my orders', 'என் ஆர்டர்கள்'],
  keepShopping: ['Keep shopping', 'தொடர்ந்து வாங்கு'],
  signIn: ['Sign in', 'உள்நுழை'],
  signUp: ['Create account', 'கணக்கு உருவாக்கு'],
  password: ['Password', 'கடவுச்சொல்'],
  pwHint: ['At least 8 characters', 'குறைந்தது 8 எழுத்துகள்'],
  emailOpt: ['Email (optional)', 'மின்னஞ்சல் (விருப்பம்)'],
  refCode: ['Referral code (optional)', 'பரிந்துரை குறியீடு (விருப்பம்)'],
  forgotLink: ['Forgot your password?', 'கடவுச்சொல் மறந்துவிட்டதா?'],
  rsTitle: ['Reset password', 'கடவுச்சொல்லை மாற்று'],
  rsHint: ['Enter the details from your most recent order. We use them to confirm it is you.', 'உங்கள் கடைசி ஆர்டரின் விவரங்களை உள்ளிடுங்கள். நீங்கள்தான் என்பதை உறுதிசெய்ய இவை பயன்படும்.'],
  rsPin: ['Pincode of your last order', 'கடைசி ஆர்டரின் அஞ்சல் குறியீடு'],
  rsAmt: ['Total of your last order (₹)', 'கடைசி ஆர்டரின் மொத்தத் தொகை (₹)'],
  rsNew: ['New password (8 or more characters)', 'புதிய கடவுச்சொல் (8 அல்லது அதற்கு மேல்)'],
  rsBtn: ['Reset password', 'கடவுச்சொல்லை மாற்று'],
  rsOk: ['Password changed. You can sign in now.', 'கடவுச்சொல் மாற்றப்பட்டது. இப்போது உள்நுழையலாம்.'],
  rsBack: ['Back to sign in', 'உள்நுழைவுக்குத் திரும்பு'],
  rsNoOrder: ['Never placed an order, or the details do not match? Message the Admin on WhatsApp and we will help.', 'இதுவரை ஆர்டர் செய்யவில்லையா, அல்லது விவரங்கள் பொருந்தவில்லையா? அட்மினுக்கு WhatsApp செய்யுங்கள்; உதவுவோம்.'],
  forgot: ['Forgot your password? Message us on WhatsApp and we will reset it.', 'கடவுச்சொல் மறந்துவிட்டதா? WhatsApp-ல் எங்களுக்குச் செய்தி அனுப்புங்கள், மாற்றித் தருகிறோம்.'],
  signOut: ['Sign out', 'வெளியேறு'],
  myAccount: ['My account', 'என் கணக்கு'],
  points: ['points', 'புள்ளிகள்'],
  yourPoints: ['Your points', 'உங்கள் புள்ளிகள்'],
  tierNow: ['You earn %1 on every order.', 'ஒவ்வொரு ஆர்டருக்கும் %1 புள்ளிகள் பெறுகிறீர்கள்.'],
  tierNext: ['Spend %1 more to reach %2.', '%2 அடைய இன்னும் %1 வாங்குங்கள்.'],
  tierTop: ['You are on our top rate.', 'நீங்கள் உயர்ந்த விகிதத்தில் உள்ளீர்கள்.'],
  lifetime: ['Total purchases: %1', 'மொத்த கொள்முதல்: %1'],
  redeemAtCheckout: ['Redeem at checkout once you have %1 points.', '%1 புள்ளிகள் ஆனதும் செக்அவுட்டில் பயன்படுத்தலாம்.'],
  referTitle: ['Refer a friend', 'நண்பரைப் பரிந்துரை செய்'],
  referHint: ['When your friend places a first order, you get %1 points and they get %2.', 'உங்கள் நண்பர் முதல் ஆர்டர் செய்யும்போது உங்களுக்கு %1, அவருக்கு %2 புள்ளிகள்.'],
  referStats: ['%1 friends have joined with your code.', '%1 நண்பர்கள் உங்கள் குறியீட்டுடன் இணைந்துள்ளனர்.'],
  copy: ['Copy', 'நகலெடு'],
  copied: ['Copied', 'நகலெடுக்கப்பட்டது'],
  shareWa: ['Share on WhatsApp', 'WhatsApp-ல் பகிர்'],
  myOrders: ['My orders', 'என் ஆர்டர்கள்'],
  noOrders: ['No orders yet.', 'இன்னும் ஆர்டர் இல்லை.'],
  history: ['Points history', 'புள்ளிகள் வரலாறு'],
  noHistory: ['Nothing yet. Points appear here after your first delivered order.', 'இன்னும் இல்லை. முதல் டெலிவரிக்குப் பின் இங்கே தெரியும்.'],
  details: ['My details', 'என் விவரங்கள்'],
  save: ['Save', 'சேமி'],
  saved: ['Saved', 'சேமிக்கப்பட்டது'],
  writeReview: ['Write a review', 'கருத்து எழுது'],
  reviewHint: ['You have a delivered order, so you can leave a review. We check each one before it appears on the site.', 'உங்கள் ஆர்டர் டெலிவரி ஆகியுள்ளதால் கருத்து எழுதலாம். வெளியிடும் முன் நாங்கள் சரிபார்ப்போம்.'],
  yourTown: ['Your town (optional)', 'ஊர் (விருப்பம்)'],
  yourReview: ['Your review', 'உங்கள் கருத்து'],
  sendReview: ['Send review', 'கருத்தை அனுப்பு'],
  reviewSent: ['Thank you. Your review will appear after we check it.', 'நன்றி. சரிபார்த்த பின் உங்கள் கருத்து வெளியாகும்.'],
  adminPanel: ['Open admin panel', 'நிர்வாகப் பகுதி'],
  noReviews: ['Reviews will appear here', 'கருத்துகள் இங்கே தெரியும்'],
  noReviewsHint: ['Customers can write a review after their first delivered order.', 'முதல் டெலிவரிக்குப் பின் வாடிக்கையாளர்கள் கருத்து எழுதலாம்.'],
  noCombos: ['Combo packs are on the way', 'காம்போ தொகுப்புகள் விரைவில்'],
  noCombosHint: ['Call us on %1 to ask about a pack made for your kitchen.', 'உங்கள் சமையலறைக்கேற்ற தொகுப்புக்கு %1 எண்ணை அழைக்கவும்.'],
  comboTag: ['Combo', 'காம்போ'],
  endsOn: ['Ends %1', 'முடிவு %1'],
  shopThis: ['See this pack', 'இந்த அளவைப் பார்'],
  rewardsLead: ['Earn points on every order, move up to a higher rate as your purchases add up, and use your points on your next order.', 'ஒவ்வொரு ஆர்டருக்கும் புள்ளிகள் பெறுங்கள்; கொள்முதல் கூடக்கூட அதிக விகிதம் கிடைக்கும்; அடுத்த ஆர்டரில் புள்ளிகளைப் பயன்படுத்துங்கள்.'],
  tierFirst: ['from your first order', 'முதல் ஆர்டர் முதல்'],
  tierFrom: ['once your total purchases reach %1', 'மொத்த கொள்முதல் %1 ஆனதும்'],
  joinTitle: ['Join and start earning', 'இணைந்து புள்ளிகள் பெறுங்கள்'],
  ruleCredit: ['Points are added when your order is delivered.', 'ஆர்டர் டெலிவரி ஆனதும் புள்ளிகள் சேர்க்கப்படும்.'],
  ruleCreditPlaced: ['Points are added as soon as your order is placed.', 'ஆர்டர் பதிவானதும் புள்ளிகள் சேர்க்கப்படும்.'],
  ruleRedeem: ['1 point is worth ₹1. Redeem from %1 points at checkout.', '1 புள்ளி = ₹1. செக்அவுட்டில் %1 புள்ளிகளிலிருந்து பயன்படுத்தலாம்.'],
  ruleRefer: ['Share your code. When a friend places a first order, you get %1 points and they get %2.', 'உங்கள் குறியீட்டைப் பகிருங்கள். நண்பர் முதல் ஆர்டர் செய்தால் உங்களுக்கு %1, அவருக்கு %2 புள்ளிகள்.'],
  bulkSent: ['Enquiry sent. Your reference is %1. We will call you soon.', 'விசாரணை அனுப்பப்பட்டது. உங்கள் குறிப்பு எண் %1. விரைவில் அழைப்போம்.'],
  sugSent: ['Thank you. We have your suggestion.', 'நன்றி. உங்கள் பரிந்துரை கிடைத்தது.'],
  pickOil: ['Choose at least one oil.', 'குறைந்தது ஒரு எண்ணெயைத் தேர்ந்தெடுங்கள்.'],
  otherOil: ['Other', 'மற்றவை'],
  loadFail: ['The shop could not load. Check your connection and refresh the page. You can also call us on 99658 42548.', 'கடை ஏற்றப்படவில்லை. இணைப்பைச் சரிபார்த்து பக்கத்தைப் புதுப்பிக்கவும். அல்லது 99658 42548 எண்ணை அழைக்கவும்.'],
  welcome: ['Welcome, %1', 'வணக்கம், %1'],
  welcomeBack: ['Signed in', 'உள்நுழைந்தீர்கள்'],
  refApplied: ['Referral code %1 applied. Create your account to use it.', 'பரிந்துரை குறியீடு %1 சேர்க்கப்பட்டது. பயன்படுத்த கணக்கு உருவாக்குங்கள்.'],
  st: {
    placed: ['Placed', 'பதிவானது'], confirmed: ['Confirmed', 'உறுதியானது'], packed: ['Packed', 'பேக் ஆனது'],
    shipped: ['On the way', 'வழியில்'], delivered: ['Delivered', 'டெலிவரி ஆனது'], cancelled: ['Cancelled', 'ரத்தானது']
  },
  pay: { pending: ['Payment pending', 'பணம் நிலுவை'], paid: ['Paid', 'செலுத்தப்பட்டது'] },
  tkOrder: ['Order', 'ஆர்டர்'], tkBulk: ['Bulk enquiry', 'மொத்த ஆர்டர் விசாரணை'],
  tkRefOrder: ['Order number', 'ஆர்டர் எண்'], tkRefBulk: ['Enquiry number', 'விசாரணை எண்'],
  tkPhone: ['Mobile number used', 'பயன்படுத்திய கைப்பேசி எண்'], tkGo: ['Track', 'நிலை பார்'],
  tkMine: ['Or pick one of your orders', 'அல்லது உங்கள் ஆர்டரைத் தேர்ந்தெடுக்கவும்'],
  tkSignedIn: ['Signed in. Choose an order to see where it is.', 'உள்நுழைந்துள்ளீர்கள். ஆர்டரைத் தேர்ந்தெடுத்து நிலையைப் பாருங்கள்.'],
  tkEmpty: ['Your order status will appear here.', 'உங்கள் ஆர்டர் நிலை இங்கே தெரியும்.'],
  tkLooking: ['Looking it up…', 'தேடுகிறோம்…'],
  tkItems: ['What is in it', 'ஆர்டரில் உள்ளவை'], tkTotal: ['Total', 'மொத்தம்'],
  tkPayOnline: ['Online payment is pending. We will call you to collect payment.', 'ஆன்லைன் கட்டணம் நிலுவையில் உள்ளது. கட்டணம் பெற நாங்கள் அழைப்போம்.'],
  tkPaid: ['Payment received.', 'கட்டணம் பெறப்பட்டது.'],
  tkPayOffline: ['Payment is taken offline.', 'கட்டணம் நேரில் பெறப்படும்.'],
  tkCancelled: ['This order was cancelled. If that is a surprise, please call us.', 'இந்த ஆர்டர் ரத்து செய்யப்பட்டது. எதிர்பாராததாக இருந்தால் அழையுங்கள்.'],
  tkClosed: ['This enquiry is closed. You can send a new one any time.', 'இந்த விசாரணை முடிக்கப்பட்டது. எப்போது வேண்டுமானாலும் புதிதாக அனுப்பலாம்.'],
  tkNext: ['Updated', 'புதுப்பிப்பு'],
  tkYourOrder: ['Your order %1 is %2.', 'உங்கள் ஆர்டர் %1: %2.'],
  issueH: ['Having an issue? Reach us', 'சிக்கலா? எங்களைத் தொடர்பு கொள்ளுங்கள்'],
  issueSub: ['Choose what it is about. The message is filled in for you.', 'எதைப் பற்றி என்று தேர்ந்தெடுங்கள். செய்தி தானாக நிரப்பப்படும்.'],
  issueWa: ['WhatsApp', 'WhatsApp'], issueMail: ['Email', 'மின்னஞ்சல்'],
  waTitle: ['Who would you like to message?', 'யாருக்குச் செய்தி அனுப்ப வேண்டும்?'],
  waMD: ['Managing Director', 'மேலாண்மை இயக்குநர்'], waMDFor: ['Suggestions, escalations, business enquiries', 'ஆலோசனைகள், புகார்கள், வணிக விசாரணைகள்'],
  waAdmin: ['Admin team', 'நிர்வாகக் குழு'], waAdminFor: ['Technical issues, order support, reward points', 'தொழில்நுட்பச் சிக்கல், ஆர்டர் உதவி, பரிசுப் புள்ளிகள்'],
  err: {
    NOT_FOUND: ['We could not find that. Check the number and the mobile used on the order.', 'கிடைக்கவில்லை. எண்ணையும் ஆர்டரில் கொடுத்த கைப்பேசி எண்ணையும் சரிபாருங்கள்.'],
    NOT_SIGNED_IN: ['Please sign in first.', 'முதலில் உள்நுழையவும்.'],
    LOGIN_REQUIRED: ['Please sign in first.', 'முதலில் உள்நுழையவும்.'],
    INVALID_PHONE: ['Enter a 10 digit mobile number starting with 6, 7, 8 or 9.', '6, 7, 8 அல்லது 9-ல் தொடங்கும் 10 இலக்க எண்ணை உள்ளிடவும்.'],
    INVALID_NAME: ['Enter your name.', 'பெயரை உள்ளிடவும்.'],
    INVALID_PINCODE: ['Enter a 6 digit pincode.', '6 இலக்க அஞ்சல் குறியீட்டை உள்ளிடவும்.'],
    INVALID_ADDRESS: ['Enter the full delivery address.', 'முழு முகவரியை உள்ளிடவும்.'],
    BULK_REQUIRED: ['That quantity is above the online limit. Please send a bulk enquiry.', 'இந்த அளவு ஆன்லைன் வரம்பை மீறுகிறது. மொத்த ஆர்டர் விசாரணை அனுப்பவும்.'],
    REDEEM_BELOW_MIN: ['You need to redeem at least %1 points.', 'குறைந்தது %1 புள்ளிகள் பயன்படுத்த வேண்டும்.'],
    REDEEM_EXCEEDS_BALANCE: ['You do not have that many points.', 'உங்களிடம் அவ்வளவு புள்ளிகள் இல்லை.'],
    PROMO_OFF: ['Promo codes are not available right now.', 'ப்ரோமோ குறியீடுகள் தற்போது இல்லை.'],
    PROMO_INVALID: ['That promo code is not valid.', 'இந்த ப்ரோமோ குறியீடு செல்லாது.'],
    PROMO_EXPIRED: ['This promo code has ended or has not started yet.', 'இந்த ப்ரோமோ குறியீடு முடிந்துவிட்டது அல்லது இன்னும் தொடங்கவில்லை.'],
    PROMO_MIN: ['Add items worth ₹%1 or more to use this code.', '₹%1 அல்லது அதற்கு மேல் மதிப்புள்ள பொருட்களைச் சேர்த்தால் இந்த குறியீடு செல்லும்.'],
    PROMO_LIMIT: ['This offer is fully used.', 'இந்த சலுகை முழுவதும் பயன்படுத்தப்பட்டுவிட்டது.'],
    PROMO_USED: ['You have already used this code.', 'இந்த குறியீட்டை நீங்கள் ஏற்கனவே பயன்படுத்தியுள்ளீர்கள்.'],
    REDEEM_EXCEEDS_ORDER: ['Points used cannot be more than the order value.', 'ஆர்டர் மதிப்பை விட அதிகமாக பயன்படுத்த முடியாது.'],
    ITEM_UNAVAILABLE: ['An item in your cart is no longer available. Please remove it.', 'கார்ட்டில் உள்ள ஒரு பொருள் இப்போது கிடைக்கவில்லை. அதை நீக்கவும்.'],
    RESET_FAILED: ['The details do not match our records.', 'விவரங்கள் எங்கள் பதிவுகளுடன் பொருந்தவில்லை.'],
    LOCKED: ['Too many wrong tries. Please contact the Admin on WhatsApp.', 'பலமுறை தவறாக உள்ளிட்டுள்ளீர்கள். அட்மினை WhatsApp-ல் தொடர்புகொள்ளுங்கள்.'],
    OUT_OF_STOCK: ['Sorry, that item is out of stock.', 'மன்னிக்கவும், அந்தப் பொருள் இருப்பில் இல்லை.'],
    EMPTY_CART: ['Your cart is empty.', 'கார்ட் காலியாக உள்ளது.'],
    TOO_MANY_REQUESTS: ['Too many tries. Please wait a little and try again, or call us.', 'அதிக முயற்சிகள். சற்று நேரம் கழித்து முயற்சிக்கவும் அல்லது அழைக்கவும்.'],
    NO_DELIVERED_ORDER: ['You can review after an order is delivered.', 'ஆர்டர் டெலிவரி ஆன பின் கருத்து எழுதலாம்.'],
    INVALID_PRODUCT: ['Tell us which product you would like.', 'எந்தப் பொருள் வேண்டும் எனச் சொல்லுங்கள்.'],
    INVALID_OILS: ['Choose at least one oil.', 'குறைந்தது ஒரு எண்ணெயைத் தேர்ந்தெடுங்கள்.'],
    INVALID_CREDS: ['Mobile number or password is not right.', 'மொபைல் எண் அல்லது கடவுச்சொல் தவறு.'],
    EXISTS: ['This mobile number already has an account. Please sign in.', 'இந்த எண்ணுக்கு ஏற்கனவே கணக்கு உள்ளது. உள்நுழையவும்.'],
    WEAK: ['Choose a password with at least 8 characters.', 'குறைந்தது 8 எழுத்துகள் உள்ள கடவுச்சொல்லைத் தேர்ந்தெடுங்கள்.'],
    BAD_REF: ['That referral code was not found. Check it or leave it empty.', 'அந்த பரிந்துரை குறியீடு கிடைக்கவில்லை. சரிபார்க்கவும் அல்லது காலியாக விடவும்.'],
    BAD_EMAIL: ['That email does not look right.', 'மின்னஞ்சல் சரியாக இல்லை.'],
    GENERIC: ['Something went wrong. Please try again or call us.', 'ஏதோ தவறு நடந்தது. மீண்டும் முயற்சிக்கவும் அல்லது அழைக்கவும்.']
  }
};
const t = (k, ...a) => {
  const v = k.split('.').reduce((o, x) => o && o[x], T);
  let s = Array.isArray(v) ? (lang === 'ta' ? v[1] : v[0]) : String(k);
  a.forEach((x, i) => { s = s.replace('%' + (i + 1), x); });
  return s;
};
function errText(e) {
  const m = (e && (e.message || e.error_description || e)) + '';
  const code = Object.keys(T.err).find(c => m.includes(c));
  if (code) {
    const arg = (m.match(new RegExp(code + ':(\\d+)')) || [])[1];
    return t('err.' + code, arg || '');
  }
  if (/invalid login/i.test(m)) return t('err.INVALID_CREDS');
  if (/already registered|already been registered|user_already_exists/i.test(m)) return t('err.EXISTS');
  if (/password/i.test(m) && /(short|least|weak)/i.test(m)) return t('err.WEAK');
  if (/failed to fetch|network/i.test(m)) return L('No connection. Check your internet and try again.', 'இணைப்பு இல்லை. இணையத்தைச் சரிபார்த்து மீண்டும் முயற்சிக்கவும்.');
  return t('err.GENERIC');
}

/* ---------- state ---------- */
const S = {
  products: [], combos: [], offers: [], slides: [], reviews: [], settings: {},
  session: null, profile: null, orders: [], ledger: [],
  cart: [], redeem: 0, sel: {}, qty: {}, loaded: false
};
try { S.cart = JSON.parse(store.get('sv_cart') || '[]').filter(x => x && x.id && x.qty > 0); } catch (e) { S.cart = []; }
const saveCart = () => store.set('sv_cart', JSON.stringify(S.cart));
const setting = (k, d) => (S.settings[k] === undefined || S.settings[k] === null) ? d : S.settings[k];
const contact = () => Object.assign({ phone1: '99658 42548', phone2: '63798 09495', email: 'vinayagaoilmills@gmail.com', whatsapp1: SV.whatsapp, wa_md: '919965842548', wa_admin: '916379809495', instagram: 'https://www.instagram.com/vinayaga_mills/', facebook: 'https://www.facebook.com/srivinayagamills', threads: 'https://www.threads.com/@vinayaga_mills', maps_url: 'https://maps.app.goo.gl/yUar4BYDgQyybho69' }, Object.fromEntries(Object.entries(S.settings.contact || {}).filter(([, v]) => v != null && String(v).trim() !== '')));
const inWindow = r => { const n = Date.now(); return (!r.starts_at || new Date(r.starts_at) <= n) && (!r.ends_at || new Date(r.ends_at) >= n); };
const variantMap = () => { const m = {}; S.products.forEach(p => p.variants.forEach(v => { m[v.id] = { v, p }; })); return m; };

function toast(msg) {
  const el = $('#toast'); el.textContent = msg; el.classList.add('on');
  clearTimeout(toast._t); toast._t = setTimeout(() => el.classList.remove('on'), 2600);
}
function busy(on) { const b = $('#loadbar'); b.style.width = on ? '70%' : '100%'; if (!on) setTimeout(() => { b.style.width = '0'; }, 400); }


/* ---------- sound effects (Web Audio, nothing to download) ---------- */
const SFX = (() => {
  let ctx = null, master = null, on = true;
  const ensure = () => {
    if (!on) return null;
    if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); master = ctx.createGain(); master.gain.value = .55; master.connect(ctx.destination); } catch (e) { return null; } }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  };
  const tone = (f, t0, d, o = {}) => {
    const c = ensure(); if (!c) return; const t = c.currentTime + t0;
    const os = c.createOscillator(), g = c.createGain();
    os.type = o.type || 'sine'; os.frequency.setValueAtTime(f, t); if (o.f2) os.frequency.exponentialRampToValueAtTime(o.f2, t + d);
    const v = o.vol == null ? .2 : o.vol; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + (o.a || .008)); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    os.connect(g); g.connect(master); os.start(t); os.stop(t + d + .03);
  };
  const noise = (t0, d, f1, f2, vol, q) => {
    const c = ensure(); if (!c) return; const t = c.currentTime + t0, n = Math.max(1, Math.floor(c.sampleRate * d));
    const buf = c.createBuffer(1, n, c.sampleRate), da = buf.getChannelData(0); for (let i = 0; i < n; i++) da[i] = Math.random() * 2 - 1;
    const s = c.createBufferSource(); s.buffer = buf; const fl = c.createBiquadFilter(); fl.type = 'bandpass'; fl.Q.value = q || 1.2;
    fl.frequency.setValueAtTime(f1, t); fl.frequency.exponentialRampToValueAtTime(f2, t + d);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + d * .25); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    s.connect(fl); fl.connect(g); g.connect(master); s.start(t); s.stop(t + d + .03);
  };
  const lib = {
    pop() { tone(430, 0, .11, { f2: 820, vol: .24 }); tone(1180, .07, .08, { vol: .08, type: 'triangle' }); },
    tick() { tone(1250, 0, .04, { type: 'triangle', vol: .09 }); },
    confirm() { tone(523, 0, .12, { vol: .17 }); tone(784, .09, .2, { vol: .17 }); },
    error() { tone(200, 0, .16, { type: 'triangle', vol: .2, f2: 150 }); tone(150, .1, .16, { type: 'triangle', vol: .16, f2: 110 }); },
    coin() { tone(988, 0, .07, { type: 'square', vol: .07 }); tone(1319, .06, .28, { type: 'square', vol: .07 }); tone(1976, .06, .22, { vol: .06 }); },
    ignite() { noise(0, .9, 300, 1400, .22, .8); tone(55, 0, .9, { type: 'sawtooth', vol: .1, f2: 90 }); },
    launch() { noise(0, 1.5, 500, 4200, .3, .7); tone(110, 0, 1.4, { type: 'sawtooth', vol: .1, f2: 520 }); },
    chime() { [659, 784, 988, 1319].forEach((f, i) => tone(f, i * .11, .6, { vol: .15 })); }
  };
  const api = {
    play(n) { try { lib[n] && lib[n](); } catch (e) {} },
    get on() { return on; },
    set(v) { on = v; store.set('sv_sound', v ? '1' : '0'); if (v) { ensure(); api.play('tick'); } paint(); },
    unlock() { if (on) ensure(); }
  };
  const paint = () => { const b = $('#sndBtn'); if (!b) return; b.setAttribute('aria-pressed', on); b.classList.toggle('is-off', !on); $('.lbl-s', b).innerHTML = on ? '<span class="en">Sound</span><span class="ta">ஒலி</span>' : '<span class="en">Muted</span><span class="ta">ஒலி இல்லை</span>'; };
  api.paint = paint;
  ['pointerdown', 'keydown', 'touchstart'].forEach(ev => addEventListener(ev, () => api.unlock(), { once: true, passive: true }));
  return api;
})();
/* form messages: one sound for success, one for a problem */
new MutationObserver(ms => ms.forEach(m => { const el = m.target; if (m.type !== 'attributes' || !el.classList || !el.classList.contains('show')) return;
  const was = (m.oldValue || '').split(/\s+/); if (was.includes('show') && el.className.split(/\s+/).every(c => was.includes(c))) return;
  if (el.classList.contains('err') || el.classList.contains('fail')) SFX.play('error'); else if (el.classList.contains('ok')) SFX.play('confirm');
})).observe(document.body, { subtree: true, attributes: true, attributeFilter: ['class'], attributeOldValue: true });

/* ---------- language and theme ---------- */
function setLang(l) {
  const go = () => {
    lang = l; store.set('sv_lang', l);
    document.documentElement.lang = l;
    $$('[data-ph-en]').forEach(el => { el.placeholder = L(el.dataset.phEn, el.dataset.phTa); });
    renderAll();
  };
  if (document.startViewTransition && !matchMedia('(prefers-reduced-motion: reduce)').matches) document.startViewTransition(go); else go();
}
$('#langBtn').addEventListener('click', () => setLang(lang === 'en' ? 'ta' : 'en'));
(function theme() {
  const saved = store.get('sv_theme');
  if (saved) document.documentElement.dataset.theme = saved;
  $('#themeBtn').addEventListener('click', () => {
    const cur = document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    const nx = cur === 'dark' ? 'light' : 'dark';
    const r = document.documentElement;
    const apply = () => { r.dataset.theme = nx; store.set('sv_theme', nx); paintTheme(); };
    if (document.startViewTransition && !matchMedia('(prefers-reduced-motion: reduce)').matches) document.startViewTransition(apply); else apply();
  });
  paintTheme();
})();
function curTheme() { return document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'); }
function paintTheme() {
  const d = curTheme() === 'dark';
  $('#themeBtn .lbl-d').innerHTML = d ? '<span class="en">Light</span><span class="ta">ஒளி</span>' : '<span class="en">Dark</span><span class="ta">இருள்</span>';
  $('#themeBtn').classList.toggle('is-dark', d);
}
document.documentElement.lang = lang;

/* ---------- data ---------- */
async function loadCatalogue() {
  busy(true);
  const q = (p) => p.then(r => { if (r.error) throw r.error; return r.data; });
  try {
    const [products, combos, offers, slides, settings, reviews, fest] = await Promise.all([
      q(sb.from('products').select('*, variants(*)').eq('is_active', true).order('sort_order')),
      q(sb.from('combos').select('*, combo_items(qty, variants(id, label, products(name_en, name_ta)))').eq('is_active', true).order('sort_order')),
      q(sb.from('offers').select('*').eq('is_active', true).order('sort_order')),
      q(sb.from('hero_slides').select('*').eq('is_active', true).order('sort_order')),
      q(sb.from('site_settings').select('*')),
      q(sb.from('reviews').select('display_name,town,rating,body,created_at').eq('status', 'approved').order('created_at', { ascending: false }).limit(12)),
      q(sb.from('festivals').select('*').eq('is_active', true).limit(1)).catch(() => [])
    ]);
    S.festival = (fest && fest[0]) || null;
    S.products = products.map(p => ({ ...p, variants: (p.variants || []).filter(v => v.is_active).sort((a, b) => a.sort_order - b.sort_order) })).filter(p => p.variants.length);
    S.combos = combos.filter(inWindow);
    S.offers = offers.filter(inWindow);
    S.slides = slides;
    S.settings = Object.fromEntries(settings.map(r => [r.key, r.value]));
    S.reviews = reviews;
    S.loaded = true;
    try { seoRuntime(); } catch (x) { /* search tags are optional */ }
    $('#loadFail').innerHTML = '';
  } catch (e) {
    console.error(e);
    $('#loadFail').innerHTML = `<div class="fail" role="alert">${esc(t('loadFail'))}</div>`;
    $('#shelf').innerHTML = '';
  }
  // drop cart lines whose item no longer exists
  if (S.loaded) {
    const vm = variantMap(); const cm = Object.fromEntries(S.combos.map(c => [c.id, c]));
    S.cart = S.cart.filter(l => l.k === 'c' ? cm[l.id] : vm[l.id]); saveCart();
  }
  busy(false);
}

/* ---------- hero ---------- */
let slideIdx = 0, slideTimer = null;
function renderHero() {
  const slides = S.slides.length ? S.slides : [{ image_url: 'assets/hero-1.webp', headline_en: 'Pressed here. Poured honestly.', headline_ta: 'இங்கேயே பிழிந்தது. நேர்மையாக வழங்குவது.', sub_en: 'Sun-dried seed, cast-iron expeller, no blending.', sub_ta: 'வெயிலில் உலர்த்திய விதை, வார்ப்பிரும்பு இயந்திரம், கலப்பில்லை.', cta_label: 'Shop the oils', cta_href: '#oils' }];
  $('#slides').innerHTML = slides.map((s, i) => `<div class="slide ${i === slideIdx ? 'on' : ''}"><img src="${esc(s.image_url)}" alt="${esc(s.headline_en || 'Sri Vinayaga Oil & Flour Mills')}" ${i === 0 ? 'fetchpriority="high"' : 'loading="lazy" decoding="async"'}></div>`).join('');
  $('#dots').innerHTML = slides.length > 1 ? slides.map((s, i) => `<button role="tab" aria-label="Slide ${i + 1}" aria-selected="${i === slideIdx}" class="${i === slideIdx ? 'on' : ''}" data-i="${i}"></button>`).join('') : '';
  showSlideText(slides[slideIdx]);
  clearTimeout(slideTimer);
  if (slides.length > 1 && !reduceMotion) {
    const dur = 7000;
    $$('#dots button.on').forEach(b => b.style.setProperty('--dur', dur + 'ms'));
    slideTimer = setTimeout(() => goSlide((slideIdx + 1) % slides.length), dur);
  }
}
function showSlideText(s) {
  const h = (lang === 'ta' && s.headline_ta) ? s.headline_ta : s.headline_en;
  const lines = String(h).split(/(?<=[.!?])\s+/).filter(Boolean);
  $('#heroH').innerHTML = lines.map(l => `<span class="ln"><span>${esc(l)}</span></span>`).join('');
  $('#heroSub').textContent = (lang === 'ta' && s.sub_ta) ? s.sub_ta : s.sub_en;
  const ctaLabel = s.cta_label ? ((lang === 'ta') ? ctaTa(s.cta_label) : s.cta_label) : '';
  $('#heroCta').innerHTML = (ctaLabel ? `<a class="btn gold" href="${esc(s.cta_href || '#oils')}">${esc(ctaLabel)}</a>` : '') +
    ((s.cta_href || '#oils') === '#process' ? '' : `<a class="btn ghost" href="#process">${esc(L('How we make it', 'தயாரிப்பு முறை'))}</a>`);
}
const ctaTa = l => ({ 'Shop the oils': 'எண்ணெய்களை வாங்க', 'See how we make it': 'தயாரிப்பு முறையைப் பார்', 'Shop now': 'இப்போது வாங்கு' }[l] || l);
function goSlide(i) {
  const slides = S.slides.length ? S.slides : [0];
  slideIdx = i;
  $$('#slides .slide').forEach((el, n) => el.classList.toggle('on', n === i));
  $$('#dots button').forEach((b, n) => { b.classList.toggle('on', n === i); b.setAttribute('aria-selected', n === i); b.classList.toggle('done', false); });
  if (S.slides[i]) showSlideText(S.slides[i]);
  clearTimeout(slideTimer);
  if (slides.length > 1 && !reduceMotion) {
    $$('#dots button.on').forEach(b => b.style.setProperty('--dur', '7000ms'));
    slideTimer = setTimeout(() => goSlide((i + 1) % slides.length), 7000);
  }
}
$('#dots').addEventListener('click', e => { const b = e.target.closest('button'); if (b) goSlide(+b.dataset.i); });

/* ---------- announcements in top bar ---------- */
let annT = null;
const TB_MSGS = () => [
  ['Delivering across Tamil Nadu', 'தமிழ்நாடு முழுவதும் விநியோகம்'],
  ['Made by one family since 1935', '1935 முதல் ஒரே குடும்பத்தின் தயாரிப்பு'],
  ['Sun-dried seed, pressed straight away', 'வெயிலில் உலர்த்திய விதை, உடனே பிழிதல்'],
  ['One seed in every bottle, never blended', 'ஒரு பாட்டிலில் ஒரே விதை, கலப்பில்லை'],
  ['Settled for days, never filtered', 'நாட்கணக்கில் தெளிய வைத்தது, வடிகட்டாதது'],
  [`Free delivery on orders above ₹${(+setting('free_delivery_above', 1500)).toLocaleString('en-IN')}`, `₹${(+setting('free_delivery_above', 1500)).toLocaleString('en-IN')}க்கு மேல் ஆர்டருக்கு இலவச டெலிவரி`],
  ['Earn reward points on every order', 'ஒவ்வொரு ஆர்டருக்கும் பரிசுப் புள்ளிகள்'],
  ['Bulk orders for homes, hotels and temples', 'வீடுகள், ஹோட்டல்கள், கோயில்களுக்கு மொத்த ஆர்டர்']
];
let tbOrder = [], tbLast = -1;
function renderAnnounce() {
  clearInterval(annT);
  const el = $('#tbNote');
  const msgs = TB_MSGS().map(m => ({ en: m[0], ta: m[1] }));
  S.offers.filter(o => o.kind === 'announcement').forEach(o => msgs.push({
    en: o.title_en + (o.body_en ? ' ' + o.body_en : ''),
    ta: (o.title_ta || o.title_en) + ((o.body_ta || o.body_en) ? ' ' + (o.body_ta || o.body_en) : '')
  }));
  const next = () => {
    if (!tbOrder.length) {
      tbOrder = msgs.map((_, i) => i).sort(() => Math.random() - .5);
      if (tbOrder[tbOrder.length - 1] === tbLast && tbOrder.length > 1) tbOrder.unshift(tbOrder.pop());
    }
    tbLast = tbOrder.pop(); return msgs[tbLast % msgs.length];
  };
  const paint = m => { el.innerHTML = `<span class="en">${esc(m.en)}</span><span class="ta">${esc(m.ta)}</span>`; };
  tbOrder = [];
  paint(next());
  annT = setInterval(() => {
    el.classList.add('out');
    setTimeout(() => { paint(next()); el.classList.remove('out'); }, 320);
  }, 5200);
}

/* ---------- contact bits that the owner can edit ---------- */

const SOC_IMG = { instagram: 'assets/soc-instagram.svg', facebook: 'assets/soc-facebook.svg', threads: 'assets/soc-threads.svg', whatsapp: 'assets/wa-logo.svg', mail: 'assets/soc-email.svg' };
const socImg = (k, name) => `<img src="${SOC_IMG[k]}" alt="${name}" width="44" height="44" loading="lazy" decoding="async">`;
function renderSocial(c) {
  const el = $('#social'); if (!el) return;
  const items = [['instagram', 'Instagram', c.instagram], ['facebook', 'Facebook', c.facebook], ['threads', 'Threads', c.threads]].filter(x => /^https?:\/\//.test(x[2] || ''));
  el.innerHTML = items.map(x => `<a href="${esc(x[2])}" target="_blank" rel="noopener" aria-label="${x[1]}" title="${x[1]}">${socImg(x[0], x[1])}</a>`).join('') +
    `<a href="https://wa.me/${esc(waNum('md'))}" data-wa="1" aria-label="WhatsApp" title="WhatsApp">${socImg('whatsapp', 'WhatsApp')}</a>` +
    (c.email ? `<a href="mailto:${esc(c.email)}" aria-label="Email" title="Email">${socImg('mail', 'Email')}</a>` : '');
}
function applyContact() {
  const c = contact();
  $$('[data-c]').forEach(el => {
    const k = el.dataset.c; if (c[k] == null || c[k] === '') return;
    el.textContent = c[k];
    if (k === 'phone1' || k === 'phone2') el.href = 'tel:+91' + String(c[k]).replace(/\D/g, '').slice(-10);
    if (k === 'email') el.href = 'mailto:' + c[k];
  });
  $$('[data-wa]').forEach(el => { el.href = 'https://wa.me/' + (c.whatsapp1 || SV.whatsapp); });
  renderSocial(c);
  const addr = c.address || '120 Vellalar Street, Kondayampettai Agraharam, Thiruvanaikoil, Srirangam, Trichy - 620005';
  const mf = $('#mapFrame'), src = 'https://www.google.com/maps?q=' + encodeURIComponent(addr) + '&output=embed';
  if (mf && mf.dataset.src !== src) { mf.dataset.src = src; mf.src = src; }
  if ($('#dirBtn') && c.maps_url) $('#dirBtn').href = c.maps_url;
  $('#yr').textContent = '© ' + new Date().getFullYear() + ' Sri Vinayaga Oil & Flour Mills';
}

/* ---------- shelf ---------- */
function lowStock(v) {
  const th = +setting('low_stock_threshold', 5);
  if (!th || v.stock == null || v.stock <= 0 || v.stock > th) return '';
  return '<p class="low" role="status">' + esc(t('onlyLeft', v.stock)) + '</p>';
}
function selVariant(p) { return p.variants.find(v => v.id === S.sel[p.id]) || p.variants.find(v => v.stock !== 0) || p.variants[0]; }
function renderShelf() {
  if (!S.loaded) return;
  $('#shelf').innerHTML = S.products.map(cardHtml).join('') + moreHtml();
  const del = setting('delivery_fee', 80), free = setting('free_delivery_above', 1500);
  $('#shelfNote').textContent = t('deliveryNote', inr(del), inr(free));
}
function moreHtml() {
  return `<article class="card more"><h3>${esc(L('Need a different pack?', 'வேறு அளவு வேண்டுமா?'))}</h3>
    <p>${esc(L('Drums, custom packaging, a monthly supply, or an oil that is not on the shelf. Tell us and we will call you.', 'டிரம், தனிப்பயன் பேக்கிங், மாதாந்திர விநியோகம் அல்லது இங்கு இல்லாத எண்ணெய். சொல்லுங்கள், நாங்கள் அழைக்கிறோம்.'))}</p>
    <div><a class="btn line" href="#bulk">${esc(L('Bulk enquiry', 'மொத்த ஆர்டர்'))}</a></div></article>`;
}
function cardHtml(p) {
  const v = selVariant(p); S.sel[p.id] = v.id;
  const q = S.qty[v.id] || 1;
  const maxq = v.max_online_qty;
  const note = maxq ? `<div class="bulknote">${esc(t('tinBulk', maxq))} <button class="link" data-act="bulk">${esc(t('tinBulkLink'))}</button></div>` : '';
  const sig = p.is_signature ? `<span class="tag">${esc(t('signature'))}</span>` : '';
  const alt = lang === 'ta' ? p.name_en : p.name_ta;
  const bg = /assets\/product-/.test(p.image_url || '') ? p.image_url.replace('product-', 'bg-') : '';
  return `<article class="card" id="p-${esc(p.slug)}" data-p="${p.id}" style="--accent:${esc(p.accent || '#1F4A38')}">
    <div class="pic${bg ? ' hasbg' : ''}"${bg ? ` style="background-image:url('${esc(bg)}')"` : ''}>${sig}${p.image_url ? `<img src="${esc(p.image_url)}" alt="${esc(p.name_en)} bottle" loading="lazy" decoding="async">` : ''}</div>
    <div class="body">
      <div><h3>${esc(pick(p, 'name'))}</h3>${alt ? `<div class="alt-name ${lang === 'ta' ? '' : 'tam'}">${esc(alt)}</div>` : ''}</div>
      ${p.usage_en ? `<span class="use">${esc(pick(p, 'usage'))}</span>` : ''}
      <p class="blurb">${esc(pick(p, 'blurb'))} <a class="know" href="p/${esc(p.slug)}.html">${esc(t('knowMore'))}</a></p>
      <div class="chips" role="group" aria-label="Pack size">${p.variants.map(x => `<button class="chip" data-act="var" data-v="${x.id}" aria-pressed="${x.id === v.id}" ${x.stock === 0 ? 'disabled' : ''}>${esc(x.label)}</button>`).join('')}</div>
      ${note}
      ${lowStock(v)}
      <div class="buyrow">
        <div class="price${+v.mrp > +v.price ? ' has-save' : ''}">${priceHtml(v)}</div>
        <div class="qty" role="group" aria-label="Quantity"><button data-act="minus" aria-label="Less">−</button><output>${q}</output><button data-act="plus" aria-label="More">+</button></div>
        <button class="btn" data-act="add" ${v.stock === 0 ? 'disabled' : ''}>${esc(v.stock === 0 ? t('outOfStock') : t('addToCart'))}</button>
      </div>
    </div></article>`;
}
$('#shelf').addEventListener('click', e => {
  const b = e.target.closest('[data-act]'); if (!b) return;
  const card = b.closest('.card'); const p = S.products.find(x => x.id === card.dataset.p); if (!p) return;
  const act = b.dataset.act; const v = selVariant(p);
  if (act === 'var') { S.sel[p.id] = b.dataset.v; card.outerHTML = cardHtml(p); return; }
  if (act === 'bulk') { location.hash = '#bulk'; return; }
  if (act === 'minus' || act === 'plus') {
    let q = S.qty[v.id] || 1; q += act === 'plus' ? 1 : -1;
    const cap = v.max_online_qty || 100;
    if (q > cap) { toast(t('tinMax', cap)); q = cap; }
    S.qty[v.id] = Math.max(1, q); $('output', card).textContent = S.qty[v.id]; return;
  }
  if (act === 'add') addToCart('v', v.id, S.qty[v.id] || 1, card.querySelector('.pic img'));
});
document.addEventListener('click', e => {
  const a = e.target.closest('[data-pick]'); if (!a) return;
  const p = S.products.find(x => x.slug === a.dataset.pick); if (!p) return;
  setTimeout(() => { const c = $('#p-' + p.slug); if (c) { c.scrollIntoView({ behavior: 'smooth', block: 'center' }); c.animate([{ boxShadow: '0 0 0 3px var(--gold-bright)' }, { boxShadow: 'var(--shadow)' }], { duration: 1600 }); } }, 50);
});

/* ---------- cart ---------- */
function lineInfo(l) {
  if (l.k === 'c') {
    const c = S.combos.find(x => x.id === l.id); if (!c) return null;
    return { name: pick(c, 'name'), label: t('comboTag'), price: +c.price, img: c.image_url || 'assets/combo-gift.webp', max: 100, stock: null };
  }
  const m = variantMap()[l.id]; if (!m) return null;
  return { name: pick(m.p, 'name'), label: m.v.label, price: +m.v.price, img: m.p.image_url, max: m.v.max_online_qty || 100, stock: m.v.stock };
}
function addToCart(k, id, qty, srcEl) {
  const info = lineInfo({ k, id }); if (!info) return;
  const ex = S.cart.find(l => l.k === k && l.id === id);
  let n = (ex ? ex.qty : 0) + qty;
  if (n > info.max) { n = info.max; toast(t('tinMax', info.max)); }
  else toast(t('added'));
  if (ex) ex.qty = n; else S.cart.push({ k, id, qty: n });
  saveCart(); renderCartBadge();
  SFX.play('pop'); flyToCart(srcEl || null);
}
function bumpCart() {
  const btn = $('#cartBtn'), bd = $('#cartN');
  btn.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.14)' }, { transform: 'scale(1)' }], { duration: 420, easing: 'cubic-bezier(.3,1.6,.5,1)' });
  if (bd.textContent) bd.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.7)' }, { transform: 'scale(1)' }], { duration: 480, easing: 'cubic-bezier(.3,1.6,.5,1)' });
}
function flyToCart(src) {
  const img = src && src.tagName === 'IMG' ? src : (src && src.querySelector('img'));
  const to = $('#cartBtn').getBoundingClientRect();
  if (!img || matchMedia('(prefers-reduced-motion: reduce)').matches || !to.width) { bumpCart(); return; }
  const r = img.getBoundingClientRect();
  if (r.bottom < 0 || r.top > innerHeight) { bumpCart(); return; }
  const wrap = document.createElement('div'), pic = document.createElement('img');
  pic.src = img.currentSrc || img.src; pic.alt = '';
  const sz = Math.min(r.width, r.height, 150), w = img.naturalWidth && img.naturalHeight ? sz * img.naturalWidth / img.naturalHeight : sz;
  const bw = Math.min(w, r.width), bh = bw * (img.naturalHeight / img.naturalWidth || 1);
  const x0 = r.left + r.width / 2 - bw / 2, y0 = r.top + r.height / 2 - bh / 2;
  const x1 = to.left + to.width / 2 - bw / 2, y1 = to.top + to.height / 2 - bh / 2;
  wrap.className = 'fly'; wrap.style.cssText = `left:${x0}px;top:${y0}px;width:${bw}px;height:${bh}px`;
  pic.style.cssText = 'width:100%;height:100%;object-fit:contain;display:block';
  wrap.appendChild(pic); document.body.appendChild(wrap);
  const D = 780, dx = x1 - x0, dy = y1 - y0;
  wrap.animate([{ transform: 'translateX(0)' }, { transform: `translateX(${dx}px)` }], { duration: D, easing: 'cubic-bezier(.45,.05,.55,.95)', fill: 'forwards' });
  const a = pic.animate([
    { transform: 'translateY(0) scale(1) rotate(0deg)', opacity: 1 },
    { transform: `translateY(${Math.min(dy, 0) - 70}px) scale(.8) rotate(-8deg)`, opacity: 1, offset: .35 },
    { transform: `translateY(${dy}px) scale(.16) rotate(14deg)`, opacity: .85 }
  ], { duration: D, easing: 'cubic-bezier(.5,0,.75,.6)', fill: 'forwards' });
  a.onfinish = () => { wrap.remove(); bumpCart(); };
}
const cartCount = () => S.cart.reduce((a, l) => a + l.qty, 0);
const cartSubtotal = () => S.cart.reduce((a, l) => { const i = lineInfo(l); return a + (i ? i.price * l.qty : 0); }, 0);
function renderCartBadge() {
  const n = cartCount(); const b = $('#cartN'); b.textContent = n || ''; b.dataset.n = n;
  const st = $('#stick'); if (!st) return;
  if (n) {
    const sub = cartSubtotal(); const net = sub - (S.redeem || 0);
    st.querySelector('.st-n').textContent = n === 1 ? t('stickItem') : t('stickItems', n);
    st.querySelector('.st-t').textContent = inr(net + feeFor(net));
    st.hidden = false; requestAnimationFrame(() => st.classList.add('on'));
  } else { st.classList.remove('on'); setTimeout(() => { if (!st.classList.contains('on')) st.hidden = true; }, 320); }
}
function feeFor(net, freeShip) { return (freeShip || net >= setting('free_delivery_above', 1500)) ? 0 : setting('delivery_fee', 80); }
/* promo codes: the owner switches them on in Admin > Promo codes. The server re-checks every code when the order is placed. */
const promoOn = () => { const v = setting('promo_enabled', false); return v === true || v === 'true' || v === 'on'; };
const promoDisc = sub => (S.promo && promoOn()) ? Math.min(+S.promo.discount || 0, sub) : 0;
let promoBusy = false;
async function promoCheck(code, sub) {
  const ph = $('#coForm [name=phone]'); const phone = ph ? cleanPhone(ph.value) : '';
  const { data, error } = await sb.rpc('promo_check', { p_code: code, p_subtotal: sub, p_phone: /^[6-9]\d{9}$/.test(phone) ? phone : null });
  return { data, error };
}
async function promoRefresh(sub) {
  if (promoBusy) return; promoBusy = true;
  const { data, error } = await promoCheck(S.promo.code, sub);
  promoBusy = false;
  if (error || !data) { S.promo = null; S.promoMsg = t('promoDropped'); } else { S.promo = Object.assign(data, { sub }); }
  renderCart();
}

let cartView = 'cart'; let lastOrder = null;
function renderCart() {
  const dr = $('#cartDr');
  if (cartView === 'done' && lastOrder) { dr.innerHTML = cartDoneHtml(); fillUpi(lastOrder); return; }
  if (!S.cart.length) {
    dr.innerHTML = head(t('cart'), 'cartT') + `<div class="dr-body"><div class="empty"><b>${esc(t('cartEmpty'))}</b>${esc(t('cartEmptyHint'))}</div><p style="margin-top:20px"><button class="btn" data-close="1" data-go="#oils">${esc(t('keepShopping'))}</button></p></div>`;
    return;
  }
  const sub = cartSubtotal();
  if (S.promo && !promoOn()) S.promo = null;
  if (S.promo && S.promo.sub !== sub) promoRefresh(sub);
  const disc = promoDisc(sub);
  const minR = setting('min_redeem_points', 400);
  const bal = S.profile ? S.profile.points_balance : 0;
  if (S.redeem > Math.min(bal, sub - disc)) S.redeem = 0;
  const net = sub - disc - S.redeem; const fee = feeFor(net, S.promo && S.promo.free_delivery); const total = net + fee;
  const free = setting('free_delivery_above', 1500);
  const p = S.profile || {};
  const lines = S.cart.map(l => {
    const i = lineInfo(l); if (!i) return '';
    return `<div class="line-item" data-k="${l.k}" data-id="${l.id}">
      ${i.img ? `<img src="${esc(i.img)}" alt="${esc(i.name)}">` : '<span></span>'}
      <div><h4>${esc(i.name)}</h4><small>${esc(i.label)} · ${inr(i.price)}</small>
        <div style="margin-top:8px;display:flex;align-items:center"><div class="qty"><button data-act="cminus" aria-label="Less">−</button><output>${l.qty}</output><button data-act="cplus" aria-label="More">+</button></div><button class="rm" data-act="crm">${esc(t('remove'))}</button></div></div>
      <b>${inr(i.price * l.qty)}</b></div>`;
  }).join('');
  let redeemBox = '';
  if (S.profile) {
    if (bal >= minR) {
      redeemBox = `<div class="sect"><h4>${esc(t('redeemTitle'))}</h4><p class="hint">${esc(t('redeemHint', bal, minR))}</p>
        <div class="refbox"><input type="number" id="rdIn" min="${minR}" max="${Math.min(bal, sub - disc)}" step="1" value="${S.redeem || ''}" inputmode="numeric" aria-label="Points to use"><button class="btn line sm" data-act="rdApply">${esc(t('apply'))}</button><button class="btn line sm" data-act="rdMax">${esc(t('useMax'))}</button>${S.redeem ? `<button class="btn line sm" data-act="rdClear">${esc(t('clear'))}</button>` : ''}</div><div class="msg err" id="rdMsg"></div></div>`;
    } else {
      redeemBox = `<p class="hint sect">${esc(t('redeemLow', minR, bal))}</p>`;
    }
  }
  const away = free - net;
  let promoBox = '';
  if (promoOn()) {
    const pm = S.promoMsg; S.promoMsg = '';
    promoBox = S.promo
      ? `<div class="sect promo ok"><div class="promo-row"><span class="promo-tag">${esc(S.promo.code)}</span><b>${esc(t('promoOk', S.promo.code))}</b><button class="link" type="button" data-act="promoRm">${esc(t('promoRm'))}</button></div><p class="hint">${esc(S.promo.free_delivery ? t('promoFree') : t('promoSave', inr(disc)))}${S.promo.title ? ' · ' + esc(S.promo.title) : ''}</p></div>`
      : `<div class="sect promo"><h4>${esc(t('promoTitle'))}</h4><div class="refbox"><input type="text" id="promoIn" maxlength="24" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="${esc(t('promoPh'))}" aria-label="${esc(t('promoTitle'))}"><button class="btn line sm" type="button" data-act="promoApply">${esc(t('apply'))}</button></div><div class="msg err${pm ? ' show' : ''}" id="promoMsg" role="alert">${esc(pm || '')}</div></div>`;
  }
  dr.innerHTML = head(t('cart'), 'cartT') + `<div class="dr-body">${lines}${redeemBox}${promoBox}
    <div class="sum sect"><div><span>${esc(t('subtotal'))}</span><span>${inr(sub)}</span></div>
      ${disc ? `<div class="em"><span>${esc(t('promoLine', S.promo.code))}</span><span>−${inr(disc)}</span></div>` : ''}
      ${S.redeem ? `<div class="em"><span>${esc(t('pointsUsed'))}</span><span>−${inr(S.redeem)}</span></div>` : ''}
      <div><span>${esc(t('delivery'))}</span><span>${fee ? inr(fee) : esc(t('free'))}</span></div>
      <div class="tot"><span>${esc(t('total'))}</span><span>${inr(total)}</span></div></div>
    <div class="fd" role="status"><div class="fd-bar"><i style="width:${Math.max(4, Math.min(100, Math.round(net / free * 100)))}%"></i></div><p class="hint">${esc(away > 0 ? t('freeAway', inr(away)) : t('freeYes'))}</p></div>
    ${checkoutHtml(p, total)}
    </div>`;
}


/* ---------- festival mode (owner switches it on in Admin > Festival) ---------- */
function festImg(u) { return /^https?:|^assets\//.test(u || '') ? u : ''; }
function renderFestival() {
  const f = S.festival, bar = $('#festBar'), tk = $('#festTrack');
  if (bar) {
    if (f && (f.msg_en || f.msg_ta)) {
      bar.innerHTML = (festImg(f.logo_url) ? '<img src="' + esc(festImg(f.logo_url)) + '" alt="' + esc(f.msg_en || 'Festival greeting') + '" width="34" height="34">' : '<span class="fest-dot" aria-hidden="true">✦</span>') + '<span>' + esc(pick(f, 'msg')) + '</span>';
      bar.hidden = false;
    } else { bar.hidden = true; bar.innerHTML = ''; }
  }
  if (tk) tk.innerHTML = festCardHtml(true);
}
function festCardHtml(small) {
  const f = S.festival; if (!f || !(f.msg_en || f.msg_ta)) return '';
  const img = festImg(f.wish_url) || festImg(f.logo_url);
  return '<div class="fest-card' + (small ? ' sm' : '') + '">' + (img ? '<img src="' + esc(img) + '" alt="' + esc(f.msg_en || 'Festival greeting') + '" loading="lazy">' : '') + '<p>' + esc(pick(f, 'msg')) + '</p></div>';
}

let guestMode = false;
function checkoutHtml(p, total) {
  if (!S.profile && !guestMode) {
    return `<div class="sect gate"><p class="hint" style="margin-bottom:12px">${esc(t('guestPerk'))}</p>
      <button class="btn" data-act="needLogin">${esc(t('signIn'))} / ${esc(t('signUp'))}</button>
      <button class="link gbtn" type="button" data-act="guestGo">${esc(t('guestBtn'))}</button></div>`;
  }
  const g = !S.profile;
  return `<form class="f sect" id="coForm" novalidate data-guest="${g ? 1 : 0}">
      <h4>${esc(t('deliverTo'))}</h4>
      ${g ? `<p class="hint">${esc(t('guestNote'))} <button class="link" type="button" data-act="needLogin">${esc(t('guestHave'))}</button></p>` : ''}
      <label class="fl">${esc(t('name'))}<input type="text" name="name" autocomplete="name" value="${esc(p.full_name || '')}" required></label>
      <label class="fl">${esc(t('mobile'))}<input type="tel" name="phone" inputmode="numeric" maxlength="10" autocomplete="tel-national" value="${esc(p.phone || '')}" required></label>
      <label class="fl">${esc(t('address'))}<textarea name="address" autocomplete="street-address" required>${esc(p.address || '')}</textarea></label>
      <label class="fl">${esc(t('pin'))}<input type="text" name="pin" inputmode="numeric" maxlength="6" autocomplete="postal-code" value="${esc(p.pincode || '')}" required></label>
      <label class="fl">${esc(t('notes'))}<input type="text" name="notes" maxlength="300"></label>
      <fieldset class="pay" style="border:0;padding:0;margin:0"><legend class="fl" style="font-weight:600;font-size:14px;margin-bottom:8px">${esc(t('payHow'))}</legend>
        <label><input type="radio" name="pay" value="online" checked><b>${esc(t('payOnline'))}</b><small>${esc(t('payOnlineSub'))}</small></label>
        <label><input type="radio" name="pay" value="offline"><b>${esc(t('payOffline'))}</b><small>${esc(t('payOfflineSub'))}</small></label></fieldset>
      <label class="pol-ck"><input type="checkbox" name="pol" required><span>${t('polLine')}</span></label>
      <div class="msg err" id="coMsg" role="alert"></div>
      <button class="btn" type="submit" id="coBtn">${esc(t('place'))} · ${inr(total)}</button>
      <button class="btn wa-btn" type="submit" id="coWa" data-viawa="1"><img src="assets/wa-logo.svg" alt="" width="22" height="22">${esc(t('waOrder'))}</button></form>`;
}
function head(title, id) { return `<div class="dr-head"><h3 id="${id}">${esc(title)}</h3><button class="x" data-close="1" aria-label="Close">×</button></div>`; }

/* ---------- UPI pay card (shows only the default UPI ID the owner chose) ---------- */
let upiInfo, qrLoad;
function loadQR() { return qrLoad || (qrLoad = new Promise((ok, no) => { if (window.qrcode) return ok(); const el = document.createElement('script'); el.src = 'js/qr.js?v=20261013d'; el.onload = ok; el.onerror = no; document.head.appendChild(el); })); }
async function fillUpi(o) {
  const box = $('#upiCard'); if (!box) return;
  try {
    if (upiInfo === undefined) { const r = await sb.rpc('pay_upi'); upiInfo = (r && r.data && r.data.upi_id) ? r.data : null; }
    if (!upiInfo) return;
    await loadQR();
    const amt = (+o.total).toFixed(2);
    const link = 'upi://pay?pa=' + encodeURIComponent(upiInfo.upi_id) + '&pn=' + encodeURIComponent(upiInfo.payee || 'Sri Vinayaga Oil & Flour Mills') + '&am=' + amt + '&cu=INR&tn=' + encodeURIComponent('Order ' + o.order_no);
    const q = window.qrcode(0, 'M'); q.addData(link); q.make();
    const mob = matchMedia('(pointer:coarse)').matches;
    const payBtn = mob ? '<a class="btn upi-pay" href="' + esc(link) + '">' + esc(t('upiOpen')) + '</a>' : '';
    box.innerHTML = '<h4>' + esc(t('upiTitle', inr(o.total))) + '</h4><p class="hint">' + esc(t(mob ? 'upiHowMob' : 'upiHowDesk')) + '</p>' + payBtn +
      '<div class="qr">' + q.createSvgTag({ cellSize: 4, margin: 2, scalable: true }) + '</div>' +
      '<div class="upi-id mono">' + esc(upiInfo.upi_id) + '</div>' +
      '<div class="upi-btns"><button type="button" class="btn line" data-act="upiCopy" data-v="' + esc(upiInfo.upi_id) + '">' + esc(t('upiCopy')) + '</button></div>' +
      '<p class="hint">' + esc(t('upiNote')) + '</p>';
    box.hidden = false;
    const pm = $('#placedMsg'); if (pm) pm.textContent = t('placedOnlineQr');
  } catch (e) { /* card stays hidden; order is already placed */ }
}


/* ---------- search tags that depend on live data ---------- */
function seoRuntime() {
  const base = String(setting('site_url', '') || '').replace(/\/+$/, '');
  if (base && !document.querySelector('link[rel=canonical]')) { const l = document.createElement('link'); l.rel = 'canonical'; l.href = base + '/'; document.head.appendChild(l); }
  const old = document.getElementById('ldProducts'); if (old) old.remove();
  if (!S.products.length) return;
  const rv = S.reviews || [];
  const agg = rv.length ? { '@type': 'AggregateRating', ratingValue: (rv.reduce((a, r) => a + r.rating, 0) / rv.length).toFixed(1), reviewCount: rv.length, bestRating: 5, worstRating: 1 } : null;
  const items = S.products.map(p => {
    const o = { '@type': 'Product', name: p.name_en, alternateName: p.name_ta || undefined, description: p.blurb_en, brand: { '@type': 'Brand', name: 'Sri Vinayaga Oil & Flour Mills' },
      image: p.image_url ? new URL(p.image_url, location.href).href : undefined,
      offers: p.variants.map(v => ({ '@type': 'Offer', name: p.name_en + ' ' + v.label, price: String(v.price), priceCurrency: 'INR', availability: (v.stock === null || v.stock > 0) ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock', url: (base || location.origin + location.pathname.replace(/[^/]*$/, '').replace(/\/$/, '')) + '/p/' + p.slug + '.html' })) };
    if (agg) o.aggregateRating = agg;
    return o;
  });
  const el = document.createElement('script'); el.type = 'application/ld+json'; el.id = 'ldProducts';
  el.textContent = JSON.stringify({ '@context': 'https://schema.org', '@graph': items });
  document.head.appendChild(el);
}
/* ---------- add to home screen ---------- */
let installEv = null;
if ('serviceWorker' in navigator && location.protocol === 'https:') window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
try { localStorage.setItem('sv_visits', String((+localStorage.getItem('sv_visits') || 0) + 1)); } catch (e) {}
const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone;
const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
function showInstall() {
  const b = document.getElementById('installBtn'); if (!b || isStandalone()) return;
  let v = 0; try { v = +localStorage.getItem('sv_visits') || 0; } catch (e) {}
  b.hidden = !(v >= 2 && (installEv || isIOS));
}
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEv = e; showInstall(); });
window.addEventListener('appinstalled', () => { installEv = null; const b = document.getElementById('installBtn'); if (b) b.hidden = true; });
document.addEventListener('click', async e => {
  if (!e.target.closest('#installBtn')) return;
  if (installEv) { installEv.prompt(); try { await installEv.userChoice; } catch (x) {} installEv = null; showInstall(); }
  else toast(L('Tap the Share button, then "Add to Home Screen".', 'Share பொத்தானைத் தட்டி, "Add to Home Screen" தேர்ந்தெடுக்கவும்.'));
});
if (isIOS) document.addEventListener('DOMContentLoaded', showInstall);

/* ---------- invoice ---------- */
let invLib;
function loadInvoice() { return invLib || (invLib = new Promise((ok, no) => { if (window.SVInvoice) return ok(); const el = document.createElement('script'); el.src = 'js/invoice.js?v=20261013d'; el.onload = ok; el.onerror = () => { invLib = null; no(); }; document.head.appendChild(el); })); }
function invBtns(no) {
  const b = (l, c, tx) => `<button type="button" class="${c}" data-inv="${esc(no)}" data-il="${l}">${esc(tx)}</button>`;
  return `<span class="inv-row">${lang === 'ta' ? b('ask', 'link', t('invDl')) : b('en', 'link', t('invDl')) + b('ta', 'link sm', t('invTa'))}</span>`;
}
function invOrder(no) {
  if (lastOrder && lastOrder.order_no === no) return lastOrder;
  return (S.orders || []).find(o => o.order_no === no);
}
function invoiceData(o) {
  const dbRow = !!o.order_items;
  const lines = dbRow ? o.order_items.map(i => ({ name: i.item_name, label: i.item_label, qty: i.qty, price: +i.unit_price })) : (o.lines || []);
  const subtotal = dbRow ? +o.subtotal : lines.reduce((a, l) => a + l.price * l.qty, 0);
  const redeem = dbRow ? (o.points_redeemed || 0) : (o.redeem || 0);
  const promo = +o.promo_discount || 0;
  const fee = dbRow ? +o.delivery_fee : Math.max(0, +o.total - (subtotal - promo - redeem));
  return { no: o.order_no, dateStr: new Date(o.created_at || Date.now()).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    payMode: o.payment_mode, payStatus: o.payment_status || 'pending', name: o.customer_name || o.name, phone: o.phone, address: o.address, pin: o.pincode || o.pin,
    lines, subtotal, redeem, promo, promoCode: o.promo_code || '', fee, total: +o.total };
}
async function makeInvoice(no, il, btn) {
  const o = invOrder(no); if (!o) return;
  const d = invoiceData(o);
  const lab = btn && btn.textContent; if (btn) { btn.disabled = true; btn.textContent = t('invBusy'); }
  try {
    await loadInvoice();
    const opt = { site: (setting('site_url', '') || '').replace(/^https?:\/\//, '').replace(/\/$/, '') };
    const tm = {}; S.products.forEach(p => { if (p.name_ta) tm[p.name_en] = p.name_ta; }); S.combos.forEach(c => { if (c.name_ta) tm[c.name_en] = c.name_ta; });
    opt.tamilName = n => tm[n] || n;
    if (S.festival && (S.festival.msg_en || S.festival.msg_ta)) { opt.festival = S.festival; opt.festLogo = festImg(S.festival.logo_url); }
    if (d.payStatus !== 'paid' && d.total > 0) {
      try {
        if (upiInfo === undefined) { const r = await sb.rpc('pay_upi'); upiInfo = (r && r.data && r.data.upi_id) ? r.data : null; }
        if (upiInfo) {
          await loadQR();
          const link = 'upi://pay?pa=' + encodeURIComponent(upiInfo.upi_id) + '&pn=' + encodeURIComponent(upiInfo.payee || 'Sri Vinayaga Oil & Flour Mills') + '&am=' + d.total.toFixed(2) + '&cu=INR&tn=' + encodeURIComponent('Order ' + d.no);
          const q = window.qrcode(0, 'M'); q.addData(link); q.make();
          opt.qrSvg = q.createSvgTag({ cellSize: 4, margin: 0, scalable: true }); opt.upiId = upiInfo.upi_id;
        }
      } catch (x) { /* invoice without QR */ }
    }
    try { await window.SVInvoice.toPdf(d, il, opt); }
    catch (x) { console.error('Invoice PDF failed, using print dialog:', x); await window.SVInvoice.printFallback(d, il, opt); }
  } catch (x) { console.error('Invoice failed:', x); toast(t('invFail')); }
  if (btn) { btn.disabled = false; btn.textContent = lab; }
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-inv]'); if (!b) return;
  const no = b.dataset.inv, il = b.dataset.il;
  if (il === 'ask') {
    const row = b.closest('.inv-row');
    row.innerHTML = `<span class="hint">${esc(t('invAsk'))}</span><button type="button" class="link" data-inv="${esc(no)}" data-il="ta">தமிழ்</button><button type="button" class="link" data-inv="${esc(no)}" data-il="en">English</button>`;
    return;
  }
  makeInvoice(no, il, b);
});
function waLink(o) {
  const lines = (o.lines || []).map(l => '• ' + l.name + (l.label ? ' ' + l.label : '') + ' × ' + l.qty + ' = ₹' + (l.price * l.qty).toLocaleString('en-IN')).join('\n');
  const msg = 'Hello, I placed order ' + o.order_no + ' on the website.\n\n' + lines + (+o.promo_discount > 0 ? '\nPromo ' + o.promo_code + ': -₹' + (+o.promo_discount).toLocaleString('en-IN') : '') + '\n\nTotal: ₹' + (+o.total).toLocaleString('en-IN') + ' (' + (o.payment_mode === 'online' ? 'online payment' : 'pay on delivery') + ')\nName: ' + o.name + '\nPhone: ' + o.phone + '\nAddress: ' + o.address + ' - ' + o.pin;
  return 'https://wa.me/' + waNum('admin') + '?text=' + encodeURIComponent(msg);
}
function cartDoneHtml() {
  const o = lastOrder; const earnNow = setting('credit_points_on', 'delivered') === 'placed';
  const wa = `<a class="btn wa-btn ${o.viaWa ? '' : 'line'}" href="${esc(waLink(o))}" target="_blank" rel="noopener"><img src="assets/wa-logo.svg" alt="" width="22" height="22">${esc(t('waSend'))}</a>`;
  return head(t('placed'), 'cartT') + `<div class="dr-body"><div class="done"><div class="ok">✓</div><h3>${esc(t('placed'))}</h3>
    ${festCardHtml(false)}
    <div class="no">${esc(o.order_no)}</div>
    <p id="placedMsg">${esc(o.payment_mode === 'online' ? t('placedOnline') : t('placedOffline'))}</p>
    <p style="margin-top:10px"><b>${inr(o.total)}</b></p>
    ${o.viaWa ? `<div class="wa-card"><h4>${esc(t('waSendTitle'))}</h4>${wa}<p class="hint">${esc(t('waSent'))}</p></div>` : ''}
    ${o.payment_mode === 'online' && o.total > 0 ? '<div id="upiCard" class="upi" hidden></div>' : ''}
    ${o.guest ? `<div class="guest-up"><h4>${esc(t('guestDoneHead'))}</h4><p class="hint">${esc(t('guestDoneBody'))}</p><button class="btn" data-act="guestSignup">${esc(t('createAcct'))}</button></div>` : (o.points_estimate > 0 ? `<p class="hint" style="margin-top:10px">${esc(earnNow ? t('willEarnNow', o.points_estimate) : t('willEarn', o.points_estimate))}</p>` : '')}
    <div class="inv-done">${invBtns(o.order_no)}</div>
    <div style="display:grid;gap:10px;margin-top:16px">${o.viaWa ? '' : wa}${o.guest ? `<button class="btn line" data-act="trackThis">${esc(t('trackThis'))}</button>` : `<button class="btn" data-act="goOrders">${esc(t('viewOrders'))}</button>`}<button class="btn line" data-close="1">${esc(t('keepShopping'))}</button></div></div></div>`;
}
$('#cartDr').addEventListener('click', async e => {
  const go = e.target.closest('[data-go]'); if (go) { closeAll(); setTimeout(() => { location.hash = go.dataset.go; }, 320); return; }
  const b = e.target.closest('[data-act]'); if (!b) return;
  const li = b.closest('.line-item'); const act = b.dataset.act;
  if (act === 'upiCopy') { try { await navigator.clipboard.writeText(b.dataset.v); } catch (x) {} toast(t('upiCopied')); return; }
  if (li) {
    const l = S.cart.find(x => x.k === li.dataset.k && x.id === li.dataset.id); const i = l && lineInfo(l);
    if (act === 'cminus') l.qty = Math.max(1, l.qty - 1);
    if (act === 'cplus') { if (l.qty + 1 > i.max) toast(t('tinMax', i.max)); else l.qty++; }
    if (act === 'crm') S.cart = S.cart.filter(x => x !== l);
    saveCart(); renderCartBadge(); renderCart(); return;
  }
  if (act === 'rdApply' || act === 'rdMax') {
    const sub = cartSubtotal() - promoDisc(cartSubtotal()); const bal = S.profile.points_balance; const minR = setting('min_redeem_points', 400);
    const v = act === 'rdMax' ? Math.min(bal, sub) : Math.floor(+$('#rdIn').value || 0);
    const m = $('#rdMsg');
    if (v < minR) { m.textContent = t('err.REDEEM_BELOW_MIN', minR); m.classList.add('show'); return; }
    if (v > bal) { m.textContent = t('err.REDEEM_EXCEEDS_BALANCE'); m.classList.add('show'); return; }
    if (v > sub) { m.textContent = t('err.REDEEM_EXCEEDS_ORDER'); m.classList.add('show'); return; }
    S.redeem = v; SFX.play('coin'); renderCart(); return;
  }
  if (act === 'rdClear') { S.redeem = 0; renderCart(); return; }
  if (act === 'promoRm') { S.promo = null; renderCart(); return; }
  if (act === 'promoApply') {
    const inp = $('#promoIn'), m = $('#promoMsg'); const code = (inp.value || '').trim().toUpperCase();
    m.classList.remove('show'); if (!code) return;
    b.disabled = true; const sub = cartSubtotal();
    const { data, error } = await promoCheck(code, sub); b.disabled = false;
    if (error || !data) { m.textContent = errText(error); m.classList.add('show'); return; }
    S.promo = Object.assign(data, { sub }); S.redeem = 0; SFX.play('coin'); renderCart(); return;
  }
  if (act === 'needLogin') { openAccount('in'); return; }
  if (act === 'guestGo') { guestMode = true; renderCart(); return; }
  if (act === 'guestSignup') { cartView = 'cart'; openAccount('up'); return; }
  if (act === 'trackThis') { closeAll(); setTimeout(() => { location.hash = '#track'; }, 320); return; }
  if (act === 'goOrders') { cartView = 'cart'; openAccount(); return; }
});
$('#cartDr').addEventListener('submit', async e => {
  if (e.target.id !== 'coForm') return;
  e.preventDefault();
  const f = e.target; const m = $('#coMsg'); m.classList.remove('show');
  const viaWa = !!(e.submitter && e.submitter.dataset.viawa);
  const fd = Object.fromEntries(new FormData(f));
  if (!fd.pol) { m.textContent = t('polNeed'); m.classList.add('show'); return; }
  const guest = f.dataset.guest === '1';
  const btn = $('#coBtn'), wb = $('#coWa'); btn.dataset.l = btn.textContent; if (wb) wb.dataset.l = wb.textContent; btn.disabled = true; if (wb) wb.disabled = true; (viaWa ? wb : btn).textContent = t('placing');
  const items = S.cart.map(l => ({ kind: l.k === 'c' ? 'combo' : 'variant', id: l.id, qty: l.qty }));
  const lines = S.cart.map(l => { const i = lineInfo(l); return i ? { name: i.name, label: i.label, price: i.price, qty: l.qty } : null; }).filter(Boolean);
  const imgs = [];
  const base = { p_items: items, p_payment: fd.pay, p_name: fd.name, p_phone: cleanPhone(fd.phone), p_address: fd.address, p_pin: (fd.pin || '').trim(), p_notes: fd.notes || null, p_lang: lang, p_promo: (S.promo && promoOn()) ? S.promo.code : null };
  const call = guest ? sb.rpc('place_guest_order', base) : sb.rpc('place_order', Object.assign({ p_redeem: S.redeem || 0 }, base));
  const res = await rocketOrder(call, imgs);
  const { data, error } = res;
  if (error) {
    m.textContent = errText(error); m.classList.add('show'); btn.disabled = false; if (wb) wb.disabled = false;
    btn.textContent = btn.dataset.l; if (wb) wb.textContent = wb.dataset.l;
    if (/ITEM_UNAVAILABLE|OUT_OF_STOCK/.test(error.message)) loadCatalogue().then(() => { renderShelf(); });
    return;
  }
  lastOrder = Object.assign({ created_at: new Date().toISOString(), redeem: S.redeem || 0 }, data, { lines, name: fd.name, phone: cleanPhone(fd.phone), address: fd.address, pin: (fd.pin || '').trim(), viaWa, lang });
  S.cart = []; S.redeem = 0; S.promo = null; saveCart(); renderCartBadge();
  cartView = 'done'; renderCart();
  await rocketEnd(data);
  if (!guest) { await refreshAccount(); }
  await loadCatalogue(); renderShelf();
});

/* ---------- rocket: order launch ---------- */
let rk = null;
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function rocketOrder(call, imgs) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const settle = call.then(r => r, e => ({ data: null, error: e || { message: 'NETWORK' } }));
  if (reduce) return settle;
  const el = document.createElement('div'); el.className = 'rk';
  el.innerHTML = '<canvas class="rk-cv"></canvas><div class="rk-ship"><img class="rk-cart" src="assets/cart-fly.webp" alt=""><div class="rk-flame"></div></div><div class="rk-done"><img src="assets/logo-drop.webp" alt=""><h3></h3><p></p></div>';
  document.body.appendChild(el);
  const cv = $('.rk-cv', el), cx = cv.getContext('2d'); const dpr = Math.min(2, devicePixelRatio || 1);
  const W = cv.width = innerWidth * dpr, H = cv.height = innerHeight * dpr; cv.style.width = '100%'; cv.style.height = '100%';
  const parts = [], stars = Array.from({ length: 70 }, () => ({ x: Math.random() * W, y: Math.random() * H, r: (.5 + Math.random() * 1.4) * dpr, s: .3 + Math.random() }));
  const ship = $('.rk-ship', el); let phase = 'ignite', t0 = performance.now(), run = true, lift = 0;
  const box = () => { const r = ship.getBoundingClientRect(); return { x: (r.left + r.width / 2) * dpr, y: (r.bottom - 6) * dpr }; };
  (function frame(now) {
    if (!run) return; const dt = now - t0;
    cx.clearRect(0, 0, W, H);
    stars.forEach(s => { cx.globalAlpha = .35 + .4 * Math.abs(Math.sin(now / 600 + s.x)); cx.fillStyle = '#fff'; cx.fillRect(s.x, (s.y + (phase === 'lift' ? lift * 900 * s.s : 0)) % H, s.r, s.r); });
    const b = box(), n = phase === 'lift' ? 5 : 2;
    for (let i = 0; i < n; i++) parts.push({ x: b.x + (Math.random() - .5) * 26 * dpr, y: b.y, vx: (Math.random() - .5) * 1.6 * dpr, vy: (1.5 + Math.random() * 2.5) * dpr, l: 1, k: Math.random() < .3 ? 'sp' : 'sm' });
    for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; p.x += p.vx; p.y += p.vy; p.l -= p.k === 'sp' ? .03 : .014; if (p.l <= 0) { parts.splice(i, 1); continue; }
      cx.globalAlpha = p.l * (p.k === 'sp' ? 1 : .35); cx.fillStyle = p.k === 'sp' ? '#D9A441' : '#d8d4c8'; cx.beginPath(); cx.arc(p.x, p.y, (p.k === 'sp' ? 2 : 9 * (1.4 - p.l)) * dpr, 0, 6.3); cx.fill(); }
    requestAnimationFrame(frame);
  })(t0);
  el.classList.add('on'); SFX.play('ignite'); ship.classList.add('shake');
  const [res] = await Promise.all([settle, sleep(1700)]);
  if (res.error) { run = false; SFX.play('error'); el.classList.remove('on'); await sleep(320); el.remove(); return res; }
  phase = 'lift'; ship.classList.remove('shake'); ship.classList.add('go'); SFX.play('launch');
  const st = performance.now(); (function lf() { lift = Math.min(1, (performance.now() - st) / 1300); if (run && lift < 1) requestAnimationFrame(lf); })();
  await sleep(1250);
  rk = { el, stop: () => { run = false; } };
  return res;
}
async function rocketEnd(order) {
  if (!rk) return; const { el, stop } = rk; rk = null;
  const no = order && (order.order_no || order.number || (order.order && order.order.order_no)) || '';
  $('.rk-done h3', el).textContent = L('Order placed', 'ஆர்டர் பதிவு செய்யப்பட்டது');
  $('.rk-done p', el).textContent = no ? L('Your order number is ', 'உங்கள் ஆர்டர் எண்: ') + no : '';
  el.classList.add('placed'); SFX.play('chime');
  await sleep(1500); el.classList.remove('on'); await sleep(360); stop(); el.remove();
}

/* ---------- drawers ---------- */
let lastFocus = null;
function openDrawer(el) {
  lastFocus = document.activeElement;
  SFX.play('tick'); el.hidden = false; $('#scrim').classList.add('on');
  requestAnimationFrame(() => { el.classList.add('on'); const f = $('button, input, a', el); if (f) f.focus({ preventScroll: true }); });
  document.body.style.overflow = 'hidden'; document.documentElement.classList.add('dr-open');
}
function closeAll() {
  $$('.drawer.on').forEach(d => { d.classList.remove('on'); setTimeout(() => { if (!d.classList.contains('on')) d.hidden = true; }, 360); });
  $('#scrim').classList.remove('on'); document.body.style.overflow = ''; document.documentElement.classList.remove('dr-open');
  if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  if (cartView === 'done') cartView = 'cart';
}
$('#scrim').addEventListener('click', closeAll);
document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeAll(); setMenu(false); } });
document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target && e.target.id === 'promoIn') { e.preventDefault(); const b = document.querySelector('[data-act="promoApply"]'); if (b) b.click(); } });
document.addEventListener('click', e => { if (e.target.closest('[data-close]')) closeAll(); });
$('#cartBtn').addEventListener('click', () => { renderCart(); openDrawer($('#cartDr')); });
const stk = $('#stick'); if (stk) stk.addEventListener('click', () => { renderCart(); openDrawer($('#cartDr')); });
$('#acctBtn').addEventListener('click', () => openAccount());

/* ---------- auth + account ---------- */
const cleanPhone = v => { let d = String(v || '').replace(/\D/g, ''); if (d.length > 10) d = d.slice(-10); return d; };
const phoneEmail = p => p + '@' + SV.phoneDomain;
let authTab = 'in';
async function refreshAccount() {
  const { data } = await sb.auth.getSession();
  S.session = data.session;
  if (!S.session) { S.profile = null; S.orders = []; S.ledger = []; renderAcctBtn(); renderRewards(); renderTrack(); renderOpenOrder(); return; }
  const uid = S.session.user.id;
  const [pr, od, lg] = await Promise.all([
    sb.from('profiles').select('*').eq('id', uid).single(),
    sb.from('orders').select('*, order_items(*)').eq('user_id', uid).order('created_at', { ascending: false }).limit(20),
    sb.from('points_ledger').select('*').eq('user_id', uid).order('created_at', { ascending: false }).limit(30)
  ]);
  S.profile = pr.data || null; S.orders = od.data || []; S.ledger = lg.data || [];
  renderAcctBtn(); renderRewards(); renderTrack(); renderOpenOrder();
}
function renderAcctBtn() {
  const l = $('#acctLbl');
  l.innerHTML = S.profile ? esc((S.profile.full_name || '').split(' ')[0] || t('myAccount')) : `<span class="en">Sign in</span><span class="ta">உள்நுழை</span>`;
}
function openAccount(tab) {
  if (tab) authTab = tab;
  renderAccount(); openDrawer($('#acctDr'));
}
function tierInfo(spend) {
  const tiers = (setting('points_tiers', [{ min: 0, rate: 0.02 }])).slice().sort((a, b) => a.min - b.min);
  let cur = tiers[0], next = null;
  tiers.forEach(x => { if (spend >= x.min) cur = x; });
  next = tiers.find(x => x.min > spend) || null;
  return { cur, next, tiers };
}
const pct = r => (Math.round(r * 1000) / 10) + '%';
function renderAccount() {
  const dr = $('#acctDr');
  if (!S.profile) {
    const ref = store.get('sv_ref') || '';
    dr.innerHTML = head(authTab === 'in' ? t('signIn') : authTab === 'reset' ? t('rsTitle') : t('signUp'), 'acctT') + `<div class="dr-body">
      <div class="tabs" role="tablist"><button role="tab" data-tab="in" aria-selected="${authTab === 'in'}">${esc(t('signIn'))}</button><button role="tab" data-tab="up" aria-selected="${authTab === 'up'}">${esc(t('signUp'))}</button></div>
      ${authTab === 'in' ? `<form class="f" id="inForm" novalidate>
        <label class="fl">${esc(t('mobile'))}<input type="tel" name="phone" inputmode="numeric" maxlength="14" autocomplete="username" required></label>
        <label class="fl">${esc(t('password'))}<input type="password" name="password" autocomplete="current-password" required></label>
        <div class="msg err" id="authMsg" role="alert"></div>
        <button class="btn" type="submit">${esc(t('signIn'))}</button>
        <p class="hint"><button type="button" class="link" data-tab="reset">${esc(t('forgotLink'))}</button></p></form>`
      : authTab === 'reset' ? `<form class="f" id="rsForm" novalidate>
        <p class="hint">${esc(t('rsHint'))}</p>
        <label class="fl">${esc(t('mobile'))}<input type="tel" name="phone" inputmode="numeric" maxlength="14" autocomplete="username" required></label>
        <label class="fl">${esc(t('rsPin'))}<input type="text" name="pin" inputmode="numeric" maxlength="6" autocomplete="off" required></label>
        <label class="fl">${esc(t('rsAmt'))}<input type="text" name="amount" inputmode="decimal" maxlength="10" autocomplete="off" required></label>
        <label class="fl">${esc(t('rsNew'))}<input type="password" name="password" autocomplete="new-password" required></label>
        <div class="msg err" id="authMsg" role="alert"></div>
        <button class="btn" type="submit">${esc(t('rsBtn'))}</button>
        <p class="hint">${esc(t('rsNoOrder'))} <a class="link" data-wa="1" href="https://wa.me/${esc(waNum('admin'))}" target="_blank" rel="noopener">WhatsApp</a></p>
        <p class="hint"><button type="button" class="link" data-tab="in">${esc(t('rsBack'))}</button></p></form>`
      : `<form class="f" id="upForm" novalidate>
        <label class="fl">${esc(t('name'))}<input type="text" name="name" autocomplete="name" required></label>
        <label class="fl">${esc(t('mobile'))}<input type="tel" name="phone" inputmode="numeric" maxlength="14" autocomplete="username" required></label>
        <label class="fl">${esc(t('password'))} <small>${esc(t('pwHint'))}</small><input type="password" name="password" autocomplete="new-password" minlength="8" required></label>
        <label class="fl">${esc(t('emailOpt'))}<input type="email" name="email" autocomplete="email"></label>
        <label class="fl">${esc(t('refCode'))}<input type="text" name="ref" value="${esc(ref)}" maxlength="12" style="text-transform:uppercase;font-family:var(--f-mono)"></label>
        <div class="msg err" id="authMsg" role="alert"></div>
        <button class="btn" type="submit">${esc(t('signUp'))}</button></form>`}
    </div>`;
    return;
  }
  const p = S.profile; const ti = tierInfo(+p.lifetime_spend); const minR = setting('min_redeem_points', 400);
  const progress = ti.next ? Math.min(100, Math.round(((+p.lifetime_spend - ti.cur.min) / (ti.next.min - ti.cur.min)) * 100)) : 100;
  const link = location.origin + location.pathname + '?ref=' + p.referral_code;
  const waText = encodeURIComponent(L(`I order my oils from Sri Vinayaga Oil & Flour Mills, Trichy. Join with my code ${p.referral_code} and we both earn points: ${link}`, `நான் திருச்சி ஸ்ரீ விநாயகா ஆயில் & ஃப்ளோர் மில்ஸில் எண்ணெய் வாங்குகிறேன். என் குறியீடு ${p.referral_code} மூலம் இணைந்தால் இருவருக்கும் புள்ளிகள்: ${link}`));
  const delivered = S.orders.some(o => o.status === 'delivered');
  const role = p.role && p.role !== 'customer';
  dr.innerHTML = head(t('myAccount'), 'acctT') + `<div class="dr-body">
    <div class="acct-top"><div style="opacity:.85;font-size:14px">${esc(t('welcome', (p.full_name || '').split(' ')[0] || ''))}</div>
      <div class="bigpts">${(p.points_balance || 0).toLocaleString('en-IN')}</div><div>${esc(t('yourPoints'))}</div>
      <div class="bar"><i style="width:${progress}%;background:var(--gold-bright)"></i></div>
      <div style="font-size:14px">${esc(t('tierNow', pct(ti.cur.rate)))} ${ti.next ? esc(t('tierNext', inr(ti.next.min - p.lifetime_spend), pct(ti.next.rate))) : esc(t('tierTop'))}</div>
      <div style="font-size:13.5px;opacity:.8;margin-top:4px">${esc(t('lifetime', inr(p.lifetime_spend)))}</div>
      ${p.points_balance < minR ? `<div style="font-size:13.5px;margin-top:8px">${esc(t('redeemAtCheckout', minR))}</div>` : `<div style="margin-top:12px"><button class="btn gold sm" data-act="toCart">${esc(t('redeemTitle'))}</button></div>`}</div>
    ${role ? `<p style="margin-bottom:14px"><a class="btn line sm" href="admin/">${esc(t('adminPanel'))}</a></p>` : ''}
    <div class="sect"><h4>${esc(t('referTitle'))}</h4><p class="hint">${esc(t('referHint', setting('referral_referrer_points', 150), setting('referral_friend_points', 100)))}</p>
      <div class="refbox"><input type="text" readonly value="${esc(p.referral_code)}" aria-label="Your referral code" id="refCode"><button class="btn line sm" data-act="copyRef">${esc(t('copy'))}</button></div>
      <p style="margin-top:10px"><a class="btn sm" href="https://wa.me/?text=${waText}" target="_blank" rel="noopener">${esc(t('shareWa'))}</a></p>
      ${p.ref_count ? `<p class="hint" style="margin-top:8px">${esc(t('referStats', p.ref_count))}</p>` : ''}</div>
    <div class="sect"><h4>${esc(t('myOrders'))}</h4>${S.orders.length ? S.orders.map(orderHtml).join('') : `<p class="hint">${esc(t('noOrders'))}</p>`}</div>
    <div class="sect"><h4>${esc(t('history'))}</h4>${S.ledger.length ? S.ledger.map(x => `<div class="lg"><span>${esc(x.reason)}<br><small class="hint">${new Date(x.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</small></span><b class="${x.delta > 0 ? 'pos' : 'neg'}">${x.delta > 0 ? '+' : ''}${x.delta}</b></div>`).join('') : `<p class="hint">${esc(t('noHistory'))}</p>`}</div>
    ${delivered ? `<form class="f sect" id="revForm" novalidate><h4>${esc(t('writeReview'))}</h4><p class="hint">${esc(t('reviewHint'))}</p>
      <div class="stars-in" role="radiogroup" aria-label="Rating" id="starsIn">${[1, 2, 3, 4, 5].map(n => `<button type="button" data-s="${n}" aria-label="${n}" class="on">★</button>`).join('')}</div>
      <label class="fl">${esc(t('yourTown'))}<input type="text" name="town" maxlength="60"></label>
      <label class="fl">${esc(t('yourReview'))}<textarea name="body" minlength="8" maxlength="400" required></textarea></label>
      <div class="msg" id="revMsg" role="status"></div><button class="btn sm" type="submit">${esc(t('sendReview'))}</button></form>` : ''}
    <form class="f sect" id="profForm" novalidate><h4>${esc(t('details'))}</h4>
      <label class="fl">${esc(t('name'))}<input type="text" name="name" value="${esc(p.full_name)}"></label>
      <label class="fl">${esc(t('mobile'))}<input type="text" value="${esc(p.phone || '')}" disabled></label>
      <label class="fl">${esc(t('emailOpt'))}<input type="email" name="email" value="${esc(p.contact_email || '')}"></label>
      <label class="fl">${esc(t('address'))}<textarea name="address">${esc(p.address || '')}</textarea></label>
      <label class="fl">${esc(t('pin'))}<input type="text" name="pin" inputmode="numeric" maxlength="6" value="${esc(p.pincode || '')}"></label>
      <div class="msg" id="profMsg" role="status"></div><button class="btn line sm" type="submit">${esc(t('save'))}</button></form>
    <p class="sect"><button class="btn line" data-act="out">${esc(t('signOut'))}</button></p></div>`;
  // stars default to 5
  $$('#starsIn button').forEach(b => b.classList.add('on'));
}
function reorder(o) {
  if (!o) return;
  const vm = variantMap(); const skipped = []; let added = 0;
  (o.order_items || []).forEach(i => {
    let ok = false;
    if (i.variant_id && vm[i.variant_id]) {
      const v = vm[i.variant_id].v; const cap = Math.min(v.max_online_qty || 100, v.stock == null ? 100 : v.stock);
      if (cap > 0) { const ex = S.cart.find(l => l.k === 'v' && l.id === v.id); const n = Math.min(cap, (ex ? ex.qty : 0) + i.qty); if (ex) ex.qty = n; else S.cart.push({ k: 'v', id: v.id, qty: n }); ok = true; }
    } else if (i.combo_id && S.combos.find(c => c.id === i.combo_id)) {
      const ex = S.cart.find(l => l.k === 'c' && l.id === i.combo_id); if (ex) ex.qty += i.qty; else S.cart.push({ k: 'c', id: i.combo_id, qty: i.qty }); ok = true;
    }
    if (ok) added++; else skipped.push(i.item_name + (i.item_label ? ' ' + i.item_label : ''));
  });
  saveCart(); renderCartBadge();
  if (!added) { toast(t('reorderNone')); return; }
  closeAll(); setTimeout(() => { renderCart(); openDrawer($('#cartDr')); toast(skipped.length ? t('reorderDone') + ' ' + t('reorderSkip', skipped.join(', ')) : t('reorderDone')); }, 380);
}
function orderHtml(o) {
  const items = (o.order_items || []).map(i => `${esc(i.item_name)} ${esc(i.item_label)} × ${i.qty}`).join('<br>');
  const d = new Date(o.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  return `<div class="ord"><header><span class="mono">${esc(o.order_no)}</span><span class="st ${esc(o.status)}">${esc(t('st.' + o.status))}</span></header>
    <div style="margin:6px 0;color:var(--muted)">${items}</div>
    <div style="display:flex;justify-content:space-between"><span>${d} · ${esc(t('pay.' + o.payment_status))}</span><b>${inr(o.total)}</b></div>${o.promo_code ? `<div class="hint" style="margin:4px 0 0">${esc(t('promoLine', o.promo_code))}${+o.promo_discount > 0 ? ' · −' + inr(o.promo_discount) : ' · ' + esc(t('promoFree'))}</div>` : ''}
    <div class="ord-act"><button type="button" class="link" data-reorder="${esc(o.order_no)}">${esc(t('reorder'))}</button>${invBtns(o.order_no)}<a class="link" href="#track" data-tkgo="${esc(o.order_no)}">${esc(t('tkGo'))}</a><button type="button" class="link" data-ordhelp="${esc(o.order_no)}">${esc(L('Need help?', 'உதவி வேண்டுமா?'))}</button></div></div>`;
}
$('#acctDr').addEventListener('click', async e => {
  const ro = e.target.closest('[data-reorder]'); if (ro) { reorder(S.orders.find(o => o.order_no === ro.dataset.reorder)); return; }
  const hp = e.target.closest('[data-ordhelp]'); if (hp) { closeAll(); setTimeout(() => { tkTab = 'order'; tkRef = hp.dataset.ordhelp; tkRes = null; renderTrack(); document.getElementById('track').scrollIntoView(); }, 330); return; }
  const tab = e.target.closest('[data-tab]'); if (tab) { authTab = tab.dataset.tab; renderAccount(); return; }
  const star = e.target.closest('#starsIn button'); if (star) { const n = +star.dataset.s; $$('#starsIn button').forEach(b => b.classList.toggle('on', +b.dataset.s <= n)); $('#starsIn').dataset.v = n; return; }
  const b = e.target.closest('[data-act]'); if (!b) return;
  if (b.dataset.act === 'out') { await sb.auth.signOut(); S.redeem = 0; authTab = 'in'; await refreshAccount(); closeAll(); toast(L('Signed out', 'வெளியேறினீர்கள்')); }
  if (b.dataset.act === 'toCart') { closeAll(); setTimeout(() => { renderCart(); openDrawer($('#cartDr')); }, 380); }
  if (b.dataset.act === 'copyRef') {
    const v = $('#refCode').value;
    try { await navigator.clipboard.writeText(v); } catch (x) { $('#refCode').select(); document.execCommand && document.execCommand('copy'); }
    toast(t('copied'));
  }
});
$('#acctDr').addEventListener('submit', async e => {
  e.preventDefault();
  const id = e.target.id; const fd = Object.fromEntries(new FormData(e.target));
  const msg = $('#authMsg');
  const fail = (m, el) => { const x = el || msg; x.textContent = m; x.className = 'msg err show'; };
  const btn = $('button[type=submit]', e.target);
  if (id === 'rsForm') {
    const ph = cleanPhone(fd.phone);
    if (!/^[6-9]\d{9}$/.test(ph)) return fail(t('err.INVALID_PHONE'));
    if (!/^\d{6}$/.test((fd.pin || '').trim())) return fail(t('err.INVALID_PINCODE'));
    if (!(parseFloat(String(fd.amount).replace(/[^0-9.]/g, '')) > 0)) return fail(t('err.RESET_FAILED'));
    if ((fd.password || '').length < 8) return fail(t('err.WEAK'));
    btn.disabled = true;
    let res = null;
    try {
      const r = await fetch(SV.url + '/functions/v1/reset-password', { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: SV.key }, body: JSON.stringify({ phone: ph, pin: fd.pin.trim(), amount: fd.amount, password: fd.password }) });
      res = await r.json().catch(() => ({}));
    } catch (x) { res = { error: 'NETWORK' }; }
    btn.disabled = false;
    if (!res || !res.ok) return fail(t('err.' + (res && res.error && T.err[res.error] ? res.error : 'RESET_FAILED')));
    authTab = 'in'; renderAccount(); toast(t('rsOk')); return;
  }
  if (id === 'inForm') {
    const ph = cleanPhone(fd.phone);
    if (!/^[6-9]\d{9}$/.test(ph)) return fail(t('err.INVALID_PHONE'));
    btn.disabled = true;
    const { error } = await sb.auth.signInWithPassword({ email: phoneEmail(ph), password: fd.password });
    btn.disabled = false;
    if (error) return fail(errText(error));
    await refreshAccount(); toast(t('welcomeBack')); renderAccount();
    if (cartView === 'cart' && $('#cartDr').classList.contains('on')) renderCart();
  }
  if (id === 'upForm') {
    const ph = cleanPhone(fd.phone); const em = (fd.email || '').trim(); const ref = (fd.ref || '').trim().toUpperCase();
    if ((fd.name || '').trim().length < 2) return fail(t('err.INVALID_NAME'));
    if (!/^[6-9]\d{9}$/.test(ph)) return fail(t('err.INVALID_PHONE'));
    if ((fd.password || '').length < 8) return fail(t('err.WEAK'));
    if (em && !/^\S+@\S+\.\S+$/.test(em)) return fail(t('err.BAD_EMAIL'));
    btn.disabled = true;
    if (ref) {
      const { data: ok } = await sb.rpc('check_referral_code', { p_code: ref });
      if (!ok) { btn.disabled = false; return fail(t('err.BAD_REF')); }
    }
    const { data, error } = await sb.auth.signUp({ email: phoneEmail(ph), password: fd.password, options: { data: { full_name: fd.name.trim(), phone: ph, contact_email: em, referral_code: ref } } });
    if (error) { btn.disabled = false; return fail(errText(error)); }
    if (!data.session) {
      const r = await sb.auth.signInWithPassword({ email: phoneEmail(ph), password: fd.password });
      if (r.error) { btn.disabled = false; return fail(errText(r.error)); }
    }
    store.set('sv_ref', '');
    await refreshAccount(); toast(t('welcome', fd.name.trim().split(' ')[0])); renderAccount();
    if ($('#cartDr').classList.contains('on')) renderCart();
  }
  if (id === 'profForm') {
    const m = $('#profMsg');
    const { error } = await sb.from('profiles').update({ full_name: fd.name.trim(), contact_email: fd.email.trim() || null, address: fd.address.trim() || null, pincode: fd.pin.trim() || null }).eq('id', S.profile.id);
    if (error) return fail(errText(error), m);
    m.textContent = t('saved'); m.className = 'msg ok show'; await refreshAccount(); renderAcctBtn();
  }
  if (id === 'revForm') {
    const m = $('#revMsg'); const stars = +($('#starsIn').dataset.v || 5);
    const { error } = await sb.rpc('submit_review', { p_rating: stars, p_body: fd.body.trim(), p_town: fd.town.trim() || null });
    if (error) return fail(errText(error), m);
    m.textContent = t('reviewSent'); m.className = 'msg ok show'; e.target.reset();
  }
});

/* ---------- combos, specials ---------- */
function renderCombos() {
  const el = $('#comboList');
  if (!S.loaded) { el.innerHTML = ''; return; }
  const c = contact();
  el.innerHTML = S.combos.length ? S.combos.map(cb => {
    const items = (cb.combo_items || []).map(ci => `<li>${ci.qty} × ${esc(pick(ci.variants.products, 'name'))} ${esc(ci.variants.label)}</li>`).join('');
    return `<article class="combo" data-id="${cb.id}">
      <div class="cimg"><img src="${esc(cb.image_url || 'assets/combo-gift.webp')}" alt="${esc(cb.name_en || 'Gift combo of three oils')}" loading="lazy" decoding="async"></div>
      <div class="cbody"><h3>${esc(pick(cb, 'name'))}</h3>${cb.blurb_en ? `<p style="color:var(--muted)">${esc(pick(cb, 'blurb'))}</p>` : ''}
      <ul>${items}</ul>${cb.ends_at ? `<span class="ends">${esc(t('endsOn', new Date(cb.ends_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })))}</span>` : ''}
      <div class="buyrow"><div class="price">${inr(cb.price)}</div><button class="btn" data-act="addCombo">${esc(t('addToCart'))}</button></div></div></article>`;
  }).join('') : `<div class="empty"><img src="assets/empty-basket.webp" alt="An empty woven basket" loading="lazy" decoding="async"><div><b>${esc(t('noCombos'))}</b>${esc(t('noCombosHint', c.phone1))}</div></div>`;
  const sp = S.offers.filter(o => o.kind !== 'announcement');
  $('#specialList').innerHTML = sp.map(o => `<article class="special ${o.image_url ? '' : 'noimg'}">
    ${o.image_url ? `<div class="simg"><img src="${esc(o.image_url)}" alt="${esc(o.title_en || 'Special offer')}" loading="lazy" decoding="async"></div>` : ''}
    <div class="sb">${o.badge ? `<span class="stamp">${esc(o.badge)}</span>` : ''}<h3>${esc(pick(o, 'title'))}</h3>${o.body_en ? `<p>${esc(pick(o, 'body'))}</p>` : ''}
    ${o.variant_id && variantMap()[o.variant_id] ? `<button class="btn sm" data-act="shopOffer" data-v="${o.variant_id}">${esc(t('shopThis'))}</button>` : ''}</div></article>`).join('');
}
$('#combos').addEventListener('click', e => {
  const b = e.target.closest('[data-act]'); if (!b) return;
  if (b.dataset.act === 'addCombo') addToCart('c', b.closest('.combo').dataset.id, 1, b.closest('.combo').querySelector('.cimg img'));
  if (b.dataset.act === 'shopOffer') {
    const m = variantMap()[b.dataset.v]; if (!m) return;
    S.sel[m.p.id] = m.v.id; renderShelf();
    const c = $('#p-' + m.p.slug); if (c) c.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
});

/* ---------- rewards ---------- */
function renderRewards() {
  if (!S.loaded) return;
  const minR = setting('min_redeem_points', 400);
  $('#rwLead').textContent = t('rewardsLead');
  const tiers = tierInfo(0).tiers;
  $('#tiers').innerHTML = tiers.map(x => `<div class="tier"><b>${pct(x.rate)}</b><span>${esc(x.min ? t('tierFrom', inr(x.min)) : t('tierFirst'))}</span></div>`).join('');
  const credit = setting('credit_points_on', 'delivered') === 'placed' ? t('ruleCreditPlaced') : t('ruleCredit');
  const rules = `<ul><li>${esc(credit)}</li><li>${esc(t('ruleRedeem', minR))}</li><li>${esc(t('ruleRefer', setting('referral_referrer_points', 150), setting('referral_friend_points', 100)))}</li></ul>`;
  const p = S.profile;
  if (p) {
    const ti = tierInfo(+p.lifetime_spend);
    const progress = ti.next ? Math.min(100, Math.round(((+p.lifetime_spend - ti.cur.min) / (ti.next.min - ti.cur.min)) * 100)) : 100;
    $('#rwCard').innerHTML = `<h3>${esc(t('yourPoints'))}</h3><div class="bigpts">${(p.points_balance || 0).toLocaleString('en-IN')}</div>
      <div class="bar"><i style="width:${progress}%"></i></div><div style="font-size:14.5px;color:#DCE7DF">${esc(t('tierNow', pct(ti.cur.rate)))} ${ti.next ? esc(t('tierNext', inr(ti.next.min - p.lifetime_spend), pct(ti.next.rate))) : esc(t('tierTop'))}</div>
      ${rules}<button class="btn gold" id="rwOpen">${esc(t('myAccount'))}</button>`;
    $('#rwOpen').onclick = () => openAccount();
  } else {
    $('#rwCard').innerHTML = `<h3>${esc(t('joinTitle'))}</h3>${rules}<button class="btn gold" id="rwJoin">${esc(t('signUp'))}</button>`;
    $('#rwJoin').onclick = () => openAccount('up');
  }
}

/* ---------- reviews ---------- */
function renderReviews() {
  if (!S.loaded) return;
  $('#revList').innerHTML = S.reviews.length ? S.reviews.map(r => `<figure class="rev" style="margin:0"><div class="stars" aria-label="${r.rating} of 5">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</div><p>${esc(r.body)}</p><small>${esc(r.display_name)}${r.town ? ', ' + esc(r.town) : ''}</small></figure>`).join('')
    : `<div class="empty"><b>${esc(t('noReviews'))}</b>${esc(t('noReviewsHint'))}</div>`;
}

/* ---------- bulk + suggestion forms ---------- */
function renderBulkOils() {
  const names = S.products.length ? S.products.map(p => [p.name_en, pick(p, 'name')]) : [['Gingelly Oil', 'நல்லெண்ணெய்'], ['Groundnut Oil', 'கடலை எண்ணெய்'], ['Coconut Oil', 'தேங்காய் எண்ணெய்'], ['Castor Oil', 'விளக்கெண்ணெய்'], ['Neem Oil', 'வேப்ப எண்ணெய்']];
  names.push(['Other', t('otherOil')]);
  const old = $$('#bulkOils input:checked').map(i => i.value);
  $('#bulkOils').innerHTML = names.map(([en, show]) => `<label><input type="checkbox" value="${esc(en)}" ${old.includes(en) ? 'checked' : ''}>${esc(show)}</label>`).join('');
}
function flash(el, text, ok) { el.textContent = text; el.className = 'msg show ' + (ok ? 'ok' : 'err'); }
$('#bulkForm').addEventListener('submit', async e => {
  e.preventDefault(); const f = e.target; const m = $('#bulkMsg'); const fd = Object.fromEntries(new FormData(f));
  const oils = $$('#bulkOils input:checked').map(i => i.value);
  if (!oils.length) return flash(m, t('pickOil'), false);
  const ph = cleanPhone(fd.phone); if (!/^[6-9]\d{9}$/.test(ph)) return flash(m, t('err.INVALID_PHONE'), false);
  const btn = $('button[type=submit]', f); btn.disabled = true;
  const { data, error } = await sb.rpc('submit_enquiry', { p_name: fd.name, p_business: fd.business || null, p_phone: ph, p_city: fd.city || null, p_oils: oils, p_qty: fd.qty ? +fd.qty : null, p_freq: fd.freq, p_message: fd.message || null });
  btn.disabled = false;
  if (error) return flash(m, errText(error), false);
  flash(m, t('bulkSent', data), true); f.reset();
});
$('#sugForm').addEventListener('submit', async e => {
  e.preventDefault(); const f = e.target; const m = $('#sugMsg'); const fd = Object.fromEntries(new FormData(f));
  const ph = fd.phone ? cleanPhone(fd.phone) : '';
  if (ph && !/^[6-9]\d{9}$/.test(ph)) return flash(m, t('err.INVALID_PHONE'), false);
  const btn = $('button[type=submit]', f); btn.disabled = true;
  const { error } = await sb.rpc('submit_suggestion', { p_product: fd.product, p_details: fd.details || null, p_name: fd.name || null, p_phone: ph });
  btn.disabled = false;
  if (error) return flash(m, errText(error), false);
  flash(m, t('sugSent'), true); f.reset();
});
$$('input[name=phone]').forEach(i => i.addEventListener('input', () => { i.value = i.value.replace(/\D/g, '').slice(0, 10); }));

/* ---------- nav, scroll effects ---------- */
function setMenu(o) {
  $('#links').classList.toggle('open', o); $('#menuScrim').classList.toggle('on', o);
  $('#burger').setAttribute('aria-expanded', o); document.body.classList.toggle('menu-lock', o);
  SFX.play('tick'); if (o) $('#menuX').focus({ preventScroll: true });
}
$('#burger').addEventListener('click', () => setMenu(!$('#links').classList.contains('open')));
$('#menuX').addEventListener('click', () => { setMenu(false); $('#burger').focus({ preventScroll: true }); });
$('#menuScrim').addEventListener('click', () => setMenu(false));
$('#links').addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
(function swipeMenu() {
  let x0 = null, y0 = 0; const el = $('#links');
  el.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
  el.addEventListener('touchend', e => { if (x0 === null) return; const dx = e.changedTouches[0].clientX - x0, dy = Math.abs(e.changedTouches[0].clientY - y0); x0 = null; if (dx > 60 && dy < 60) setMenu(false); }, { passive: true });
  matchMedia('(min-width:1041px)').addEventListener('change', e => { if (e.matches) setMenu(false); });
})();
(function effects() {
  const secs = ['oils', 'combos', 'process', 'story', 'rewards', 'bulk'].map(id => document.getElementById(id));
  const spy = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) $$('#links a').forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#' + en.target.id)); }), { rootMargin: '-45% 0px -50% 0px' });
  secs.forEach(s => s && spy.observe(s));
  // process: sticky photo follows the active step
  const imgs = $$('#stage img');
  const stepObs = new IntersectionObserver(es => es.forEach(en => {
    if (!en.isIntersecting) return; const i = +en.target.dataset.i;
    $$('#steps .step').forEach(s => s.classList.toggle('on', s === en.target));
    imgs.forEach(im => im.classList.toggle('on', im.dataset.for.split(',').includes(String(i))));
  }), { rootMargin: '-40% 0px -50% 0px' });
  $$('#steps .step').forEach(s => stepObs.observe(s));
  const tl = $('#timeline');
  buildPath(tl);
  const stepBy = d => { const li = tl.querySelector('li'); tl.scrollBy({ left: d * (li.offsetWidth + 18), behavior: 'smooth' }); };
  const navUpd = () => { $('#tlPrev').disabled = tl.scrollLeft < 8; $('#tlNext').disabled = tl.scrollLeft + tl.clientWidth >= tl.scrollWidth - 8; };
  $('#tlPrev').addEventListener('click', () => stepBy(-1)); $('#tlNext').addEventListener('click', () => stepBy(1));
  tl.addEventListener('scroll', navUpd, { passive: true }); navUpd();
  new IntersectionObserver((es, ob) => es.forEach(en => { if (en.isIntersecting) { tl.style.setProperty('--tl', '100%'); ob.disconnect(); } }), { threshold: .25 }).observe(tl);
})();

/* ---------- referral link ---------- */
(function refFromUrl() {
  const r = new URLSearchParams(location.search).get('ref');
  if (r && /^[A-Za-z0-9]{4,12}$/.test(r)) { store.set('sv_ref', r.toUpperCase()); window.__refPending = r.toUpperCase(); }
})();


/* ---------- track order and bulk enquiry ---------- */
const TK_ORDER = ['placed', 'confirmed', 'packed', 'shipped', 'delivered'];
const TK_BULK = [['new', 'Received', 'பெறப்பட்டது'], ['contacted', 'We have called you', 'உங்களை அழைத்தோம்'], ['quoted', 'Quote sent', 'விலை விவரம் அனுப்பப்பட்டது'], ['won', 'Confirmed', 'உறுதியானது'], ['closed', 'Closed', 'முடிந்தது']];
let tkTab = 'order', tkRes = null, tkBusy = false, tkErr = '', tkRef = '', tkPhone = '';
const fmtAt = at => at ? new Date(at).toLocaleString(lang === 'ta' ? 'ta-IN' : 'en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '';
function tkTimeline(r) {
  const at = {}; (r.steps || []).forEach(s => { at[s.status] = s.at; });
  let list, cur;
  if (r.kind === 'bulk') { list = TK_BULK.map(x => ({ k: x[0], label: lang === 'ta' ? x[2] : x[1] })); cur = r.status; }
  else if (r.status === 'cancelled') { list = [{ k: 'placed', label: t('st.placed') }, { k: 'cancelled', label: t('st.cancelled') }]; cur = 'cancelled'; }
  else { list = TK_ORDER.map(k => ({ k, label: t('st.' + k) })); cur = r.status; }
  const ci = list.findIndex(x => x.k === cur);
  return `<ol class="tk-tl">${list.map((x, i) => `<li class="${i < ci ? 'is-done' : i === ci ? 'is-cur' : ''} ${x.k === 'cancelled' ? 'bad' : ''}"><b>${esc(x.label)}</b><small>${esc(fmtAt(at[x.k] || (i === 0 ? r.placed_at : '')))}</small></li>`).join('')}</ol>`;
}
function tkResultHtml(r) {
  const head = `<div class="tk-head"><span class="mono">${esc(r.ref)}</span><span class="st ${esc(r.status)}">${esc(r.kind === 'bulk' ? (TK_BULK.find(x => x[0] === r.status) || [0, r.status, r.status])[lang === 'ta' ? 2 : 1] : t('st.' + r.status))}</span></div>`;
  let body = tkTimeline(r);
  if (r.kind === 'order') {
    const pay = r.status === 'cancelled' ? '' : r.payment_status === 'paid' ? t('tkPaid') : r.payment_mode === 'online' ? t('tkPayOnline') : t('tkPayOffline');
    body += (r.status === 'cancelled' ? `<p class="tk-note bad">${esc(t('tkCancelled'))}</p>` : '') + (pay ? `<p class="tk-note">${esc(pay)}</p>` : '') +
      `<div class="tk-items"><h4>${esc(t('tkItems'))}</h4>${(r.items || []).map(i => `<div><span>${esc(i.name)} ${esc(i.label || '')}</span><span>× ${i.qty}</span></div>`).join('')}<div class="tot"><span>${esc(t('tkTotal'))}</span><b>${inr(r.total)}</b></div></div>`;
  } else if (r.status === 'closed') body += `<p class="tk-note">${esc(t('tkClosed'))}</p>`;
  return `<div class="tk-card" id="tkCard">${head}${body}${r.kind === 'order' && S.session && (S.orders || []).some(o => o.order_no === r.ref) ? `<div class="inv-done">${invBtns(r.ref)}</div>` : ''}${issueHtml(r.ref, r.kind)}</div>`;
}
function renderTrack() {
  const el = $('#tkBody'); if (!el) return;
  if ($('#tkRef')) { tkRef = $('#tkRef').value; tkPhone = $('#tkPh').value; }
  const mine = S.session && S.orders.length ? `<div class="tk-mine"><h4>${esc(t('tkMine'))}</h4><div>${S.orders.map(o => `<button type="button" class="chip" data-tkmine="${esc(o.order_no)}" aria-pressed="${tkRes && tkRes.ref === o.order_no}">${esc(o.order_no)} · ${esc(t('st.' + o.status))}</button>`).join('')}</div></div>` : '';
  const isB = tkTab === 'bulk';
  el.innerHTML = `<form class="tk-form" id="tkForm" novalidate>
      <div class="tk-tabs" role="tablist"><button type="button" role="tab" data-tk="order" aria-selected="${!isB}">${esc(t('tkOrder'))}</button><button type="button" role="tab" data-tk="bulk" aria-selected="${isB}">${esc(t('tkBulk'))}</button></div>
      ${S.session && S.orders.length && !isB ? `<p class="hint">${esc(t('tkSignedIn'))}</p>${mine}<hr>` : ''}
      <div class="f"><label for="tkRef">${esc(t(isB ? 'tkRefBulk' : 'tkRefOrder'))}</label><input id="tkRef" type="text" name="ref" autocomplete="off" autocapitalize="characters" placeholder="${isB ? 'BLK-0001' : 'SV261011-0001'}" value="${esc(tkRef)}"></div>
      <div class="f"><label for="tkPh">${esc(t('tkPhone'))}</label><input id="tkPh" type="tel" name="phone" inputmode="numeric" autocomplete="tel" maxlength="14" placeholder="98xxxxxxxx" value="${esc(tkPhone)}"></div>
      ${tkErr ? `<div class="fail" role="alert">${esc(tkErr)}</div>` : ''}
      <button class="btn" type="submit" ${tkBusy ? 'disabled' : ''}>${esc(tkBusy ? t('tkLooking') : t('tkGo'))}</button>
    </form>
    <div class="tk-out" aria-live="polite">${tkRes ? tkResultHtml(tkRes) : `<div class="empty tk-empty"><b>${esc(t('tkEmpty'))}</b></div>`}</div>`;
}
async function tkRun(call) {
  tkBusy = true; tkErr = ''; renderTrack(); busy(true);
  const [res] = await Promise.all([call(), new Promise(r => setTimeout(r, 450))]);
  busy(false); tkBusy = false;
  if (res.error) { tkErr = errText(res.error); tkRes = null; } else { tkRes = res.data; tkErr = ''; }
  renderTrack(); if (tkRes) $('#tkCard') && $('#tkCard').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}
$('#tkBody').addEventListener('click', e => {
  const tab = e.target.closest('[data-tk]'); if (tab) { tkTab = tab.dataset.tk; tkRes = null; tkErr = ''; renderTrack(); return; }
  const m = e.target.closest('[data-tkmine]'); if (m) { tkTab = 'order'; tkRun(() => sb.rpc('track_my_order', { p_order_no: m.dataset.tkmine })); return; }
  const w = e.target.closest('[data-issue-wa]'); if (w) { const f = issueFields(w.closest('.issue')); openWA({ to: f.to, text: f.text }); return; }
});
$('#tkBody').addEventListener('submit', e => {
  e.preventDefault();
  tkRef = $('#tkRef').value.trim(); tkPhone = $('#tkPh').value.trim();
  const ph = tkPhone.replace(/\D/g, '').slice(-10);
  if (!tkRef) { tkErr = t('err.NOT_FOUND'); renderTrack(); return; }
  if (!/^[6-9]\d{9}$/.test(ph)) { tkErr = t('err.INVALID_PHONE'); renderTrack(); return; }
  tkRun(() => sb.rpc('track_lookup', { p_kind: tkTab, p_ref: tkRef, p_phone: ph }));
});
function openTrack(kind, ref) { tkTab = kind || 'order'; tkRef = ref || ''; tkRes = null; renderTrack(); document.getElementById('track').scrollIntoView(); }

/* open order strip for signed-in customers */
function renderOpenOrder() {
  const el = $('#openOrder'); if (!el) return;
  const o = S.session && (S.orders || []).find(x => !['delivered', 'cancelled'].includes(x.status));
  if (!o) { el.hidden = true; return; }
  el.hidden = false;
  el.innerHTML = `<div class="wrap"><span>${esc(t('tkYourOrder', o.order_no, t('st.' + o.status)))}</span><a class="link" href="#track" data-tkgo="${esc(o.order_no)}">${esc(t('tkGo'))}</a></div>`;
}
document.addEventListener('click', e => {
  const g = e.target.closest('[data-tkgo]'); if (!g) return;
  e.preventDefault(); closeAll(); tkTab = 'order'; document.getElementById('track').scrollIntoView();
  tkRun(() => sb.rpc('track_my_order', { p_order_no: g.dataset.tkgo }));
});

/* ---------- "Having an issue?" and the WhatsApp chooser ---------- */
const ISSUES = [
  ['order', 'Order help', 'ஆர்டர் உதவி', 'admin'], ['points', 'Reward points', 'பரிசுப் புள்ளிகள்', 'admin'], ['tech', 'Website problem', 'இணையதளச் சிக்கல்', 'admin'],
  ['suggest', 'Suggestion', 'ஆலோசனை', 'md'], ['escalate', 'Complaint or escalation', 'புகார் / மேல்முறையீடு', 'md']
];
function issueHtml(ref, kind) {
  const nm = (S.profile && S.profile.full_name) || '';
  return `<div class="issue" data-ref="${esc(ref || '')}" data-kind="${esc(kind || 'order')}" data-name="${esc(nm)}">
    <h4>${esc(t('issueH'))}</h4><p>${esc(t('issueSub'))}</p>
    <div class="chips" role="group">${ISSUES.map((x, i) => `<button type="button" class="chip" data-issue="${x[0]}" aria-pressed="${i === 0}">${esc(lang === 'ta' ? x[2] : x[1])}</button>`).join('')}</div>
    <div class="issue-btns"><button type="button" class="btn" data-issue-wa="1">${esc(t('issueWa'))}</button><a class="btn line" data-issue-mail="1" href="#">${esc(t('issueMail'))}</a></div></div>`;
}
function issueFields(box) {
  const sel = (box.querySelector('[data-issue][aria-pressed="true"]') || {}).dataset || { issue: 'order' };
  const it = ISSUES.find(x => x[0] === sel.issue) || ISSUES[0];
  const label = lang === 'ta' ? it[2] : it[1], ref = box.dataset.ref, name = box.dataset.name || '';
  const refLine = ref ? (box.dataset.kind === 'bulk' ? L('Enquiry', 'விசாரணை') : L('Order', 'ஆர்டர்')) + ': ' + ref : '';
  const lines = [L('Hello Sri Vinayaga Oil & Flour Mills,', 'வணக்கம் ஸ்ரீ விநாயகா ஆயில் & ஃப்ளோர் மில்ஸ்,'), refLine, L('Name', 'பெயர்') + ': ' + name, L('About', 'விஷயம்') + ': ' + label, '', L('My message:', 'என் செய்தி:') + ' '].filter((x, i) => x || i === 4);
  return { to: it[3], text: lines.join('\n'), subject: (refLine ? refLine + ' - ' : '') + label };
}
document.addEventListener('click', e => {
  const c = e.target.closest('[data-issue]'); if (c) { $$('[data-issue]', c.closest('.issue')).forEach(x => x.setAttribute('aria-pressed', x === c)); return; }
  const m = e.target.closest('[data-issue-mail]'); if (m) { const f = issueFields(m.closest('.issue')); m.href = 'mailto:' + contact().email + '?subject=' + encodeURIComponent(f.subject) + '&body=' + encodeURIComponent(f.text); }
});
function waNum(to) { const c = contact(); return String(to === 'md' ? c.wa_md : c.wa_admin).replace(/\D/g, ''); }
function waNice(n) { n = n.replace(/^91/, ''); return n.slice(0, 5) + ' ' + n.slice(5); }
let waText = '', waLast = null;
function openWA(opts) {
  opts = opts || {};
  if (opts.to) { window.open('https://wa.me/' + waNum(opts.to) + (opts.text ? '?text=' + encodeURIComponent(opts.text) : ''), '_blank', 'noopener'); return; }
  waText = opts.text || ''; waLast = document.activeElement;
  const q = waText ? '?text=' + encodeURIComponent(waText) : '';
  const opt = (to, nm, forT) => `<a class="wa-opt" href="https://wa.me/${waNum(to)}${q}" target="_blank" rel="noopener"><b>${esc(t(nm))}</b><span class="no">${esc(waNice(waNum(to)))}</span><small>${esc(t(forT))}</small></a>`;
  $('#waBox').innerHTML = `<button class="menu-x wa-x" type="button" data-wa-close aria-label="${esc(L('Close', 'மூடு'))}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19"/></svg></button><h3 id="waT">${esc(t('waTitle'))}</h3>${opt('md', 'waMD', 'waMDFor')}${opt('admin', 'waAdmin', 'waAdminFor')}`;
  const d = $('#waDlg'); d.hidden = false; requestAnimationFrame(() => d.classList.add('on')); $('.wa-opt', d).focus();
}
function closeWA() { const d = $('#waDlg'); if (d.hidden) return; d.classList.remove('on'); setTimeout(() => { d.hidden = true; }, 260); if (waLast && waLast.focus) waLast.focus({ preventScroll: true }); }
$('#waDlg').addEventListener('click', e => { if (e.target.id === 'waDlg' || e.target.closest('[data-wa-close]') || e.target.closest('.wa-opt')) closeWA(); });
document.addEventListener('click', e => {
  const w = e.target.closest('a[data-wa]'); if (!w || e.defaultPrevented) return;
  e.preventDefault(); openWA();
}, true);
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeWA(); });

/* ---------- scroll reveal (one style, everywhere) ---------- */
const REVEAL = '.sec-head,.sig>*,.card:not(.more),.card.more,.combo,.special,.proc .stage,.step,.story>*,.tl>*,.why-photos img,.why>div,.tiers>*,.rw-fig,.rw-card,.rw>div:first-child>*,.rev,.bulk .wrap>*,#mill .wrap>*,.ft>div,.ft-band';
let revIO = null;
function reveal() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
  if (!revIO) revIO = new IntersectionObserver(es => es.forEach(en => {
    if (!en.isIntersecting) return; const el = en.target; revIO.unobserve(el);
    requestAnimationFrame(() => { el.classList.add('in'); setTimeout(() => el.classList.remove('rv', 'in'), 900); });
  }), { threshold: .08, rootMargin: '0px 0px -6% 0px' });
  $$(REVEAL).forEach(el => {
    if (el.dataset.rv || el.closest('.hero') || el.closest('.drawer')) return; el.dataset.rv = '1';
    const sibs = [...el.parentElement.children].filter(c => c.matches(REVEAL)); const i = Math.min(sibs.indexOf(el), 5);
    el.style.setProperty('--d', i * 70 + 'ms'); el.classList.add('rv'); revIO.observe(el);
  });
}

/* ---------- render all ---------- */
function renderAll() {
  renderFestival(); renderHero(); renderAnnounce(); applyContact(); renderShelf(); renderCombos(); renderRewards(); renderReviews(); renderBulkOils(); renderCartBadge(); renderAcctBtn(); renderTrack(); renderOpenOrder();
  if ($('#cartDr').classList.contains('on')) renderCart();
  if ($('#acctDr').classList.contains('on')) renderAccount();
  reveal();
}

(async function init() {
  renderAll();
  sb.auth.onAuthStateChange((ev) => { if (ev === 'SIGNED_OUT') { S.profile = null; renderAcctBtn(); renderRewards(); } });
  await Promise.all([loadCatalogue(), refreshAccount()]);
  renderAll();
  if (window.__refPending && !S.profile) { authTab = 'up'; toast(t('refApplied', window.__refPending)); setTimeout(() => openAccount('up'), 900); }
  if (location.hash === '#cart') { renderCart(); openDrawer($('#cartDr')); history.replaceState(null, '', location.pathname + location.search); }
  else if (location.hash && document.querySelector(location.hash)) setTimeout(() => document.querySelector(location.hash).scrollIntoView(), 80);
})();
/* ---------- story: curved dotted path joining the cards ---------- */
function buildPath(tl) {
  const NS = 'http://www.w3.org/2000/svg', wrap = tl.parentElement;
  const svg = document.createElementNS(NS, 'svg'); svg.setAttribute('class', 'tl-path'); svg.setAttribute('aria-hidden', 'true'); tl.prepend(svg);
  const draw = () => {
    const lis = [...tl.children].filter(n => n.tagName === 'LI'); if (!lis.length) return;
    const W = tl.scrollWidth, y = 34, xs = lis.map(li => li.offsetLeft + li.offsetWidth / 2), top = lis[0].offsetTop;
    let d = `M ${Math.max(6, xs[0] - 90)} ${y + 22} C ${xs[0] - 60} ${y + 22}, ${xs[0] - 40} ${y}, ${xs[0]} ${y}`;
    xs.slice(1).forEach((x, i) => { const a = xs[i], s = i % 2 ? -1 : 1, dx = x - a; d += ` C ${a + dx * .33} ${y + s * 34}, ${x - dx * .33} ${y - s * 34}, ${x} ${y}`; });
    const e = xs[xs.length - 1]; d += ` C ${e + 40} ${y + 30}, ${e + 70} ${y - 22}, ${e + 110} ${y - 4}`;
    svg.setAttribute('width', W); svg.setAttribute('height', top); svg.setAttribute('viewBox', `0 0 ${W} ${top}`);
    svg.innerHTML = `<defs><mask id="tlMask"><path id="tlReveal" d="${d}" fill="none" stroke="#fff" stroke-width="14" stroke-linecap="round"/></mask></defs>
      <path d="${d}" fill="none" stroke="var(--gold-bright)" stroke-width="3.2" stroke-linecap="round" stroke-dasharray="0.1 11" mask="url(#tlMask)"/>
      ${xs.map((x, i) => `<g class="rn" style="--i:${i}"><path d="M${x} ${y + 13} L${x} ${top - 2}" stroke="var(--gold-bright)" stroke-width="2.5" stroke-dasharray="0.1 7" stroke-linecap="round"/><circle cx="${x}" cy="${y}" r="12" fill="var(--bg)" stroke="var(--gold-bright)" stroke-width="2.5"/><circle cx="${x}" cy="${y}" r="5" fill="var(--gold-bright)"/></g>`).join('')}
      <g class="rn" style="--i:${xs.length}" transform="translate(${e + 110} ${y - 4})"><path d="M0 0 L0 -24" stroke="var(--gold)" stroke-width="2"/><path d="M0 -24 L18 -18 L0 -12 Z" fill="var(--gold-bright)"/></g>`;
    const rp = $('#tlReveal', svg), L = rp.getTotalLength(); rp.style.strokeDasharray = L; rp.style.transition = 'none'; rp.style.strokeDashoffset = wrap.classList.contains('go') ? 0 : L;
    requestAnimationFrame(() => { rp.style.transition = 'stroke-dashoffset 2.4s cubic-bezier(.3,.6,.2,1)'; });
  };
  new ResizeObserver(draw).observe(tl); draw();
  new IntersectionObserver((es, ob) => es.forEach(en => { if (en.isIntersecting) { wrap.classList.add('go'); const rp = $('#tlReveal', svg); if (rp) rp.style.strokeDashoffset = 0; ob.disconnect(); } }), { threshold: .2 }).observe(wrap);
}
})();

