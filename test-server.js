require('dotenv').config();
const express = require('express');
const path = require('path');
const app = express();

// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Simple test route
app.get('/simple-test', (req, res) => {
  res.render('simple-test');
});

// Recipe test route with mock data
app.get('/recipe-test', (req, res) => {
  const mockRecipe = {
    title: "Test Recipe",
    brand: "Test Brand",
    brandSlug: "test-brand",
    slug: "test-recipe",
    description: "This is a test recipe description",
    image: "/images/placeholder.png",
    foodType: "Test Category",
    foodTypeSlug: "test-category",
    yield: "4 servings",
    prepTime: "15 minutes",
    cookTime: "30 minutes",
    totalTime: "45 minutes",
    difficulty: "Easy",
    rating: {
      value: 4.5,
      count: 10
    },
    ingredients: [
      "1 cup test ingredient",
      "2 tablespoons test ingredient 2",
      "3 teaspoons test ingredient 3"
    ],
    instructions: [
      "Step 1: Do something",
      "Step 2: Do something else",
      "Step 3: Finish the recipe"
    ]
  };

  const mockRelatedRecipes = [
    {
      title: "Related Recipe 1",
      brand: "Test Brand",
      url: "/recipe-test",
      image: "/images/placeholder.png",
      rating: { value: 4.2 }
    },
    {
      title: "Related Recipe 2",
      brand: "Test Brand",
      url: "/recipe-test",
      image: "/images/placeholder.png",
      rating: { value: 4.7 }
    }
  ];

  res.render('recipe', {
    title: mockRecipe.title,
    description: mockRecipe.description,
    url: `/recipes/${mockRecipe.brandSlug}/${mockRecipe.slug}`,
    currentRoute: `/recipes/${mockRecipe.brandSlug}/${mockRecipe.slug}`,
    recipe: mockRecipe,
    relatedRecipes: mockRelatedRecipes
  });
});

// Error handling
app.use((req, res) => {
  res.status(404).render('error', {
    title: '404 - Page Not Found',
    description: 'The page you are looking for does not exist.',
    url: req.originalUrl,
    currentRoute: req.originalUrl,
    error: {
      status: 404,
      message: 'Page not found'
    }
  });
});

// Start server
const PORT = process.env.TEST_PORT || 3003;
app.listen(PORT, () => {
  console.log(`Test server running on http://localhost:${PORT}`);
  console.log(`Try these test routes:`);
  console.log(`- http://localhost:${PORT}/simple-test`);
  console.log(`- http://localhost:${PORT}/recipe-test`);
});
