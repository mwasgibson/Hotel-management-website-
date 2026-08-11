const { S3Client } = require('@aws-sdk/client-s3');

// Cloudflare R2 is S3-compatible — same SDK as AWS S3, just a different
// endpoint and region: 'auto' is R2's required value, not a real AWS region.
const r2 = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
});

const BUCKET = process.env.R2_BUCKET_NAME;

module.exports = { r2, BUCKET };