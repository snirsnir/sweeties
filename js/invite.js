export async function generateInvite(formData, basePath = '', bgFile = 'invite/invite.png') {
    const font = new FontFace('FbAnimator', `url(${basePath}fonts/FbAnimator-Regular.ttf)`);
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

            const FONT   = 'FbAnimator, Arial';
            const S      = Math.round(W * 0.062);
            const maxW   = W * 0.65;
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
                    if (ctx.measureText(test).width > maxW && cur) { lines.push(cur); cur = w; }
                    else { cur = test; }
                }
                if (cur) lines.push(cur);
                return lines;
            }

            function drawLine(text, y, size, color) {
                ctx.font = `${size}px ${FONT}`; ctx.fillStyle = color;
                ctx.fillText(text, cx, y, maxW);
            }

            function drawWrapped(text, yStart, size, color, spacing = 1.5) {
                const lines = wrapLines(text, size);
                lines.forEach((l, i) => drawLine(l, yStart + i * size * spacing, size, color));
                return yStart + lines.length * size * spacing;
            }

            function drawPill(y, w, h, color, alpha = 0.18) {
                ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = color;
                const r = h / 2, x = cx - w / 2;
                ctx.beginPath();
                ctx.moveTo(x + r, y - h / 2); ctx.lineTo(x + w - r, y - h / 2);
                ctx.arc(x + w - r, y, r, -Math.PI / 2, Math.PI / 2);
                ctx.lineTo(x + r, y + h / 2);
                ctx.arc(x + r, y, r, Math.PI / 2, -Math.PI / 2);
                ctx.closePath(); ctx.fill(); ctx.restore();
            }

            const DAY_NAMES = ['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'];
            const dateObj   = formData.date ? new Date(formData.date) : null;
            const dateStr   = dateObj ? dateObj.toLocaleDateString('he-IL', { day: 'numeric', month: 'long' }) : '—';
            const dayName   = dateObj ? `יום ${DAY_NAMES[dateObj.getDay()]}` : '';

            const streetLine    = [formData.street, formData.streetNum, formData.apt ? `דירה ${formData.apt}` : ''].filter(Boolean).join(' ');
            const cityLine      = formData.city || '';
            const celebrantName = formData.celebrantName || (formData.celebrant || '').split(',')[0];
            const nameY    = H * 0.24;

            drawLine(`${celebrantName} חוגגת`, nameY, S * 1.20, PURPLE);
            if (formData.celebrantAge) drawLine(formData.celebrantAge, nameY + S * 1.44, S * 1.25, PURPLE);

            drawWrapped('ומזמינה אתכן',    H * 0.37, S * 0.97, PINK);
            drawWrapped('לסדנת לב ניפוץ!', H * 0.41, S * 0.97, PINK);

            drawLine('אז איפה זה קורה?', H * 0.52,  S * 0.80, SOFT);
            drawLine(streetLine,          H * 0.565, S * 0.86, PURPLE);
            drawLine(cityLine,            H * 0.605, S * 0.86, PURPLE);

            drawLine('מתי?',                        H * 0.675, S * 0.92, SOFT);
            drawLine(`${dayName} | ${dateStr}`,     H * 0.725, S * 0.80, PURPLE);
            drawLine(`בשעה ${formData.time}`,       H * 0.765, S * 0.80, PURPLE);

            const footerText = 'מחכים לכם לחגיגה חוויתית ומתוקה במיוחד 💜';
            const footerSize = S * 0.82;
            ctx.font = `${footerSize}px ${FONT}`;
            const footerW = Math.min(ctx.measureText(footerText).width + S * 1.4, maxW + S * 1.4);
            drawPill(H * 0.855, footerW, footerSize * 2.4, '#7c3aed', 0.15);
            drawLine(footerText, H * 0.855, footerSize, PURPLE);

            resolve(c.toDataURL('image/jpeg', 0.92));
        };
        img.onerror = () => resolve(null);
        img.src = `${basePath}${bgFile}?` + Date.now();
    });
}
