const $ = selector => document.querySelector(selector);
const $$ = selector => document.querySelectorAll(selector);

let mode = "message";

const config = {
  message: {
    label: "MESSAGE ANALYZER",
    title: "Paste the message you don't trust.",
    note: "Runs local pattern analysis first.",
    placeholder:
      "Example: Your account will be blocked today. Verify your OTP immediately at https://...",
  },

  url: {
    label: "LINK INTELLIGENCE",
    title: "Paste the link before you open it.",
    note: "Local URL signals run before external intelligence.",
    placeholder: "https://example.com/verify",
  },

  phone: {
    label: "PHONE INTELLIGENCE",
    title: "Check an unknown caller.",
    note: "Number format is checked locally first.",
    placeholder: "+91 98765 43210",
  }
};

function escapeHtml(value) {
  return String(value).replace(
    /[&<>"']/g,
    character =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      })[character]
  );
}

const esc = escapeHtml;

function renderInput() {
  const current = config[mode];

  $("#modeLabel").textContent = current.label;
  $("#modeTitle").textContent = current.title;
  $("#submitNote").textContent = current.note;

  if (mode === "message") {
    $("#inputWrap").innerHTML = `
      <textarea
        id="scanInput"
        class="input"
        maxlength="5000"
        placeholder="${current.placeholder}"
      ></textarea>
    `;
  } else {
    $("#inputWrap").innerHTML = `
      <input
        id="scanInput"
        class="input single"
        type="${mode === "phone" ? "tel" : "url"}"
        autocomplete="off"
        placeholder="${current.placeholder}"
      >
    `;
  }

  $("#counter").textContent =
    mode === "message"
      ? "0 / 5,000"
      : "";

  renderChips();
}

function renderChips() {
  const examples = {
    message: [
      [
        "Urgency",
        "Your account will be closed in 24 hours"
      ],
      [
        "OTP request",
        "Send your OTP to verify"
      ],
      [
        "Prize",
        "Congratulations! You won ₹50,000"
      ]
    ],

    url: [
      [
        "Phishing",
        "https://secure-account-verify.example/login"
      ],
      [
        "Short link",
        "https://bit.ly/example"
      ]
    ],

    phone: [
      [
        "India",
        "+91 98765 43210"
      ],
      [
        "International",
        "+1 202 555 0184"
      ]
    ]
  };

  $("#smartChips").innerHTML =
    (examples[mode] || [])
      .map(
        ([name, value]) => `
          <button
            class="smart-chip"
            data-fill="${esc(value)}"
          >
            ${esc(name)}
          </button>
        `
      )
      .join("");
}

renderInput();

$$(".scan-tab").forEach(button => {
  button.addEventListener("click", () => {
    $$(".scan-tab").forEach(tab =>
      tab.classList.remove("active")
    );

    button.classList.add("active");

    mode = button.dataset.mode;

    $("#result").classList.add("hidden");

    renderInput();
  });
});

document.addEventListener("input", event => {
  if (
    event.target.id === "scanInput" &&
    mode === "message"
  ) {
    $("#counter").textContent =
      `${event.target.value.length.toLocaleString()} / 5,000`;
  }
});

document.addEventListener("click", event => {
  const fillButton =
    event.target.closest("[data-fill]");

  if (fillButton) {
    $("#scanInput").value =
      fillButton.dataset.fill;

    $("#scanInput").dispatchEvent(
      new Event("input")
    );

    $("#scanInput").focus();
  }

  const jump =
    event.target.closest("[data-jump]");

  if (jump) {
    event.preventDefault();

    document
      .querySelector(jump.dataset.jump)
      ?.scrollIntoView({
        behavior: "smooth"
      });
  }

  const detected =
    event.target.closest("[data-open-url]");

  if (detected) {
    event.preventDefault();

    switchToMode("url");

    $("#scanInput").value =
      detected.dataset.openUrl;

    urlCheck();
  }
});

