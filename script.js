// --------------------- Created By InCoder ---------------------
/* ====================================================
   QR Forge — script.js
   ==================================================== */

"use strict";

/* ── DOM refs ── */
const tabs = document.querySelectorAll(".tab");
const panels = document.querySelectorAll(".input-panel");
const generateBtn = document.getElementById("generateBtn");
const qrOutput = document.getElementById("qrOutput");
const qrPlaceholder = document.getElementById("qrPlaceholder");
const qrCanvasWrap = document.getElementById("qrCanvasWrap");
const qrCodeEl = document.getElementById("qrCodeEl");
const qrActions = document.getElementById("qrActions");
const historySection = document.getElementById("historySection");
const historyList = document.getElementById("historyList");
const toast = document.getElementById("toast");

/* ── customize ── */
const customToggle = document.getElementById("customToggle");
const customBody = document.getElementById("customBody");
const toggleArrow = document.getElementById("toggleArrow");
const fgColor = document.getElementById("fgColor");
const bgColor = document.getElementById("bgColor");
const fgHex = document.getElementById("fgHex");
const bgHex = document.getElementById("bgHex");
const qrSize = document.getElementById("qrSize");
const sizeVal = document.getElementById("sizeVal");

/* ── state ── */
let currentType = "text";
let currentQRText = "";
let qrInstance = null;
let history = JSON.parse(localStorage.getItem("qrHistory") || "[]");
let ecLevel = "L";
let wifiSecurity = "WPA";

