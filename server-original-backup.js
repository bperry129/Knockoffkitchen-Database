const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const { marked } = require('marked');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Import Recipe model
const Recipe = require('./models/Recipe');

// Middleware
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI).then(() => {
  console.log('Connected to MongoDB');
}).catch(error => {
  console.error('MongoDB connection error:', error);
});

// Ultra-safe content parsing to prevent character cutoffs
function parseRecipeContent(recipe) {
  // Check if we have structured ingredients and instructions
  if (recipe.ingredients && recipe.ingredients.length > 0 && recipe.instructions && recipe.instructions.length > 0) {
    // Use structured data - this is the safest approach
    let parsedContent = '<div class="recipe-structured-content">';
    
    // Ingredients section
    parsedContent += '<h2 class="text-2xl font-bold text-slate-900 mb-4 mt-8 pb-2 border-b border-slate-200">Ingredients</h2>';
    parsedContent += '<ul class="list-disc list-inside space-y-2 mb-6 pl-4">';
    recipe.ingredients.forEach(ingredient => {
      if (ingredient && ingredient.trim()) {
        parsedContent += `<li class="text-slate-700 leading-relaxed pl-2">${ingredient.trim()}</li>`;
      }
    });
    parsedContent += '</ul>';
    
    // Instructions section
    parsedContent += '<h2 class="text-2xl font-bold text-slate-900 mb-4 mt-8 pb-2 border-b border-slate-200">Instructions</h2>';
    parsedContent += '<ol class="list-decimal list-inside space-y-3 mb-6 pl-4">';
    recipe.instructions.forEach((instruction, index) => {
      if (instruction && instruction.trim()) {
        parsedContent += `<li class="text-slate-700 leading-relaxed mb-3 pl-2">
          <span class="font-medium text-slate-900">Step ${index + 1}:</span> ${instruction.trim()}
        </li>`;
      }
    });
    parsedContent += '</ol>';
    
    // Add tips, notes, variations if available
    if (recipe.tips && recipe.tips.length > 0) {
      parsedContent += '<h3 class="text-xl font-bold text-slate-900 mb-3 mt-6">Tips</h3>';
      parsedContent += '<ul class="list-disc list-inside space-y-2 mb-6 ml-4">';
      recipe.tips.forEach(tip => {
        if (tip && tip.trim()) {
          parsedContent += `<li class="text-slate-700 leading-relaxed">${tip.trim()}</li>`;
        }
      });
      parsedContent += '</ul>';
    }
    
    if (recipe.notes && recipe.notes.trim()) {
      parsedContent += '<h3 class="text-xl font-bold text-slate-900 mb-3 mt-6">Notes</h3>';
      parsedContent += `<p class="text-slate-700 leading-relaxed mb-4">${recipe.notes.trim()}</p>`;
    }
    
    parsedContent += '</div>';
    recipe.parsedContent = parsedContent;
    
  } else if (recipe.contentMarkdown) {
    // ULTRA-SAFE MARKDOWN PROCESSING - minimal regex to prevent character cutoffs
    try {
      // Start with the raw markdown - NO AGGRESSIVE PREPROCESSING
      let safeMarkdown = recipe.contentMarkdown.trim();
      
      // Convert to HTML using marked with minimal processing
      let htmlContent = marked(safeMarkdown);
      
      // MINIMAL, ULTRA-SAFE post-processing - only add CSS classes
      if (htmlContent) {
        // Add classes to existing tags WITHOUT modifying content
        htmlContent = htmlContent.replace(/<h1/g, '<h1 class="text-3xl font-bold text-slate-900 mb-6"');
        htmlContent = htmlContent.replace(/<h2/g, '<h2 class="text-2xl font-bold text-slate-900 mb-4 mt-8 pb-2 border-b border-slate-200"');
        htmlContent = htmlContent.replace(/<h3/g, '<h3 class="text-xl font-bold text-slate-900 mb-3 mt-6"');
        htmlContent = htmlContent.replace(/<h4/g, '<h4 class="text-lg font-semibold text-slate-900 mb-2 mt-4"');
        htmlContent = htmlContent.replace(/<h5/g, '<h5 class="text-base font-semibold text-slate-900 mb-2 mt-3"');
        htmlContent = htmlContent.replace(/<h6/g, '<h6 class="text-sm font-semibold text-slate-900 mb-2 mt-3"');
        
        htmlContent = htmlContent.replace(/<p/g, '<p class="text-slate-700 leading-relaxed mb-4"');
        htmlContent = htmlContent.replace(/<ul/g, '<ul class="list-disc list-inside space-y-2 mb-6 ml-4"');
        htmlContent = htmlContent.replace(/<ol/g, '<ol class="list-decimal list-inside space-y-3 mb-6 ml-4"');
        htmlContent = htmlContent.replace(/<li/g, '<li class="text-slate-700 leading-relaxed mb-2"');
        
        htmlContent = htmlContent.replace(/<strong/g, '<strong class="font-semibold text-slate-900"');
        htmlContent = htmlContent.replace(/<b>/g, '<b class="font-semibold text-slate-900">');
        htmlContent = htmlContent.replace(/<em/g, '<em class="italic text-slate-800"');
        htmlContent = htmlContent.replace(/<i>/g, '<i class="italic text-slate-800">');
        
        htmlContent = htmlContent.replace(/<blockquote/g, '<blockquote class="border-l-4 border-orange-500 pl-4 italic text-slate-600 mb-4"');
        htmlContent = htmlContent.replace(/<code/g, '<code class="bg-slate-100 px-2 py-1 rounded text-sm font-mono"');
        htmlContent = htmlContent.replace(/<pre/g, '<pre class="bg-slate-100 p-4 rounded-lg overflow-x-auto mb-4"');
      }
      
      recipe.parsedContent = htmlContent;
    } catch (error) {
      console.error('Error parsing markdown for recipe:', recipe.title, error);
      // SAFEST POSSIBLE FALLBACK - just wrap in paragraphs
      recipe.parsedContent = recipe.contentMarkdown
        .split('\n\n')
        .filter(paragraph => paragraph.trim())
        .map(paragraph => `<p class="text-slate-700 leading-relaxed mb-4">${paragraph.trim()}</p>`)
        .join('\n');
    }
  } else {
    recipe.parsedContent = '<p class="text-slate-700 leading-relaxed mb-4">Recipe content is being processed and will be available soon.</p>';
  }
  
  return recipe;
}

