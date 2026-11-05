This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Profile icon uploads

The profile icon is uploaded straight from the browser to the object storage behind the CDN with a presigned URL:

1. `POST /api/user/icon/prepare` validates the file, computes its SHA-256, decides the storage path (`u/profiles/{id}/avatar.png`) and returns a presigned `PUT` URL plus a signed intent.
2. The browser `PUT`s the file to the presigned URL.
3. `POST /api/user/icon/complete` sends the intent's path, hash, type and size to the API's `POST /upload/verify`, which re-hashes the stored object, and then sets the photo URL to `${CDN_URL}/u/profiles/{id}/avatar.png?v=<first 16 hex digits of the SHA-256>`.
4. `GET /api/users/{id}/avatar` checks the stored file through the API's `GET /upload/verify` on every request and serves it from the CDN only when it is still valid.

Set `STORAGE_ENDPOINT` (the S3-compatible endpoint), `STORAGE_BUCKET`, `STORAGE_ACCESS_KEY_ID` and `STORAGE_SECRET_ACCESS_KEY`. The access key needs object write access to the bucket.

### Bucket CORS

Because the browser uploads directly to the bucket, its CORS policy must allow `PUT` from this app's origins. In the Cloudflare dashboard, open the bucket, go to **Settings → CORS Policy**, and add:

```json
[
  {
    "AllowedOrigins": ["https://<this app's production origin>", "https://<this app's preview origin>", "http://localhost:3001"],
    "AllowedMethods": ["PUT"],
    "AllowedHeaders": ["content-type"],
    "MaxAgeSeconds": 3600
  }
]
```

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
