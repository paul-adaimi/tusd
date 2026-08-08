function readStdin() {
  return new Promise((resolve, reject) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (c) => (data += c));
    process.stdin.on("end", () => resolve(data));
    process.stdin.on("error", reject);
  });
}

async function main() {
  const DJANGO_API_URL = process.env.DJANGO_API_URL;
  const WEBHOOK_SECRET = process.env.TUSD_WEBHOOK_SECRET;

  const raw = await readStdin();
  let evt = {};
  try {
    evt = JSON.parse(raw);
  } catch {}

  // Same shape as post-finish-src.mjs: metadata lives under Event.Upload.MetaData.
  // bookTitle/itemIndex/bytesBeforeThisItem/orderBytesTotal are set once by
  // the app at upload-creation time (see UploadManager.swift's
  // Upload-Metadata) and replayed by tusd on every hook call for this
  // upload's lifetime — so this script never needs to track any state of
  // its own across calls, just relay tusd's own live Offset plus that
  // metadata.
  const upload = evt?.Event?.Upload;
  const meta = upload?.MetaData || {};
  const offset = upload?.Offset;

  const orderId = meta.orderId;
  const itemId = meta.itemId;

  if (!DJANGO_API_URL || !WEBHOOK_SECRET) {
    console.error("Missing DJANGO_API_URL/TUSD_WEBHOOK_SECRET env vars");
    process.stdout.write("{}");
    return;
  }

  if (!orderId || !itemId || offset === undefined) {
    console.error("Missing required metadata/offset", { orderId, itemId, offset });
    process.stdout.write("{}");
    return;
  }

  const body = {
    orderId,
    currentItemIndex: Number(meta.itemIndex || 0),
    currentItemTitle: meta.bookTitle || "",
    bytesSentOverall: Number(meta.bytesBeforeThisItem || 0) + Number(offset),
    bytesTotalOverall: Number(meta.orderBytesTotal || 0),
    status: "uploading",
  };

  try {
    await fetch(
      `${DJANGO_API_URL.replace(/\/$/, "")}/orders/live-activity-progress-webhook/`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Secret": WEBHOOK_SECRET,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(5000),
      },
    );
  } catch (e) {
    // Never let a failed/slow webhook call affect the actual upload —
    // this hook is purely informational.
    console.error("post-receive webhook failed", e);
  }

  process.stdout.write("{}");
}

main().catch((e) => {
  console.error("post-receive fatal", e);
  process.stdout.write("{}");
});