$("#analyze").addEventListener("click", () => {
  if (mode === "message") {
    messageCheck();
  }

  if (mode === "url") {
    urlCheck();
  }

  if (mode === "phone") {
    phoneCheck();
  }
});

function switchToMode(nextMode) {
  mode = nextMode;

  $$(".scan-tab").forEach(tab => {
    tab.classList.toggle(
      "active",
      tab.dataset.mode === nextMode
    );
  });

  renderInput();

  $("#result").classList.add("hidden");
}

/* -------------------------------------------------------
   MESSAGE ANALYSIS
------------------------------------------------------- */

function messageCheck() {
  const text = $("#scanInput").value.trim();

  if (!text) {
    alert("Paste a message first.");
    return;
  }

  const content = text.toLowerCase();

  const rules = [
    [
      /\b(otp|one[- ]time password|verification code)\b/,
      "Requests an OTP or verification code.",
      28
    ],

    [
      /\b(pin|cvv|cvc|password|passcode)\b/,
      "Mentions sensitive authentication information such as a PIN, CVV or password.",
      28
    ],

    [
      /\b(immediately|urgent|act now|last warning|final notice|within\s+\d+\s*(hour|hours|minute|minutes)|today only)\b/,
      "Creates urgency or a deadline to pressure you.",
      20
    ],

    [
      /\b(block(ed|ing)?|suspend(ed|ing)?|freeze|terminate|legal action|police case)\b/,
      "Uses a threat involving account suspension, closure or legal consequences.",
      17
    ],

    [
      /\b(prize|lottery|winner|won|reward|cashback|refund|gift|lucky draw)\b/,
      "Promises unexpected money, a prize, reward or refund.",
      20
    ],

    [
      /\b(bank|sbi|hdfc|icici|axis|rbi|income tax|customs|police|government|courier|fedex|dhl|amazon|flipkart|paytm|phonepe|google pay|gpay)\b/,
      "May be impersonating a bank, government body, delivery service or major brand.",
      12
    ],

    [
      /\b(click|tap|verify|confirm|update|kyc|reactivate|unlock)\b.{0,90}\b(link|url|account|details|otp)?/,
      "Pushes you toward an immediate verification or account action.",
      12
    ],

    [
      /\b(send|pay|transfer|deposit)\b.{0,90}\b(rs\.?|₹|inr|rupees|upi|account|fee|charge)\b/,
      "Requests a payment or transfer.",
      18
    ]
  ];

  let score = 0;
  const reasons = [];

  rules.forEach(rule => {
    if (rule[0].test(content)) {
      score += rule[2];
      reasons.push(rule[1]);
    }
  });

  const urls =
    text.match(
      /\bhttps?:\/\/[^\s<>"']+/gi
    ) || [];

  if (urls.length) {
    score += 8;

    reasons.push(
      `Contains ${urls.length} URL${
        urls.length > 1 ? "s" : ""
      } that should be checked separately.`
    );
  }

  score = Math.min(score, 98);

  const verdict =
    score >= 55
      ? "HIGH RISK"
      : score >= 25
      ? "CAUTION"
      : "LOW RISK";

  const extra =
    urls.length > 0
      ? `
        <div class="detected">
          <h4>DETECTED LINKS</h4>

          ${urls
            .map(
              url => `
                <button
                  class="detected-link"
                  data-open-url="${esc(url)}"
                >
                  ${esc(url.slice(0, 65))} ↗
                </button>
              `
            )
            .join("")}
        </div>
      `
      : "";

  showResult(
    verdict,
    score,
    reasons,
    extra
  );
}

/* -------------------------------------------------------
   LOCAL URL ANALYSIS
------------------------------------------------------- */

function localUrlAnalysis(raw) {
  let url;

  try {
    url = new URL(raw);
  } catch {
    return {
      error:
        "Enter a complete URL such as https://example.com"
    };
  }

  if (
    !["http:", "https:"].includes(
      url.protocol
    )
  ) {
    return {
      error:
        "Only HTTP and HTTPS links are supported."
    };
  }

  const domain =
    url.hostname.toLowerCase();

  let score = 0;
  const reasons = [];

  if (url.protocol === "http:") {
    score += 8;
    reasons.push(
      "Uses HTTP instead of HTTPS."
    );
  }

  if (
    /^(\d{1,3}\.){3}\d{1,3}$/.test(domain)
  ) {
    score += 28;

    reasons.push(
      "Uses an IP address instead of a normal domain name."
    );
  }

  if (domain.includes("xn--")) {
    score += 25;

    reasons.push(
      "Uses punycode, which can hide lookalike characters."
    );
  }

  if (/[^\x00-\x7F]/.test(domain)) {
    score += 20;

    reasons.push(
      "Contains non-ASCII domain characters."
    );
  }

  if (domain.split(".").length > 4) {
    score += 12;

    reasons.push(
      "Has an unusually deep subdomain structure."
    );
  }

  if (
    (url.href.match(
      /%[0-9a-f]{2}/gi
    ) || []).length > 4
  ) {
    score += 12;

    reasons.push(
      "Contains substantial URL encoding or obfuscation."
    );
  }

  if (
    /(login|verify|secure|account|wallet|payment|refund|bonus|gift|claim|update|kyc)/i.test(
      url.pathname + url.search
    )
  ) {
    score += 7;

    reasons.push(
      "Uses words commonly found in account or payment lures."
    );
  }

  return {
    url: url.href,
    domain,
    score: Math.min(score, 90),
    reasons
  };
}

/* -------------------------------------------------------
   URL INTELLIGENCE
------------------------------------------------------- */

async function urlCheck() {
  const raw = $("#scanInput").value.trim();

  if (!raw) {
    alert("Paste a URL first.");
    return;
  }

  const local =
    localUrlAnalysis(raw);

  if (local.error) {
    showResult(
      "UNVERIFIED",
      0,
      [local.error]
    );

    return;
  }

  busy(true);

  try {
    const response =
      await fetch("/api/url", {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json"
        },
        body: JSON.stringify({
          url: local.url
        })
      });

    const data =
      await response.json();

    if (!response.ok) {
      throw new Error(
        data.error ||
        "URL intelligence unavailable."
      );
    }

    let score = local.score;

    const reasons = [
      ...local.reasons
    ];

    let intelligenceAvailable = false;

    /* PhishTank */

    if (
      data.phishtank?.available
    ) {
      intelligenceAvailable = true;

      const result =
        data.phishtank;

      const phishData =
        result.results ||
        result;

      if (
        phishData.in_database &&
        phishData.valid
      ) {
        score =
          Math.min(
            99,
            score + 70
          );

        reasons.unshift(
          "PhishTank reports this URL as a verified phishing entry."
        );
      } else {
        reasons.push(
          "No verified PhishTank phishing match was returned."
        );
      }
    } else {
      reasons.push(
        "PhishTank intelligence was unavailable."
      );
    }

    /* RDAP */

    if (data.rdap?.available) {
      intelligenceAvailable = true;

      const registration =
        data.rdap.registrationDate;

      if (registration) {
        const ageDays =
          Math.max(
            0,
            Math.floor(
              (Date.now() -
                new Date(registration).getTime()) /
                86400000
            )
          );

        if (ageDays < 30) {
          score =
            Math.min(
              95,
              score + 20
            );

          reasons.push(
            `Domain registration appears very recent (${ageDays} days).`
          );
        } else {
          const months =
            Math.floor(
              ageDays / 30
            );

          reasons.push(
            `Domain registration appears older than ${months} month${
              months === 1 ? "" : "s"
            }.`
          );
        }
      } else {
        reasons.push(
          "Domain registration date could not be verified."
        );
      }
    } else {
      reasons.push(
        "Domain registration intelligence was unavailable."
      );
    }

    /* Redirects */

    const redirects =
      data.redirects;

    let finalUrl =
      local.url;

    if (
      redirects?.finalUrl
    ) {
      finalUrl =
        redirects.finalUrl;

      if (
        finalUrl !== local.url
      ) {
        score =
          Math.min(
            95,
            score + 8
          );

        reasons.push(
          `The URL redirects to ${finalUrl}.`
        );
      }

      if (
        redirects.count >= 3
      ) {
        score =
          Math.min(
            95,
            score + 8
          );

        reasons.push(
          `The link passes through ${redirects.count} redirects.`
        );
      }

      if (
        redirects.error
      ) {
        reasons.push(
          `Redirect inspection stopped: ${redirects.error}`
        );
      }
    } else {
      reasons.push(
        "Redirect destination could not be verified."
      );
    }

    /* Certificates */

    if (
      data.certificates?.available
    ) {
      intelligenceAvailable = true;

      const count =
        Number(
          data.certificates.count
        );

      if (
        Number.isFinite(count) &&
        count > 0
      ) {
        reasons.push(
          `Certificate transparency returned ${count} certificate record${
            count === 1 ? "" : "s"
          }.`
        );
      }
    } else {
      reasons.push(
        "Certificate transparency data was unavailable."
      );
    }

    /*
     * A low local score + zero external intelligence
     * must not become a misleading "Safe" result.
     */

    let verdict;

    if (
      score >= 55
    ) {
      verdict = "HIGH RISK";
    } else if (
      score >= 25
    ) {
      verdict = "CAUTION";
    } else if (
      intelligenceAvailable
    ) {
      verdict = "LOW RISK";
    } else {
      verdict = "UNVERIFIED";
    }

    const extra = `
      <div class="detected">

        <h4>DOMAIN</h4>

        <strong>
          ${esc(local.domain)}
        </strong>

        <p>
          ${
            finalUrl !== local.url
              ? `Final destination: ${esc(finalUrl)}`
              : "No alternate final destination was detected."
          }
        </p>

        <p>
          External intelligence is supplemental.
          Missing data is not proof of safety.
        </p>

      </div>
    `;

    showResult(
      verdict,
      score,
      reasons,
      extra
    );
  } catch (error) {
    showResult(
      "UNVERIFIED",
      local.score,
      [
        ...local.reasons,
        "Live reputation intelligence could not be reached.",
        "This link could not be fully verified."
      ],
      `
        <div class="detected">
          <h4>UNVERIFIED</h4>
          <p>
            No reliable external verdict was available.
            Do not treat this result as proof that the URL is safe.
          </p>
        </div>
      `
    );
  } finally {
    busy(false);
  }
}

