# Deployment Guide: GEM Dashboard on Vercel

This guide addresses your concerns about deploying a **Next.js + FastAPI** application with **Scheduled Tasks** and a **Database** to a serverless platform like Vercel.

## 1. Architecture Strategy

### Concerns & Solutions
1.  **Frontend & Backend Bundle?**
    *   **Solution**: Keep them in the same repo (Monorepo). Vercel is smart enough to deploy the Next.js frontend to its Edge Network and the FastAPI backend to Serverless Functions.
    *   **Configuration**: We will add a `vercel.json` to tell Vercel how to route traffic.

2.  **Running at a Given Hour (Scheduling)?**
    *   **Concern**: A 24/7 server waiting for 4:00 PM is a waste of resources.
    *   **Vercel Limitation**: You cannot use `APScheduler` (background threads) in Serverless Functions because they "freeze" or shut down immediately after a response is sent.
    *   **Solution**: **Vercel Cron Jobs**. You configure a `cron` in `vercel.json` that hits your existing `/api/trigger-update` endpoint once a day. This is free and efficient.

3.  **Database Persistence?**
    *   **Concern**: SQLite (`database.db`) is a file. On Vercel, the file system is ephemeral (it resets every time the function wakes up). Your history would be lost constantly.
    *   **Solution**: Use a **Serverless Cloud Database**.
    *   **Recommendation**: **Neon** (Postgres) or **Turso** (LibSQL). Both allow you to connect via a specialized URL. We will update the code to use an environment variable (`DATABASE_URL`) so it uses SQLite locally and Postgres/LibSQL in the cloud.

---

## 2. Step-by-Step Implementation

### A. Prepare the Code (I will do this for you)
1.  **Update `database.py`**: Modify it to read `DATABASE_URL` from environment variables.
2.  **Secure the Trigger**: Add a secret check to `/api/trigger-update` so only the Cron job can call it.
3.  **Add `vercel.json`**: specific configuration for routing.

### B. Deployment Steps (You will do this)

1.  **Create a Cloud Database**
    *   Go to [Neon.tech](https://neon.tech) (easiest for Postgres) or [Turso.tech](https://turso.tech).
    *   Create a free project.
    *   Copy the **Connection String** (e.g., `postgresql://user:pass@ep-xyz.aws.neon.tech/neondb?sslmode=require`).

2.  **Deploy to Vercel**
    *   Go to Vercel Dashboard -> Add New Project.
    *   Import your `gem-dashboard` repository.
    *   **Environment Variables**: Add your `DATABASE_URL` here.
    *   Deploy!

3.  **Setup Cron**
    *   The `vercel.json` I create will automatically set up the Cron job for 4:00 PM EST.

---

## 3. Why this approach?
*   **Cost**: $0. Vercel Free Tier covers the frontend, backend functions, and Cron. Neon/Turso free tiers are plenty for this data size.
*   **Maintenance**: No servers to patch. No process managers to restart.
*   **Scalability**: Handles traffic spikes automatically.
