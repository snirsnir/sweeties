/**
 * sweeties - Three.js Intro Animation
 * Heart smash sequence with Draco-compressed GLB models
 */

import * as THREE from 'three';
import { GLTFLoader }  from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

// ─── Setup ───────────────────────────────────────────────────────────────────
const canvas   = document.getElementById('three-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
renderer.outputColorSpace  = THREE.SRGBColorSpace;
renderer.toneMapping       = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;

const scene  = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(0, 0.5, 6);
camera.lookAt(0, 0, 0);

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// ─── Lights ──────────────────────────────────────────────────────────────────
const ambient = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambient);

const goldLight = new THREE.PointLight(0xD4AF37, 4, 30);
goldLight.position.set(3, 4, 3);
scene.add(goldLight);

const purpleLight = new THREE.PointLight(0x8B2FC9, 3, 25);
purpleLight.position.set(-3, -1, 3);
scene.add(purpleLight);

const rimLight = new THREE.DirectionalLight(0xffffff, 1.5);
rimLight.position.set(0, 5, 2);
rimLight.castShadow = true;
scene.add(rimLight);

const fillLight = new THREE.PointLight(0xA855F7, 2, 20);
fillLight.position.set(0, -3, 4);
scene.add(fillLight);

// ─── Background particles ─────────────────────────────────────────────────────
function makeStarfield() {
    const N = 300;
    const pos = new Float32Array(N * 3);
    const col = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
        pos[i*3]   = (Math.random() - 0.5) * 40;
        pos[i*3+1] = (Math.random() - 0.5) * 30;
        pos[i*3+2] = -15 + Math.random() * 5;
        const gold = Math.random() > 0.5;
        col[i*3]   = gold ? 0.83 : 0.55;
        col[i*3+1] = gold ? 0.69 : 0.18;
        col[i*3+2] = gold ? 0.22 : 0.79;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color',    new THREE.BufferAttribute(col, 3));
    const mat = new THREE.PointsMaterial({ size: 0.06, vertexColors: true, transparent: true, opacity: 0.7 });
    const pts = new THREE.Points(geo, mat);
    scene.add(pts);
    return pts;
}
const starfield = makeStarfield();

// ─── Glow ring ────────────────────────────────────────────────────────────────
function makeGlowRing() {
    const geo = new THREE.TorusGeometry(2.2, 0.02, 8, 80);
    const mat = new THREE.MeshBasicMaterial({ color: 0x8B2FC9, transparent: true, opacity: 0 });
    const ring = new THREE.Mesh(geo, mat);
    ring.rotation.x = Math.PI / 2;
    scene.add(ring);
    return ring;
}
const glowRing = makeGlowRing();

// ─── State machine ────────────────────────────────────────────────────────────
const STATE = { LOADING: 0, IDLE: 1, SWINGING: 2, IMPACT: 3, SHATTERING: 4, FADING: 5, DONE: 6 };
let state = STATE.LOADING;

const clock = new THREE.Clock();
let heartModel   = null;
let hammerModel  = null;
let shards       = [];
let burstPoints  = null;
let shakeAmount  = 0;
let swingT       = 0;
let fadeT        = 0;
let impactDone   = false;
let totalFadeT   = 0;
let autoTimer    = 0;
let modelsLoaded = 0;

// Hammer arc swing — pivot above heart, arm rotates down
const PIVOT       = new THREE.Vector3(0, 1.8, 0.2);
const ARM_LEN     = 2.8;
const ANGLE_IDLE  = 0.65;   // radians — hammer close to heart, tilted right

function hammerFromAngle(a) {
    return new THREE.Vector3(
        PIVOT.x + Math.sin(a) * ARM_LEN,
        PIVOT.y - Math.cos(a) * ARM_LEN,
        PIVOT.z
    );
}

// ─── Draco + GLTF Loader ──────────────────────────────────────────────────────
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
dracoLoader.preload();

const loader = new GLTFLoader();
loader.setDRACOLoader(dracoLoader);

const loadingBar = document.getElementById('loading-bar');

function onProgress(e) {
    if (e.lengthComputable && loadingBar) {
        const pct = Math.round((e.loaded / e.total) * 50);
        loadingBar.style.width = (modelsLoaded * 50 + pct) + '%';
    }
}

