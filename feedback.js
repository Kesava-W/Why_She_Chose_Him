/*
 * Feedback popup for a static story site.
 * Adds a floating "Feedback" button and a popup with quick-pick pills that
 * autofill the text box. Submissions are sent through Web3Forms, which emails them.
 *
 * Usage: <script src="feedback.js" data-story="Story Title"></script>
 * Any element with a data-feedback attribute also opens the popup.
 */
(function () {
    "use strict";

    var ACCESS_KEY = "d2a22cf0-d7cb-49f6-a463-71d922e0a86e";
    var ENDPOINT = "https://api.web3forms.com/submit";

    var script = document.currentScript;
    var STORY = (script && script.getAttribute("data-story")) || document.title;

    // Each pill autofills its text into the message box. The reader can edit it freely.
    var PILLS = [
        { label: "Loved it", text: "I loved this." },
        { label: "Great characters", text: "The characters really work for me." },
        { label: "Gripping plot", text: "The plot kept me hooked." },
        { label: "Want more", text: "I want to read more of this." },
        { label: "Confusing", text: "Some parts were confusing." },
        { label: "Too slow", text: "The pacing felt slow in places." },
        { label: "Typo / error", text: "I spotted a typo or mistake:" },
        { label: "My theory", text: "My theory is:" }
    ];

    function chapterLabel() {
        var file = new URLSearchParams(window.location.search).get("file");
        if (!file) return "";
        var m = file.match(/^chapter(\d+)(?:_(\d+))?$/i);
        if (m) return "Chapter " + m[1] + (m[2] ? "." + m[2] : "");
        return file;
    }

    var css = [
        ".fb-open{position:fixed;right:18px;bottom:18px;z-index:1000;display:flex;align-items:center;gap:8px;",
        "padding:12px 18px;border:none;border-radius:999px;background:#111827;color:#fff;font:bold 15px Georgia,serif;",
        "cursor:pointer;box-shadow:0 8px 24px rgba(0,0,0,.3);transition:background .2s,transform .2s}",
        ".fb-open:hover{background:#2563eb;transform:translateY(-2px)}",
        ".fb-open svg{width:18px;height:18px;fill:currentColor}",
        ".fb-overlay{position:fixed;inset:0;z-index:2000;display:none;align-items:center;justify-content:center;",
        "padding:16px;background:rgba(17,24,39,.6)}",
        ".fb-overlay.fb-show{display:flex}",
        ".fb-card{box-sizing:border-box;position:relative;width:100%;max-width:520px;max-height:92vh;overflow-y:auto;padding:28px;",
        "border-radius:14px;background:#fff;color:#333;font-family:Georgia,serif;line-height:1.5;",
        "box-shadow:0 20px 60px rgba(0,0,0,.35);animation:fb-pop .2s ease-out}",
        "@keyframes fb-pop{from{opacity:0;transform:translateY(12px) scale(.98)}to{opacity:1;transform:none}}",
        "@media (prefers-reduced-motion:reduce){.fb-card{animation:none}.fb-open{transition:none}}",
        ".fb-close{position:absolute;top:10px;right:12px;width:34px;height:34px;border:none;border-radius:50%;",
        "background:transparent;color:#6b7280;font-size:24px;line-height:1;cursor:pointer}",
        ".fb-close:hover{background:#f3f4f6;color:#111827}",
        ".fb-card h2{margin:0 0 4px;color:#111827;font-size:1.4rem}",
        ".fb-sub{margin:0 0 18px;color:#6b7280;font-size:.95rem}",
        ".fb-label{display:block;margin:14px 0 8px;color:#111827;font-weight:bold;font-size:.95rem}",
        ".fb-hint{font-weight:normal;color:#6b7280}",
        ".fb-pills{display:flex;flex-wrap:wrap;gap:8px}",
        ".fb-pill{padding:8px 14px;border:1px solid #d1d5db;border-radius:999px;background:#f3f4f6;color:#111827;",
        "font:14px Georgia,serif;cursor:pointer;transition:background .15s,border-color .15s,color .15s}",
        ".fb-pill:hover{border-color:#2563eb}",
        ".fb-pill[aria-pressed=true]{background:#2563eb;border-color:#2563eb;color:#fff}",
        ".fb-card textarea,.fb-card input[type=text],.fb-card input[type=email]{width:100%;padding:10px 12px;",
        "border:1px solid #d1d5db;border-radius:8px;background:#fff;color:#111827;font:15px Georgia,serif;box-sizing:border-box}",
        ".fb-card textarea{min-height:120px;resize:vertical}",
        ".fb-card textarea:focus,.fb-card input:focus,.fb-pill:focus-visible,.fb-open:focus-visible,.fb-close:focus-visible,",
        ".fb-send:focus-visible{outline:2px solid #2563eb;outline-offset:2px}",
        ".fb-row{display:flex;gap:10px}",
        ".fb-row>div{flex:1;min-width:0}",
        ".fb-send{width:100%;margin-top:18px;padding:13px;border:none;border-radius:8px;background:#2563eb;color:#fff;",
        "font:bold 16px Georgia,serif;cursor:pointer}",
        ".fb-send:hover{background:#1d4ed8}",
        ".fb-send:disabled{opacity:.6;cursor:default}",
        ".fb-error{margin:12px 0 0;padding:10px 12px;border-radius:8px;background:#fef2f2;color:#b91c1c;font-size:.9rem}",
        ".fb-done{padding:24px 0 8px;text-align:center}",
        ".fb-done h2{margin-bottom:8px}",
        ".fb-hp{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden}",
        "@media (max-width:560px){.fb-overlay{align-items:flex-end;padding:0}",
        ".fb-card{max-width:none;border-radius:14px 14px 0 0;padding:22px 18px}",
        ".fb-row{flex-direction:column}}"
    ].join("");

    var style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);

    var openBtn = document.createElement("button");
    openBtn.type = "button";
    openBtn.className = "fb-open";
    openBtn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 3h16a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 1-2z"/></svg><span>Feedback</span>';

    var overlay = document.createElement("div");
    overlay.className = "fb-overlay";
    overlay.innerHTML =
        '<div class="fb-card" role="dialog" aria-modal="true" aria-labelledby="fb-title">' +
        '<button type="button" class="fb-close" aria-label="Close">&times;</button>' +
        '<div class="fb-body">' +
        '<h2 id="fb-title">Share your thoughts</h2>' +
        '<p class="fb-sub"></p>' +
        '<form novalidate>' +
        '<span class="fb-label">Tap what fits <span class="fb-hint">(optional)</span></span>' +
        '<div class="fb-pills"></div>' +
        '<label class="fb-label" for="fb-message">Your feedback</label>' +
        '<textarea id="fb-message" maxlength="3000" placeholder="Type here, or tap a pill above to start." required></textarea>' +
        '<span class="fb-label">Want a reply? <span class="fb-hint">(optional)</span></span>' +
        '<div class="fb-row">' +
        '<div><input type="text" id="fb-name" maxlength="80" placeholder="Your name" autocomplete="name" aria-label="Your name"></div>' +
        '<div><input type="email" id="fb-email" maxlength="120" placeholder="Your email" autocomplete="email" aria-label="Your email"></div>' +
        '</div>' +
        '<div class="fb-hp" aria-hidden="true"><label>Leave this empty<input type="text" id="fb-hp" tabindex="-1" autocomplete="off"></label></div>' +
        '<div class="fb-error" role="alert" hidden></div>' +
        '<button type="submit" class="fb-send">Send feedback</button>' +
        '</form>' +
        '</div>' +
        '</div>';

    var card = overlay.querySelector(".fb-card");
    var body = overlay.querySelector(".fb-body");
    var sub = overlay.querySelector(".fb-sub");
    var form = overlay.querySelector("form");
    var pillBox = overlay.querySelector(".fb-pills");
    var message = overlay.querySelector("#fb-message");
    var nameInput = overlay.querySelector("#fb-name");
    var emailInput = overlay.querySelector("#fb-email");
    var honeypot = overlay.querySelector("#fb-hp");
    var errorBox = overlay.querySelector(".fb-error");
    var sendBtn = overlay.querySelector(".fb-send");
    var closeBtn = overlay.querySelector(".fb-close");
    var lastFocus = null;
    // Holds the form nodes while the thank-you screen is showing, so the popup can be reused.
    var holder = document.createDocumentFragment();

    function appendText(text) {
        var v = message.value.replace(/\s+$/, "");
        message.value = v ? v + " " + text : text;
    }

    function removeText(text) {
        message.value = message.value.replace(text, "").replace(/ {2,}/g, " ").trim();
    }

    PILLS.forEach(function (p) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "fb-pill";
        b.textContent = p.label;
        b.setAttribute("aria-pressed", "false");
        b.addEventListener("click", function () {
            var on = b.getAttribute("aria-pressed") !== "true";
            b.setAttribute("aria-pressed", on ? "true" : "false");
            if (on) appendText(p.text); else removeText(p.text);
        });
        pillBox.appendChild(b);
    });

    function selectedPills() {
        return Array.prototype.filter.call(pillBox.children, function (b) {
            return b.getAttribute("aria-pressed") === "true";
        }).map(function (b) { return b.textContent; });
    }

    function context() {
        var ch = chapterLabel();
        return ch ? STORY + " - " + ch : STORY;
    }

    function openPopup() {
        lastFocus = document.activeElement;
        sub.textContent = context();
        overlay.classList.add("fb-show");
        document.body.style.overflow = "hidden";
        var target = body.querySelector("textarea") || closeBtn;
        target.focus();
    }

    function closePopup() {
        overlay.classList.remove("fb-show");
        document.body.style.overflow = "";
        if (!body.contains(form)) resetForm();
        if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    function showError(text) {
        errorBox.textContent = text;
        errorBox.hidden = false;
    }

    function showDone() {
        body.innerHTML =
            '<div class="fb-done"><h2>Thank you!</h2>' +
            '<p class="fb-sub">Your feedback has been sent. Every message is read.</p>' +
            '<button type="button" class="fb-send fb-finish">Close</button></div>';
        body.querySelector(".fb-finish").addEventListener("click", closePopup);
        body.querySelector(".fb-finish").focus();
    }

    function resetForm() {
        message.value = "";
        nameInput.value = "";
        emailInput.value = "";
        honeypot.value = "";
        Array.prototype.forEach.call(pillBox.children, function (b) { b.setAttribute("aria-pressed", "false"); });
        errorBox.hidden = true;
        sendBtn.disabled = false;
        sendBtn.textContent = "Send feedback";
        if (!body.contains(form)) {
            body.innerHTML = "";
            while (holder.firstChild) body.appendChild(holder.firstChild);
        }
    }

    function submit(e) {
        e.preventDefault();
        errorBox.hidden = true;

        var text = message.value.trim();
        if (!text) {
            showError("Please write a message or tap a pill first.");
            message.focus();
            return;
        }
        var email = emailInput.value.trim();
        if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
            showError("That email address doesn't look right. Leave it empty if you don't want a reply.");
            emailInput.focus();
            return;
        }

        // Bots fill hidden fields; pretend it worked and send nothing.
        if (honeypot.value) {
            swapToDone();
            return;
        }

        var ch = chapterLabel();
        var payload = {
            access_key: ACCESS_KEY,
            subject: "Feedback - " + STORY + " - " + (ch || "Home page"),
            from_name: STORY + " Feedback",
            story: STORY,
            chapter: ch || "Home page",
            reactions: selectedPills().join(", ") || "(none)",
            message: text,
            page: window.location.href
        };
        var name = nameInput.value.trim();
        if (name) payload.name = name;
        if (email) payload.email = email;

        sendBtn.disabled = true;
        sendBtn.textContent = "Sending...";

        fetch(ENDPOINT, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Accept": "application/json" },
            body: JSON.stringify(payload)
        })
            .then(function (r) { return r.json(); })
            .then(function (d) {
                if (d && d.success) {
                    swapToDone();
                } else {
                    throw new Error((d && d.message) || "Send failed");
                }
            })
            .catch(function () {
                sendBtn.disabled = false;
                sendBtn.textContent = "Send feedback";
                showError("Sorry, that didn't go through. Please try again in a moment.");
            });
    }

    function swapToDone() {
        // Move the live form nodes out of the way instead of destroying them.
        while (body.firstChild) holder.appendChild(body.firstChild);
        showDone();
    }

    form.addEventListener("submit", submit);
    closeBtn.addEventListener("click", closePopup);
    overlay.addEventListener("mousedown", function (e) {
        if (e.target === overlay) closePopup();
    });
    document.addEventListener("keydown", function (e) {
        if (!overlay.classList.contains("fb-show")) return;
        if (e.key === "Escape") { closePopup(); return; }
        if (e.key !== "Tab") return;
        var f = card.querySelectorAll("button:not([disabled]),textarea,input:not([tabindex='-1'])");
        if (!f.length) return;
        var first = f[0];
        var last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });

    document.addEventListener("click", function (e) {
        var t = e.target.closest ? e.target.closest("[data-feedback]") : null;
        if (t) {
            e.preventDefault();
            openPopup();
        }
    });
    openBtn.addEventListener("click", openPopup);

    function mount() {
        document.body.appendChild(openBtn);
        document.body.appendChild(overlay);
    }
    if (document.body) mount(); else document.addEventListener("DOMContentLoaded", mount);
})();