/* -------------------------------------------------------
   PHONE INTELLIGENCE
------------------------------------------------------- */

async function phoneCheck() {
  const raw =
    $("#scanInput").value.trim();

  if (!raw) {
    alert(
      "Enter a phone number first."
    );

    return;
  }

  const digits =
    raw.replace(/\D/g, "");

  if (
    digits.length < 8 ||
    digits.length > 15
  ) {
    showResult(
      "UNVERIFIED",
      0,
      [
        "The number format does not look valid."
      ]
    );

    return;
  }

  busy(true);

  try {
    const response =
      await fetch("/api/phone", {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json"
        },
        body: JSON.stringify({
          number: raw,
          country: "IN"
        })
      });

    const data =
      await response.json();

    if (!response.ok) {
      throw new Error(
        data.error ||
        "Phone intelligence unavailable."
      );
    }

    let verdict =
      "UNVERIFIED";

    let score = 0;

    const reasons = [];

    const provider =
      data.providerResults
        ?.callTracer;

    const lookup =
      data.lookup || {};

    const reports =
      lookup.reports || {};

    const spamScore =
      Number(
        reports.spam_score
      );

    if (
      Number.isFinite(spamScore)
    ) {
      score =
        Math.min(
          95,
          spamScore
        );

      if (
        spamScore >= 70
      ) {
        verdict =
          "HIGH RISK";
      } else if (
        spamScore >= 35
      ) {
        verdict =
          "CAUTION";
      } else {
        verdict =
          "LOW RISK";
      }

      reasons.push(
        `Community spam signal: ${spamScore}/100.`
      );
    } else {
      reasons.push(
        "No community spam score was available."
      );
    }

    if (
      reports.total != null
    ) {
      reasons.push(
        `${reports.total} community report${
          reports.total === 1
            ? ""
            : "s"
        } were returned.`
      );
    }

    if (
      lookup.carrier
    ) {
      reasons.push(
        `Carrier: ${lookup.carrier}.`
      );
    }

    if (
      lookup.number_type
    ) {
      reasons.push(
        `Line type: ${lookup.number_type}.`
      );
    }

    if (
      lookup.location
    ) {
      reasons.push(
        `Location: ${lookup.location}.`
      );
    }

    if (
      data.status ===
      "unverified"
    ) {
      verdict =
        "UNVERIFIED";

      score = 0;

      reasons.push(
        "The external phone intelligence provider was unavailable."
      );
    }

    const providerStatus =
      provider?.available
        ? "External provider responded."
        : "External provider unavailable.";

    reasons.push(
      providerStatus
    );

    showResult(
      verdict,
      score,
      reasons,
      `
        <div class="detected">

          <h4>NUMBER</h4>

          <strong>
            ${esc(
              data.number || raw
            )}
          </strong>

          ${
            lookup.carrier
              ? `<p>Carrier: ${esc(
                  lookup.carrier
                )}</p>`
              : ""
          }

          ${
            lookup.number_type
              ? `<p>Line type: ${esc(
                  lookup.number_type
                )}</p>`
              : ""
          }

          ${
            lookup.location
              ? `<p>Location: ${esc(
                  lookup.location
                )}</p>`
              : ""
          }

          <p>
            Community/carrier information
            is not verified identity.
          </p>

        </div>
      `
    );
  } catch (error) {
    showResult(
      "UNVERIFIED",
      0,
      [
        error.message ||
          "Phone intelligence is unavailable.",
        "No conclusion should be drawn from unavailable lookup data."
      ]
    );
  } finally {
    busy(false);
  }
}

