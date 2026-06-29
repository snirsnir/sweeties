import { initializeApp }   from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, doc, getDoc, updateDoc, serverTimestamp }
    from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
    firebaseConfig,
    EMAILJS_PUBLIC_KEY, EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_CUSTOMER,
    ADMIN_EMAIL
} from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

// EmailJS init
emailjs.init(EMAILJS_PUBLIC_KEY);

// ── State ─────────────────────────────────────────────────────────
let signaturePad  = null;
let signatureData = null;
const orderId = new URLSearchParams(location.search).get('id');

// ── Screens ───────────────────────────────────────────────────────
const screens = {
    loading: document.getElementById('loading-screen'),
    error:   document.getElementById('error-screen'),
    order:   document.getElementById('order-screen'),
    success: document.getElementById('success-screen'),
};
function show(name) { Object.values(screens).forEach(s => s.classList.add('hidden')); screens[name].classList.remove('hidden'); }

// ── Init ──────────────────────────────────────────────────────────
async function init() {
    if (!orderId) { show('error'); return; }
    try {
        const snap = await getDoc(doc(db, 'orders', orderId));
        if (!snap.exists()) { show('error'); return; }

        const data = snap.data();

        if (data.status === 'submitted') {
            document.getElementById('success-name').textContent = data.customerName;
            show('success');
            return;
        }

        document.getElementById('f-name').value       = data.customerName;
        document.getElementById('greeting-name').textContent = data.customerName;
        document.getElementById('success-name').textContent  = data.customerName;

        initSignaturePad();
        initPhoneFormat();
        show('order');
    } catch (e) {
        console.error(e);
        show('error');
    }
}

// ── Time picker ───────────────────────────────────────────────────
window.updateTime = () => {
    const h = document.getElementById('f-time-hour').value;
    const m = document.getElementById('f-time-min').value;
    document.getElementById('f-time').value = (h && m) ? `${h.padStart(2,'0')}:${m}` : '';
};

function initPhoneFormat() {
    const el = document.getElementById('f-phone');
    el.addEventListener('input', () => {
        const digits = el.value.replace(/\D/g, '').slice(0, 10);
        el.value = digits.length > 3 ? digits.slice(0, 3) + '-' + digits.slice(3) : digits;
    });
}

function initSignaturePad() {
    const canvas = document.getElementById('signature-canvas');
    signaturePad  = new SignaturePad(canvas, { backgroundColor: 'rgba(255,255,255,0)', penColor: '#1a1a2e' });
    resizePad();
    window.addEventListener('resize', resizePad);
}

function resizePad() {
    const canvas = document.getElementById('signature-canvas');
    const ratio  = Math.max(window.devicePixelRatio || 1, 1);
    canvas.width  = canvas.offsetWidth  * ratio;
    canvas.height = canvas.offsetHeight * ratio;
    canvas.getContext('2d').scale(ratio, ratio);
    if (signaturePad) signaturePad.clear();
}

