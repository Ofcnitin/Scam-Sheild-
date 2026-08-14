const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST,OPTIONS"
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...CORS
    }
  });
}

function normalizeNumber(input) {
  const raw = String(input || "").trim();
  const digits = raw.replace(/\D/g, "");

  if (digits.length < 8 || digits.length > 15) {
    return null;
  }

  return {
    raw,
    digits
  };
}

async function callTracerLookup(number) {
  try {
    /*
     * Provider adapter.
     *
     * Keep this isolated so the provider can be replaced
     * without changing the Scam Shield frontend.
     */
    const response = await fetch(
      `https://calltracer.io/api/lookup/${encodeURIComponent(number)}`,
      {
        headers: {
          Accept: "application/json",
          "User-Agent": "ScamShield/1.0"
        }
      }
    );

    if (!response.ok) {
      throw new Error(
        `Provider returned HTTP ${response.status}`
      );
    }

    return {
      available: true,
      provider: "CallTracer",
      data: await response.json()
    };
  } catch (error) {
    return {
      available: false,
      provider: "CallTracer",
      error: error.message || "Provider unavailable"
    };
  }
}

function buildSignals(lookup) {
  const data = lookup?.data || {};
  const reports = data.reports || {};

  const signals = [];

  const spamScore = Number(reports.spam_score);

  if (Number.isFinite(spamScore)) {
    if (spamScore >= 70) {
      signals.push({
        type: "danger",
        text: `High community spam signal (${spamScore}/100).`
      });
    } else if (spamScore >= 35) {
      signals.push({
        type: "warning",
        text: `Moderate community spam signal (${spamScore}/100).`
      });
    } else {
      signals.push({
        type: "positive",
        text: `Low community spam signal (${spamScore}/100).`
      });
    }
  }

  if (reports.total != null) {
    signals.push({
      type: "info",
      text: `${reports.total} community report${
        reports.total === 1 ? "" : "s"
      } returned by the provider.`
    });
  }

  if (data.carrier) {
    signals.push({
      type: "info",
      text: `Carrier: ${data.carrier}.`
    });
  }

  if (data.number_type) {
    signals.push({
      type: "info",
      text: `Line type: ${data.number_type}.`
    });
  }

  if (data.location) {
    signals.push({
      type: "info",
      text: `Location: ${data.location}.`
    });
  }

  return signals;
}

export async function onRequest(context) {
  if (context.request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: CORS
    });
  }

  if (context.request.method !== "POST") {
    return json(
      {
        error: "Method not allowed."
      },
      405
    );
  }

  try {
    const body = await context.request.json();
    const number = normalizeNumber(body?.number);

    if (!number) {
      return json(
        {
          error:
            "Enter a valid phone number with 8–15 digits."
        },
        400
      );
    }

    const lookup = await callTracerLookup(number.digits);

    /*
     * Important:
     * No provider response = UNKNOWN.
     * We never convert missing intelligence into "Safe".
     */
    if (!lookup.available) {
      return json({
        number: number.raw,
        digits: number.digits,
        status: "unverified",
        providerResults: {
          callTracer: lookup
        },
        signals: [
          {
            type: "unknown",
            text:
              "No external phone intelligence was available."
          }
        ],
        disclaimer:
          "Community and carrier information is not verified identity."
      });
    }

    const signals = buildSignals(lookup);

    const spamScore = Number(
      lookup.data?.reports?.spam_score
    );

    let risk = "unknown";

    if (Number.isFinite(spamScore)) {
      if (spamScore >= 70) {
        risk = "high";
      } else if (spamScore >= 35) {
        risk = "caution";
      } else {
        risk = "low";
      }
    }

    return json({
      number: number.raw,
      digits: number.digits,

      status: "verified-source",
      risk,

      providerResults: {
        callTracer: lookup
      },

      lookup: lookup.data || {},

      signals,

      disclaimer:
        "Community/carrier-sourced information is not verified identity and is not proof of fraud."
    });
  } catch (error) {
    return json(
      {
        status: "unverified",
        error:
          error?.message ||
          "Phone intelligence check failed.",
        disclaimer:
          "No conclusion should be drawn from unavailable lookup data."
      },
      500
    );
  }
}
