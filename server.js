const express = require('express');
const mongoose = require('mongoose');
const compression = require('compression');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { marked } = require('marked');
require('dotenv').config();

const Recipe = require('./models/Recipe');

const app = express();
const PORT = process.env.PORT || 3000;

// Security and performance middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"]
    }
  }
}));

app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Set view engine and views directory
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('Connected to MongoDB'))
.catch((err) => console.error('MongoDB connection error:', err));

// Helper function to get recipe counts
async function getRecipeCounts() {
  try {
    const totalRecipes = await Recipe.countDocuments();
    const brands = await Recipe.distinct('brand');
    const categories = await Recipe.distinct('foodType');
    return {
      totalRecipes,
      totalBrands: brands.length,
      totalCategories: categories.length
    };
  } catch (error) {
    console.error('Error getting recipe counts:', error);
    return { totalRecipes: 0, totalBrands: 0, totalCategories: 0 };
  }
}

// Routes

// Home page
app.get('/', async (req, res) => {
  try {
    const counts = await getRecipeCounts();
    const featuredRecipes = await Recipe.find({ featured: true }).limit(6);
    const recentRecipes = await Recipe.find().sort({ createdAt: -1 }).limit(8);
    
    res.render('index', {
      title: 'Knockoff Kitchen - 23,000+ Copycat Recipes',
      description: 'Discover over 23,000 copycat recipes from your favorite restaurants and brands. Create homemade versions of popular dishes with easy-to-follow instructions.',
      counts,
      featuredRecipes,
      recentRecipes,
      currentPage: 'home'
    });
  } catch (error) {
    console.error('Home page error:', error);
    res.status(500).render('error', { 
      error: 'Internal server error',
      title: 'Error - Knockoff Kitchen',
      description: 'An error occurred while loading the homepage.',
      currentRoute: 'error'
    });
  }
});

// All recipes page
app.get('/recipes', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 24;
    const skip = (page - 1) * limit;
    
    const filter = {};
    if (req.query.brand) filter.brandSlug = req.query.brand;
    if (req.query.category) filter.foodTypeSlug = req.query.category;
    
    const totalRecipes = await Recipe.countDocuments(filter);
    const recipes = await Recipe.find(filter)
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit);
    
    const brands = await Recipe.distinct('brand').sort();
    const categories = await Recipe.distinct('foodType').sort();
    
    const totalPages = Math.ceil(totalRecipes / limit);
    
    res.render('recipes', {
      title: 'All Recipes - Knockoff Kitchen',
      description: 'Browse our complete collection of copycat recipes for popular brand-name foods.',
      recipes,
      brands,
      categories,
      currentPage: page,
      totalPages,
      totalRecipes,
      selectedBrand: req.query.brand || '',
      selectedCategory: req.query.category || '',
      currentRoute: 'recipes'
    });
  } catch (error) {
    console.error('Recipes page error:', error);
    res.status(500).render('error', { 
      error: 'Internal server error',
      title: 'Error - Knockoff Kitchen',
      description: 'An error occurred while loading the recipes page.',
      currentRoute: 'error'
    });
  }
});

// Individual recipe page - EXACT URL match with original site
app.get('/recipes/:brand/:slug', async (req, res) => {
  try {
    const recipe = await Recipe.findOne({
      brandSlug: req.params.brand,
      slug: req.params.slug
    });
    
    if (!recipe) {
      return res.status(404).render('error', { 
        error: 'Recipe not found',
        title: 'Recipe Not Found - Knockoff Kitchen',
        description: 'The recipe you are looking for could not be found.',
        currentRoute: 'error'
      });
    }
    
    // Parse markdown content if available
    if (recipe.contentMarkdown) {
      try {
        recipe.parsedContent = marked(recipe.contentMarkdown);
        console.log('Parsed markdown content for recipe:', recipe.title);
        console.log('Content preview:', recipe.parsedContent.substring(0, 200) + '...');
      } catch (error) {
        console.error('Error parsing markdown:', error);
        recipe.parsedContent = recipe.contentMarkdown.replace(/\n/g, '<br>');
      }
    } else {
      console.log('No contentMarkdown found for recipe:', recipe.title);
    }
    
    // Get related recipes from same brand
    const relatedRecipes = await Recipe.find({
      brandSlug: req.params.brand,
      _id: { $ne: recipe._id }
    }).limit(4);
    
    res.render('recipe', {
      title: `${recipe.title} - ${recipe.brand} Copycat Recipe`,
      description: recipe.seo?.description || `Learn how to make ${recipe.title} at home with this copycat recipe from ${recipe.brand}.`,
      recipe,
      relatedRecipes,
      currentRoute: 'recipes'
    });
  } catch (error) {
    console.error('Recipe page error:', error);
    res.status(500).render('error', { 
      error: 'Internal server error',
      title: 'Error - Knockoff Kitchen',
      description: 'An error occurred while loading the recipe page.',
      currentRoute: 'error'
    });
  }
});

