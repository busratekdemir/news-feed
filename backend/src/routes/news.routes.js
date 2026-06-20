const express = require("express");
const { PrismaClient } = require("@prisma/client");
const authMiddleware = require("../middleware/auth.middleware");
const {
  fetchPersonalizedNews,
  allowedCategories,
} = require("../services/news.service");

const router = express.Router();
const prisma = new PrismaClient();

router.get("/categories", (req, res) => {
  res.json({
    categories: allowedCategories,
  });
});

router.get("/", authMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        preferences: true,
      },
    });

    if (!user) {
      return res.status(404).json({ message: "Kullanıcı bulunamadı." });
    }

    const categories = user.preferences
      ? user.preferences.split(",")
      : ["general"];

    const articles = await fetchPersonalizedNews(categories);

    return res.json({
      message: "Kişiselleştirilmiş haber akışı getirildi.",
      selectedCategories: categories,
      totalResults: articles.length,
      articles,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Haberler getirilirken hata oluştu.",
      error: error.message,
    });
  }
});

module.exports = router;
