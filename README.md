# Political Bias Analyzer - Chrome Extension

A Chrome extension that analyzes political bias in news articles and web content using OpenAI's GPT API. The extension extracts article content and provides a visual breakdown of left vs. right political leaning percentages.



## Features

- **Political Bias Analysis**: Analyzes news articles and web content for political bias using AI
- **Visual Charts**: Displays results in an interactive donut chart with left/right percentages
- **Secure API Key Storage**: Stores your OpenAI API key locally with security features
- **Content Extraction**: Automatically extracts article content from various website layouts
- **Privacy Focused**: Only sends article content to OpenAI API, no personal data shared
- **Fallback Visualization**: Shows text-based charts when Chart.js fails to load

## Installation

### Prerequisites
- Chrome browser (or Chromium-based browser)
- OpenAI API key (get one at [OpenAI Platform](https://platform.openai.com/api-keys))

### Setup Steps

1. **Download the Extension**
   ```bash
   git clone <repository-url>
   cd chromeextension.Ideologicallabeling
   ```

2. **Install in Chrome**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top-right corner)
   - Click "Load unpacked"
   - Select the extension folder containing `manifest.json`

3. **Configure API Key**
   - Click the extension icon in your browser toolbar
   - Enter your OpenAI API key in the provided field
   - Click "Save Key" to validate and store it securely

## Usage

1. **Navigate to an Article**: Go to any news article or webpage you want to analyze
2. **Open the Extension**: Click the "Political Bias Analyzer" icon in your browser toolbar
3. **Analyze Content**: Click the "Analyze Political Bias" button
4. **View Results**: See the political bias breakdown with:
   - Percentage analysis (Left vs. Right leaning)
   - Visual donut chart
   - Article metadata (title, URL)

## How It Works

### Content Extraction
The extension uses a content script (`content.js`) that:
- Scans the webpage for article content using multiple selectors
- Extracts headings (H1-H6) and main text content
- Limits content to 8000 characters for API efficiency
- Handles various website layouts automatically

### AI Analysis
- Sends article content to OpenAI's GPT-3.5-turbo model
- Uses a specialized prompt to analyze political bias
- Returns structured percentage breakdown
- Processes results with error handling and validation

### Security Features
- API key validation before saving
- Local storage only (no external servers)
- Masked API key display
- Clear key functionality
- Test API connectivity before analysis

## File Structure

```
chromeextension.Ideologicallabeling/
├── manifest.json          # Extension configuration
├── popup.js              # Main popup interface logic
├── hello.html            # Extension popup UI
├── content.js            # Content script for article extraction
├── background.js         # Background service worker
└── README.md            # This file
```

## API Requirements

- **OpenAI API Key**: Required for bias analysis
- **Model**: Uses `gpt-3.5-turbo` for cost efficiency
- **Rate Limits**: Subject to OpenAI's API rate limits
- **Cost**: Analysis uses minimal tokens (~100 max_tokens per request)

## Privacy & Security

- ✅ API key stored locally in browser storage only
- ✅ No data sent to third parties except OpenAI
- ✅ Article content sent to OpenAI for analysis only
- ✅ No personal information collected or stored
- ✅ Clear API key functionality for easy removal

## Troubleshooting

### Common Issues

**"Content Script Not Loaded" Error**
- Solution: Refresh the webpage and try again
- This happens when the extension is installed on an already-open page

**"Invalid API Key" Error**
- Ensure your API key starts with `sk-` and is 20+ characters
- Verify the key is valid at [OpenAI Platform](https://platform.openai.com/api-keys)

**"No Article Content Found"**
- The page may not have detectable article content
- Try on a different news website or article page

**Chart Not Displaying**
- Extension includes fallback visualization when Chart.js fails
- Check internet connection for CDN loading

### API Key Management

- **Save**: Enter key and click "Save Key" to validate and store
- **Clear**: Click "Clear" button to remove stored key
- **Update**: Modify the key field and click "Save Key" again

## Development

### Local Development

1. Make changes to source files
2. Go to `chrome://extensions/`
3. Click the refresh icon on the extension card
4. Test changes in the extension popup

### Key Files to Modify

- `popup.js`: Main functionality and UI logic
- `content.js`: Article content extraction logic
- `hello.html`: Extension popup interface
- `manifest.json`: Extension permissions and configuration

### Testing

- Test on various news websites
- Verify API key validation works
- Check error handling for different scenarios
- Ensure chart rendering works properly

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is open source. Please ensure you comply with OpenAI's usage policies when using their API.

## Disclaimer

This tool is for educational and informational purposes only. Political bias analysis is inherently subjective and should not be the sole basis for decision-making. The AI analysis reflects patterns in the training data and may not capture all nuances of political content.