import app from "./app";
import { logger } from "./lib/logger";
import { db, adminsTable, paymentSettingsTable } from "@workspace/db";
import { sql } from "drizzle-orm";
import bcrypt from "bcryptjs";

process.on("uncaughtException", (err) => {
  console.error("🔥 CRITICAL: Uncaught Exception:", err);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("🔥 CRITICAL: Unhandled Rejection at:", promise, "reason:", reason);
});

const rawPort = process.env["PORT"] || "3000";

async function startServer() {
  const port = parseInt(rawPort, 10);
  if (isNaN(port)) {
    console.error(`🔥 ERROR: Invalid PORT "${rawPort}"`);
    process.exit(1);
  }

  // Initialize DB before starting server
  try {
    logger.info("Initializing database...");
    // The db import triggers initialization in lib/db
    await db.execute(sql`SELECT 1`);
    logger.info("Database connection verified.");
  } catch (err) {
    logger.error({ err }, "Database initialization warning (Server will still start in Mock/Fallback mode)");
  }

  // Ensure database tables exist
  try {
    logger.info("Checking database tables...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS admins (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS payment_settings (
        id INTEGER PRIMARY KEY DEFAULT 1,
        price INTEGER NOT NULL DEFAULT 1500000,
        is_paystack_enabled BOOLEAN NOT NULL DEFAULT TRUE,
        is_manual_enabled BOOLEAN NOT NULL DEFAULT TRUE,
        paystack_public_key TEXT,
        paystack_secret_key TEXT,
        bank_name TEXT NOT NULL DEFAULT 'Opay',
        account_number TEXT NOT NULL DEFAULT '1234567890',
        account_name TEXT NOT NULL DEFAULT 'OneTailor Technologies',
        instructions TEXT NOT NULL DEFAULT 'Pay into the account above and send proof of payment to support.',
        payment_link TEXT,
        global_usage_limit INTEGER NOT NULL DEFAULT 25,
        currency_code TEXT NOT NULL DEFAULT 'NGN',
        currency_symbol TEXT NOT NULL DEFAULT '₦',
        measurement_limit INTEGER NOT NULL DEFAULT 25,
        pro_upgrade_message TEXT NOT NULL DEFAULT 'Want to backup your customer measurement and never lose them if you phone or device is broken stolen etc. Unlock Premium to access more features beyond measurement, manage order, delivery, payment, inventory, finance, expense and so much more.',
        pro_upgrade_link TEXT,
        pro_upgrade_button_text TEXT NOT NULL DEFAULT 'Unlock Premium',
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    // Permanent fix: Auto-migrate columns if they don't exist
    const settingsColumns = [
      { name: "is_paystack_enabled", type: "BOOLEAN NOT NULL DEFAULT TRUE" },
      { name: "is_manual_enabled", type: "BOOLEAN NOT NULL DEFAULT TRUE" },
      { name: "paystack_public_key", type: "TEXT" },
      { name: "paystack_secret_key", type: "TEXT" },
      { name: "global_usage_limit", type: "INTEGER NOT NULL DEFAULT 25" },
      { name: "currency_code", type: "TEXT NOT NULL DEFAULT 'NGN'" },
      { name: "currency_symbol", type: "TEXT NOT NULL DEFAULT '₦'" },
      { name: "measurement_limit", type: "INTEGER NOT NULL DEFAULT 25" },
      { name: "pro_upgrade_message", type: "TEXT NOT NULL DEFAULT 'Want to backup your customer measurement and never lose them if you phone or device is broken stolen etc. Unlock Premium to access more features beyond measurement, manage order, delivery, payment, inventory, finance, expense and so much more.'" },
      { name: "pro_upgrade_link", type: "TEXT" },
      { name: "pro_upgrade_button_text", type: "TEXT NOT NULL DEFAULT 'Unlock Premium'" },
      { name: "is_debug_mode", type: "BOOLEAN NOT NULL DEFAULT FALSE" },
      { name: "is_usage_limit_enabled", type: "BOOLEAN NOT NULL DEFAULT TRUE" }
    ];

    for (const col of settingsColumns) {
      try {
        await db.execute(sql.raw(`ALTER TABLE payment_settings ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}`));
      } catch (e) {}
    }

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS licenses (
        id SERIAL PRIMARY KEY,
        key TEXT NOT NULL UNIQUE,
        status TEXT NOT NULL DEFAULT 'active',
        customer_name TEXT,
        business_name TEXT,
        license_type TEXT NOT NULL DEFAULT 'one_tailor',
        phone TEXT,
        email TEXT,
        activation_date TIMESTAMP,
        expiry_date TIMESTAMP,
        user_id INTEGER,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    
    // Auto-migrate licenses table columns
    const licenseColumns = [
      { name: "customer_name", type: "TEXT" },
      { name: "business_name", type: "TEXT" },
      { name: "license_type", type: "TEXT NOT NULL DEFAULT 'one_tailor'" },
      { name: "phone", type: "TEXT" },
      { name: "email", type: "TEXT" },
      { name: "user_id", type: "INTEGER" },
      { name: "activation_date", type: "TIMESTAMP" },
      { name: "expiry_date", type: "TIMESTAMP" }
    ];

    for (const col of licenseColumns) {
      try {
        await db.execute(sql.raw(`ALTER TABLE licenses ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}`));
      } catch (e) {}
    }
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        device_id TEXT NOT NULL UNIQUE,
        email TEXT UNIQUE,
        phone TEXT,
        business_name TEXT,
        business_address TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        is_premium BOOLEAN NOT NULL DEFAULT FALSE,
        last_seen TIMESTAMP NOT NULL DEFAULT NOW(),
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    // Ensure all columns exist in users table
    const userColumns = [
      { name: "email", type: "TEXT UNIQUE" },
      { name: "phone", type: "TEXT" },
      { name: "business_name", type: "TEXT" },
      { name: "business_address", type: "TEXT" },
      { name: "is_premium", type: "BOOLEAN NOT NULL DEFAULT FALSE" },
      { name: "total_usage_count", type: "INTEGER NOT NULL DEFAULT 0" },
      { name: "referral_code", type: "TEXT UNIQUE" },
      { name: "referred_by", type: "INTEGER" },
      { name: "successful_invites", type: "INTEGER DEFAULT 0" },
      { name: "referral_reward_level", type: "INTEGER DEFAULT 0" },
      { name: "referral_confirmed", type: "BOOLEAN DEFAULT FALSE" },
      { name: "bonus_usage_limit", type: "INTEGER DEFAULT 0" },
      { name: "premium_expiry_date", type: "TIMESTAMP" }
    ];
    for (const col of userColumns) {
      try { await db.execute(sql.raw(`ALTER TABLE users ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}`)); } catch (e) {}
    }

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS business_profiles (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        email TEXT NOT NULL,
        address TEXT NOT NULL,
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        amount INTEGER NOT NULL,
        currency TEXT NOT NULL DEFAULT 'NGN',
        method TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        reference TEXT UNIQUE,
        evidence_url TEXT,
        admin_notes TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        verified_at TIMESTAMP
      )
    `);

    // Auto-migrate payments table columns
    const paymentColumns = [
      { name: "user_id", type: "INTEGER" },
      { name: "amount", type: "INTEGER NOT NULL DEFAULT 0" },
      { name: "currency", type: "TEXT NOT NULL DEFAULT 'NGN'" },
      { name: "method", type: "TEXT NOT NULL DEFAULT 'manual'" },
      { name: "status", type: "TEXT NOT NULL DEFAULT 'pending'" },
      { name: "reference", type: "TEXT UNIQUE" },
      { name: "evidence_url", type: "TEXT" },
      { name: "admin_notes", type: "TEXT" },
      { name: "verified_at", type: "TIMESTAMP" }
    ];

    for (const col of paymentColumns) {
      try {
        await db.execute(sql.raw(`ALTER TABLE payments ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}`));
      } catch (e) {}
    }
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        device_id TEXT NOT NULL,
        endpoint TEXT NOT NULL UNIQUE,
        p256dh TEXT NOT NULL,
        auth TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS license_activations (
        id SERIAL PRIMARY KEY,
        license_id INTEGER NOT NULL REFERENCES licenses(id),
        device_id TEXT NOT NULL,
        activated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        type TEXT NOT NULL,
        content TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS email_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        template TEXT NOT NULL,
        recipient TEXT NOT NULL,
        status TEXT NOT NULL,
        error TEXT,
        sent_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        admin_id INTEGER REFERENCES admins(id),
        action TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id INTEGER,
        details TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS tailoring_customers (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        gender TEXT,
        email TEXT,
        address TEXT,
        notes TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS tailoring_measurements (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER NOT NULL,
        label TEXT NOT NULL,
        category TEXT NOT NULL,
        values TEXT NOT NULL,
        is_custom BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    logger.info("Database tables verified.");

    // Initial Data Setup
    const adminCheck = await db.select().from(adminsTable).limit(1);
    if (adminCheck.length === 0) {
      logger.info("Creating default admin account...");
      await db.insert(adminsTable).values({
        username: "admin",
        passwordHash: bcrypt.hashSync("admin123", 10) // Set a safer default
      });
      logger.info("Default Admin created: admin / admin123");
    }

    const settingsCheck = await db.select().from(paymentSettingsTable).where(sql`id = 1`).limit(1);
    if (settingsCheck.length === 0) {
      logger.info("Initializing payment settings...");
      await db.insert(paymentSettingsTable).values({
        id: 1,
        price: 1500000, // 15,000 NGN in kobo
        bankName: "Opay",
        accountNumber: "1234567890",
        accountName: "OneTailor Technologies",
        instructions: "Pay into the account above and send proof of payment to support.",
        measurementLimit: 25,
        proUpgradeMessage: "Want to backup your customer measurement and never lose them if you phone or device is broken stolen etc. ⭐ Unlock Premium unlock more feature beyond measurement, manage order, delivery, payment, inventory, finance, expense and so much more.",
        proUpgradeButtonText: "⭐ Unlock Premium"
      });
    }
    
  } catch (err) {
    logger.error({ err }, "Failed to verify/create database tables or initial data");
  }

  app.listen(port, "0.0.0.0", () => {
    console.log(`\n🚀 Backend Server running at http://127.0.0.1:${port}`);
    console.log(`📂 Database mode: ${process.env.DATABASE_URL ? "Remote/Postgres" : "Local/PGLite"}\n`);
  });
}

startServer().catch(err => {
  logger.error({ err }, "Failed to start server");
  process.exit(1);
});
