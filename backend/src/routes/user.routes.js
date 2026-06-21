const express = require("express");
const { PrismaClient } = require("@prisma/client");
const authMiddleware = require("../middleware/auth.middleware");
const { allowedCategories } = require("../services/news.service");

const router = express.Router();
const prisma = new PrismaClient();

router.get("/preferences", authMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        preferences: true,
      },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    return res.json({
      preferences: user.preferences.split(","),
    });
  } catch (error) {
    return res.status(500).json({
      message: "Preferences could not be loaded.",
      error: error.message,
    });
  }
});

router.put("/preferences", authMiddleware, async (req, res) => {
  try {
    const { preferences } = req.body;

    if (!Array.isArray(preferences) || preferences.length === 0) {
      return res.status(400).json({
        message: "Select at least one category.",
      });
    }

    const safePreferences = [
      ...new Set(
        preferences.filter((preference) => allowedCategories.includes(preference))
      ),
    ];

    if (safePreferences.length === 0) {
      return res.status(400).json({
        message: "Select at least one supported category.",
      });
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        preferences: safePreferences.join(","),
      },
      select: {
        id: true,
        name: true,
        email: true,
        preferences: true,
      },
    });

    return res.json({
      message: "Preferences updated.",
      user: {
        ...updatedUser,
        preferences: updatedUser.preferences.split(","),
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: "Preferences could not be updated.",
      error: error.message,
    });
  }
});

module.exports = router;
