// ===== CONFIGURATION =====
// Paste the PRODUCTION webhook URL from the n8n Webhook node (not the "test" URL).
const N8N_WEBHOOK_URL = "PASTE_PRODUCTION_WEBHOOK_URL_HERE";
// =========================

const form = document.getElementById("bookingForm");
const btn = document.getElementById("submitBtn");
const statusEl = document.getElementById("formStatus");
const menu = document.getElementById("menu");
const burger = document.getElementById("burger");
let busy = false;

burger.addEventListener("click", () => {
  const open = menu.classList.toggle("open");
  burger.setAttribute("aria-expanded", String(open));
});
menu.querySelectorAll("a").forEach(a => a.addEventListener("click", () => {
  menu.classList.remove("open"); burger.setAttribute("aria-expanded", "false");
}));

document.getElementById("date").min = new Date().toISOString().slice(0, 10);

function setErr(id, msg) {
  document.getElementById("err-" + id).textContent = msg;
  document.getElementById(id).setAttribute("aria-invalid", msg ? "true" : "false");
}
function setStatus(msg, kind) { statusEl.textContent = msg; statusEl.className = "status " + (kind || ""); }

function validate(d) {
  let ok = true;
  const digits = d.phone.replace(/\D/g, "");
  const checks = {
    name: d.name.length < 2 ? "Enter your full name." : "",
    phone: !/^\+?[0-9\s()\-]+$/.test(d.phone) || digits.length < 10 || digits.length > 15 ? "Enter a valid phone number, for example +7 700 000 00 00." : "",
    email: d.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.email) ? "Enter a valid email address or leave it empty." : "",
    service: !d.service ? "Choose a service." : ""
  };
  for (const k in checks) { setErr(k, checks[k]); if (checks[k]) ok = false; }
  return ok;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (busy) return; // prevent duplicate submissions
  const f = new FormData(form);
  const data = Object.fromEntries([...f.entries()].map(([k, v]) => [k, String(v).trim()]));
  setStatus("");
  if (!validate(data)) { setStatus("Please fix the highlighted fields.", "bad"); return; }
  if (N8N_WEBHOOK_URL.startsWith("PASTE_")) { setStatus("Booking is not connected yet: webhook URL is not configured.", "bad"); return; }

  busy = true; btn.disabled = true; btn.textContent = "Sending…"; setStatus("Sending your request…");
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20000);
  try {
    const res = await fetch(N8N_WEBHOOK_URL, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data), signal: ctrl.signal
    });
    let json = {};
    try { json = await res.json(); } catch (_) {}
    if (res.ok && json.success) {
      setStatus(json.message || "Your booking request has been received!", "ok");
      form.reset();
    } else if (res.status === 400 && json.message) {
      setStatus(json.message, "bad");
    } else {
      setStatus("We could not send your request. Please try again or call us.", "bad");
    }
  } catch (err) {
    setStatus("Connection problem. Check your internet and try again.", "bad");
  } finally {
    clearTimeout(timer); busy = false; btn.disabled = false; btn.textContent = "Send booking request";
  }
});
