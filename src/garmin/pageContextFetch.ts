export type PageFetchRequest = {
  url: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
  headers?: Record<string, string>;
  body?: string;
};

export type PageFetchResponse = {
  ok: boolean;
  status: number;
  body: string;
};

export async function pageContextFetch(req: PageFetchRequest): Promise<PageFetchResponse> {
  return new Promise((resolve, reject) => {
    const channel = new MessageChannel();
    channel.port1.onmessage = (event) => {
      const data = event.data as { ok: true; response: PageFetchResponse } | { ok: false; error: string };
      channel.port1.close();
      script.remove();
      if (data.ok) resolve(data.response);
      else reject(new Error(data.error));
    };

    const script = document.createElement("script");
    const serializedReq = JSON.stringify(req).replace(/<\/script/gi, "<\\/script");
    script.textContent = `
      (async () => {
        const port = (await new Promise(r => {
          window.addEventListener("message", function onMsg(e) {
            if (e.data === "gwg-port") {
              window.removeEventListener("message", onMsg);
              r(e.ports[0]);
            }
          });
        }));
        try {
          const req = ${serializedReq};
          const res = await fetch(req.url, {
            method: req.method,
            credentials: "include",
            headers: req.headers,
            body: req.body,
          });
          const body = await res.text();
          port.postMessage({ ok: true, response: { ok: res.ok, status: res.status, body } });
        } catch (e) {
          port.postMessage({ ok: false, error: String(e) });
        }
      })();
    `;
    document.documentElement.appendChild(script);
    window.postMessage("gwg-port", "*", [channel.port2]);
  });
}
