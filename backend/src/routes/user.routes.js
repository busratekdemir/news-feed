const express = require("express");
const { PrismaClient } = require("@prisma/client");
const authMiddleware = require("../middleware/auth.middleware");

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
      return res.status(404).json({ message: "Kullanıcı bulunamadı." });
    }

    return res.json({
      preferences: user.preferences.split(","),
    });
  } catch (error) {
    return res.status(500).json({
      message: "Tercihler alınırken hata oluştu.",
      error: error.message,
    });
  }
});

router.put("/preferences", authMiddleware, async (req, res) => {
  try {
    const { preferences } = req.body;

    if (!Array.isArray(preferences) || preferences.length === 0) {
      return res.status(400).json({
        message: "En az bir kategori seçilmelidir.",
      });
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        preferences: preferences.join(","),
      },
      select: {
        id: true,
        name: true,
        email: true,
        preferences: true,
      },
    });

    return res.json({
      message: "Tercihler güncellendi.",
      user: {
        ...updatedUser,
        preferences: updatedUser.preferences.split(","),
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: "Tercihler güncellenirken hata oluştu.",
      error: error.message,
    });
  }
});

module.exports = router;