/* -------------------------------------------------------
   UI
------------------------------------------------------- */

function busy(isBusy) {
  $("#analyze").disabled =
    isBusy;

  $("#analyze").innerHTML =
    isBusy
      ? "Checking…"
      : 'Analyze <span>→</span>';
}

function showResult(
  verdict,
  score,
  reasons,
  extra = ""
) {
  const className =
    verdict === "HIGH RISK"
      ? "high"
      : verdict === "CAUTION"
      ? "caution"
      : verdict === "LOW RISK"
      ? "low"
      : "unknown";

  const safeReasons =
    reasons.length
      ? reasons
      : [
          "No strong scam pattern was detected."
        ];

  $("#result").innerHTML = `
    <div class="result-head">

      <div class="verdict-wrap">

        <i
          class="verdict-dot ${className}"
        ></i>

        <div>

          <h3>
            ${verdict}
          </h3>

          <div class="verdict-score">
            Risk signal score · ${score}/100
          </div>

        </div>

      </div>

      <div
        class="score-ring ${className}"
      >
        ${score}
      </div>

    </div>

    ${
      extra
        ? `
          <div class="result-body">
            ${extra}
          </div>
        `
        : ""
    }

    <div class="result-body">

      <h4>
        WHY THIS RESULT
      </h4>

      <ul>

        ${safeReasons
          .map(
            reason =>
              `<li>${esc(
                reason
              )}</li>`
          )
          .join("")}

      </ul>

    </div>

    <div class="result-actions">

      <a
        href="#report"
        class="${
          verdict === "HIGH RISK"
            ? "danger"
            : ""
        }"
      >
        What should I do? →
      </a>

    </div>
  `;

  $("#result")
    .classList
    .remove("hidden");

  $("#result").scrollIntoView({
    behavior: "smooth",
    block: "nearest"
  });
   }
