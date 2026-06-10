import { Router, type IRouter } from "express";
import { db, paymentSettingsTable, paymentsTable, usersTable, licensesTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { authenticateAdmin } from "../middlewares/auth";
import axios from "axios";
import multer from "multer";
import path from "path";
import fs from "fs";
import { generateLicenseKey, generateReferralCode } from "../lib/utils";
import { sendEmail, templates } from "../lib/notifications";
import crypto from "crypto";

const router: IRouter = Router();

// --- Paystack Webhook Endpoint ---
router.post("/payment/paystack/webhook", async (req, res) => {
  const event = req.body;
  
  // 0. Verify Signature using Secret Key from DB
  try {
    const [settings] = await db.select().from(paymentSettingsTable).where(eq(paymentSettingsTable.id, 1)).limit(1);
    const secret = settings?.paystackSecretKey;
    
    if (!secret) {
      console.error("Webhook Error: Paystack secret not configured in database");
      return res.status(500).json({ message: "Paystack secret not configured" });
    }

    const hash = crypto.createHmac('sha512', secret).update(JSON.stringify(req.body)).digest('hex');
    if (hash !== req.headers['x-paystack-signature']) {
      return res.status(401).send("Unauthorized");
    }

    if (event.event === "charge.success") {
      const { reference, metadata, amount, customer } = event.data;
      const { userId, deviceId } = metadata;

      // 1. Duplicate Protection: Check if already processed
      const [existing] = await db.select().from(paymentsTable).where(eq(paymentsTable.reference, reference)).limit(1);
      if (existing && existing.status === "success") {
        return res.status(200).send("Already processed");
      }

      // 2. Update/Insert payment record
      if (existing) {
        await db.update(paymentsTable).set({ status: "success", verifiedAt: new Date() }).where(eq(paymentsTable.id, existing.id));
      } else {
        await db.insert(paymentsTable).values({
          userId,
          amount: amount / 100, // Store as Naira
          method: "paystack",
          status: "success",
          reference,
          verifiedAt: new Date()
        });
      }

      // 3. Activate Premium & Generate License
      await db.update(usersTable).set({ isPremium: true }).where(eq(usersTable.id, userId));
      
      const licenseKey = generateLicenseKey();
      await db.insert(licensesTable).values({
        userId,
        key: licenseKey,
        status: "active",
        activationDate: new Date(),
        customerName: customer.first_name || "Customer",
        email: customer.email,
        licenseType: "one_tailor"
      });

      // 4. Notify User
      const template = templates.licenseActivated(customer.first_name || "Customer", licenseKey);
      await sendEmail(customer.email, template.subject, template.html);

      res.status(200).send("Webhook handled");
    } else {
      res.status(200).send("Event ignored");
    }
  } catch (error) {
    console.error("Webhook Error:", error);
    res.status(500).send("Internal Error");
  }
});

// --- Public Routes ---multer for evidence uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = "./uploads/evidence";
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    // Only allow specific safe mime types
    const allowedMimeTypes = ["image/jpeg", "image/png", "application/pdf"];
    if (allowedMimeTypes.includes(file.mimetype)) {
      return cb(null, true);
    }
    cb(new Error("Only images (JPG/PNG) and PDFs are allowed for security."));
  }
});

// --- Public Routes ---

