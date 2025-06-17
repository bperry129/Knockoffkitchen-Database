# Knockoff Kitchen - Recipe Website

A modern, SEO-optimized recipe website built with Node.js, Express, MongoDB, and Tailwind CSS. Features a comprehensive collection of copycat recipes from popular brands and restaurants.

## Features

- **SEO-Optimized**: Perfect meta tags, structured data, and clean URLs
- **Fast Performance**: Optimized images, efficient database queries, and minimal JavaScript
- **Mobile-First Design**: Responsive design that works on all devices
- **Database-Driven**: MongoDB integration with 23k+ recipes
- **Search & Filtering**: Advanced search and filtering by brand/category
- **Clean Architecture**: Organized code structure with proper separation of concerns

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose ODM
- **Frontend**: EJS templating, Tailwind CSS
- **Deployment**: Ready for production deployment

## Prerequisites

- Node.js (v16 or higher)
- MongoDB Atlas account (or local MongoDB installation)
- npm or yarn package manager

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd knockoff-kitchen-new
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   - Copy `.env.example` to `.env`
   - Update the MongoDB connection string with your credentials:
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster0.iton0z.mongodb.net/KK-NEW-Project
   PORT=3000
   NODE_ENV=development
   ```

4. **Build CSS**
   ```bash
   npm run build-css
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Visit the application**
   - Open http://localhost:3000 in your browser

## Available Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm run build-css` - Build Tailwind CSS
- `npm run watch-css` - Watch and rebuild CSS on changes

## Project Structure

```
knockoff-kitchen-new/
├── models/
│   └── Recipe.js          # MongoDB recipe schema
├── views/
│   ├── layout.ejs         # Main layout template
│   ├── index.ejs          # Homepage
│   ├── recipe.ejs         # Individual recipe page
│   ├── recipes.ejs        # Recipe listing page
│   ├── brands.ejs         # Brands page
│   ├── categories.ejs     # Categories page
│   ├── search.ejs         # Search results page
│   ├── about.ejs          # About page
│   ├── contact.ejs        # Contact page
│   └── error.ejs          # Error page
├── public/
│   ├── css/
│   │   ├── input.css      # Tailwind source
│   │   └── style.css      # Compiled CSS
│   └── robots.txt         # SEO robots file
├── server.js              # Main server file
├── package.json           # Dependencies and scripts
└── tailwind.config.js     # Tailwind configuration
```

## Database Schema

The Recipe model includes the following fields:
- `title` - Recipe name
- `slug` - URL-friendly version of title
- `brand` - Restaurant/brand name
- `category` - Recipe category
- `description` - Recipe description
- `ingredients` - Array of ingredients
- `instructions` - Array of cooking steps
- `image` - Recipe image URL
- `nutrition` - Nutritional information
- `prepTime`, `cookTime`, `totalTime` - Timing information
- `yield` - Serving size
- `tips`, `variations`, `faqs` - Additional content
- `servingSuggestions` - Serving ideas
- `notes` - Additional notes

## SEO Features

- **Meta Tags**: Dynamic title, description, and Open Graph tags
- **Structured Data**: Recipe schema markup for rich snippets
- **Clean URLs**: SEO-friendly URL structure
- **Sitemap**: XML sitemap generation
- **Robots.txt**: Search engine crawling instructions
- **Performance**: Fast loading times and optimized images

## URL Structure

- `/` - Homepage
- `/recipes` - All recipes with pagination and filters
- `/recipes/[brand-slug]/[recipe-slug]` - Individual recipe pages
- `/brands` - All brands listing
- `/categories` - All categories listing
- `/search?q=query` - Search results
- `/about` - About page
- `/contact` - Contact page

## Performance Optimizations

- Database indexing on frequently queried fields
- Pagination for large result sets
- Efficient aggregation queries
- Minimal client-side JavaScript
- Optimized images and assets
- Clean, semantic HTML

## Production Deployment

1. **Set environment variables**
   ```bash
   NODE_ENV=production
   MONGODB_URI=your-production-mongodb-uri
   PORT=3000
   ```

2. **Build assets**
   ```bash
   npm run build-css
   ```

3. **Start production server**
   ```bash
   npm start
   ```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support or questions, please contact [hello@knockoffkitchen.com](mailto:hello@knockoffkitchen.com).