// ── Agreement text ────────────────────────────────────────────────
function agreementHTML(name, guests) {
    const guestsLine = guests ? ` והערכת כמות משתתפים: כ-${guests} ילדים` : '';
    return `<div class="agreement-body">
<p class="ag-intro">
הסכם זה נערך בין <strong>Sweeties קופסאות ניפוץ</strong> לבין <strong>${name}</strong>,
לצורך הפעלת יום הולדת חוויתי בסגנון ניפוץ שוקולד. הלקוח/ה מאשר/ת כי קרא/ה, הבין/ה והסכים/ה לכל תנאי ההסכם כמפורט להלן.
</p>

<h4>סעיף 1: פרטי ההזמנה</h4>
<p>1. Sweeties תספק את השירותים בהתאם לפרטים שסוכמו בין הצדדים, לרבות תאריך, מיקום, סוג${guestsLine}.</p>
<p>2. הלקוח/ה מתחייב/ת לספק פרטים נכונים ומדויקים לביצוע ההזמנה.</p>

<h4>סעיף 2: אספקת השירותים</h4>
<p>1. החברה מתחייבת להגיע למקום האירוע במועד שסוכם ולספק את ההפעלה בהתאם לפרטים שנמסרו.</p>
<p>2. הלקוח/ה מתחייב/ת לעדכן את החברה על כל שינוי בפרטי ההזמנה בהקדם האפשרי.</p>

<h4>סעיף 3: תנאי ביטול</h4>
<p>1. ביטול חינם בטווח זמן של 48 שעות ממועד שליחת ההזמנה, ובלבד שהביטול לא יאוחר משבועיים לפני מועד האירוע.</p>
<p>2. ביטול 3–14 יום לפני האירוע — חיוב בסך 50% ממחיר ההזמנה הכולל.</p>
<p>3. ביטול 2–3 ימים לפני האירוע — חיוב בסך 70% ממחיר ההזמנה הכולל.</p>
<p>4. ביטול ביום האירוע — חיוב בסך 100% ממחיר ההזמנה הכולל.</p>
<p>5. ביטול עקב כוח עליון בכל שלב — לא יגבו דמי ביטול בכפוף להצגת אסמכתא מתאימה.</p>

<h4>סעיף 4: אמצעי תשלום</h4>
<p>התשלום יתבצע באמצעות אפליקציית "ביט", העברה בנקאית או מזומן.</p>

<h4>סעיף 5: תנאים כלליים</h4>
<p>1. הלקוח/ה מאשר/ת כי קיבל/ה אישור לכל פרטי ההזמנה לפני האירוע.</p>
<p>2. הלקוח/ה מתחייב/ת לעדכן את החברה על כל שינוי בהקדם האפשרי.</p>

<h4>סעיף 6: שימוש בתמונות</h4>
<p>Sweeties קופסאות ניפוץ עשויה להשתמש בתמונות מהאירוע לצורך שיווק ברשתות החברתיות.
ניתן לפנות בכל עת ולבקש הסרה.</p>

<h4>סעיף 7: אישור והסכמה</h4>
<p>חתימה דיגיטלית על הסכם זה מהווה הסכמה מלאה ומודעת לכל תנאי ההסכם ומחייבת משפטית את שני הצדדים.</p>

<div class="ag-sig-line">שם הלקוח/ה: <strong>${name}</strong></div>
</div>`;
}