loader.load('models/heart.glb', (gltf) => {
    heartModel = gltf.scene;

    // Rotate upright so face points toward camera
    heartModel.rotation.x = Math.PI / 2;

    // Scale to fit nicely on screen
    const box = new THREE.Box3().setFromObject(heartModel);
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = 2.4 / maxDim;
    heartModel.scale.setScalar(scale);

    // Centre at origin based on scaled bounds
    const centre = new THREE.Vector3();
    box.getCenter(centre);
    heartModel.position.sub(centre.multiplyScalar(scale));
    // Small upward nudge so it sits nicely in frame
    heartModel.position.y -= 0.45;

    heartModel.traverse(c => {
        if (c.isMesh) {
            c.castShadow = true;
            c.receiveShadow = true;
            if (c.material) {
                c.material.metalness = 0.25;
                c.material.roughness = 0.35;
                c.material.needsUpdate = true;
            }
        }
    });
    scene.add(heartModel);
    modelsLoaded++;
    loadingBar.style.width = '50%';
    checkReady();
}, onProgress, (err) => {
    console.warn('Heart load error:', err);
    createFallbackHeart();
    modelsLoaded++;
    checkReady();
});

loader.load('models/hammer.glb', (gltf) => {
    const loaded = gltf.scene;

    // Scale
    const box = new THREE.Box3().setFromObject(loaded);
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = 1.8 / maxDim;
    loaded.scale.setScalar(scale);

    // Centre
    const centre = new THREE.Vector3();
    box.getCenter(centre);
    loaded.position.sub(centre.multiplyScalar(scale));

    // סיבוב כדי שראש הפטיש יצביע למטה לכיוון הלב
    loaded.rotation.set(Math.PI, 0, -Math.PI / 1.3);

    loaded.traverse(c => { if (c.isMesh) c.castShadow = true; });

    // Wrap in a Group — we animate the group, inner model holds the orientation fix
    hammerModel = new THREE.Group();
    hammerModel.add(loaded);
    hammerModel.position.copy(hammerFromAngle(ANGLE_IDLE));
    hammerModel.rotation.set(0, 0, ANGLE_IDLE);
    scene.add(hammerModel);
    modelsLoaded++;
    loadingBar.style.width = '100%';
    checkReady();
}, onProgress, (err) => {
    console.warn('Hammer load error:', err);
    createFallbackHammer();
    modelsLoaded++;
    checkReady();
});

// ─── Fallbacks if GLB fails ───────────────────────────────────────────────────
function createFallbackHeart() {
    const geo = new THREE.SphereGeometry(1, 32, 32);
    const mat = new THREE.MeshStandardMaterial({ color: 0x8B2FC9, metalness: 0.3, roughness: 0.4 });
    heartModel = new THREE.Mesh(geo, mat);
    scene.add(heartModel);
}
function createFallbackHammer() {
    const group = new THREE.Group();
    const headGeo = new THREE.BoxGeometry(0.8, 0.5, 0.5);
    const headMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.8, roughness: 0.2 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 0.8;
    const handleGeo = new THREE.CylinderGeometry(0.07, 0.07, 1.8, 10);
    const handleMat = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
    const handle = new THREE.Mesh(handleGeo, handleMat);
    group.add(head, handle);
    group.position.copy(hammerFromAngle(ANGLE_IDLE));
    group.rotation.set(0, 0, ANGLE_IDLE);
    hammerModel = group;
    scene.add(hammerModel);
}

// ─── Ready ────────────────────────────────────────────────────────────────────
function checkReady() {
    if (modelsLoaded < 2) return;

    setTimeout(() => {
        const overlay = document.getElementById('loading-overlay');
        overlay.style.opacity = '0';
        setTimeout(() => {
            overlay.style.display = 'none';
            const ui = document.getElementById('intro-ui');
            if (ui) { ui.style.transition = 'opacity .6s ease'; ui.style.opacity = '1'; }
            state = STATE.IDLE;
            // ניפוץ אוטומטי — קצר רגע כדי שהמצב יתייצב לפני שמתחיל
            setTimeout(() => startSwing(), 600);
        }, 800);
    }, 400);
}

