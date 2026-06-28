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
        show('order');
    } catch (e) {
        console.error(e);
        show('error');
    }
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
function agreementHTML(name) {
    return `<div class="agreement-body">
<p class="ag-intro">
הסכם זה נערך בין <strong>Sweeties קופסאות ניפוץ</strong> לבין <strong>${name}</strong>,
לצורך אספקת קופסאות ניפוץ שוקולד לאירוע. הלקוח/ה מאשר/ת כי קרא/ה, הבין/ה והסכים/ה לכל תנאי ההסכם כמפורט להלן.
</p>

<h4>סעיף 1: פרטי ההזמנה</h4>
<p>1. החברה תספק את השירותים בהתאם לפרטים שסוכמו בין הצדדים, לרבות תאריך, מיקום, סוג וכמות קופסאות הניפוץ.</p>
<p>2. הלקוח/ה מתחייב/ת לספק פרטים נכונים ומדויקים לביצוע ההזמנה.</p>

<h4>סעיף 2: אספקת השירותים</h4>
<p>1. החברה מתחייבת לספק את הקופסאות במועד שסוכם ובהתאם לפרטים שנמסרו.</p>
<p>2. הלקוח/ה מתחייב/ת לעדכן את החברה על כל שינוי בפרטי ההזמנה בהקדם האפשרי.</p>

<h4>סעיף 3: תנאי ביטול</h4>
<p>1. ביטול מעל 14 יום ממועד האירוע — דמי טיפול בסך 5% מסך העסקה.</p>
<p>2. ביטול 7–14 יום לפני האירוע — חיוב בסך 50% ממחיר ההזמנה הכולל.</p>
<p>3. ביטול פחות מ-7 ימים לפני האירוע — חיוב בסך 75% ממחיר ההזמנה הכולל.</p>
<p>4. ביטול ביום האירוע — חיוב בסך 100% ממחיר ההזמנה הכולל.</p>
<p>5. ביטול עקב כוח עליון — לא יגבו דמי ביטול בכפוף להצגת אסמכתא מתאימה.</p>

<h4>סעיף 4: אמצעי תשלום</h4>
<p>התשלום יתבצע באמצעות אפליקציית "ביט", העברה בנקאית, מזומן, או כפי שסוכם מראש בכתב.</p>

<h4>סעיף 5: איכות המוצרים</h4>
<p>1. החברה מתחייבת לעמוד בסטנדרטים גבוהים של עבודת יד ואיכות שוקולד.</p>
<p>2. במקרה של פגם — יש לפנות לחברה תוך 24 שעות מרגע קבלת ההזמנה.</p>

<h4>סעיף 6: תנאים כלליים</h4>
<p>1. הלקוח/ה מאשר/ת כי קיבל/ה אישור לכל פרטי ההזמנה לפני האירוע.</p>
<p>2. הלקוח/ה מתחייב/ת לעדכן את החברה על כל שינוי בהקדם האפשרי.</p>

<h4>סעיף 7: שימוש בתמונות</h4>
<p>Sweeties קופסאות ניפוץ עשויה להשתמש בתמונות מהאירוע לצורך שיווק ברשתות החברתיות.
ניתן לפנות בכל עת ולבקש הסרה.</p>

<h4>סעיף 8: אישור והסכמה</h4>
<p>חתימה דיגיטלית על הסכם זה מהווה הסכמה מלאה ומודעת לכל תנאי ההסכם ומחייבת משפטית את שני הצדדים.</p>

<div class="ag-sig-line">שם הלקוח/ה: <strong>${name}</strong></div>
</div>`;
}