/* ============================================================
   BACKGROUND CANVAS — particle grid
============================================================ */
(function initBG() {
  const canvas = document.getElementById("bgCanvas");
  const ctx = canvas.getContext("2d");
  const dots = [];
  const count = 80;

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener("resize", resize);

  for (let i = 0; i < count; i++) {
    dots.push({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      r: Math.random() * 1.5 + 0.5,
    });
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    dots.forEach((d) => {
      d.x += d.vx;
      d.y += d.vy;
      if (d.x < 0 || d.x > canvas.width) d.vx *= -1;
      if (d.y < 0 || d.y > canvas.height) d.vy *= -1;

      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0,229,255,0.5)";
      ctx.fill();
    });

    // connect nearby dots
    for (let i = 0; i < dots.length; i++) {
      for (let j = i + 1; j < dots.length; j++) {
        const dx = dots[i].x - dots[j].x;
        const dy = dots[i].y - dots[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120) {
          ctx.beginPath();
          ctx.moveTo(dots[i].x, dots[i].y);
          ctx.lineTo(dots[j].x, dots[j].y);
          ctx.strokeStyle = `rgba(0,229,255,${0.15 * (1 - dist / 120)})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }
    requestAnimationFrame(draw);
  }
  draw();
})();

/* ============================================================
   TABS
============================================================ */
tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    tabs.forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    currentType = tab.dataset.type;

    panels.forEach((p) => p.classList.remove("active"));
    const target = document.querySelector(
      `.input-panel[data-panel="${currentType}"]`,
    );
    if (target) target.classList.add("active");

    resetOutput();
  });
});

/* ============================================================
   CUSTOMIZE TOGGLE
============================================================ */
customToggle.addEventListener("click", () => {
  customBody.classList.toggle("open");
  toggleArrow.classList.toggle("open");
});

/* ── color pickers ── */
fgColor.addEventListener("input", () => {
  fgHex.textContent = fgColor.value.toUpperCase();
  if (currentQRText) regenerate();
});
bgColor.addEventListener("input", () => {
  bgHex.textContent = bgColor.value.toUpperCase();
  if (currentQRText) regenerate();
});

/* ── size slider ── */
qrSize.addEventListener("input", () => {
  const v = qrSize.value;
  sizeVal.textContent = v;
  const pct = (((v - 128) / (512 - 128)) * 100).toFixed(1) + "%";
  qrSize.style.setProperty("--pct", pct);
  if (currentQRText) regenerate();
});
// init slider fill
qrSize.style.setProperty("--pct", "33%");

/* ── error correction ── */
document.getElementById("ecLevel").addEventListener("click", (e) => {
  const seg = e.target.closest(".seg");
  if (!seg) return;
  document
    .querySelectorAll("#ecLevel .seg")
    .forEach((s) => s.classList.remove("active"));
  seg.classList.add("active");
  ecLevel = seg.dataset.val;
  if (currentQRText) regenerate();
});

/* ── wifi security ── */
document.getElementById("wifiSecurity").addEventListener("click", (e) => {
  const seg = e.target.closest(".seg");
  if (!seg) return;
  document
    .querySelectorAll("#wifiSecurity .seg")
    .forEach((s) => s.classList.remove("active"));
  seg.classList.add("active");
  wifiSecurity = seg.dataset.val;
});

/* ── wifi eye ── */
document.getElementById("wifiEye").addEventListener("click", () => {
  const wifiPass = document.getElementById("wifiPass");
  const eye = document.querySelector("#wifiEye i");
  if (wifiPass.type === "password") {
    wifiPass.type = "text";
    eye.className = "fa-solid fa-eye-slash";
  } else {
    wifiPass.type = "password";
    eye.className = "fa-solid fa-eye";
  }
});

/* ============================================================
   CHAR COUNTERS
============================================================ */
document.getElementById("textInput").addEventListener("input", function () {
  document.getElementById("textCount").textContent = this.value.length;
});
document.getElementById("smsBody").addEventListener("input", function () {
  document.getElementById("smsCount").textContent = this.value.length;
});

/* ============================================================
   BUILD QR STRING
============================================================ */
function buildQRString(type) {
  switch (type) {
    case "text": {
      const v = document.getElementById("textInput").value.trim();
      return v || null;
    }
    case "url": {
      const v = document.getElementById("urlInput").value.trim();
      if (!v) return null;
      return v.startsWith("http") ? v : "https://" + v;
    }
    case "email": {
      const to = document.getElementById("emailTo").value.trim();
      const sub = document.getElementById("emailSubject").value.trim();
      const body = document.getElementById("emailBody").value.trim();
      if (!to) return null;
      const params = new URLSearchParams();
      if (sub) params.set("subject", sub);
      if (body) params.set("body", body);
      const qs = params.toString();
      return `mailto:${to}${qs ? "?" + qs : ""}`;
    }
    case "phone": {
      const v = document
        .getElementById("phoneInput")
        .value.trim()
        .replace(/\s/g, "");
      return v ? `tel:${v}` : null;
    }
    case "sms": {
      const phone = document
        .getElementById("smsPhone")
        .value.trim()
        .replace(/\s/g, "");
      const msg = document.getElementById("smsBody").value.trim();
      if (!phone) return null;
      return `SMSTO:${phone}:${msg}`;
    }
    case "wifi": {
      const ssid = document.getElementById("wifiSSID").value.trim();
      const pass = document.getElementById("wifiPass").value;
      if (!ssid) return null;
      // WPA2 format: WIFI:T:WPA;S:ssid;P:pass;;
      const escaped = (s) => s.replace(/[\\;,":]/g, (c) => "\\" + c);
      if (wifiSecurity === "nopass")
        return `WIFI:T:nopass;S:${escaped(ssid)};;`;
      return `WIFI:T:${wifiSecurity};S:${escaped(ssid)};P:${escaped(pass)};;`;
    }
    case "vcard": {
      const first = document.getElementById("vcFirst").value.trim();
      const last = document.getElementById("vcLast").value.trim();
      const phone = document.getElementById("vcPhone").value.trim();
      const email = document.getElementById("vcEmail").value.trim();
      const org = document.getElementById("vcOrg").value.trim();
      const url = document.getElementById("vcUrl").value.trim();
      if (!first && !last) return null;
      let vc = "BEGIN:VCARD\nVERSION:3.0\n";
      vc += `FN:${first} ${last}\n`;
      vc += `N:${last};${first};;;\n`;
      if (phone) vc += `TEL:${phone}\n`;
      if (email) vc += `EMAIL:${email}\n`;
      if (org) vc += `ORG:${org}\n`;
      if (url) vc += `URL:${url}\n`;
      vc += "END:VCARD";
      return vc;
    }
    case "upi": {
      const id = document.getElementById("upiId").value.trim();
      const name = document.getElementById("upiName").value.trim();
      const amount = document.getElementById("upiAmount").value.trim();
      const note = document.getElementById("upiNote").value.trim();
      if (!id) return null;
      const params = new URLSearchParams({ pa: id });
      if (name) params.set("pn", name);
      if (amount) params.set("am", amount);
      if (note) params.set("tn", note);
      params.set("cu", "INR");
      return `upi://pay?${params.toString()}`;
    }
    default:
      return null;
  }
}

/* ============================================================
   GENERATE QR
============================================================ */
generateBtn.addEventListener("click", () => {
  const text = buildQRString(currentType);
  if (!text) {
    showToast("Please fill the required fields first.", "error");
    shakeBtn();
    return;
  }
  currentQRText = text;
  renderQR(text);
});

function regenerate() {
  if (currentQRText) renderQR(currentQRText);
}

function renderQR(text) {
  generateBtn.classList.add("loading");

  setTimeout(() => {
    qrCodeEl.innerHTML = "";
    qrInstance = null;

    const size = parseInt(qrSize.value);
    const ecMap = {
      L: QRCode.CorrectLevel.L,
      M: QRCode.CorrectLevel.M,
      Q: QRCode.CorrectLevel.Q,
      H: QRCode.CorrectLevel.H,
    };

    try {
      qrInstance = new QRCode(qrCodeEl, {
        text: text,
        width: size,
        height: size,
        colorDark: fgColor.value,
        colorLight: bgColor.value,
        correctLevel: ecMap[ecLevel] || QRCode.CorrectLevel.L,
      });
    } catch (e) {
      showToast(
        "Could not generate QR. Try a shorter input or lower error correction.",
        "error",
      );
      generateBtn.classList.remove("loading");
      return;
    }

    // show QR
    qrPlaceholder.style.display = "none";
    qrCanvasWrap.classList.add("visible");
    qrOutput.classList.add("has-qr");
    qrActions.classList.add("visible");

    generateBtn.classList.remove("loading");

    // save history
    setTimeout(() => {
      const img = qrCodeEl.querySelector("img");
      const src = img ? img.src : "";
      saveHistory(text, currentType, src);
    }, 300);

    showToast("QR code generated!", "success");
  }, 350);
}

/* ============================================================
   RESET OUTPUT
============================================================ */
function resetOutput() {
  currentQRText = "";
  qrCodeEl.innerHTML = "";
  qrPlaceholder.style.display = "";
  qrCanvasWrap.classList.remove("visible");
  qrOutput.classList.remove("has-qr");
  qrActions.classList.remove("visible");
}

/* ============================================================
   SHAKE ANIMATION
============================================================ */
function shakeBtn() {
  generateBtn.style.animation = "none";
  generateBtn.offsetHeight; // reflow
  generateBtn.style.animation = "shake 0.4s ease";
  setTimeout(() => (generateBtn.style.animation = ""), 400);
}
const shakeKF = document.createElement("style");
shakeKF.textContent = `@keyframes shake {
  0%,100%{transform:translateX(0)}20%{transform:translateX(-6px)}40%{transform:translateX(6px)}60%{transform:translateX(-4px)}80%{transform:translateX(4px)}
}`;
document.head.appendChild(shakeKF);

/* ============================================================
   DOWNLOAD PNG
============================================================ */
document.getElementById("downloadPNG").addEventListener("click", () => {
  const img = qrCodeEl.querySelector("img");
  const canvas = qrCodeEl.querySelector("canvas");

  if (canvas) {
    const link = document.createElement("a");
    link.download = `qrforge-${currentType}-${Date.now()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    showToast("PNG downloaded!", "success");
  } else if (img) {
    const link = document.createElement("a");
    link.download = `qrforge-${currentType}-${Date.now()}.png`;
    link.href = img.src;
    link.click();
    showToast("PNG downloaded!", "success");
  }
});

/* ============================================================
   DOWNLOAD SVG
============================================================ */
document.getElementById("downloadSVG").addEventListener("click", () => {
  if (!currentQRText) return;
  const size = parseInt(qrSize.value);
  // Build a minimal SVG using QR matrix
  // We'll use the canvas pixel data to reconstruct
  const canvas = qrCodeEl.querySelector("canvas");
  if (!canvas) {
    showToast("SVG not available for this QR. Try regenerating.", "error");
    return;
  }

  const ctx = canvas.getContext("2d");
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const moduleCount = Math.round(Math.sqrt(canvas.width * canvas.height));
  const cellSize = canvas.width / moduleCount;

  let svgRects = "";
  for (let row = 0; row < moduleCount; row++) {
    for (let col = 0; col < moduleCount; col++) {
      const px = Math.floor(col * cellSize);
      const py = Math.floor(row * cellSize);
      const idx = (py * canvas.width + px) * 4;
      const r = data.data[idx],
        g = data.data[idx + 1],
        b = data.data[idx + 2];
      const isDark = r + g + b < 382;
      if (isDark) {
        svgRects += `<rect x="${col}" y="${row}" width="1" height="1" fill="${fgColor.value}"/>`;
      }
    }
  }
  const svgStr = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${moduleCount} ${moduleCount}" width="${size}" height="${size}" shape-rendering="crispEdges">
<rect width="${moduleCount}" height="${moduleCount}" fill="${bgColor.value}"/>
${svgRects}
</svg>`;

  const blob = new Blob([svgStr], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.download = `qrforge-${currentType}-${Date.now()}.svg`;
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
  showToast("SVG downloaded!", "success");
});

/* ============================================================
   COPY TO CLIPBOARD
============================================================ */
document.getElementById("copyBtn").addEventListener("click", async () => {
  const canvas = qrCodeEl.querySelector("canvas");
  const img = qrCodeEl.querySelector("img");

  try {
    if (canvas) {
      canvas.toBlob(async (blob) => {
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": blob }),
        ]);
        showToast("Copied to clipboard!", "success");
        pulseBtn(document.getElementById("copyBtn"));
      });
    } else if (img) {
      const res = await fetch(img.src);
      const blob = await res.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);
      showToast("Copied to clipboard!", "success");
      pulseBtn(document.getElementById("copyBtn"));
    }
  } catch {
    showToast("Copy not supported in this browser.", "error");
  }
});

function pulseBtn(btn) {
  btn.classList.add("success");
  setTimeout(() => btn.classList.remove("success"), 1500);
}

/* ============================================================
   SHARE
============================================================ */
document.getElementById("shareBtn").addEventListener("click", async () => {
  const canvas = qrCodeEl.querySelector("canvas");
  const img = qrCodeEl.querySelector("img");

  if (navigator.share) {
    try {
      let file;
      if (canvas) {
        const blob = await new Promise((res) => canvas.toBlob(res));
        file = new File([blob], "qrcode.png", { type: "image/png" });
      } else if (img) {
        const res = await fetch(img.src);
        const blob = await res.blob();
        file = new File([blob], "qrcode.png", { type: "image/png" });
      }
      await navigator.share({ files: [file], title: "QR Code from QR Forge" });
    } catch {
      showToast("Share cancelled.", "");
    }
  } else {
    showToast("Share not supported. Try Copy instead.", "error");
  }
});

/* ============================================================
   HISTORY
============================================================ */
function saveHistory(text, type, imgSrc) {
  const label = text.length > 40 ? text.slice(0, 37) + "…" : text;
  const entry = { id: Date.now(), label, type, text, imgSrc };
  history = [entry, ...history.filter((h) => h.text !== text)].slice(0, 8);
  localStorage.setItem("qrHistory", JSON.stringify(history));
  renderHistory();
}

function renderHistory() {
  if (history.length === 0) {
    historySection.classList.remove("visible");
    return;
  }
  historySection.classList.add("visible");
  historyList.innerHTML = "";
  history.forEach((item) => {
    const div = document.createElement("div");
    div.className = "history-item";
    div.innerHTML = `
      <img src="${item.imgSrc}" alt="QR" onerror="this.style.display='none'"/>
      <div class="history-item-info">
        <div class="history-item-label">${escHtml(item.label)}</div>
        <div class="history-item-type">${item.type}</div>
      </div>
      <button class="history-item-del" data-id="${item.id}" title="Remove"><i class="fa-solid fa-xmark"></i></button>
    `;
    div.addEventListener("click", (e) => {
      if (e.target.closest(".history-item-del")) return;
      reloadFromHistory(item);
    });
    div.querySelector(".history-item-del").addEventListener("click", (e) => {
      e.stopPropagation();
      removeHistory(item.id);
    });
    historyList.appendChild(div);
  });
}

function reloadFromHistory(item) {
  // switch tab
  tabs.forEach((t) => {
    t.classList.toggle("active", t.dataset.type === item.type);
  });
  panels.forEach((p) => {
    p.classList.toggle("active", p.dataset.panel === item.type);
  });
  currentType = item.type;
  currentQRText = item.text;
  renderQR(item.text);
}

function removeHistory(id) {
  history = history.filter((h) => h.id !== id);
  localStorage.setItem("qrHistory", JSON.stringify(history));
  renderHistory();
}

document.getElementById("clearHistory").addEventListener("click", () => {
  history = [];
  localStorage.removeItem("qrHistory");
  renderHistory();
  showToast("History cleared.", "");
});

function escHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* ============================================================
   TOAST
============================================================ */
let toastTimer;
function showToast(msg, type = "") {
  toast.textContent = msg;
  toast.className = "toast show " + type;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2800);
}

/* ============================================================
   INIT
============================================================ */
renderHistory();

// allow Enter key to trigger generate (except textarea)
document.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && e.target.tagName !== "TEXTAREA") {
    generateBtn.click();
  }
});