// Routes

// Homepage
app.get('/', async (req, res) => {
  try {
    // Get featured recipes
    const featuredRecipes = await Recipe.find({ featured: true }).limit(6);
    
    // Get recent recipes
    const recentRecipes = await Recipe.find({}).sort({ createdAt: -1 }).limit(8);
    
    // Get counts
    const totalRecipes = await Recipe.countDocuments();
    const totalBrands = await Recipe.distinct('brand').then(brands => brands.length);
    const totalCategories = await Recipe.distinct('foodType').then(categories => categories.length);
    
    res.render('index', {
      title: 'Knockoff Kitchen - Copycat Recipes for Popular Brand Foods',
      description: 'Discover thousands of copycat recipes from your favorite restaurants and brands. Create homemade versions of popular dishes with our easy-to-follow instructions.',
      featuredRecipes,
      recentRecipes,
      counts: {
        totalRecipes,
        totalBrands,
        totalCategories
      },
      currentRoute: 'home'
    });
  } catch (error) {
    console.error('Error loading homepage:', error);
    res.status(500).render('error', {
      title: 'Error - Knockoff Kitchen',
      description: 'An error occurred while loading the homepage.',
      error: 'Failed to load homepage. Please try again later.',
      currentRoute: 'home'
    });
  }
});

// Recipes listing
app.get('/recipes', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 24;
    const skip = (page - 1) * limit;
    
    // Build filter
    let filter = {};
    if (req.query.brand) {
      filter.brandSlug = req.query.brand;
    }
    if (req.query.category) {
      filter.foodTypeSlug = req.query.category;
    }
    
    // Get recipes
    const recipes = await Recipe.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    // Get total count
    const totalRecipes = await Recipe.countDocuments(filter);
    const totalPages = Math.ceil(totalRecipes / limit);
    
    // Get filter options
    const brands = await Recipe.distinct('brand');
    const categories = await Recipe.distinct('foodType');
    
    res.render('recipes', {
      title: 'All Recipes - Knockoff Kitchen',
      description: 'Browse our complete collection of copycat recipes for popular brand-name foods.',
      recipes,
      brands,
      categories,
      totalRecipes,
      totalPages,
      currentPage: page,
      selectedBrand: req.query.brand || '',
      selectedCategory: req.query.category || '',
      currentRoute: 'recipes'
    });
  } catch (error) {
    console.error('Error fetching recipes:', error);
    res.status(500).render('error', {
      title: 'Error - Knockoff Kitchen',
      description: 'An error occurred while loading recipes.',
      error: 'Failed to load recipes. Please try again later.',
      currentRoute: 'recipes'
    });
  }
});