// ─── Shatter geometry (3×3×3 spatial grid, two-pass) ─────────────────────────
function shatterHeart(root) {
    const groups   = {};
    const GRID     = 3;
    const masterBB = new THREE.Box3();

    // Pass 1: build complete bounding box across all meshes
    root.traverse(child => {
        if (!child.isMesh) return;
        child.updateWorldMatrix(true, false);
        let tmpGeo = child.geometry.clone();
        if (tmpGeo.index) tmpGeo = tmpGeo.toNonIndexed();
        tmpGeo.applyMatrix4(child.matrixWorld);
        tmpGeo.computeBoundingBox();
        masterBB.union(tmpGeo.boundingBox);
        tmpGeo.dispose();
    });

    const bbSz = new THREE.Vector3();
    masterBB.getSize(bbSz);
    const safeX = bbSz.x < 0.0001 ? 1 : bbSz.x;
    const safeY = bbSz.y < 0.0001 ? 1 : bbSz.y;
    const safeZ = bbSz.z < 0.0001 ? 1 : bbSz.z;

    // Pass 2: assign every triangle to its grid cell
    root.traverse(child => {
        if (!child.isMesh) return;
        child.updateWorldMatrix(true, false);

        let geo = child.geometry.clone();
        if (geo.index) geo = geo.toNonIndexed();
        geo.applyMatrix4(child.matrixWorld);

        const pos  = geo.attributes.position;
        const tris = pos.count / 3;

        for (let i = 0; i < tris; i++) {
            const b = i * 3;
            const ax = pos.getX(b),   ay = pos.getY(b),   az = pos.getZ(b);
            const bx = pos.getX(b+1), by = pos.getY(b+1), bz = pos.getZ(b+1);
            const cx = pos.getX(b+2), cy = pos.getY(b+2), cz = pos.getZ(b+2);
            const centX = (ax+bx+cx)/3, centY = (ay+by+cy)/3, centZ = (az+bz+cz)/3;

            const gx = Math.min(GRID-1, Math.max(0, Math.floor((centX - masterBB.min.x) / safeX * GRID)));
            const gy = Math.min(GRID-1, Math.max(0, Math.floor((centY - masterBB.min.y) / safeY * GRID)));
            const gz = Math.min(GRID-1, Math.max(0, Math.floor((centZ - masterBB.min.z) / safeZ * GRID)));
            const cellKey = `${gx}_${gy}_${gz}`;

            if (!groups[cellKey]) {
                groups[cellKey] = { verts: [], sumX: 0, sumY: 0, sumZ: 0, n: 0, mat: child.material };
            }
            groups[cellKey].verts.push(ax,ay,az, bx,by,bz, cx,cy,cz);
            groups[cellKey].sumX += centX;
            groups[cellKey].sumY += centY;
            groups[cellKey].sumZ += centZ;
            groups[cellKey].n++;
        }
        geo.dispose();
    });

    const bbCentre = new THREE.Vector3();
    masterBB.getCenter(bbCentre);

    const result = [];
    for (const key in groups) {
        const g = groups[key];
        if (g.n < 1) continue;

        const cx = g.sumX / g.n;
        const cy = g.sumY / g.n;
        const cz = g.sumZ / g.n;

        const centered = new Float32Array(g.verts.length);
        for (let i = 0; i < g.verts.length; i += 3) {
            centered[i]   = g.verts[i]   - cx;
            centered[i+1] = g.verts[i+1] - cy;
            centered[i+2] = g.verts[i+2] - cz;
        }

        const shardGeo = new THREE.BufferGeometry();
        shardGeo.setAttribute('position', new THREE.BufferAttribute(centered, 3));
        shardGeo.computeVertexNormals();

        let mat;
        if (g.mat) {
            mat = g.mat.clone();
        } else {
            mat = new THREE.MeshStandardMaterial({ color: 0x8B2FC9, metalness: 0.3, roughness: 0.35 });
        }
        mat.side = THREE.DoubleSide;
        mat.transparent = true;
        mat.opacity = 1;

        const mesh = new THREE.Mesh(shardGeo, mat);
        mesh.position.set(cx, cy, cz);
        mesh.castShadow = true;

        // Explosion direction from heart centre
        const dir = new THREE.Vector3(cx - bbCentre.x, cy - bbCentre.y, cz - bbCentre.z);
        if (dir.length() < 0.01) dir.set((Math.random()-0.5), Math.random()+0.5, (Math.random()-0.5));
        dir.normalize();

        const speed = 2.5 + Math.random() * 6;
        mesh.userData.vel = dir.multiplyScalar(speed).add(
            new THREE.Vector3((Math.random()-.5)*3, Math.random()*4+1, (Math.random()-.5)*3)
        );
        mesh.userData.angVel = new THREE.Vector3(
            (Math.random()-.5)*12, (Math.random()-.5)*12, (Math.random()-.5)*12
        );
        mesh.userData.life     = 1.0;
        mesh.userData.fadeDelay = Math.random() * 0.4;

        result.push(mesh);
    }
    return result;
}

