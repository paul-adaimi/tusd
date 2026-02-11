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

const BUCKET = process.env.B2_BUCKET; // same as tusd -s3-bucket
const ENDPOINT = process.env.B2_ENDPOINT; // https://s3.<region>.backblazeb2.com
const REGION = process.env.AWS_REGION || "us-east-1"; // B2 often uses e.g. us-east-005 (set it!)
const ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;

const raw = await readStdin();
let evt = {};
try {
  evt = JSON.parse(raw);
} catch {}

const uploadId = evt?.Upload?.ID || process.env.TUS_ID; // fallback
const meta = evt?.Upload?.MetaData || {};

const orderId = safe(meta.orderId);
const itemId = safe(meta.itemId);
const filename = ensureZip(
  safe(meta.filename || meta.name || `${uploadId}.zip`),
);

if (!BUCKET || !ENDPOINT || !ACCESS_KEY_ID || !SECRET_ACCESS_KEY) {
  console.error("Missing S3/B2 env vars");
  console.log("{}");
  process.exit(0);
}

if (!uploadId || !orderId || !itemId) {
  console.error("Missing required metadata", { uploadId, orderId, itemId });
  console.log("{}");
  process.exit(0);
}

// tusd stored the object under: uploads/<uploadId> (because you use -s3-object-prefix=uploads/)
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
  // ensure source exists (sometimes helpful)
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
  // do NOT crash tusd: just log and exit
}

console.log("{}");