// ── Agreement modal ───────────────────────────────────────────────
window.openAgreement = () => {
    const name = document.getElementById('f-name').value;
    const agText  = document.getElementById('agreement-text');
    const guests  = document.getElementById('f-guests').value.trim();
    agText.innerHTML = agreementHTML(name, guests);
    document.getElementById('agreement-modal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    // חתימה נעולה עד גלילה לסוף
    lockSignature(true);

    // גלילה לסוף = פתיחת חתימה
    agText.onscroll = () => {
        const { scrollTop, scrollHeight, clientHeight } = agText;
        if (scrollTop + clientHeight >= scrollHeight - 8) {
            lockSignature(false);
            agText.onscroll = null;
        }
    };

    requestAnimationFrame(() => requestAnimationFrame(resizePad));
};

function lockSignature(locked) {
    const canvas  = document.getElementById('signature-canvas');
    const btn     = document.getElementById('confirm-signature-btn');
    const section = document.querySelector('.signature-section');
    canvas.style.pointerEvents  = locked ? 'none' : 'auto';
    section.style.opacity       = locked ? '0.35' : '1';
    section.style.transition    = 'opacity 0.4s';
    btn.disabled                = locked;
    btn.style.opacity           = locked ? '0.4' : '1';
    if (!locked) {
        const hint = document.getElementById('scroll-hint');
        if (hint) hint.remove();
    }
}

window.closeAgreement = () => {
    document.getElementById('agreement-modal').classList.add('hidden');
    document.body.style.overflow = '';
};

window.clearSignature = () => signaturePad?.clear();

window.confirmSignature = () => {
    if (!signaturePad || signaturePad.isEmpty()) {
        alert('נא לחתום לפני האישור');
        return;
    }
    signatureData = signaturePad.toDataURL('image/png');

    // כפתור הסכמה הופך לאפור
    const btn = document.getElementById('confirm-signature-btn');
    btn.disabled   = true;
    btn.textContent = '✅ נחתם';
    btn.style.background = '#9ca3af';

    closeAgreement();
    document.getElementById('signed-indicator').classList.remove('hidden');
    const agBtn = document.getElementById('open-agreement-btn');
    agBtn.textContent = '✍️ חתימה על הסכם';
    agBtn.style.background  = '#9ca3af';
    agBtn.style.borderColor = '#9ca3af';
    agBtn.style.color       = '#fff';
    const submitBtn = document.getElementById('submit-btn');
    submitBtn.disabled = false;
    submitBtn.classList.add('pulse');
};

// ── Generate invite image ─────────────────────────────────────────
async function generateInvite(formData) {
    try { await document.fonts.load('bold 48px Rubik'); } catch(e) {}

    return new Promise(resolve => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            const c   = document.createElement('canvas');
            c.width   = img.width;
            c.height  = img.height;
            const ctx = c.getContext('2d');
            ctx.drawImage(img, 0, 0);

            const W = c.width, H = c.height, cx = W / 2;
            ctx.textAlign    = 'center';
            ctx.textBaseline = 'middle';
            ctx.direction    = 'rtl';

            const S    = Math.round(W * 0.060);
            const maxW = W * 0.65;

            // צבעים אחידים
            const PINK   = '#c2185b';
            const PURPLE = '#6a1b9a';
            const SOFT   = '#8e4baa';

            // גלישת שורות ב-70% רוחב
            function wrapLines(text, size, bold = false) {
                ctx.font = `${bold ? 'bold ' : ''}${size}px Rubik, Arial`;
                const words = text.split(' ');
                const lines = [];
                let cur = '';
                for (const w of words) {
                    const test = cur ? `${cur} ${w}` : w;
                    if (ctx.measureText(test).width > maxW && cur) {
                        lines.push(cur);
                        cur = w;
                    } else { cur = test; }
                }
                if (cur) lines.push(cur);
                return lines;
            }

            // ציור שורה אחת
            function drawLine(text, y, size, color, bold = true) {
                ctx.font      = `${bold ? 'bold ' : ''}${size}px Rubik, Arial`;
                ctx.fillStyle = color;
                ctx.fillText(text, cx, y, maxW);
            }

            // ציור עם גלישה — מחזיר Y הבא
            function drawWrapped(text, yStart, size, color, bold, spacing = 1.45) {
                const lines = wrapLines(text, size, bold);
                lines.forEach((l, i) => drawLine(l, yStart + i * size * spacing, size, color, bold));
                return yStart + lines.length * size * spacing;
            }

            const dateStr = formData.date
                ? new Date(formData.date).toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' })
                : '—';

            let y = H * 0.285;
            const gap = S * 0.55;

            // שורה 1+2: כותרת ראשית
            y = drawWrapped(`${formData.celebrant} מזמינה אתכם לנפץ`, y, S * 1.0, PURPLE, true);
            y = drawWrapped('איתה לבבות 🔨🍫', y, S * 1.0, PINK, true);

            y += gap * 1.4;

            // איפה?
            drawLine('אז איפה זה קורה?', y, S * 0.68, SOFT, false);
            y += S * 1.1;
            y = drawWrapped(formData.address, y, S * 0.85, PURPLE, true);

            y += gap * 1.2;

            // מתי?
            drawLine('מתי?', y, S * 0.68, SOFT, false);
            y += S * 1.1;
            y = drawWrapped(`${dateStr} | בשעה ${formData.time}`, y, S * 0.85, PURPLE, true);

            y += gap * 1.4;

            // footer
            drawWrapped('מחכים לכם לחגיגה חוויתית ומתוקה במיוחד 💜', y, S * 0.65, PURPLE, false);
            drawLine('#sweeties_IL', y + S * 1.1, S * 0.65, PINK, false);

            resolve(c.toDataURL('image/jpeg', 0.90));
        };
        img.onerror = () => resolve(null);
        img.src = 'invite/invite.png?' + Date.now();
    });
}

