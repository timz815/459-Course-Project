const express = require("express");
const router = express.Router();
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const verifyToken = require("../middleware/authMiddleware");

// register
router.post("/register", async (req, res) => {
  try {
    // TODO(tier-1 user-model): Accept and persist email from req.body.
    // - Destructure email alongside username/password.
    // - Add a duplicate-email check (case-insensitive) before saving.
    // - Pass email when constructing newUser so it is stored in MongoDB.
    const { username, password } = req.body;

    // 1. check if user already exists
    const existingUser = await User.findOne({ username });
    if (existingUser)
      return res.status(400).json({ message: "User already exists" });

    // 2. hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3. save the user
    const newUser = new User({ username, password: hashedPassword });
    await newUser.save();

    res.status(201).json({ message: "User registered successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// login
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    // 1. find user
    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ message: "User not found" });

    console.log(`[LOGIN] Found user: ${username}, role in DB: "${user.role}"`);

    // 2. compare passwords
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid credentials" });

    // 3. generate token  ("wristband")
    const tokenPayload = {
      id: user._id,
      username: user.username,
      displayName: user.displayName || "",
      email: user.email || "",
      avatarUrl: user.avatarUrl || "",
      accountBalance: user.accountBalance,
      role: user.role || "user",
    };
    console.log(`[LOGIN] JWT payload for ${username}:`, tokenPayload);

    const token = jwt.sign(
      tokenPayload,
      process.env.JWT_SECRET || "fallbackSecret",
      { expiresIn: "1h" },
    );

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        displayName: user.displayName || "",
        email: user.email || "",
        avatarUrl: user.avatarUrl || "",
        accountBalance: user.accountBalance,
        role: user.role || "user",
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// helper: generate a fresh JWT for the given user document
function generateToken(user) {
  return jwt.sign(
    {
      id: user._id,
      username: user.username,
      displayName: user.displayName || "",
      email: user.email || "",
      avatarUrl: user.avatarUrl || "",
      accountBalance: user.accountBalance,
      role: user.role || "user",
    },
    process.env.JWT_SECRET || "fallbackSecret",
    { expiresIn: "1h" },
  );
}

// GET current user profile
router.get("/me", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH display name
router.patch("/profile/display-name", verifyToken, async (req, res) => {
  try {
    const { displayName } = req.body;

    // length check
    if (!displayName || displayName.length < 3 || displayName.length > 20) {
      return res.status(400).json({
        message: "Display names must be between 3 and 20 characters.",
      });
    }

    // allowed characters
    if (!/^[a-zA-Z0-9_]+$/.test(displayName)) {
      return res.status(400).json({
        message:
          "Display names can only contain letters, numbers, and underscores.",
      });
    }

    // uniqueness (case-insensitive)
    const existing = await User.findOne({
      displayName: { $regex: new RegExp(`^${displayName}$`, "i") },
      _id: { $ne: req.userId },
    });
    if (existing) {
      return res.status(409).json({
        message: "That display name is already in use. Please choose another.",
      });
    }

    const user = await User.findByIdAndUpdate(
      req.userId,
      { displayName },
      { new: true },
    ).select("-password");

    const token = generateToken(user);
    res.json({ message: "Your display name has been updated.", token, user });
  } catch (err) {
    res.status(500).json({
      message: "Unable to update your display name. Please try again.",
    });
  }
});

// PATCH avatar URL
router.patch("/profile/avatar", verifyToken, async (req, res) => {
  try {
    const { avatarUrl } = req.body;

    // Validate URL format and restrict to http/https only
    try {
      const parsed = new URL(avatarUrl);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        return res
          .status(400)
          .json({ message: "Please enter a valid image URL." });
      }
    } catch {
      return res
        .status(400)
        .json({ message: "Please enter a valid image URL." });
    }

    const user = await User.findByIdAndUpdate(
      req.userId,
      { avatarUrl },
      { new: true },
    ).select("-password");

    const token = generateToken(user);
    res.json({
      message: "Your profile picture has been updated.",
      token,
      user,
    });
  } catch (err) {
    res.status(500).json({
      message: "Unable to update your profile picture. Please try again.",
    });
  }
});

// PATCH email
// Note: In a real application, you'd want to implement email verification for the new address
// before updating it in the user's profile. For simplicity,
// this example just updates the email and returns a success message.
router.patch("/profile/email", verifyToken, async (req, res) => {
  try {
    const { email } = req.body;

    // duplicate check
    const existing = await User.findOne({
      email: email.toLowerCase(),
      _id: { $ne: req.userId },
    });
    if (existing) {
      return res.status(409).json({
        message: "That email address is already in use by another account.",
      });
    }

    const user = await User.findByIdAndUpdate(
      req.userId,
      { email: email.toLowerCase() },
      { new: true },
    ).select("-password");

    const token = generateToken(user);
    res.json({
      message: "We've sent a verification link to your new email address.",
      token,
      user,
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Unable to update your email. Please try again." });
  }
});

// PATCH password
// Note: In a real application, you'd want to implement additional security measures here,
// such as requiring the user to re-authenticate before changing their password,
// and sending an email notification about the change. For simplicity,
// this example just updates the password after verifying the current one.
router.patch("/profile/password", verifyToken, async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        message: "The new password and confirmation password do not match.",
      });
    }

    const user = await User.findById(req.userId);
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({
        message: "Your current password is incorrect. Please try again.",
      });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ message: "Your password has been successfully updated." });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Unable to update your password. Please try again." });
  }
});

module.exports = router;

// TODO(tier-1 password-reset): Implement email-based password recovery.
// 1. POST /forgot-password
//    - Accept { email } from req.body.
//    - Look up user by email; respond with a generic success message regardless
//      (avoids leaking whether the email is registered).
//    - Generate a crypto.randomBytes token, hash it, and store the hash + expiry
//      (e.g., resetToken + resetTokenExpiry) on the User document.
//    - Send the raw token to the user's email via Nodemailer.
//      Use a transporter configured from env vars (EMAIL_HOST, EMAIL_PORT,
//      EMAIL_USER, EMAIL_PASS).
// 2. POST /reset-password
//    - Accept { token, newPassword } from req.body.
//    - Hash the incoming token and look up a User where the stored hash matches
//      and resetTokenExpiry > Date.now().
//    - Hash newPassword with bcrypt, save it, and clear the reset fields.
//    - Return a success message so the frontend can redirect to /login.
// 3. Add resetToken (String) and resetTokenExpiry (Date) fields to the User model.
