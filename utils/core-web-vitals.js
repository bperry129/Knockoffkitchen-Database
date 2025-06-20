/**
 * Core Web Vitals Optimization Utility
 * 
 * This utility focuses on improving the three Core Web Vitals metrics:
 * 1. Largest Contentful Paint (LCP) - loading performance
 * 2. First Input Delay (FID) - interactivity
 * 3. Cumulative Layout Shift (CLS) - visual stability
 */

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

/**
 * Core Web Vitals Middleware for Express
 * 
 * This middleware injects performance optimizations into the HTML response:
 * - Resource hints (preload, preconnect)
 * - Inline critical CSS
 * - Font optimization
 * - Image optimization attributes
 * - JavaScript optimization
 */
function coreWebVitalsMiddleware() {
  return async function(req, res, next) {
    // Store the original send function
    const originalSend = res.send;
    
    // Override the send function for HTML responses
    res.send = function(body) {
      // Only process HTML responses
      if (typeof body === 'string' && res.get('Content-Type')?.includes('text/html')) {
        // Apply Core Web Vitals optimizations
        body = optimizeHtml(body, req);
      }
      
      // Call the original send function with the optimized body
      return originalSend.call(this, body);
    };
    
    next();
  };
}

/**
 * Optimize HTML for Core Web Vitals
 */
function optimizeHtml(html, req) {
  // Skip optimization for non-production environments if needed
  if (process.env.NODE_ENV !== 'production' && process.env.OPTIMIZE_DEV !== 'true') {
    return html;
  }
  
  // Add preload for critical resources
  html = addResourceHints(html);
  
  // Add image loading optimizations
  html = optimizeImages(html);
  
  // Add font display optimizations
  html = optimizeFonts(html);
  
  // Add script loading optimizations
  html = optimizeScripts(html);
  
  // Add layout stability optimizations
  html = preventLayoutShifts(html);
  
  return html;
}

/**
 * Add resource hints (preload, preconnect, etc.)
 */
function addResourceHints(html) {
  // Check if resource hints already exist
  if (html.includes('rel="preload"') && html.includes('rel="preconnect"')) {
    return html;
  }
  
  // Resource hints to add
  const resourceHints = `
    <!-- Resource hints for Core Web Vitals -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="preload" href="/css/style.css" as="style">
    <link rel="preload" href="/images/placeholder.png" as="image" type="image/png">
  `;
  
  // Insert resource hints after the opening head tag
  return html.replace('<head>', '<head>\n' + resourceHints);
}

/**
 * Optimize images for Core Web Vitals
 */
function optimizeImages(html) {
  // Add loading="lazy" to images not in the viewport
  html = html.replace(/<img(?!\s+loading=)(.*?)>/gi, (match, attributes) => {
    // Don't add lazy loading to critical above-the-fold images
    if (attributes.includes('class="hero-image"') || attributes.includes('class="logo"')) {
      return `<img ${attributes}>`;
    }
    return `<img loading="lazy" ${attributes}>`;
  });
  
  // Add width and height attributes to prevent layout shifts
  html = html.replace(/<img(.*?)(?!\s+width=|\s+height=)(.*?)>/gi, (match, attributesBefore, attributesAfter) => {
    // Skip if already has width/height
    if (attributesBefore.includes('width=') || attributesBefore.includes('height=') || 
        attributesAfter.includes('width=') || attributesAfter.includes('height=')) {
      return match;
    }
    return `<img${attributesBefore} width="100%" height="auto"${attributesAfter}>`;
  });
  
  // Add fetchpriority="high" to LCP image
  html = html.replace(/<img(.*?)class="(.*?)lcp-image(.*?)"(.*?)>/gi, 
    '<img$1class="$2lcp-image$3"$4 fetchpriority="high">');
  
  // Add decoding="async" to non-critical images
  html = html.replace(/<img(?!\s+decoding=)(.*?)(?!class="(.*?)lcp-image(.*?)")(.*?)>/gi, 
    '<img decoding="async"$1$4>');
  
  return html;
}

/**
 * Optimize fonts for Core Web Vitals
 */
