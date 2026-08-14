function cors() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST,OPTIONS"
  };
}

export async function onRequest(context) {
  if (context.request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: cors()
    });
  }

  try {
    const { url } = await context.request.json();

    const u = new URL(String(url || ""));

    if (!["http:", "https:"].includes(u.protocol)) {
      throw new Error("Only HTTP/HTTPS URLs are supported.");
    }

    const domain = u.hostname.toLowerCase();

    const output = {
      input: u.href,
      domain
    };

    const checks = await Promise.allSettled([
      fetch("https://checkurl.phishtank.com/checkurl/", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "ScamShield/1.0"
        },
        body: new URLSearchParams({
          url: u.href,
          format: "json"
        })
      }).then(response => response.json()),

      fetch(
        `https://rdap.org/domain/${encodeURIComponent(domain)}`,
        {
          headers: {
            "Accept": "application/rdap+json, application/json"
          }
        }
      ).then(response => {
        if (!response.ok) {
          throw new Error(`RDAP ${response.status}`);
        }

        return response.json();
      }),

      fetch(
        `https://crt.sh/?q=${encodeURIComponent("%." + domain)}&output=json`
      ).then(response => {
        if (!response.ok) {
          throw new Error(`crt.sh ${response.status}`);
        }

        return response.json();
      })
    ]);

    output.phishtank =
      checks[0].status === "fulfilled"
        ? checks[0].value
        : {
            error: String(
              checks[0].reason?.message || "Unavailable"
            )
          };

    output.rdap =
      checks[1].status === "fulfilled"
        ? checks[1].value
        : {
            error: String(
              checks[1].reason?.message || "Unavailable"
            )
          };

    output.certificates =
      checks[2].status === "fulfilled"
        ? checks[2].value.slice(0, 20)
        : {
            error: String(
              checks[2].reason?.message || "Unavailable"
            )
          };

    return new Response(
      JSON.stringify(output),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...cors()
        }
      }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error.message || "URL check failed"
      }),
      {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          ...cors()
        }
      }
    );
  }
  }
