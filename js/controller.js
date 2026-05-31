/**
 * About section — controller.glb floating 3D model
 * Default: gentle float in all directions
 * Long press (300ms): free rotation via pointer drag
 */

import * as THREE from 'three';
import { GLTFLoader }  from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

const canvas = document.getElementById('controller-canvas');
if (!canvas) throw new Error('controller-canvas not found');

// ── Renderer ──────────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace  = THREE.SRGBColorSpace;
renderer.toneMapping       = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;

const scene  = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
camera.position.set(0, 0, 4.5);

// ── Lights ────────────────────────────────────────────────────
scene.add(new THREE.AmbientLight(0xffffff, 0.8));

const keyLight = new THREE.DirectionalLight(0xffffff, 1.8);
keyLight.position.set(3, 4, 3);
scene.add(keyLight);

const accentLight = new THREE.PointLight(0xA855F7, 2.5, 25);
accentLight.position.set(-2, -1, 3);
scene.add(accentLight);

const rimLight = new THREE.PointLight(0xD4AF37, 1.5, 20);
rimLight.position.set(2, -2, -1);
scene.add(rimLight);

// ── Resize ────────────────────────────────────────────────────
function resize() {
    const frame = canvas.parentElement;
    if (!frame) return;
    const w = frame.clientWidth  || 300;
    const h = frame.clientHeight || 300;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
}
resize();
new ResizeObserver(resize).observe(canvas.parentElement);

// ── Load model ────────────────────────────────────────────────
const draco = new DRACOLoader();
draco.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
draco.preload();

const loader = new GLTFLoader();
loader.setDRACOLoader(draco);

let model = null;
const clock = new THREE.Clock();

loader.load('models/controller.glb', (gltf) => {
    model = gltf.scene;

    // Scale + centre
    const box = new THREE.Box3().setFromObject(model);
    const sz  = new THREE.Vector3();
    box.getSize(sz);
    const scale = 2.2 / Math.max(sz.x, sz.y, sz.z);
    model.scale.setScalar(scale);

    const centre = new THREE.Vector3();
    box.getCenter(centre);
    model.position.sub(centre.multiplyScalar(scale));

    model.traverse(c => {
        if (c.isMesh) {
            c.castShadow = true;
            if (c.material) { c.material.metalness = 0.3; c.material.roughness = 0.4; }
        }
    });

    scene.add(model);
}, undefined, (err) => console.warn('controller.glb:', err));

// ── Interaction: long-press → free rotation with momentum ────
let isRotating  = false;
let longPressId = null;
let lastX = 0, lastY = 0;
let dragRotX = 0, dragRotY = 0;
let velX = 0, velY = 0;          // אינרציה
const DAMPING  = 0.90;            // כמה מהר עוצרת האינרציה
const LERP     = 0.07;            // חלקות סיבוב בזמן גרירה

const hint = document.getElementById('controller-hint');

function startPress(x, y) {
    lastX = x; lastY = y;
    velX = 0; velY = 0;
    // הסתר רמז בלחיצה ראשונה
    if (hint) hint.classList.add('hidden');
    longPressId = setTimeout(() => {
        isRotating = true;
        canvas.style.cursor = 'grabbing';
        if (model) { dragRotX = model.rotation.x; dragRotY = model.rotation.y; }
    }, 280);
}

function movePress(x, y) {
    if (!isRotating) return;
    const dx = (x - lastX) * 0.010;
    const dy = (y - lastY) * 0.010;
    velX = dy;   // X rotation from vertical drag
    velY = dx;   // Y rotation from horizontal drag
    dragRotX += velX;
    dragRotY += velY;
    lastX = x; lastY = y;
}

function endPress() {
    clearTimeout(longPressId);
    // momentum continues in animate loop
    isRotating = false;
    canvas.style.cursor = '';
}

canvas.style.touchAction = 'none';
canvas.addEventListener('pointerdown',  e => { canvas.setPointerCapture(e.pointerId); startPress(e.clientX, e.clientY); });
canvas.addEventListener('pointermove',  e => movePress(e.clientX, e.clientY));
canvas.addEventListener('pointerup',    endPress);
canvas.addEventListener('pointercancel', endPress);
canvas.addEventListener('contextmenu',  e => e.preventDefault());

// ── Animate ───────────────────────────────────────────────────
renderer.setAnimationLoop(() => {
    const t = clock.getElapsedTime();

    // Update accent light colour from CSS variable
    const cssColor = getComputedStyle(document.documentElement)
        .getPropertyValue('--purple').trim();
    if (cssColor) {
        accentLight.color.set(cssColor);
    }

    if (model) {
        if (isRotating) {
            // גרירה חלקה — lerp נמוך לתחושת משקל
            model.rotation.x += (dragRotX - model.rotation.x) * LERP;
            model.rotation.y += (dragRotY - model.rotation.y) * LERP;
        } else {
            // אינרציה: המשך סיבוב אחרי שחרור
            if (Math.abs(velX) > 0.0002 || Math.abs(velY) > 0.0002) {
                dragRotX += velX;
                dragRotY += velY;
                velX *= DAMPING;
                velY *= DAMPING;
                model.rotation.x += (dragRotX - model.rotation.x) * LERP;
                model.rotation.y += (dragRotY - model.rotation.y) * LERP;
            } else {
                // ריחוף עדין
                velX = 0; velY = 0;
                // מחזיר בהדרגה לרוטציה הדיפולטית
                dragRotX += (0 - dragRotX) * 0.015;
                dragRotY += (0 - dragRotY) * 0.015;
                model.position.y = Math.sin(t * 0.55) * 0.14;
                model.position.x = Math.sin(t * 0.38) * 0.09;
                model.rotation.y = dragRotY + Math.sin(t * 0.30) * 0.10;
                model.rotation.z = Math.sin(t * 0.45) * 0.04;
                model.rotation.x = dragRotX;
            }
        }
    }

    renderer.render(scene, camera);
});
