const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const { marked } = require('marked');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Import Recipe model
const Recipe = require('./models/Recipe');

// COST-SAVING OPTIMIZATION #1: In-memory cache
const cache = {
  data: new Map(),
  expiryTimes: new Map(),
  
  set(key, value, ttlMinutes = 30) {
    this.data.set(key, value);
    this.expiryTimes.set(key, Date.now() + (ttlMinutes * 60 * 1000));
  },
  
  get(key) {
    if (this.expiryTimes.get(key) > Date.now()) {
      return this.data.get(key);
    }
    this.data.delete(key);
    this.expiryTimes.delete(key);
    return null;
  },
  
  clear() {
    this.data.clear();
    this.expiryTimes.clear();
  }
};

// Middleware
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// COST-SAVING OPTIMIZATION #2: Optimized MongoDB connection
mongoose.connect(process.env.MONGODB_URI, {
  // Connection pool settings to reduce connection overhead
  maxPoolSize: 5,
  minPoolSize: 1,
  maxIdleTimeMS: 30000,
  serverSelectionTimeoutMS: 5000,
  // Read preferences for better performance
  readPreference: 'secondaryPreferred',
  // Compression to reduce bandwidth costs
  compressors: ['zlib']
}).then(() => {
  console.log('Connected to MongoDB with optimizations');
}).catch(error => {
  console.error('MongoDB connection error:', error);
});

// COST-SAVING OPTIMIZATION #3: Create essential indexes
async function createIndexes() {
  try {
    await Recipe.collection.createIndex({ brandSlug: 1, slug: 1 }, { unique: true });
    await Recipe.collection.createIndex({ brand: 1 });
    await Recipe.collection.createIndex({ foodType: 1 });
    await Recipe.collection.createIndex({ featured: 1 });
    await Recipe.collection.createIndex({ createdAt: -1 });
    await Recipe.collection.createIndex({ 
      title: 'text', 
      description: 'text', 
      brand: 'text', 
      foodType: 'text' 
    });
    console.log('Database indexes created for cost optimization');
  } catch (error) {
    console.log('Indexes may already exist:', error.message);
  }
}

// COST-SAVING OPTIMIZATION #4: Cached aggregation functions
async function getCachedStats() {
  const cacheKey = 'site_stats';
  let stats = cache.get(cacheKey);
  
  if (!stats) {
    console.log('Fetching fresh stats from database...');
    // Single aggregation query instead of multiple separate queries
    const result = await Recipe.aggregate([
      {
        $facet: {
          totalRecipes: [{ $count: "count" }],
          brands: [
            { $group: { _id: "$brand" } },
            { $count: "count" }
          ],
          categories: [
            { $group: { _id: "$foodType" } },
            { $count: "count" }
          ]
        }
      }
    ]);
    
    stats = {
      totalRecipes: result[0].totalRecipes[0]?.count || 0,
      totalBrands: result[0].brands[0]?.count || 0,
      totalCategories: result[0].categories[0]?.count || 0
    };
    
    // Cache for 2 hours to reduce database hits
    cache.set(cacheKey, stats, 120);
  }
  
  return stats;
}

async function getCachedHomePageData() {
  const cacheKey = 'homepage_data';
  let data = cache.get(cacheKey);
  
  if (!data) {
    console.log('Fetching fresh homepage data...');
    // Single aggregation query instead of multiple separate queries
    const result = await Recipe.aggregate([
      {
        $facet: {
          featured: [
            { $match: { featured: true } },
            { $limit: 6 }
          ],
          recent: [
            { $sort: { createdAt: -1 } },
            { $limit: 8 }
          ]
        }
      }
    ]);
    
    data = {
      featuredRecipes: result[0].featured || [],
      recentRecipes: result[0].recent || []
    };
    
    // Cache for 30 minutes
    cache.set(cacheKey, data, 30);
  }
  
  return data;
}

