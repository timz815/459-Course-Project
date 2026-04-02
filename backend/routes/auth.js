const express = require("express");
const router = express.Router();
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const verifyToken = require("../middleware/authMiddleware");

// register
router.post("/register", async (req, res) => {
  try {
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

    // 2. compare passwords
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid credentials" });

    // 3. generate token  ("wristband")
    const token = jwt.sign(
      {
        id: user._id,
        username: user.username,
        displayName: user.displayName || "",
        email: user.email || "",
        avatarUrl: user.avatarUrl || "",
        accountBalance: user.accountBalance,
      },
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
      return res
        .status(400)
        .json({
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
    res
      .status(500)
      .json({
        message: "Unable to update your display name. Please try again.",
      });
  }
});

// PATCH avatar URL
router.patch("/profile/avatar", verifyToken, async (req, res) => {
  try {
    const { avatarUrl } = req.body;

    // basic URL format check
    try {
      new URL(avatarUrl);
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
    res
      .status(500)
      .json({
        message: "Unable to update your profile picture. Please try again.",
      });
  }
});

// PATCH email
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
