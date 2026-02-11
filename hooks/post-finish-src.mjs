import {
  S3Client,
  CopyObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";

function readStdin() {
  return new Promise((resolve, reject) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (c) => (data += c));
    process.stdin.on("end", () => resolve(data));
    process.stdin.on("error", reject);
  });
}

function safe(s) {
  return String(s ?? "").replace(/[^a-zA-Z0-9._-]/g, "_");
}

function ensureZip(name) {
  if (!name) return "upload.zip";
  return name.toLowerCase().endsWith(".zip") ? name : `${name}.zip`;
}

async function main() {
  const BUCKET = process.env.B2_BUCKET;
  const ENDPOINT = process.env.B2_ENDPOINT;

  // Prefer AWS_* but fall back to your B2 vars if you use them
  const ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID || process.env.B2_KEY_ID;
  const SECRET_ACCESS_KEY =
    process.env.AWS_SECRET_ACCESS_KEY || process.env.B2_APP_KEY;
  const REGION = process.env.AWS_REGION || process.env.B2_REGION || "us-east-1";

  const raw = await readStdin();
  let evt = {};
  try {
    evt = JSON.parse(raw);
  } catch {}

  const uploadId = evt?.Upload?.ID || process.env.TUS_ID;
  const meta = evt?.Upload?.MetaData || {};

  console.error("META KEYS:", Object.keys(meta));
  console.error("META RAW:", meta);

  const orderId = safe(meta.orderId);
  const itemId = safe(meta.itemId);
  const filename = ensureZip(
    safe(meta.filename || meta.name || `${uploadId}.zip`),
  );

  if (!BUCKET || !ENDPOINT || !ACCESS_KEY_ID || !SECRET_ACCESS_KEY) {
    console.error("Missing S3/B2 env vars", {
      BUCKET: !!BUCKET,
      ENDPOINT: !!ENDPOINT,
      ACCESS_KEY_ID: !!ACCESS_KEY_ID,
      SECRET_ACCESS_KEY: !!SECRET_ACCESS_KEY,
    });
    process.stdout.write("{}");
    return;
  }

  if (!uploadId || !orderId || !itemId) {
    console.error("Missing required metadata", { uploadId, orderId, itemId });
    process.stdout.write("{}");
    return;
  }

  const sourceKey = `uploads/${uploadId}`;
  const destKey = `orders/${orderId}/${itemId}/${filename}`;

  const s3 = new S3Client({
    region: REGION,
    endpoint: ENDPOINT,
    forcePathStyle: true,
    credentials: {
      accessKeyId: ACCESS_KEY_ID,
      secretAccessKey: SECRET_ACCESS_KEY,
    },
  });

  try {
    await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: sourceKey }));

    await s3.send(
      new CopyObjectCommand({
        Bucket: BUCKET,
        CopySource: `/${BUCKET}/${sourceKey}`,
        Key: destKey,
        ContentType: "application/zip",
        ContentDisposition: `attachment; filename="${filename}"`,
        MetadataDirective: "COPY",
      }),
    );

    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: sourceKey }));

    console.error("Moved upload", { sourceKey, destKey });
  } catch (e) {
    console.error("post-finish move failed", e);
    // don't crash tusd; just exit cleanly
  }

  process.stdout.write("{}");
}

main().catch((e) => {
  console.error("post-finish fatal", e);
  process.stdout.write("{}");
});