function optimizeFonts(html) {
  // Add font-display swap to prevent font blocking
  html = html.replace(/<link(.*?)href="https:\/\/fonts.googleapis.com(.*?)>/gi, 
    '<link$1href="https://fonts.googleapis.com$2 font-display="swap">');
  
  return html;
}

/**
 * Optimize script loading for Core Web Vitals
 */
function optimizeScripts(html) {
  // Add defer to non-critical scripts
  html = html.replace(/<script(?!\s+defer|\s+async)(.*?)>(.*?)<\/script>/gi, (match, attributes, content) => {
    // Skip inline scripts that might be critical
    if (content.trim().length > 0) {
      return match;
    }
    // Skip critical scripts
    if (attributes.includes('id="critical"') || attributes.includes('class="critical"')) {
      return match;
    }
    return `<script defer${attributes}>${content}</script>`;
  });
  
  return html;
}

/**
 * Prevent layout shifts for Core Web Vitals
 */
function preventLayoutShifts(html) {
  // Add aspect-ratio containers for images
  html = html.replace(/<div class="(.*?)image-container(.*?)">([\s\S]*?)<img(.*?)><\/div>/gi, 
    (match, classBefore, classAfter, content, imgAttributes) => {
      // Extract width and height if present
      const widthMatch = imgAttributes.match(/width="(\d+)"/);
      const heightMatch = imgAttributes.match(/height="(\d+)"/);
      
      if (widthMatch && heightMatch) {
        const width = parseInt(widthMatch[1]);
        const height = parseInt(heightMatch[1]);
        const aspectRatio = (height / width) * 100;
        
        return `<div class="${classBefore}image-container${classAfter}" style="position: relative; padding-bottom: ${aspectRatio}%; height: 0; overflow: hidden;">${content}<img${imgAttributes} style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover;"></div>`;
      }
      
      return match;
    });
  
  return html;
}

/**
 * Injects Core Web Vitals monitoring script
 */
function injectWebVitalsMonitoring(html) {
  // Only inject in production
  if (process.env.NODE_ENV !== 'production') {
    return html;
  }
  
  const monitoringScript = `
    <!-- Core Web Vitals Monitoring -->
    <script>
    (function() {
      // Feature detection
      if (!('PerformanceObserver' in window)) return;
      
      try {
        // Create performance observer for LCP
        const lcpObserver = new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries();
          const lastEntry = entries[entries.length - 1];
          console.log('LCP:', lastEntry.startTime / 1000, 'seconds');
          
          // Report to analytics (you can replace with your analytics system)
          if (window.gtag) {
            gtag('event', 'web_vitals', {
              event_category: 'Web Vitals',
              event_label: 'LCP',
              value: Math.round(lastEntry.startTime),
              non_interaction: true,
            });
          }
        });
        
        // Start observing LCP
        lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
        
        // Create performance observer for CLS
        const clsObserver = new PerformanceObserver((entryList) => {
          let clsValue = 0;
          for (const entry of entryList.getEntries()) {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
            }
          }
          console.log('CLS:', clsValue);
          
          // Report to analytics
          if (window.gtag) {
            gtag('event', 'web_vitals', {
              event_category: 'Web Vitals',
              event_label: 'CLS',
              value: Math.round(clsValue * 1000),
              non_interaction: true,
            });
          }
        });
        
        // Start observing CLS
        clsObserver.observe({ type: 'layout-shift', buffered: true });
        
        // Create performance observer for FID
        const fidObserver = new PerformanceObserver((entryList) => {
          for (const entry of entryList.getEntries()) {
            console.log('FID:', entry.processingStart - entry.startTime, 'ms');
            
            // Report to analytics
            if (window.gtag) {
              gtag('event', 'web_vitals', {
                event_category: 'Web Vitals',
                event_label: 'FID',
                value: Math.round(entry.processingStart - entry.startTime),
                non_interaction: true,
              });
            }
          }
        });
        
        // Start observing FID
        fidObserver.observe({ type: 'first-input', buffered: true });
      } catch (e) {
        console.error('Web Vitals monitoring error:', e);
      }
    })();
    </script>
  `;
  
  // Insert monitoring script before the closing head tag
  return html.replace('</head>', monitoringScript + '</head>');
}

module.exports = {
  coreWebVitalsMiddleware,
  optimizeHtml,
  injectWebVitalsMonitoring
};