// ── Format date ───────────────────────────────────────────────────
function fmtDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' });
}

// ── Submit ────────────────────────────────────────────────────────
window.submitOrder = async () => {
    if (!signatureData) { alert('נא לקרוא ולחתום על ההסכם תחילה'); return; }

    const get = id => document.getElementById(id)?.value.trim() || '';
    const celebrantName = get('f-celebrant-name');
    const celebrantAge  = get('f-celebrant-age');
    const formData = {
        name:          get('f-name'),
        phone:         get('f-phone'),
        email:         get('f-email'),
        date:          get('f-date'),
        time:          get('f-time'),
        celebrant:     celebrantAge ? `${celebrantName}, גיל ${celebrantAge}` : celebrantName,
        celebrantName,
        celebrantAge,
        guests:        get('f-guests'),
        street:        get('f-street'),
        streetNum:     get('f-street-num'),
        apt:           get('f-apt'),
        city:          get('f-city'),
        address:       [get('f-street') + ' ' + get('f-street-num'), get('f-apt') ? 'דירה ' + get('f-apt') : '', get('f-city')].filter(Boolean).join(', '),
        decoration:    get('f-decoration'),
        extras:        get('f-extras'),
    };

    const required = [
        { k: 'phone',         el: 'f-phone',          label: 'טלפון' },
        { k: 'email',         el: 'f-email',           label: 'דוא"ל' },
        { k: 'date',          el: 'f-date',            label: 'תאריך אירוע' },
        { k: 'time',          el: 'f-time',            label: 'שעת אירוע' },
        { k: 'celebrantName', el: 'f-celebrant-name',  label: 'שם החוגג/ת' },
        { k: 'guests',        el: 'f-guests',            label: 'הערכת מספר משתתפים' },
        { k: 'street',        el: 'f-street',           label: 'רחוב' },
        { k: 'streetNum',     el: 'f-street-num',       label: 'מספר בית' },
        { k: 'city',          el: 'f-city',             label: 'עיר' },
    ];
    for (const { k, el, label } of required) {
        if (!formData[k]) {
            alert(`נא למלא: ${label}`);
            document.getElementById(el)?.focus();
            return;
        }
    }

    const btn = document.getElementById('submit-btn');
    btn.textContent = 'שולחת… ⏳';
    btn.disabled = true;

    try {
        // Generate invite
        const inviteImg = await generateInvite(formData);

        // Save to Firestore
        await updateDoc(doc(db, 'orders', orderId), {
            ...formData,
            eventDate:     formData.date,
            signatureData,
            inviteImage:   inviteImg || '',
            status:        'submitted',
            submittedAt:   serverTimestamp()
        });

        // Send email via EmailJS
        await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_CUSTOMER, {
            to_name:          formData.name,
            to_email:         formData.email,
            admin_email:      ADMIN_EMAIL,
            phone:            formData.phone,
            event_date:       fmtDate(formData.date),
            event_time:       formData.time,
            celebrant:        formData.celebrant,
            guests:           formData.guests   || 'לא צוין',
            event_address:    formData.address,
            decoration:       formData.decoration || 'לא צוין',
            extras:           formData.extras      || 'לא צוין',
            agreement_signed: '✓ ההסכם נחתם ונשמר',
            // invite_image ו-signature_img מושהים עד שדרוג PLAN ב-EmailJS
        });

        show('success');
        window.scrollTo(0, 0);

    } catch (e) {
        console.error(e);
        alert('שגיאה בשליחה: ' + e.message + '\nנסי שוב או פני ל-Chen ישירות.');
        btn.textContent = 'שלחי הזמנה 🎉';
        btn.disabled = false;
    }
};

init();
