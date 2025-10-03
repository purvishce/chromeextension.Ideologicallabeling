// Content script to extract article content and headings from the current page
function extractHeadings() {
  const headings = [];
  
  // Get all heading elements (h1, h2, h3, h4, h5, h6)
  const headingElements = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
  
  headingElements.forEach((heading, index) => {
    headings.push({
      level: parseInt(heading.tagName.substring(1)), // Extract number from H1, H2, etc.
      text: heading.textContent.trim(),
      id: heading.id || `heading-${index}`,
      tagName: heading.tagName
    });
  });
  
  return headings;
}

function extractArticleContent() {
  // Try to find the main article content
  const articleSelectors = [
    'article',
    '[role="main"]',
    '.article-content',
    '.post-content',
    '.entry-content',
    '.content',
    'main',
    '.main-content'
  ];
  
  let articleElement = null;
  for (const selector of articleSelectors) {
    articleElement = document.querySelector(selector);
    if (articleElement) break;
  }
  
  // If no specific article element found, use the body
  if (!articleElement) {
    articleElement = document.body;
  }
  
  // Extract title
  const title = document.title || 
                document.querySelector('h1')?.textContent?.trim() || 
                'Untitled';
  
  // Extract main text content
  const textContent = articleElement.textContent || articleElement.innerText || '';
  
  // Clean up the text (remove extra whitespace, etc.)
  const cleanText = textContent
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 8000); // Limit to 8000 characters for API
  
  return {
    title: title,
    text: cleanText,
    url: window.location.href
  };
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getHeadings') {
    const headings = extractHeadings();
    sendResponse({ headings: headings });
  } else if (request.action === 'getArticleContent') {
    const articleContent = extractArticleContent();
    sendResponse({ articleContent: articleContent });
  }
});

// Also make the functions available globally for debugging
window.extractHeadings = extractHeadings;
window.extractArticleContent = extractArticleContent;
