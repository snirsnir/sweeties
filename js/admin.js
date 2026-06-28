import { initializeApp }        from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged }
    from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, orderBy, query, serverTimestamp }
    from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { firebaseConfig, SITE_URL } from "./firebase-config.js";

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

// ── Auth ──────────────────────────────────────────────────────────
onAuthStateChanged(auth, user => {
    if (user) {
        loginScreen.classList.add('hidden');
        dashboard.classList.remove('hidden');
        userNameEl.textContent = user.displayName || user.email;
        loadOrders();
    } else {
        loginScreen.classList.remove('hidden');
        dashboard.classList.add('hidden');
    }
});

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

        const statusLabel = { pending: '⏳ ממתינה למילוי', submitted: '✅ הוגשה' };

        const rows = snap.docs.map(d => {
            const o    = d.data();
            const date = o.createdAt?.toDate?.()?.toLocaleDateString('he-IL') || '—';
            const stat = statusLabel[o.status] || o.status;
            const link = `${SITE_URL}/order.html?id=${d.id}`;
            const copyJs = `navigator.clipboard.writeText('${link}').then(()=>{this.textContent='✓';setTimeout(()=>this.textContent='קישור',1500)})`;
            const eventDate = o.eventDate
                ? new Date(o.eventDate).toLocaleDateString('he-IL')
                : (o.date ? new Date(o.date).toLocaleDateString('he-IL') : '—');
            return `<tr>
                <td>${o.customerName}</td>
                <td>${date}</td>
                <td>${stat}</td>
                <td>${eventDate}</td>
                <td>
                    <button class="btn-sm" onclick="${copyJs}">קישור</button>
                    ${o.status === 'submitted' ? `<button class="btn-sm" onclick="viewOrder('${d.id}')">פרטים</button>` : ''}
                </td>
            </tr>`;
        }).join('');

        ordersEl.innerHTML = `
            <table class="orders-table">
                <thead><tr><th>לקוחה</th><th>נוצרה</th><th>סטטוס</th><th>תאריך אירוע</th><th>פעולות</th></tr></thead>
                <tbody>${rows}</tbody>
            </table>`;
    } catch (e) {
        ordersEl.innerHTML = `<p class="error">שגיאה בטעינה: ${e.message}</p>`;
    }
}

// ── View order (stub — expand later) ─────────────────────────────
window.viewOrder = id => {
    alert(`קישור להזמנה: ${SITE_URL}/order.html?id=${id}`);
};
