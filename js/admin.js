import { initializeApp }        from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged }
    from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, orderBy, query, serverTimestamp, doc, getDoc, deleteDoc }
    from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { firebaseConfig, SITE_URL } from "./firebase-config.js";
import { generateInvite } from "./invite.js";

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

// ── Elements ──────────────────────────────────────────────────────
const loginScreen   = document.getElementById('login-screen');
const dashboard     = document.getElementById('dashboard');
const googleBtn     = document.getElementById('google-btn');
const logoutBtn     = document.getElementById('logout-btn');
const userNameEl    = document.getElementById('user-name');
const createModal   = document.getElementById('create-modal');
const nameInput     = document.getElementById('customer-name-input');
const linkSection   = document.getElementById('generated-link-section');
const linkInput     = document.getElementById('generated-link');
const createBtnSec  = document.getElementById('create-btn-section');
const whatsappLink  = document.getElementById('whatsapp-link');
const ordersEl      = document.getElementById('orders-container');
const eventsEl      = document.getElementById('events-container');

// ── Auth ──────────────────────────────────────────────────────────
onAuthStateChanged(auth, async user => {
    if (user) {
        // בדוק אם המייל מורשה ב-Firestore
        const adminSnap = await getDoc(doc(db, 'admins', user.email));
        if (!adminSnap.exists()) {
            await signOut(auth);
            loginScreen.classList.remove('hidden');
            dashboard.classList.add('hidden');
            showLoginError('❌ אין לך הרשאת גישה לממשק זה.');
            return;
        }
        loginScreen.classList.add('hidden');
        dashboard.classList.remove('hidden');
        userNameEl.textContent = user.displayName || user.email;
        loadOrders();
        loadEvents();
    } else {
        loginScreen.classList.remove('hidden');
        dashboard.classList.add('hidden');
    }
});

function showLoginError(msg) {
    let el = document.getElementById('login-error');
    if (!el) {
        el = document.createElement('p');
        el.id = 'login-error';
        el.style.cssText = 'color:#dc2626;margin-top:14px;font-size:14px;';
        document.querySelector('.login-card').appendChild(el);
    }
    el.textContent = msg;
}

