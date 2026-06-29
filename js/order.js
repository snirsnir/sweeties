import { initializeApp }   from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, doc, getDoc, updateDoc, serverTimestamp }
    from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage, ref, uploadString, getDownloadURL }
    from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";
import {
    firebaseConfig,
    EMAILJS_PUBLIC_KEY, EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_CUSTOMER,
    ADMIN_EMAIL
} from "./firebase-config.js";

const app     = initializeApp(firebaseConfig);
const db      = getFirestore(app);
const storage = getStorage(app, 'gs://sweeties-7cfd2.firebasestorage.app');

// EmailJS init
emailjs.init(EMAILJS_PUBLIC_KEY);

// ── State ─────────────────────────────────────────────────────────
let signaturePad   = null;
let signatureData  = null;
let inviteUrl      = '';
let inviteBase64Cached = '';
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
<p>5. ביטול עקב כוח עליון בכל שלב — לא יגבו דמי ביטול.</p>

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
    // טעינת פונט FbAnimator מהתיקייה המקומית
    const font = new FontFace('FbAnimator', 'url(fonts/FbAnimator-Regular.ttf)');
    try { await font.load(); document.fonts.add(font); } catch(e) { console.warn('Font load failed', e); }

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

            const FONT  = 'FbAnimator, Arial';
            const S     = Math.round(W * 0.062);
            const maxW  = W * 0.65;

            const PINK   = '#c2185b';
            const PURPLE = '#6a1b9a';
            const SOFT   = '#9c6bb5';

            function wrapLines(text, size) {
                ctx.font = `${size}px ${FONT}`;
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

            function drawLine(text, y, size, color) {
                ctx.font      = `${size}px ${FONT}`;
                ctx.fillStyle = color;
                ctx.fillText(text, cx, y, maxW);
            }

            function drawWrapped(text, yStart, size, color, spacing = 1.5) {
                const lines = wrapLines(text, size);
                lines.forEach((l, i) => drawLine(l, yStart + i * size * spacing, size, color));
                return yStart + lines.length * size * spacing;
            }

            const DAY_NAMES = ['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'];
            const dateObj   = formData.date ? new Date(formData.date) : null;
            const dateStr   = dateObj
                ? dateObj.toLocaleDateString('he-IL', { day: 'numeric', month: 'long' })
                : '—';
            const dayName   = dateObj ? `יום ${DAY_NAMES[dateObj.getDay()]}` : '';

            // כתובת מפוצלת
            const streetLine = [formData.street, formData.streetNum, formData.apt ? `דירה ${formData.apt}` : ''].filter(Boolean).join(' ');
            const cityLine   = formData.city || '';

            const celebrantName = formData.celebrantName || formData.celebrant.split(',')[0];

            // פונקציית רקע מעוגל לפוטר
            function drawPill(y, w, h, color, alpha = 0.18) {
                ctx.save();
                ctx.globalAlpha = alpha;
                ctx.fillStyle   = color;
                const r = h / 2, x = cx - w / 2;
                ctx.beginPath();
                ctx.moveTo(x + r, y - h / 2);
                ctx.lineTo(x + w - r, y - h / 2);
                ctx.arc(x + w - r, y, r, -Math.PI / 2, Math.PI / 2);
                ctx.lineTo(x + r, y + h / 2);
                ctx.arc(x + r, y, r, Math.PI / 2, -Math.PI / 2);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            }

            // כותרת ראשית
            drawWrapped(`${celebrantName} מזמינה אתכם`, H * 0.30, S * 1.08, PURPLE);
            drawWrapped('לנפץ איתה לבבות', H * 0.38, S * 1.08, PINK);

            // איפה?
            drawLine('אז איפה זה קורה?', H * 0.49,  S * 0.70, SOFT);
            drawLine(streetLine,          H * 0.565, S * 0.78, PURPLE);
            drawLine(cityLine,            H * 0.585, S * 0.78, PURPLE);

            // מתי?
            drawLine('מתי?',                         H * 0.63,  S * 0.70, SOFT);
            drawLine(`${dayName} | ${dateStr}`,      H * 0.68,  S * 0.72, PURPLE);
            drawLine(`בשעה ${formData.time}`,        H * 0.72,  S * 0.72, PURPLE);

            // footer עם רקע
            const footerText = 'מחכים לכם לחגיגה חוויתית ומתוקה במיוחד 💜';
            const footerSize = S * 0.68;
            ctx.font = `${footerSize}px ${FONT}`;
            const footerW = Math.min(ctx.measureText(footerText).width + S * 1.4, maxW + S * 1.4);
            drawPill(H * 0.855, footerW, footerSize * 2.4, '#7c3aed', 0.15);
            drawLine(footerText, H * 0.855, footerSize, PURPLE);

            resolve(c.toDataURL('image/jpeg', 0.92));
        };
        img.onerror = () => resolve(null);
        img.src = 'invite/invite.png?' + Date.now();
    });
}

// ── Share invite ──────────────────────────────────────────────────
window.shareInvite = async () => {
    if (!inviteBase64Cached) return;
    const btn = document.getElementById('share-btn');
    btn.textContent = 'מכינה… ⏳';
    btn.disabled = true;

    try {
        // המרת base64 ל-Blob ישירות — ללא fetch, ללא CORS
        const res  = await fetch(inviteBase64Cached);
        const blob = await res.blob();
        const file = new File([blob], 'sweeties-invite.jpg', { type: 'image/jpeg' });

        if (navigator.canShare?.({ files: [file] })) {
            await navigator.share({
                files: [file],
                title: 'ההזמנה שלי מ-Sweeties 💜',
                text:  'מוזמנים לחגיגה! 🔨🍫',
            });
        } else if (navigator.share) {
            await navigator.share({ url: inviteUrl || window.location.href, title: 'ההזמנה שלי מ-Sweeties 💜' });
        } else {
            await navigator.clipboard.writeText(inviteUrl || window.location.href);
            btn.textContent = '✓ הקישור הועתק!';
            setTimeout(() => { btn.textContent = '📲 שתפי את ההזמנה'; btn.disabled = false; }, 2500);
            return;
        }
    } catch (e) {
        if (e.name !== 'AbortError') console.error(e);
    }

    btn.textContent = '📲 שתפי את ההזמנה';
    btn.disabled = false;
};

// ── Upload invite to Firebase Storage ────────────────────────────
async function uploadInvite(base64DataUrl) {
    const storageRef = ref(storage, `invites/${orderId}.jpg`);
    await uploadString(storageRef, base64DataUrl, 'data_url');
    return await getDownloadURL(storageRef);
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
        // Generate invite + upload to Firebase Storage
        inviteBase64Cached = await generateInvite(formData) || '';
        if (inviteBase64Cached) {
            try {
                inviteUrl = await uploadInvite(inviteBase64Cached);
            } catch (storageErr) {
                console.error('Storage error:', storageErr);
            }
        }

        // תצוגה מקדימה במסך הצלחה
        if (inviteBase64Cached) {
            const preview = document.getElementById('invite-preview');
            if (preview) preview.src = inviteBase64Cached;
            document.getElementById('invite-preview-wrap')?.classList.remove('hidden');
        }

        // Save to Firestore
        await updateDoc(doc(db, 'orders', orderId), {
            ...formData,
            eventDate:     formData.date,
            signatureData,
            inviteImage:   inviteUrl,
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
            invite_url:       inviteUrl,
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