// Brands page
app.get('/brands', async (req, res) => {
  try {
    const brands = await Recipe.aggregate([
      {
        $group: {
          _id: '$brand',
          brandSlug: { $first: '$brandSlug' },
          count: { $sum: 1 },
          latestRecipe: { $max: '$createdAt' }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    res.render('brands', {
      title: 'Recipe Brands - Knockoff Kitchen',
      description: 'Browse recipes by brand. Find copycat recipes from your favorite restaurants and food companies.',
      brands,
      currentRoute: 'brands'
    });
  } catch (error) {
    console.error('Brands page error:', error);
    res.status(500).render('error', { 
      error: 'Internal server error',
      title: 'Error - Knockoff Kitchen',
      description: 'An error occurred while loading the brands page.',
      currentRoute: 'error'
    });
  }
});

// Categories page
app.get('/categories', async (req, res) => {
  try {
    const categories = await Recipe.aggregate([
      {
        $group: {
          _id: '$category',
          categorySlug: { $first: '$categorySlug' },
          count: { $sum: 1 },
          latestRecipe: { $max: '$createdAt' }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    res.render('categories', {
      title: 'Recipe Categories - Knockoff Kitchen',
      description: 'Browse recipes by category. Find appetizers, main courses, desserts, and more copycat recipes.',
      categories,
      currentRoute: 'categories'
    });
  } catch (error) {
    console.error('Categories page error:', error);
    res.status(500).render('error', { 
      error: 'Internal server error',
      title: 'Error - Knockoff Kitchen',
      description: 'An error occurred while loading the categories page.',
      currentRoute: 'error'
    });
  }
});

// Search functionality
app.get('/search', async (req, res) => {
  try {
    const query = req.query.q || '';
    const page = parseInt(req.query.page) || 1;
    const limit = 24;
    const skip = (page - 1) * limit;
    
    let recipes = [];
    let totalResults = 0;
    
    if (query.trim()) {
      const searchRegex = new RegExp(query, 'i');
      const filter = {
        $or: [
          { title: searchRegex },
          { brand: searchRegex },
          { category: searchRegex },
          { description: searchRegex },
          { tags: searchRegex }
        ]
      };
      
      totalResults = await Recipe.countDocuments(filter);
      recipes = await Recipe.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
    }
    
    const totalPages = Math.ceil(totalResults / limit);
    
    res.render('search', {
      title: query ? `Search Results for "${query}" - Knockoff Kitchen` : 'Search Recipes - Knockoff Kitchen',
      description: query ? `Search results for "${query}" in our collection of copycat recipes.` : 'Search our collection of copycat recipes.',
      recipes,
      query,
      currentPage: page,
      totalPages,
      totalResults,
      currentRoute: 'search'
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).render('error', { 
      error: 'Internal server error',
      title: 'Error - Knockoff Kitchen',
      description: 'An error occurred while performing the search.',
      currentRoute: 'error'
    });
  }
});

// About page
app.get('/about', (req, res) => {
  res.render('about', {
    title: 'About Knockoff Kitchen - Your Source for Copycat Recipes',
    description: 'Learn about Knockoff Kitchen and our mission to bring you the best copycat recipes from your favorite restaurants and brands.',
    currentRoute: 'about'
  });
});

// Contact page
app.get('/contact', (req, res) => {
  res.render('contact', {
    title: 'Contact Us - Knockoff Kitchen',
    description: 'Get in touch with the Knockoff Kitchen team. We\'d love to hear from you!',
    currentRoute: 'contact'
  });
});

// Sitemap.xml
app.get('/sitemap.xml', async (req, res) => {
  try {
    const recipes = await Recipe.find({}, 'slug brandSlug updatedAt').sort({ updatedAt: -1 });
    
    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://knockoffkitchen.com/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://knockoffkitchen.com/recipes</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://knockoffkitchen.com/brands</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://knockoffkitchen.com/categories</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;

    recipes.forEach(recipe => {
      sitemap += `
  <url>
    <loc>https://knockoffkitchen.com/recipes/${recipe.brandSlug}/${recipe.slug}</loc>
    <lastmod>${recipe.updatedAt.toISOString()}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`;
    });

    sitemap += '\n</urlset>';
    
    res.set('Content-Type', 'text/xml');
    res.send(sitemap);
  } catch (error) {
    console.error('Sitemap error:', error);
    res.status(500).send('Error generating sitemap');
  }
});

// Robots.txt
app.get('/robots.txt', (req, res) => {
  res.type('text/plain');
  res.send(`User-agent: *
Allow: /
Sitemap: https://knockoffkitchen.com/sitemap.xml`);
});

// 404 handler
app.use((req, res) => {
  res.status(404).render('error', {
    error: 'Page not found',
    title: 'Page Not Found - Knockoff Kitchen',
    description: 'The page you are looking for could not be found.',
    currentRoute: 'error'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('error', {
    error: 'Something went wrong!',
    title: 'Error - Knockoff Kitchen',
    description: 'An unexpected error occurred. Please try again later.',
    currentRoute: 'error'
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