// Categories listing
app.get('/categories', async (req, res) => {
  try {
    // Get all unique categories with counts
    const categories = await Recipe.aggregate([
      { $match: { foodType: { $ne: null, $ne: '' } } },
      { $group: { _id: '$foodType', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Add category slugs
    const categoriesWithSlugs = categories.map(category => ({
      ...category,
      categorySlug: category._id ? category._id.toLowerCase().replace(/[^a-z0-9]/g, '-') : 'unknown'
    }));

    res.render('categories', {
      title: 'Recipe Categories - Knockoff Kitchen',
      description: 'Browse our recipe categories. Find appetizers, main courses, desserts, and more copycat recipes.',
      categories: categoriesWithSlugs,
      currentRoute: 'categories'
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).render('error', {
      title: 'Error - Knockoff Kitchen',
      description: 'An error occurred while loading categories.',
      error: 'Failed to load categories. Please try again later.',
      currentRoute: 'categories'
    });
  }
});

// Brands listing
app.get('/brands', async (req, res) => {
  try {
    // Get all unique brands with counts
    const brands = await Recipe.aggregate([
      { $match: { brand: { $ne: null, $ne: '' } } },
      { $group: { _id: '$brand', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    res.render('brands', {
      title: 'Recipe Brands - Knockoff Kitchen',
      description: 'Browse recipes by brand. Find copycat recipes from your favorite restaurants and food companies.',
      brands,
      currentRoute: 'brands'
    });
  } catch (error) {
    console.error('Error fetching brands:', error);
    res.status(500).render('error', {
      title: 'Error - Knockoff Kitchen',
      description: 'An error occurred while loading brands.',
      error: 'Failed to load brands. Please try again later.',
      currentRoute: 'brands'
    });
  }
});

// Search
app.get('/search', async (req, res) => {
  try {
    const query = req.query.q || '';
    let recipes = [];
    let totalResults = 0;
    
    if (query.trim()) {
      // Search in title, description, brand, and foodType
      const searchRegex = new RegExp(query, 'i');
      recipes = await Recipe.find({
        $or: [
          { title: { $regex: searchRegex } },
          { description: { $regex: searchRegex } },
          { brand: { $regex: searchRegex } },
          { foodType: { $regex: searchRegex } }
        ]
      }).limit(50);
      
      totalResults = recipes.length;
    }
    
    res.render('search', {
      title: query ? `Search Results for "${query}" - Knockoff Kitchen` : 'Search Recipes - Knockoff Kitchen',
      description: query ? `Search results for "${query}" on Knockoff Kitchen.` : 'Search thousands of copycat recipes from your favorite brands and restaurants.',
      recipes,
      query,
      totalResults,
      currentRoute: 'search'
    });
  } catch (error) {
    console.error('Error performing search:', error);
    res.status(500).render('error', {
      title: 'Error - Knockoff Kitchen',
      description: 'An error occurred while searching.',
      error: 'Search failed. Please try again later.',
      currentRoute: 'search'
    });
  }
});

// Individual recipe
app.get('/recipes/:brandSlug/:slug', async (req, res) => {
  try {
    const recipe = await Recipe.findOne({
      brandSlug: req.params.brandSlug,
      slug: req.params.slug
    });
    
    if (!recipe) {
      return res.status(404).render('error', {
        title: 'Recipe Not Found - Knockoff Kitchen',
        description: 'The requested recipe could not be found.',
        error: 'Recipe not found. It may have been moved or deleted.',
        currentRoute: 'recipes'
      });
    }
    
    // Parse recipe content
    parseRecipeContent(recipe);
    
    // Get related recipes from same brand
    const relatedRecipes = await Recipe.find({
      brand: recipe.brand,
      _id: { $ne: recipe._id }
    }).limit(5);
    
    res.render('recipe', {
      title: `${recipe.title.replace(/^"(.*)"$|^'(.*)'$/, '$1$2') || recipe.title} - ${recipe.brand} Copycat Recipe`,
      description: recipe.seo?.description || `Learn how to make ${recipe.title.replace(/^"(.*)"$|^'(.*)'$/, '$1$2') || recipe.title} at home with this copycat recipe from ${recipe.brand}.`,
      recipe,
      relatedRecipes,
      currentRoute: 'recipes'
    });
  } catch (error) {
    console.error('Error fetching recipe:', error);
    res.status(500).render('error', {
      title: 'Error - Knockoff Kitchen',
      description: 'An error occurred while loading the recipe.',
      error: 'Failed to load recipe. Please try again later.',
      currentRoute: 'recipes'
    });
  }
});

// About page
app.get('/about', (req, res) => {
  res.render('about', {
    title: 'About Us - Knockoff Kitchen',
    description: 'Learn about Knockoff Kitchen and our mission to help you recreate your favorite brand-name foods at home.',
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

// 404 handler
app.use((req, res) => {
  res.status(404).render('error', {
    title: 'Page Not Found - Knockoff Kitchen',
    description: 'The page you are looking for could not be found.',
    error: 'Page not found. Please check the URL or navigate back to our homepage.',
    currentRoute: null
  });
});

// Error handler
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).render('error', {
    title: 'Server Error - Knockoff Kitchen',
    description: 'An internal server error occurred.',
    error: 'Something went wrong on our end. Please try again later.',
    currentRoute: null
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

module.exports = app;