// ── Agreement modal ───────────────────────────────────────────────
window.openAgreement = () => {
    const name = document.getElementById('f-name').value;
    document.getElementById('agreement-text').innerHTML = agreementHTML(name);
    document.getElementById('agreement-modal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
};

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
    closeAgreement();
    document.getElementById('signed-indicator').classList.remove('hidden');
    document.getElementById('open-agreement-btn').textContent = '✍️ ערכי חתימה';
    document.getElementById('submit-btn').disabled = false;
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

            const S = Math.round(W * 0.062); // base font size
            const maxW = W * 0.78;           // max text width (within oval)

            // Draw pill background behind text
            function pill(y, lineH, alpha = 0.72) {
                ctx.save();
                ctx.globalAlpha = alpha;
                ctx.fillStyle   = '#ffffff';
                const pw = maxW, ph = lineH * 1.55, pr = ph / 2;
                const px = cx - pw / 2, py = y - ph / 2;
                ctx.beginPath();
                ctx.moveTo(px + pr, py);
                ctx.lineTo(px + pw - pr, py);
                ctx.arc(px + pw - pr, py + pr, pr, -Math.PI/2, Math.PI/2);
                ctx.lineTo(px + pr, py + ph);
                ctx.arc(px + pr, py + pr, pr, Math.PI/2, -Math.PI/2);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            }

            function line(text, y, size, color, withPill = false) {
                if (withPill) pill(y, size);
                ctx.font      = `bold ${size}px Rubik, Arial`;
                ctx.fillStyle = color;
                ctx.fillText(text, cx, y, maxW);
            }

            function lineLight(text, y, size, color) {
                ctx.font      = `${size}px Rubik, Arial`;
                ctx.fillStyle = color;
                ctx.fillText(text, cx, y, maxW);
            }

            const dateStr = formData.date
                ? new Date(formData.date).toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' })
                : '—';

            // ── Row 1+2: main headline ────────────────────────────
            line(`${formData.celebrant} מזמינה אתכם לנפץ`, H * 0.30, S * 1.05, '#7c3aed', true);
            line(`איתה לבבות 🔨🍫`,                        H * 0.38, S * 1.05, '#e91e8c', true);

            // ── Where ─────────────────────────────────────────────
            lineLight('אז איפה זה קורה?', H * 0.47, S * 0.72, '#7c5c8a');
            line(formData.address,         H * 0.535, S * 0.88, '#1a1a2e', true);

            // ── When ──────────────────────────────────────────────
            lineLight('מתי?',              H * 0.615, S * 0.72, '#7c5c8a');
            line(`${dateStr} |`,           H * 0.675, S * 0.88, '#1a1a2e', true);
            line(`בשעה ${formData.time}`,  H * 0.735, S * 0.88, '#1a1a2e', true);

            // ── Footer ────────────────────────────────────────────
            lineLight('מחכים לכם לחגיגה חוויתית ומתוקה במיוחד 💜', H * 0.808, S * 0.68, '#5c1a5c');
            lineLight('#sweeties_IL',                                 H * 0.858, S * 0.68, '#e91e8c');

            resolve(c.toDataURL('image/jpeg', 0.88));
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

    const get = id => document.getElementById(id).value.trim();
    const formData = {
        name:       get('f-name'),
        phone:      get('f-phone'),
        email:      get('f-email'),
        date:       get('f-date'),
        time:       get('f-time'),
        celebrant:  get('f-celebrant'),
        address:    get('f-address'),
        package:    get('f-package'),
        characters: get('f-characters'),
        decoration: get('f-decoration'),
        food:       get('f-food'),
        extras:     get('f-extras'),
    };

    const required = ['phone', 'email', 'date', 'time', 'celebrant', 'address', 'package'];
    for (const k of required) {
        if (!formData[k]) {
            const labels = { phone:'טלפון', email:'דוא"ל', date:'תאריך אירוע', time:'שעת אירוע', celebrant:'שם החוגג/ת', address:'כתובת האירוע', package:'החבילה' };
            alert(`נא למלא: ${labels[k]}`);
            document.getElementById('f-' + k)?.focus();
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
            to_name:       formData.name,
            to_email:      formData.email,
            admin_email:   ADMIN_EMAIL,
            phone:         formData.phone,
            event_date:    fmtDate(formData.date),
            event_time:    formData.time,
            celebrant:     formData.celebrant,
            event_address: formData.address,
            package:       formData.package,
            characters:    formData.characters || 'לא צוין',
            decoration:    formData.decoration  || 'לא צוין',
            food:          formData.food         || 'לא צוין',
            extras:        formData.extras        || 'לא צוין',
            invite_image:  inviteImg              || '',
            signature_img: signatureData,
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
