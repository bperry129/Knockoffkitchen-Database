const mongoose = require('mongoose');
const slugify = require('slugify');

const recipeSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
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
    keywords: String
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
  if (this.isModified('title')) {
    this.slug = slugify(this.title, { lower: true, strict: true });
  }
  if (this.isModified('brand')) {
    this.brandSlug = slugify(this.brand, { lower: true, strict: true });
  }
  if (this.isModified('category')) {
    this.categorySlug = slugify(this.category, { lower: true, strict: true });
  }
  this.updatedAt = Date.now();
  next();
});

// Virtual for recipe URL
recipeSchema.virtual('url').get(function() {
  return `/recipes/${this.brandSlug}/${this.slug}`;
});

// Indexes for performance
recipeSchema.index({ brand: 1, slug: 1 });
recipeSchema.index({ category: 1 });
recipeSchema.index({ featured: 1 });
recipeSchema.index({ tags: 1 });
recipeSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Recipe', recipeSchema);