// ─── Particle burst ───────────────────────────────────────────────────────────
function createBurst(centre) {
    const N = 600;
    const pos  = new Float32Array(N * 3);
    const col  = new Float32Array(N * 3);
    const vels = [];

    for (let i = 0; i < N; i++) {
        pos[i*3]   = centre.x;
        pos[i*3+1] = centre.y;
        pos[i*3+2] = centre.z;

        const gold = Math.random() > 0.4;
        col[i*3]   = gold ? 0.95 : 0.85;
        col[i*3+1] = gold ? 0.82 : 0.30;
        col[i*3+2] = gold ? 0.10 : 1.00;

        const th = Math.random() * Math.PI * 2;
        const ph = Math.random() * Math.PI;
        const sp = 3 + Math.random() * 12;
        vels.push(new THREE.Vector3(
            Math.sin(ph)*Math.cos(th)*sp,
            Math.sin(ph)*Math.sin(th)*sp,
            Math.cos(ph)*sp
        ));
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color',    new THREE.BufferAttribute(col, 3));

    const mat = new THREE.PointsMaterial({
        size: 0.055, vertexColors: true, transparent: true, opacity: 1,
        blending: THREE.AdditiveBlending, depthWrite: false
    });

    const pts = new THREE.Points(geo, mat);
    pts.userData.vels = vels;
    pts.userData.life = 1.0;
    scene.add(pts);
    return pts;
}

// ─── Impact trigger ───────────────────────────────────────────────────────────
function triggerImpact() {
    if (impactDone) return;
    impactDone = true;
    state = STATE.IMPACT;

    // Flash
    const flash = document.getElementById('impact-flash');
    flash.classList.add('active');
    setTimeout(() => flash.classList.remove('active'), 180);

    // SMASH text
    const smashEl = document.getElementById('smash-text');
    smashEl.classList.add('boom');
    setTimeout(() => smashEl.classList.remove('boom'), 900);


    // Camera shake
    shakeAmount = 0.6;

    // Create shards
    shards = shatterHeart(heartModel);
    shards.forEach(s => scene.add(s));
    heartModel.visible = false;

    // Burst particles
    burstPoints = createBurst(new THREE.Vector3(0, 0, 0));

    // Glow ring flash
    glowRing.material.opacity = 0.8;

    // After short impact frame, transition to SHATTERING
    setTimeout(() => { state = STATE.SHATTERING; }, 120);

    // Begin fade after shattering delay
    setTimeout(() => { state = STATE.FADING; fadeT = 0; }, 1600);
}

// ─── Start swing ─────────────────────────────────────────────────────────────
function startSwing() {
    if (state !== STATE.IDLE) return;
    state = STATE.SWINGING;
    swingT = 0;
    impactDone = false;
}

// Make skip / click handlers available globally
window.skipIntro = () => {
    document.getElementById('intro-screen').style.opacity = '0';
    document.getElementById('intro-screen').style.pointerEvents = 'none';
    document.getElementById('main-site').classList.add('visible');
    setTimeout(() => {
        document.getElementById('intro-screen').style.display = 'none';
    }, 800);
};

canvas.addEventListener('click', () => {
    if (state === STATE.IDLE) startSwing();
});
canvas.addEventListener('touchend', () => {
    if (state === STATE.IDLE) startSwing();
}, { passive: true });

document.getElementById('skip-btn').addEventListener('click', window.skipIntro);

// ─── Easing ───────────────────────────────────────────────────────────────────
function easeInCubic(t)  { return t * t * t; }
function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
function lerpEuler(a, b, t) {
    return new THREE.Euler(
        THREE.MathUtils.lerp(a.x, b.x, t),
        THREE.MathUtils.lerp(a.y, b.y, t),
        THREE.MathUtils.lerp(a.z, b.z, t)
    );
}

// ─── Animate loop ─────────────────────────────────────────────────────────────
let elapsed = 0;

renderer.setAnimationLoop(() => {
    const delta   = Math.min(clock.getDelta(), 0.05);
    elapsed      += delta;

    // Starfield gentle drift
    starfield.rotation.z += delta * 0.01;
    starfield.rotation.y += delta * 0.005;

    // ── IDLE ──
    if (state === STATE.IDLE && heartModel) {
        heartModel.rotation.z  = Math.sin(elapsed * 0.7) * 0.04;
        heartModel.position.y  = -0.45 + Math.sin(elapsed * 1.0) * 0.12;
        heartModel.position.x  = Math.sin(elapsed * 0.6) * 0.08;

        // פטיש מרחף קרוב ללב עם תנודה קטנה
        if (hammerModel) {
            const idleAngle = ANGLE_IDLE + Math.sin(elapsed * 1.0) * 0.04;
            hammerModel.position.copy(hammerFromAngle(idleAngle));
            hammerModel.rotation.set(0, Math.sin(elapsed * 0.6) * 0.06, idleAngle);
        }


        goldLight.intensity   = 3.5 + Math.sin(elapsed * 1.5) * 1.0;
        purpleLight.intensity = 2.5 + Math.cos(elapsed * 1.2) * 0.8;
        glowRing.material.opacity = 0.15 + Math.sin(elapsed * 1.8) * 0.08;
        glowRing.rotation.z += delta * 0.3;
    }

    // ── SWINGING ──
    if (state === STATE.SWINGING && hammerModel) {
        swingT += delta * 0.85;
        const t    = Math.min(swingT, 1);
        const ease = easeInCubic(t);

        // מיקום קבוע — רק rotation שמאלה (Z קטן → סיבוב שמאלה)
        hammerModel.position.copy(hammerFromAngle(ANGLE_IDLE));
        const rotTarget = 1.75;
        hammerModel.rotation.set(0, 0, THREE.MathUtils.lerp(ANGLE_IDLE, rotTarget, ease));

        if (heartModel) heartModel.position.x *= 0.94;
        if (t >= 1 && !impactDone) triggerImpact();
    }

    // ── SHATTERING ──
    if (state === STATE.SHATTERING) {
        shakeAmount *= 0.88;
        if (shakeAmount > 0.01) {
            camera.position.x = (Math.random() - 0.5) * shakeAmount;
            camera.position.y = 0.5 + (Math.random() - 0.5) * shakeAmount;
        } else {
            camera.position.x = 0;
            camera.position.y = 0.5;
        }

        // Update shards
        for (const s of shards) {
            s.userData.vel.y += s.userData.gravity ?? (-5 * delta);
            s.userData.vel.y -= 5 * delta;
            s.position.addScaledVector(s.userData.vel, delta);
            s.rotation.x += s.userData.angVel.x * delta;
            s.rotation.y += s.userData.angVel.y * delta;
            s.rotation.z += s.userData.angVel.z * delta;

            if (s.userData.life > 0) {
                s.userData.life -= delta * 0.6;
                if (s.material) {
                    s.material.opacity = Math.max(0, s.userData.life);
                }
            }
        }

        // Update burst
        if (burstPoints) {
            burstPoints.userData.life -= delta * 0.8;
            burstPoints.material.opacity = Math.max(0, burstPoints.userData.life);
            const pos = burstPoints.geometry.attributes.position;
            const vels = burstPoints.userData.vels;
            for (let i = 0; i < vels.length; i++) {
                vels[i].y -= 9 * delta;
                pos.array[i*3]   += vels[i].x * delta;
                pos.array[i*3+1] += vels[i].y * delta;
                pos.array[i*3+2] += vels[i].z * delta;
            }
            pos.needsUpdate = true;
        }

        // Glow ring fades
        glowRing.material.opacity = Math.max(0, glowRing.material.opacity - delta * 0.8);
    }

    // ── FADING ──
    if (state === STATE.FADING) {
        fadeT += delta * 1.5;
        const alpha = Math.min(fadeT, 1);
        const ease  = easeOutCubic(alpha);

        renderer.domElement.style.opacity = (1 - ease).toFixed(3);

        // Continue updating shards/burst while fading
        for (const s of shards) {
            s.userData.vel.y -= 5 * delta;
            s.position.addScaledVector(s.userData.vel, delta);
            s.rotation.x += s.userData.angVel.x * delta;
            s.rotation.y += s.userData.angVel.y * delta;
            s.rotation.z += s.userData.angVel.z * delta;
        }
        if (burstPoints) {
            const pos  = burstPoints.geometry.attributes.position;
            const vels = burstPoints.userData.vels;
            for (let i = 0; i < vels.length; i++) {
                vels[i].y -= 9 * delta;
                pos.array[i*3]   += vels[i].x * delta;
                pos.array[i*3+1] += vels[i].y * delta;
                pos.array[i*3+2] += vels[i].z * delta;
            }
            pos.needsUpdate = true;
        }

        if (alpha >= 1 && state !== STATE.DONE) {
            state = STATE.DONE;
            revealSite();
        }
    }

    renderer.render(scene, camera);
});

// ─── Reveal main site ─────────────────────────────────────────────────────────
function revealSite() {
    const intro = document.getElementById('intro-screen');
    intro.style.display = 'none';
    const main = document.getElementById('main-site');
    main.classList.add('visible');
    renderer.setAnimationLoop(null);
    dracoLoader.dispose();
    document.dispatchEvent(new CustomEvent('introComplete'));
}