googleBtn.addEventListener('click', async () => {
    try {
        await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (e) {
        alert('שגיאה בהתחברות: ' + e.message);
    }
});

logoutBtn.addEventListener('click', () => signOut(auth));

// ── Create order modal ────────────────────────────────────────────
window.openCreateModal = () => {
    nameInput.value = '';
    linkSection.classList.add('hidden');
    createBtnSec.classList.remove('hidden');
    const btn = document.getElementById('create-btn');
    btn.textContent = 'צרי קישור הזמנה';
    btn.disabled = false;
    createModal.classList.remove('hidden');
    setTimeout(() => nameInput.focus(), 50);
};

window.closeCreateModal = () => createModal.classList.add('hidden');

createModal.addEventListener('click', e => { if (e.target === createModal) closeCreateModal(); });

// Enter key in name field
nameInput.addEventListener('keydown', e => { if (e.key === 'Enter') createOrder(); });

// ── Create order ──────────────────────────────────────────────────
window.createOrder = async () => {
    const name = nameInput.value.trim();
    if (!name) { nameInput.focus(); nameInput.classList.add('shake'); setTimeout(() => nameInput.classList.remove('shake'), 400); return; }

    const btn = document.getElementById('create-btn');
    btn.textContent = 'יוצרת…';
    btn.disabled = true;

    try {
        const ref = await addDoc(collection(db, 'orders'), {
            customerName: name,
            status: 'pending',
            createdAt: serverTimestamp()
        });

        const link = `${SITE_URL}/order.html?id=${ref.id}`;
        linkInput.value = link;
        linkSection.classList.remove('hidden');
        createBtnSec.classList.add('hidden');

        const msg = encodeURIComponent(`שלום ${name} 💜\nלחצי על הקישור למילוי פרטי ההזמנה:\n${link}`);
        whatsappLink.href = `https://wa.me/?text=${msg}`;

        loadOrders();
    } catch (e) {
        alert('שגיאה ביצירת הזמנה: ' + e.message);
        btn.textContent = 'צרי קישור הזמנה';
        btn.disabled = false;
    }
};

// ── Copy link ─────────────────────────────────────────────────────
window.copyLink = () => {
    navigator.clipboard.writeText(linkInput.value).then(() => {
        const btn = linkInput.nextElementSibling;
        const orig = btn.textContent;
        btn.textContent = '✓ הועתק';
        setTimeout(() => btn.textContent = orig, 2000);
    });
};

// ── Load orders ───────────────────────────────────────────────────
async function loadOrders() {
    ordersEl.innerHTML = '<div class="loading">טוען…</div>';
    try {
        const snap = await getDocs(query(collection(db, 'orders'), orderBy('createdAt', 'desc')));
        if (snap.empty) { ordersEl.innerHTML = '<p class="no-orders">אין הזמנות עדיין</p>'; return; }

        const pending = snap.docs.filter(d => d.data().status === 'pending');

        if (pending.length === 0) {
            ordersEl.innerHTML = '<p class="no-orders">אין הזמנות ממתינות</p>';
        } else {
            const rows = pending.map(d => {
                const o    = d.data();
                const date = o.createdAt?.toDate?.()?.toLocaleDateString('he-IL') || '—';
                const link = `${SITE_URL}/order.html?id=${d.id}`;
                const copyJs = `navigator.clipboard.writeText('${link}').then(()=>{this.textContent='✓';setTimeout(()=>this.textContent='קישור',1500)})`;
                return `<tr>
                    <td>${o.customerName}</td>
                    <td>${date}</td>
                    <td>⏳ ממתינה למילוי</td>
                    <td>
                        <button class="btn-sm" onclick="${copyJs}">שלח קישור</button>
                        <button class="btn-sm btn-delete" onclick="deleteOrder('${d.id}', '${o.customerName}')">🗑️ מחק</button>
                    </td>
                </tr>`;
            }).join('');
            ordersEl.innerHTML = `
                <table class="orders-table">
                    <thead><tr><th>לקוחה</th><th>נוצרה</th><th>סטטוס</th><th>פעולות</th></tr></thead>
                    <tbody>${rows}</tbody>
                </table>`;
        }
    } catch (e) {
        ordersEl.innerHTML = `<p class="error">שגיאה בטעינה: ${e.message}</p>`;
    }
}

// ── Load submitted events ─────────────────────────────────────────
async function loadEvents() {
    eventsEl.innerHTML = '<div class="loading">טוען…</div>';
    try {
        const snap = await getDocs(query(collection(db, 'orders'), orderBy('createdAt', 'desc')));
        const submitted = snap.docs.filter(d => d.data().status === 'submitted');

        if (submitted.length === 0) {
            eventsEl.innerHTML = '<p class="no-orders">אין אירועים שנסגרו עדיין</p>';
            return;
        }

        const rows = submitted.map(d => {
            const o = d.data();
            const eventDate = o.eventDate || o.date
                ? new Date(o.eventDate || o.date).toLocaleDateString('he-IL', { day:'numeric', month:'long', year:'numeric' })
                : '—';
            return `<tr>
                <td><strong>${o.customerName || '—'}</strong></td>
                <td>${o.phone || '—'}</td>
                <td>${o.email || '—'}</td>
                <td>${o.celebrant || '—'}</td>
                <td>${eventDate}</td>
                <td>${o.time || '—'}</td>
                <td>${o.address || '—'}</td>
                <td>
                    ${o.inviteImage ? `<button class="btn-sm btn-invite" onclick="previewInvite('${d.id}')">🎉 הזמנה</button>` : '—'}
                </td>
                <td>
                    <button class="btn-sm" onclick="showEventDetails('${d.id}')">פרטים מלאים</button>
                    <button class="btn-sm btn-delete" onclick="deleteOrder('${d.id}', '${o.customerName}')">🗑️ מחק</button>
                </td>
            </tr>`;
        }).join('');

        eventsEl.innerHTML = `
            <div style="overflow-x:auto;">
            <table class="orders-table events-table">
                <thead><tr>
                    <th>לקוחה</th><th>טלפון</th><th>דוא"ל</th>
                    <th>חוגג/ת</th><th>תאריך</th><th>שעה</th>
                    <th>כתובת</th><th>הזמנה</th><th></th>
                </tr></thead>
                <tbody>${rows}</tbody>
            </table>
            </div>`;

        // store data for modal
        window._eventsData = {};
        submitted.forEach(d => { window._eventsData[d.id] = d.data(); });

    } catch (e) {
        eventsEl.innerHTML = `<p class="error">שגיאה: ${e.message}</p>`;
    }
}

// ── View toggle ───────────────────────────────────────────────────
let currentView = 'table';
let calYear, calMonth;

window.switchView = (view) => {
    currentView = view;
    document.getElementById('view-table-btn').classList.toggle('active', view === 'table');
    document.getElementById('view-cal-btn').classList.toggle('active', view === 'calendar');
    document.getElementById('events-container').classList.toggle('hidden', view === 'calendar');
    document.getElementById('calendar-container').classList.toggle('hidden', view === 'table');
    if (view === 'calendar') renderCalendar();
};

// ── Calendar ──────────────────────────────────────────────────────
window.calNav = (delta) => { calMonth += delta; if (calMonth > 11) { calMonth = 0; calYear++; } if (calMonth < 0) { calMonth = 11; calYear--; } renderCalendar(); };

function renderCalendar() {
    const now = new Date();
    if (calYear === undefined) { calYear = now.getFullYear(); calMonth = now.getMonth(); }

    const events = window._eventsData || {};
    // group events by date string YYYY-MM-DD
    const byDate = {};
    Object.entries(events).forEach(([id, o]) => {
        const d = o.eventDate || o.date;
        if (!d) return;
        const key = d.slice(0, 10);
        if (!byDate[key]) byDate[key] = [];
        byDate[key].push({ id, name: o.customerName, time: o.time });
    });

    const MONTHS_HE = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];
    const DAYS_HE   = ['א׳','ב׳','ג׳','ד׳','ה׳','ו׳','ש׳'];

    const firstDay = new Date(calYear, calMonth, 1).getDay();
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();

    let cells = '';
    // blank cells before first day
    for (let i = 0; i < firstDay; i++) cells += '<div class="cal-cell empty"></div>';
    for (let d = 1; d <= daysInMonth; d++) {
        const key = `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        const evs = byDate[key] || [];
        const badges = evs.map(e => `<button class="cal-event-badge" onclick="showEventDetails('${e.id}')">${e.name}${e.time ? ' '+e.time : ''}</button>`).join('');
        const today = now.getFullYear()===calYear && now.getMonth()===calMonth && now.getDate()===d;
        cells += `<div class="cal-cell${today?' today':''}${evs.length?' has-event':''}">
            <span class="cal-day-num">${d}</span>
            ${badges}
        </div>`;
    }

    document.getElementById('calendar-container').innerHTML = `
        <div class="cal-nav">
            <button onclick="calNav(1)">&#8250;</button>
            <strong>${MONTHS_HE[calMonth]} ${calYear}</strong>
            <button onclick="calNav(-1)">&#8249;</button>
        </div>
        <div class="cal-grid">
            ${DAYS_HE.map(d => `<div class="cal-header-cell">${d}</div>`).join('')}
            ${cells}
        </div>`;
}

// ── Delete order ──────────────────────────────────────────────────
window.deleteOrder = async (id, name) => {
    if (!confirm(`למחוק את ההזמנה של ${name}?\nלא ניתן לשחזר.`)) return;
    try {
        await deleteDoc(doc(db, 'orders', id));
        if (window._eventsData) delete window._eventsData[id];
        loadOrders();
        loadEvents();
    } catch (e) {
        alert('שגיאה במחיקה: ' + e.message);
    }
};

// ── Demo invite preview ───────────────────────────────────────────
window.previewDemoInvite = async () => {
    const demoData = {
        celebrantName: 'שניר',
        celebrantAge:  '9',
        celebrant:     'שניר, גיל 9',
        street:        'חצבים',
        streetNum:     '31',
        apt:           '',
        city:          'רמת ישי',
        address:       'חצבים 31, רמת ישי',
        date:          '2026-07-09',
        time:          '17:00',
    };

    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:3000;display:flex;align-items:center;justify-content:center;padding:16px;';
    overlay.innerHTML = `<div style="position:relative;max-width:420px;width:100%;text-align:center;">
        <p style="color:white;margin-bottom:12px;font-family:Heebo,Arial;">⏳ מייצר הזמנה לדוגמא...</p>
    </div>`;
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);

    const base64 = await generateInvite(demoData);
    if (!base64) { overlay.remove(); alert('שגיאה ביצירת הדגמה'); return; }

    overlay.innerHTML = `<div style="position:relative;max-width:420px;width:100%;">
        <img src="${base64}" style="width:100%;border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,0.5);">
        <button onclick="this.closest('div[style]').remove()" style="position:absolute;top:-14px;left:-14px;width:34px;height:34px;border-radius:50%;background:white;border:none;font-size:18px;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">✕</button>
    </div>`;
};

// ── Invite preview lightbox ───────────────────────────────────────
window.previewInvite = id => {
    const o = window._eventsData?.[id];
    if (!o?.inviteImage) return;

    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:3000;display:flex;align-items:center;justify-content:center;padding:16px;cursor:zoom-out;';
    overlay.innerHTML = `
        <div style="position:relative;max-width:420px;width:100%;">
            <img src="${o.inviteImage}" style="width:100%;border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,0.5);">
            <button onclick="this.closest('div[style]').remove()" style="position:absolute;top:-14px;left:-14px;width:34px;height:34px;border-radius:50%;background:white;border:none;font-size:18px;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">✕</button>
            <a href="${o.inviteImage}" download="sweeties-invite.jpg" style="display:block;margin-top:12px;text-align:center;background:white;color:#7c3aed;padding:10px;border-radius:10px;font-weight:700;text-decoration:none;font-family:Heebo,Arial;">💾 הורדת תמונה</a>
        </div>`;
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);
};

// ── Event details modal ───────────────────────────────────────────
window.showEventDetails = id => {
    const o = window._eventsData?.[id];
    if (!o) return;
    const eventDate = o.eventDate || o.date
        ? new Date(o.eventDate || o.date).toLocaleDateString('he-IL', { day:'numeric', month:'long', year:'numeric' })
        : '—';

    const html = `
        <div style="direction:rtl;font-family:Heebo,Arial;line-height:1.8;">
            <h3 style="color:#7c3aed;margin-bottom:16px;">פרטי אירוע — ${o.customerName}</h3>
            <table style="width:100%;border-collapse:collapse;font-size:14px;">
                ${[
                    ['👤 שם לקוחה', o.customerName],
                    ['☎️ טלפון', o.phone],
                    ['✉️ דוא"ל', o.email],
                    ['🎂 חוגג/ת', o.celebrant],
                    ['📅 תאריך', eventDate],
                    ['⏰ שעה', o.time],
                    ['📍 כתובת', o.address],
                    ['👥 הערכת משתתפים', o.guests || '—'],
                    ['🎨 עיצוב מועדף', o.decoration || '—'],
                    ['📝 הערות נוספות', o.extras || '—'],
                    ['📣 איך הגיעו', o.referral || '—'],
                ].map(([k,v]) => `<tr style="border-bottom:1px solid #e5e7eb;">
                    <td style="padding:8px 12px;font-weight:700;background:#f9f0ff;width:35%;">${k}</td>
                    <td style="padding:8px 12px;">${v || '—'}</td>
                </tr>`).join('')}
            </table>
            ${o.signatureData ? `<div style="margin-top:20px;"><strong>חתימה:</strong><br><img src="${o.signatureData}" style="max-width:260px;border:1px solid #e5e7eb;border-radius:8px;padding:6px;margin-top:8px;"></div>` : ''}
            ${o.inviteImage ? `<div style="margin-top:20px;"><strong>הזמנה:</strong><br><img src="${o.inviteImage}" style="max-width:280px;border-radius:10px;margin-top:8px;"></div>` : ''}
        </div>`;

    // simple overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:2000;display:flex;align-items:center;justify-content:center;padding:16px;';
    overlay.innerHTML = `<div style="background:white;border-radius:16px;padding:32px;max-width:560px;width:100%;max-height:90vh;overflow-y:auto;position:relative;">
        <button onclick="this.closest('div[style]').remove()" style="position:absolute;top:12px;left:12px;border:none;background:none;font-size:20px;cursor:pointer;color:#6b7280;">✕</button>
        ${html}
    </div>`;
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);
};
