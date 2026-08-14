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

function isBlockedHostname(hostname) {
  const host = hostname.toLowerCase().replace(/\.$/, "");

  const blocked = [
    "localhost",
    "localhost.localdomain",
    "0.0.0.0",
    "127.0.0.1",
    "::1",
    "metadata.google.internal",
    "metadata.google.internal."
  ];

  if (blocked.includes(host)) return true;

  // IPv4 literals
  const parts = host.split(".");
  if (parts.length === 4 && parts.every(x => /^\d+$/.test(x))) {
    const [a, b] = parts.map(Number);

    if (
      a === 10 ||
      a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168)
    ) {
      return true;
    }
  }

  // Common private / loopback IPv6 forms
  if (
    host.startsWith("fc") ||
    host.startsWith("fd") ||
    host === "::1" ||
    host.startsWith("fe80:")
  ) {
    return true;
  }

  return false;
}

async function fetchRedirectChain(startUrl) {
  const chain = [];
  let current = startUrl;

  for (let i = 0; i < 6; i++) {
    const response = await fetch(current, {
      method: "GET",
      redirect: "manual",
      headers: {
        "User-Agent": "ScamShield/1.0"
      }
    });

    const location = response.headers.get("Location");

    chain.push({
      url: current,
      status: response.status,
      location: location || null
    });

    if (!location) {
      return {
        finalUrl: current,
        chain,
        count: chain.length - 1
      };
    }

    let next;

    try {
      next = new URL(location, current);
    } catch {
      return {
        finalUrl: current,
        chain,
        count: chain.length - 1,
        error: "Invalid redirect destination."
      };
    }

    if (!["http:", "https:"].includes(next.protocol)) {
      return {
        finalUrl: current,
        chain,
        count: chain.length - 1,
        error: "Redirected to a non-web protocol."
      };
    }

    if (isBlockedHostname(next.hostname)) {
      return {
        finalUrl: current,
        chain,
        count: chain.length - 1,
        error: "Redirect destination was blocked for safety."
      };
    }

    current = next.href;
  }

  return {
    finalUrl: current,
    chain,
    count: 5,
    error: "Redirect chain exceeded the safety limit."
  };
}

async function phishTankCheck(url) {
  try {
    const response = await fetch(
      "https://checkurl.phishtank.com/checkurl/",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/x-www-form-urlencoded",
          "User-Agent": "ScamShield/1.0"
        },
        body: new URLSearchParams({
          url,
          format: "json"
        })
      }
    );

    if (!response.ok) {
      throw new Error(`PhishTank HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    return {
      available: false,
      error: error.message
    };
  }
}

async function rdapCheck(domain) {
  try {
    const response = await fetch(
      `https://rdap.org/domain/${encodeURIComponent(domain)}`,
      {
        headers: {
          "Accept": "application/rdap+json, application/json"
        }
      }
    );

    if (!response.ok) {
      throw new Error(`RDAP HTTP ${response.status}`);
    }

    const data = await response.json();

    const registrationEvent = Array.isArray(data.events)
      ? data.events.find(
          event => event.eventAction === "registration"
        )
      : null;

    return {
      available: true,
      registrationDate:
        registrationEvent?.eventDate || null,
      events: data.events || [],
      status: data.status || [],
      nameservers:
        Array.isArray(data.nameservers)
          ? data.nameservers
              .map(x => x.ldhName)
              .filter(Boolean)
          : []
    };
  } catch (error) {
    return {
      available: false,
      error: error.message
    };
  }
}

async function certificateCheck(domain) {
  try {
    const response = await fetch(
      `https://crt.sh/?q=${encodeURIComponent(
        "%." + domain
      )}&output=json`,
      {
        headers: {
          "User-Agent": "ScamShield/1.0"
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Certificate lookup HTTP ${response.status}`);
    }

    const data = await response.json();

    const certificates = Array.isArray(data)
      ? data.slice(0, 20).map(cert => ({
          issuer: cert.issuer_name || null,
          name: cert.name_value || null,
          notBefore: cert.not_before || null,
          notAfter: cert.not_after || null
        }))
      : [];

    return {
      available: true,
      count: Array.isArray(data) ? data.length : 0,
      certificates
    };
  } catch (error) {
    return {
      available: false,
      error: error.message
    };
  }
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
    const input = String(body?.url || "").trim();

    if (!input) {
      return json(
        {
          error: "URL is required."
        },
        400
      );
    }

    let parsed;

    try {
      parsed = new URL(input);
    } catch {
      return json(
        {
          error: "Invalid URL."
        },
        400
      );
    }

    if (!["http:", "https:"].includes(parsed.protocol)) {
      return json(
        {
          error: "Only HTTP and HTTPS URLs are supported."
        },
        400
      );
    }

    if (isBlockedHostname(parsed.hostname)) {
      return json(
        {
          error:
            "This destination cannot be inspected."
        },
        400
      );
    }

    const normalizedUrl = parsed.href;
    const domain = parsed.hostname.toLowerCase();

    const results = await Promise.allSettled([
      phishTankCheck(normalizedUrl),
      rdapCheck(domain),
      certificateCheck(domain),
      fetchRedirectChain(normalizedUrl)
    ]);

    const value = index =>
      results[index].status === "fulfilled"
        ? results[index].value
        : {
            available: false,
            error: String(
              results[index].reason?.message ||
                "Unavailable"
            )
          };

    return json({
      input: normalizedUrl,
      domain,

      phishtank: value(0),
      rdap: value(1),
      certificates: value(2),
      redirects: value(3),

      checkedAt: new Date().toISOString(),

      disclaimer:
        "External intelligence is supplemental. Missing data does not mean a URL is safe."
    });
  } catch (error) {
    return json(
      {
        error:
          error?.message ||
          "URL intelligence check failed."
      },
      500
    );
  }
}
