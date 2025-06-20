const mongoose = require('mongoose');
const slugify = require('slugify');

const recipeSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  rating: {
    value: {
      type: Number,
      default: 4.5 // Default rating without randomization
    },
    count: {
      type: Number,
      default: 0 // Start with 0 ratings
    },
    userRatings: [{
      userId: String,
      value: Number,
      date: {
        type: Date,
        default: Date.now
      }
    }]
  },
  slug: {
    type: String,
    unique: true
  },
  brand: {
    type: String,
    required: true,
    trim: true
  },
  brandSlug: {
    type: String,
    required: true
  },
  foodType: {
    type: String,
    required: true,
    trim: true
  },
  foodTypeSlug: {
    type: String,
    required: true
  },
  product: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  yield: {
    type: String,
    trim: true
  },
  prepTime: {
    type: String,
    trim: true
  },
  cookTime: {
    type: String,
    trim: true
  },
  totalTime: {
    type: String,
    trim: true
  },
  difficulty: {
    type: String,
    trim: true
  },
  ingredients: [{
    type: String,
    trim: true
  }],
  instructions: [{
    type: String,
    trim: true
  }],
  variations: [{
    title: String,
    description: String
  }],
  tips: [{
    type: String,
    trim: true
  }],
  nutrition: {
    calories: String,
    protein: String,
    carbs: String,
    fat: String,
    fiber: String,
    sugar: String,
    sodium: String
  },
  notes: {
    type: String,
    trim: true
  },
  contentMarkdown: {
    type: String,
    trim: true
  },
  servingSuggestions: [{
    type: String,
    trim: true
  }],
  faqs: [{
    question: String,
    answer: String
  }],
  troubleshooting: [{
    problem: String,
    solution: String
  }],
  image: {
    type: String,
    trim: true
  },
  imageAlt: {
    type: String,
    trim: true
  },
  tags: [{
    type: String,
    trim: true
  }],
  seo: {
    title: String,
    description: String,
    keywords: {
      type: [String],
      default: []
    }
  },
  date: {
    type: Date,
    default: Date.now
  },
  featured: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Create URL-friendly slugs
recipeSchema.pre('save', function(next) {
  // Generate slug if title changes or slug doesn't exist
  if (this.isModified('title') || !this.slug) {
    this.slug = slugify(this.title || 'recipe', { lower: true, strict: true });
  }
  
  // Generate brandSlug if brand changes or brandSlug doesn't exist
  if (this.isModified('brand') || !this.brandSlug) {
    this.brandSlug = slugify(this.brand || 'unknown-brand', { lower: true, strict: true });
  }
  
  // Generate foodTypeSlug if foodType changes or foodTypeSlug doesn't exist
  if (this.isModified('foodType') || !this.foodTypeSlug) {
    this.foodTypeSlug = slugify(this.foodType || 'recipe', { lower: true, strict: true });
  }
  
  this.updatedAt = Date.now();
  next();
});

// Virtual for recipe URL
recipeSchema.virtual('url').get(function() {
  return `/recipes/${this.brandSlug}/${this.slug}`;
});

// Indexes for performance
recipeSchema.index({ brandSlug: 1, slug: 1 }, { unique: true });
recipeSchema.index({ brand: 1 });
recipeSchema.index({ foodType: 1 });
recipeSchema.index({ foodTypeSlug: 1 });
recipeSchema.index({ featured: 1 });
recipeSchema.index({ tags: 1 });
recipeSchema.index({ createdAt: -1 });
recipeSchema.index({ 
  title: 'text', 
  description: 'text', 
  brand: 'text', 
  foodType: 'text' 
});

module.exports = mongoose.model('Recipe', recipeSchema);