async function getCachedBrands() {
  const cacheKey = 'brands_list';
  let brands = cache.get(cacheKey);
  
  if (!brands) {
    console.log('Fetching fresh brands data...');
    brands = await Recipe.aggregate([
      { $match: { brand: { $ne: null, $ne: '' } } },
      { $group: { _id: '$brand', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    // Cache for 4 hours
    cache.set(cacheKey, brands, 240);
  }
  
  return brands;
}

async function getCachedCategories() {
  const cacheKey = 'categories_list';
  let categories = cache.get(cacheKey);
  
  if (!categories) {
    console.log('Fetching fresh categories data...');
    categories = await Recipe.aggregate([
      { $match: { foodType: { $ne: null, $ne: '' } } },
      { $group: { _id: '$foodType', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    const categoriesWithSlugs = categories.map(category => ({
      ...category,
      categorySlug: category._id ? category._id.toLowerCase().replace(/[^a-z0-9]/g, '-') : 'unknown'
    }));
    
    // Cache for 4 hours
    cache.set(cacheKey, categoriesWithSlugs, 240);
  }
  
  return categories;
}

// Ultra-safe content parsing (keeping original function)
function parseRecipeContent(recipe) {
  if (recipe.ingredients && recipe.ingredients.length > 0 && recipe.instructions && recipe.instructions.length > 0) {
    let parsedContent = '<div class="recipe-structured-content">';
    
    parsedContent += '<h2 class="text-2xl font-bold text-slate-900 mb-4 mt-8 pb-2 border-b border-slate-200">Ingredients</h2>';
    parsedContent += '<ul class="list-disc list-inside space-y-2 mb-6 pl-4">';
    recipe.ingredients.forEach(ingredient => {
      if (ingredient && ingredient.trim()) {
        parsedContent += `<li class="text-slate-700 leading-relaxed pl-2">${ingredient.trim()}</li>`;
      }
    });
    parsedContent += '</ul>';
    
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
    try {
      let safeMarkdown = recipe.contentMarkdown.trim();
      let htmlContent = marked(safeMarkdown);
      
      if (htmlContent) {
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

// Initialize indexes on startup
createIndexes();

// Routes

// OPTIMIZED Homepage - Reduced from 5 queries to 2 aggregate queries
app.get('/', async (req, res) => {
  try {
    const [homePageData, stats] = await Promise.all([
      getCachedHomePageData(),
      getCachedStats()
    ]);
    
    res.render('index', {
      title: 'Knockoff Kitchen - Copycat Recipes for Popular Brand Foods',
      description: 'Discover thousands of copycat recipes from your favorite restaurants and brands. Create homemade versions of popular dishes with our easy-to-follow instructions.',
      featuredRecipes: homePageData.featuredRecipes,
      recentRecipes: homePageData.recentRecipes,
      counts: stats,
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

// OPTIMIZED Recipes listing with caching
app.get('/recipes', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 24;
    const skip = (page - 1) * limit;
    
    // Create cache key based on filters
    const cacheKey = `recipes_${req.query.brand || 'all'}_${req.query.category || 'all'}_${page}`;
    let cachedData = cache.get(cacheKey);
    
    if (!cachedData) {
      console.log('Fetching fresh recipes data...');
      
      let filter = {};
      if (req.query.brand) {
        filter.brandSlug = req.query.brand;
      }
      if (req.query.category) {
        filter.foodTypeSlug = req.query.category;
      }
      
      // Use aggregate to get both recipes and count in one query
      const [result] = await Recipe.aggregate([
        { $match: filter },
        {
          $facet: {
            recipes: [
              { $sort: { createdAt: -1 } },
              { $skip: skip },
              { $limit: limit }
            ],
            totalCount: [
              { $count: "count" }
            ]
          }
        }
      ]);
      
      cachedData = {
        recipes: result.recipes,
        totalRecipes: result.totalCount[0]?.count || 0,
        totalPages: Math.ceil((result.totalCount[0]?.count || 0) / limit)
      };
      
      // Cache for 15 minutes
      cache.set(cacheKey, cachedData, 15);
    }
    
    // Get filter options (cached separately)
    const [brands, categories] = await Promise.all([
      getCachedBrands(),
      getCachedCategories()
    ]);
    
    res.render('recipes', {
      title: 'All Recipes - Knockoff Kitchen',
      description: 'Browse our complete collection of copycat recipes for popular brand-name foods.',
      recipes: cachedData.recipes,
      brands: brands.map(b => b._id),
      categories: categories.map(c => c._id),
      totalRecipes: cachedData.totalRecipes,
      totalPages: cachedData.totalPages,
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

// OPTIMIZED Categories with caching
app.get('/categories', async (req, res) => {
  try {
    const categories = await getCachedCategories();

    res.render('categories', {
      title: 'Recipe Categories - Knockoff Kitchen',
      description: 'Browse our recipe categories. Find appetizers, main courses, desserts, and more copycat recipes.',
      categories,
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

// OPTIMIZED Brands with caching
app.get('/brands', async (req, res) => {
  try {
    const brands = await getCachedBrands();

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

// OPTIMIZED Search with text index
app.get('/search', async (req, res) => {
  try {
    const query = req.query.q || '';
    let recipes = [];
    let totalResults = 0;
    
    if (query.trim()) {
      // Use text index for much faster search
      const cacheKey = `search_${query.trim()}_50`;
      let searchData = cache.get(cacheKey);
      
      if (!searchData) {
        console.log('Performing fresh search...');
        recipes = await Recipe.find(
          { $text: { $search: query } },
          { score: { $meta: "textScore" } }
        )
        .sort({ score: { $meta: "textScore" } })
        .limit(50);
        
        searchData = {
          recipes,
          totalResults: recipes.length
        };
        
        // Cache search results for 10 minutes
        cache.set(cacheKey, searchData, 10);
      } else {
        recipes = searchData.recipes;
        totalResults = searchData.totalResults;
      }
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

// OPTIMIZED Individual recipe with caching
app.get('/recipes/:brandSlug/:slug', async (req, res) => {
  try {
    const cacheKey = `recipe_${req.params.brandSlug}_${req.params.slug}`;
    let recipeData = cache.get(cacheKey);
    
    if (!recipeData) {
      console.log('Fetching fresh recipe data...');
      
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
      
      parseRecipeContent(recipe);
      
      // Get related recipes
      const relatedRecipes = await Recipe.find({
        brand: recipe.brand,
        _id: { $ne: recipe._id }
      }).limit(5);
      
      recipeData = { recipe, relatedRecipes };
      
      // Cache recipe for 60 minutes
      cache.set(cacheKey, recipeData, 60);
    }
    
    res.render('recipe', {
      title: `${recipeData.recipe.title.replace(/^["'"'""«»]|["'"'""«»]$/g, '').trim()} - ${recipeData.recipe.brand} Copycat Recipe`,
      description: recipeData.recipe.seo?.description || `Learn how to make ${recipeData.recipe.title.replace(/^["'"'""«»]|["'"'""«»]$/g, '').trim()} at home with this copycat recipe from ${recipeData.recipe.brand}.`,
      recipe: recipeData.recipe,
      relatedRecipes: recipeData.relatedRecipes,
      url: `/recipes/${req.params.brandSlug}/${req.params.slug}`,
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

// COST-SAVING: Cache clearing endpoint (for manual cache refresh)
app.get('/admin/clear-cache', (req, res) => {
  cache.clear();
  res.json({ message: 'Cache cleared successfully' });
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

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down gracefully...');
  mongoose.connection.close();
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  console.log(`Optimized server running on http://localhost:${PORT}`);
  console.log('Cost optimizations enabled:');
  console.log('- In-memory caching active');
  console.log('- Database indexes created');
  console.log('- Connection pooling optimized');
  console.log('- Aggregation queries minimized');
});

module.exports = app;