router.get("/payment-info", async (req, res) => {
  try {
    let settings = await db.select().from(paymentSettingsTable).where(eq(paymentSettingsTable.id, 1)).limit(1);
    
    if (settings.length === 0) {
      const defaultSettings = { 
        id: 1,
        price: 15000,
        globalUsageLimit: 25,
        measurementLimit: 25,
        currencyCode: "NGN",
        currencySymbol: "₦",
        bankName: "Opay",
        accountNumber: "1234567890",
        accountName: "OneTailor Technologies",
        instructions: "Pay into the account above and send proof of payment to support.",
        isPaystackEnabled: true,
        isManualEnabled: true,
        proUpgradeMessage: "Want to backup your customer measurement and never lose them if you phone or device is broken stolen etc. Unlock Premium to access more features beyond measurement, manage order, delivery, payment, inventory, finance, expense and so much more.",
        proUpgradeButtonText: "Unlock Premium"
      };
      
      try {
        await db.insert(paymentSettingsTable).values(defaultSettings).onConflictDoNothing();
      } catch (insertError) {
        console.error("Failed to insert default settings:", insertError);
      }
      settings = [defaultSettings as any];
    }

    const currentSettings = settings[0];

    // If deviceId is provided, also fetch user usage info
    const deviceId = req.query.deviceId as string;
    let userInfo = null;
    if (deviceId) {
      let [user] = await db.select().from(usersTable).where(eq(usersTable.deviceId, deviceId)).limit(1);
      
      if (!user) {
        // Create user if not exists (lazy registration)
        const referralCode = generateReferralCode();
        const [newUser] = await db.insert(usersTable).values({
          deviceId,
          referralCode,
          totalUsageCount: 0,
        }).returning();
        user = newUser;
      } else if (!user.referralCode) {
        // Ensure old users get a referral code
        const referralCode = generateReferralCode();
        await db.update(usersTable).set({ referralCode }).where(eq(usersTable.id, user.id));
        user.referralCode = referralCode;
      }

      if (user) {
        userInfo = {
          id: user.id,
          isPremium: user.isPremium,
          totalUsageCount: user.totalUsageCount,
          bonusUsageLimit: user.bonusUsageLimit,
          remainingUsage: Math.max(0, (currentSettings?.globalUsageLimit || 25) + user.bonusUsageLimit - user.totalUsageCount),
          referralCode: user.referralCode,
          successfulInvites: user.successfulInvites,
          referredBy: user.referredBy,
          referralConfirmed: user.referralConfirmed,
          premiumExpiryDate: user.premiumExpiryDate
        };
      }
    }

    // Hide secret key from public
    const publicSettings = currentSettings ? { ...currentSettings } : {};
    delete (publicSettings as any).paystackSecretKey;

    res.json({ ...publicSettings, user: userInfo });
  } catch (error) {
    console.error("Payment info fetch error:", error);
    res.status(500).json({ 
      message: "Internal server error",
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Record Tool Usage
router.post("/usage/record", async (req, res) => {
  const { deviceId, toolId } = req.body;
  if (!deviceId) return res.status(400).json({ message: "deviceId is required" });

  try {
    const [settings] = await db.select().from(paymentSettingsTable).where(eq(paymentSettingsTable.id, 1)).limit(1);
    const [user] = await db.select().from(usersTable).where(eq(usersTable.deviceId, deviceId)).limit(1);

    if (!user) return res.status(404).json({ message: "User not found" });

    // 1. Check if usage limit is globally enabled
    if (settings && !settings.isUsageLimitEnabled) {
       return res.json({ success: true, unlimited: true, totalUsageCount: user.totalUsageCount });
    }

    // 2. Always allow premium (check if still valid)
    const isPremium = user.isPremium || (user.premiumExpiryDate && user.premiumExpiryDate > new Date());
    
    if (isPremium) {
      return res.json({ success: true, isPremium: true, totalUsageCount: user.totalUsageCount });
    }

    // 3. Check limit
    const limit = (settings?.globalUsageLimit || 25) + user.bonusUsageLimit;
    if (user.totalUsageCount >= limit) {
      return res.status(403).json({ 
        message: "Your free uses are finished", 
        totalUsageCount: user.totalUsageCount,
        limit: limit
      });
    }

    // Increment usage
    const newCount = user.totalUsageCount + 1;
    await db.update(usersTable)
      .set({ totalUsageCount: newCount, lastSeen: new Date() })
      .where(eq(usersTable.id, user.id));

    // Handle Referral Confirmation (First Tool Usage)
    if (newCount === 1 && user.referredBy && !user.referralConfirmed) {
      await db.update(usersTable).set({ referralConfirmed: true }).where(eq(usersTable.id, user.id));
      
      // Reward the inviter
      const [inviter] = await db.select().from(usersTable).where(eq(usersTable.id, user.referredBy)).limit(1);
      if (inviter) {
        const newInviteCount = inviter.successfulInvites + 1;
        let bonusUsage = inviter.bonusUsageLimit;
        let rewardLevel = inviter.referralRewardLevel;
        let premiumExpiry = inviter.premiumExpiryDate || new Date();
        if (premiumExpiry < new Date()) premiumExpiry = new Date();

        // 1st invite: +5 credits
        if (newInviteCount === 1) {
          bonusUsage += 5;
          rewardLevel = 1;
        } 
        // 3rd invite: 7 days premium
        else if (newInviteCount === 3) {
          premiumExpiry.setDate(premiumExpiry.getDate() + 7);
          rewardLevel = 2;
        }
        // 10th invite: 30 days premium
        else if (newInviteCount === 10) {
          premiumExpiry.setDate(premiumExpiry.getDate() + 30);
          rewardLevel = 3;
        }
        // Generic: every invite after 1st gets +2 credits
        else if (newInviteCount > 1 && newInviteCount < 3) {
           bonusUsage += 2; 
        }

        await db.update(usersTable).set({
          successfulInvites: newInviteCount,
          bonusUsageLimit: bonusUsage,
          referralRewardLevel: rewardLevel,
          premiumExpiryDate: premiumExpiry
        }).where(eq(usersTable.id, inviter.id));
      }
    }

    res.json({ 
      success: true, 
      totalUsageCount: newCount, 
      remainingUsage: Math.max(0, limit - newCount) 
    });
  } catch (error) {
    console.error("Usage record error:", error);
    res.status(500).json({ 
      message: "Internal server error",
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Apply Referral Code
router.post("/referral/apply", async (req, res) => {
  const { deviceId, code } = req.body;
  if (!deviceId || !code) return res.status(400).json({ message: "deviceId and code are required" });

  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.deviceId, deviceId)).limit(1);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.referredBy) return res.status(400).json({ message: "Referral code already applied" });
    if (user.referralCode === code) return res.status(400).json({ message: "Cannot refer yourself" });

    const [inviter] = await db.select().from(usersTable).where(eq(usersTable.referralCode, code)).limit(1);
    if (!inviter) return res.status(404).json({ message: "Invalid referral code" });

    await db.update(usersTable).set({ referredBy: inviter.id }).where(eq(usersTable.id, user.id));
    
    res.json({ message: "Referral code applied successfully" });
  } catch (error) {
    console.error("Referral apply error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Paystack: Initialize Transaction
router.post("/payment/paystack/initialize", async (req, res) => {
  const { deviceId, email, amount } = req.body;

  try {
    const [settings] = await db.select().from(paymentSettingsTable).where(eq(paymentSettingsTable.id, 1)).limit(1);
    if (!settings?.isPaystackEnabled || !settings.paystackSecretKey) {
      res.status(400).json({ message: "Paystack is currently disabled" });
      return;
    }

    const [user] = await db.select().from(usersTable).where(eq(usersTable.deviceId, deviceId)).limit(1);
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    const response = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      {
        email,
        amount: amount * 100, // Convert Naira to Kobo for Paystack
        currency: settings.currencyCode || "NGN",
        callback_url: `${req.protocol}://${req.get("host")}/payment/paystack/verify`,
        metadata: { deviceId, userId: user.id }
      },
      {
        headers: {
          Authorization: `Bearer ${settings.paystackSecretKey}`,
          "Content-Type": "application/json"
        }
      }
    );

    // Create a pending payment record
    await db.insert(paymentsTable).values({
      userId: user.id,
      amount,
      method: "paystack",
      status: "pending",
      reference: response.data.data.reference
    });

    res.json(response.data);
  } catch (error: any) {
    console.error("Paystack Init Error:", error.response?.data || error.message);
    res.status(500).json({ message: "Failed to initialize payment" });
  }
});

// Paystack: Verify Transaction
router.get("/payment/paystack/verify", async (req, res) => {
  const { trxref, reference } = req.query;
  const ref = (reference || trxref) as string;

  try {
    const [settings] = await db.select().from(paymentSettingsTable).where(eq(paymentSettingsTable.id, 1)).limit(1);
    
    const response = await axios.get(`https://api.paystack.co/transaction/verify/${ref}`, {
      headers: { Authorization: `Bearer ${settings.paystackSecretKey}` }
    });

    if (response.data.data.status === "success") {
      const { userId, deviceId } = response.data.data.metadata;
      
      // 1. Check if already processed
      const [existing] = await db.select().from(paymentsTable).where(eq(paymentsTable.reference, ref)).limit(1);
      if (existing && existing.status === "success") {
        return res.redirect(`${process.env["FRONTEND_URL"] || "http://localhost:5173"}/pre-unlock/success?ref=${ref}`);
      }

      // 2. Update payment record
      if (existing) {
        await db.update(paymentsTable).set({ status: "success", verifiedAt: new Date() }).where(eq(paymentsTable.id, existing.id));
      } else {
        await db.insert(paymentsTable).values({
          userId,
          amount: response.data.data.amount / 100, // Store as Naira
          method: "paystack",
          status: "success",
          reference: ref,
          verifiedAt: new Date()
        });
      }

      // 3. Activate Premium for user
      await db.update(usersTable)
        .set({ isPremium: true })
        .where(eq(usersTable.id, userId));

      // 4. Check if license already exists
      const [existingLicense] = await db.select().from(licensesTable).where(eq(licensesTable.userId, userId)).limit(1);
      
      let licenseKey;
      if (existingLicense) {
        licenseKey = existingLicense.key;
      } else {
        // 5. Generate License
        licenseKey = generateLicenseKey();
        const customerName = response.data.data.customer.first_name || "Customer";
        const customerEmail = response.data.data.customer.email;

        await db.insert(licensesTable).values({
          userId,
          key: licenseKey,
          status: "active",
          activationDate: new Date(),
          customerName,
          email: customerEmail,
          licenseType: "one_tailor"
        });

        // 6. Send Notification
        const emailTemplate = templates.licenseActivated(customerName, licenseKey);
        await sendEmail(customerEmail, emailTemplate.subject, emailTemplate.html);
      }

      res.redirect(`${process.env["FRONTEND_URL"] || "http://localhost:5173"}/pre-unlock/success?ref=${ref}`);
    } else {
      res.redirect(`${process.env["FRONTEND_URL"] || "http://localhost:5173"}/pre-unlock/failed?ref=${ref}`);
    }
  } catch (error) {
    res.status(500).send("Verification failed");
  }
});

// Manual Payment Submission
router.post("/payment/manual", upload.single("evidence"), async (req, res) => {
  const { deviceId, amount } = req.body;
  const file = req.file;

  console.log(`[PAYMENT] Manual submission attempt: deviceId=${deviceId}, amount=${amount}, file=${file?.filename}`);

  if (!deviceId || !amount || !file) {
    console.error("[PAYMENT] Missing required fields for manual payment");
    return res.status(400).json({ message: "Missing required fields (deviceId, amount, or evidence file)" });
  }

  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.deviceId, deviceId)).limit(1);
    if (!user) {
      console.error(`[PAYMENT] User not found for deviceId: ${deviceId}`);
      return res.status(404).json({ message: "User not found" });
    }

    console.log(`[PAYMENT] Recording manual payment for user ${user.id} (${user.businessName})`);

    await db.insert(paymentsTable).values({
      userId: user.id,
      amount: parseInt(amount),
      method: "manual",
      status: "pending",
      evidenceUrl: `/uploads/evidence/${file.filename}`
    });

    // Notify Admin (Don't let email failure crash the request)
    try {
      const adminEmailTemplate = templates.manualPaymentReceived(user.businessName || "New User", parseInt(amount));
      await sendEmail(process.env["ADMIN_EMAIL"] || "admin@onetailor.com", adminEmailTemplate.subject, adminEmailTemplate.html);
      console.log("[PAYMENT] Admin notified of manual payment");
    } catch (emailErr) {
      console.error("[PAYMENT] Admin notification failed:", emailErr);
    }

    res.json({ message: "Payment submitted for verification" });
  } catch (error) {
    console.error("[PAYMENT] Manual submission error:", error);
    res.status(500).json({ 
      message: "Internal server error",
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// --- Admin Routes ---

router.put("/payment-info", authenticateAdmin as any, async (req, res) => {
  const body = req.body;
  try {
    // Filter and sanitize body
    const updateData: any = {};
    const allowedFields = [
      "price", "isPaystackEnabled", "isManualEnabled", 
      "paystackPublicKey", "paystackSecretKey", 
      "bankName", "accountNumber", "accountName", 
      "instructions", "paymentLink", "globalUsageLimit", 
      "measurementLimit", "proUpgradeMessage", 
      "proUpgradeLink", "proUpgradeButtonText",
      "currencyCode", "currencySymbol"
    ];

    for (const key of allowedFields) {
      if (body[key] !== undefined) {
        if (key === "price" || key === "globalUsageLimit" || key === "measurementLimit") {
          updateData[key] = parseInt(body[key]) || 0;
        } else {
          updateData[key] = body[key];
        }
      }
    }

    await db.update(paymentSettingsTable)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(paymentSettingsTable.id, 1));

    res.json({ message: "Payment settings updated" });
  } catch (error) {
    console.error("Payment settings update error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/admin/payments", authenticateAdmin as any, async (req, res) => {
  try {
    const payments = await db.select().from(paymentsTable).orderBy(desc(paymentsTable.createdAt));
    res.json(payments);
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/admin/payments/:id/approve", authenticateAdmin as any, async (req, res) => {
  const { id } = req.params;
  try {
    const [payment] = await db.select().from(paymentsTable).where(eq(paymentsTable.id, parseInt(id))).limit(1);
    if (!payment) {
      res.status(404).json({ message: "Payment not found" });
      return;
    }

    // 1. Update payment status
    await db.update(paymentsTable)
      .set({ status: "success", verifiedAt: new Date() })
      .where(eq(paymentsTable.id, payment.id));

    // 2. Activate Premium
    await db.update(usersTable)
      .set({ isPremium: true })
      .where(eq(usersTable.id, payment.userId));

    // 3. Generate License
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, payment.userId)).limit(1);
    const licenseKey = generateLicenseKey();
    await db.insert(licensesTable).values({
      userId: user.id,
      key: licenseKey,
      status: "active",
      activationDate: new Date(),
      customerName: user.businessName,
      email: user.email,
      phone: user.phone,
      businessName: user.businessName
    });

    // 4. Notify User
    if (user.email) {
      const emailTemplate = templates.licenseActivated(user.businessName || "Customer", licenseKey);
      await sendEmail(user.email, emailTemplate.subject, emailTemplate.html);
    }

    res.json({ message: "Payment approved and license generated" });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/admin/payments/:id/reject", authenticateAdmin as any, async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  try {
    await db.update(paymentsTable)
      .set({ status: "failed", adminNotes: reason })
      .where(eq(paymentsTable.id, parseInt(id)));

    // Notify User
    const [payment] = await db.select().from(paymentsTable).where(eq(paymentsTable.id, parseInt(id))).limit(1);
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, payment.userId)).limit(1);
    if (user.email) {
      const emailTemplate = templates.paymentRejected(reason);
      await sendEmail(user.email, emailTemplate.subject, emailTemplate.html);
    }

    res.json({ message: "Payment rejected" });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
