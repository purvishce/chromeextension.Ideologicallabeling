// API key storage with security
let apiKey = null;
let isKeyValid = false;

// Load API key from storage with error handling
function loadApiKey() {
  try {
    if (chrome && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['openai_api_key'], (result) => {
        console.log('Loading API key from storage:', result);
        apiKey = result.openai_api_key;
        if (apiKey) {
          isKeyValid = validateApiKey(apiKey);
          console.log('API key loaded, valid:', isKeyValid);
        }
        updateUI();
      });
    } else {
      console.error('Chrome storage API not available');
      updateUI();
    }
  } catch (error) {
    console.error('Error loading API key from storage:', error);
    updateUI();
  }
}

// Load API key when popup opens
loadApiKey();

// Validate API key format
function validateApiKey(key) {
  if (!key || typeof key !== 'string') return false;
  // OpenAI API keys start with 'sk-' and are at least 20 characters long
  return key.startsWith('sk-') && key.length >= 20;
}

// Mask API key for display
function maskApiKey(key) {
  if (!key || key.length < 8) return key;
  return key.substring(0, 8) + '•'.repeat(key.length - 8);
}

document.getElementById('btn').addEventListener('click', async () => {
  if (!apiKey || !isKeyValid) {
    document.getElementById('msg').innerHTML = `
      <div style="color: red; margin-bottom: 10px;">
        <strong>Valid API Key Required:</strong><br>
        Please enter a valid OpenAI API key above.<br>
        <small style="color: #666;">API keys start with 'sk-' and are 40+ characters long.</small>
      </div>
    `;
    return;
  }

  try {
    document.getElementById('msg').innerHTML = '<div style="color: blue;">Analyzing article for political bias...</div>';
    
    // Get the current active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Check if we're on a valid page
    if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('moz-extension://')) {
      document.getElementById('msg').innerHTML = `
        <div style="color: red;">
          <strong>Invalid Page:</strong><br>
          Please navigate to a news article or webpage to analyze.
        </div>
      `;
      return;
    }
    
    // Send message to content script to get article content
    const response = await chrome.tabs.sendMessage(tab.id, { action: 'getArticleContent' });
    
    if (response && response.articleContent) {
      await analyzePoliticalBias(response.articleContent);
    } else {
      document.getElementById('msg').textContent = 'No article content found on this page';
    }
  } catch (error) {
    console.error('Error analyzing article:', error);
    console.log('Full error object:', error);
    console.log('Error stack:', error.stack);
    
    // Handle specific connection errors
    if (error.message.includes('Could not establish connection') || error.message.includes('Receiving end does not exist')) {
      console.log('Content script connection error detected');
      document.getElementById('msg').innerHTML = `
        <div style="color: red;">
          <strong>Content Script Not Loaded:</strong><br>
          Please refresh the page and try again.<br>
          <small style="color: #666;">The extension needs to reload its content script.</small>
        </div>
      `;
    } else {
      console.log('General error in article analysis:', error.message);
      document.getElementById('msg').innerHTML = `
        <div style="color: red;">
          <strong>Error:</strong> ${error.message}
        </div>
      `;
    }
  }
});

async function analyzePoliticalBias(articleContent) {
  const systemPrompt = "You are a political bias rating assistant. Your job is to analyze text and determine if it leans left or right politically. You must always output percentages that add up to 100%, in this exact format: - Left leaning: X% - Right leaning: Y% Do not explain or add any extra text. Just return the percentages.";
  
  const userPrompt = `Analyze the following article and provide the left vs. right leaning percentages: ${articleContent.title}\n\n${articleContent.text}`;
  
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 100,
        temperature: 0.3
      })
    });
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    const analysis = data.choices[0].message.content;
    
    displayBiasAnalysis(analysis, articleContent);
  } catch (error) {
    console.error('OpenAI API Error:', error);
    console.log('OpenAI API error details:', error);
    console.log('API response status:', error.status);
    console.log('API response text:', error.response);
    
    document.getElementById('msg').innerHTML = `
      <div style="color: red;">
        <strong>API Error:</strong><br>
        ${error.message}
      </div>
    `;
  }
}

// Parse percentages from OpenAI response
function parseBiasPercentages(analysis) {
  console.log('Parsing bias analysis:', analysis);
  
  // Extract percentages using regex
  const leftMatch = analysis.match(/left.*?(\d+)%/i);
  const rightMatch = analysis.match(/right.*?(\d+)%/i);
  
  let leftPercent = 0;
  let rightPercent = 0;
  
  if (leftMatch) {
    leftPercent = parseInt(leftMatch[1]);
  }
  if (rightMatch) {
    rightPercent = parseInt(rightMatch[1]);
  }
  
  // If percentages don't add up to 100, normalize them
  const total = leftPercent + rightPercent;
  if (total > 0) {
    leftPercent = Math.round((leftPercent / total) * 100);
    rightPercent = Math.round((rightPercent / total) * 100);
  }
  
  console.log('Parsed percentages - Left:', leftPercent, 'Right:', rightPercent);
  
  return { left: leftPercent, right: rightPercent };
}

// Create donut chart
function createBiasChart(leftPercent, rightPercent) {
  const ctx = document.getElementById('biasChart');
  if (!ctx) {
    console.error('Chart canvas not found');
    return;
  }
  
  // Check if Chart.js is loaded
  if (typeof Chart === 'undefined') {
    console.error('Chart.js library not loaded');
    document.getElementById('msg').innerHTML += `
      <div style="color: red; margin-top: 10px;">
        <strong>Chart Error:</strong> Chart.js library failed to load. Showing text results only.
      </div>
    `;
    return;
  }
  
  // Destroy existing chart if it exists
  if (window.biasChartInstance) {
    window.biasChartInstance.destroy();
  }
  
  try {
    window.biasChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Left Leaning', 'Right Leaning'],
      datasets: [{
        data: [leftPercent, rightPercent],
        backgroundColor: ['#3498db', '#e74c3c'], // Blue for left, Red for right
        borderColor: ['#2980b9', '#c0392b'],
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            padding: 20,
            font: {
              size: 12
            }
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return context.label + ': ' + context.parsed + '%';
            }
          }
        }
      },
      cutout: '60%'
    }
  });
  } catch (error) {
    console.error('Error creating chart:', error);
    document.getElementById('msg').innerHTML += `
      <div style="color: red; margin-top: 10px;">
        <strong>Chart Creation Error:</strong> ${error.message}
      </div>
    `;
  }
}

function displayBiasAnalysis(analysis, articleContent) {
  const msgElement = document.getElementById('msg');
  const chartContainer = document.getElementById('chartContainer');
  
  // Parse the percentages
  const percentages = parseBiasPercentages(analysis);
  
  let html = `
    <div style="border: 1px solid #ddd; padding: 10px; border-radius: 5px; background: #f9f9f9;">
      <h4 style="margin: 0 0 10px 0; color: #333;">Political Bias Analysis</h4>
      <div style="font-family: monospace; background: white; padding: 8px; border-radius: 3px; margin: 10px 0;">
        ${analysis}
      </div>
      <div style="font-size: 12px; color: #666; margin-top: 10px;">
        <strong>Article:</strong> ${articleContent.title}<br>
        <strong>URL:</strong> <a href="${articleContent.url}" target="_blank" style="color: #0066cc;">${articleContent.url}</a>
      </div>
    </div>
  `;
  
  msgElement.innerHTML = html;
  
  // Show and create chart
  if (chartContainer) {
    chartContainer.style.display = 'block';
    
    // Check if Chart.js is available before creating chart
    if (typeof Chart !== 'undefined') {
      createBiasChart(percentages.left, percentages.right);
    } else {
      // Fallback: show visual representation without Chart.js
      showFallbackChart(percentages.left, percentages.right);
    }
  }
}

// Fallback chart display when Chart.js is not available
function showFallbackChart(leftPercent, rightPercent) {
  const chartContainer = document.getElementById('chartContainer');
  if (!chartContainer) return;
  
  const total = leftPercent + rightPercent;
  const leftWidth = total > 0 ? (leftPercent / total) * 100 : 50;
  const rightWidth = total > 0 ? (rightPercent / total) * 100 : 50;
  
  chartContainer.innerHTML = `
    <div style="text-align: center; margin: 10px 0;">
      <h4 style="margin: 0 0 15px 0; color: #333;">Political Bias Visualization</h4>
      <div style="display: flex; align-items: center; justify-content: center; margin-bottom: 10px;">
        <div style="width: 200px; height: 20px; border: 2px solid #333; border-radius: 10px; overflow: hidden; display: flex;">
          <div style="width: ${leftWidth}%; height: 100%; background: #3498db; display: flex; align-items: center; justify-content: center; color: white; font-size: 10px; font-weight: bold;">
            ${leftPercent}%
          </div>
          <div style="width: ${rightWidth}%; height: 100%; background: #e74c3c; display: flex; align-items: center; justify-content: center; color: white; font-size: 10px; font-weight: bold;">
            ${rightPercent}%
          </div>
        </div>
      </div>
      <div style="display: flex; justify-content: space-around; font-size: 12px;">
        <div style="color: #3498db; font-weight: bold;">🔵 Left: ${leftPercent}%</div>
        <div style="color: #e74c3c; font-weight: bold;">🔴 Right: ${rightPercent}%</div>
      </div>
    </div>
  `;
}

function updateUI() {
  const apiKeyInput = document.getElementById('apiKey');
  const saveBtn = document.getElementById('saveApiKey');
  const clearBtn = document.getElementById('clearApiKey');
  
  if (apiKey && isKeyValid) {
    apiKeyInput.value = maskApiKey(apiKey);
    apiKeyInput.style.borderColor = '#4CAF50';
    apiKeyInput.disabled = true;
    saveBtn.textContent = 'Saved ✓';
    saveBtn.style.background = '#4CAF50';
    if (clearBtn) clearBtn.style.display = 'inline-block';
  } else if (apiKey) {
    apiKeyInput.value = maskApiKey(apiKey);
    apiKeyInput.style.borderColor = '#f44336';
    apiKeyInput.disabled = false;
    saveBtn.textContent = 'Update Key';
    saveBtn.style.background = '#ff9800';
  } else {
    apiKeyInput.value = '';
    apiKeyInput.style.borderColor = '#ddd';
    apiKeyInput.disabled = false;
    saveBtn.textContent = 'Save Key';
    saveBtn.style.background = '#4CAF50';
    if (clearBtn) clearBtn.style.display = 'none';
  }
}

document.getElementById('saveApiKey').addEventListener('click', async () => {
  const apiKeyInput = document.getElementById('apiKey');
  const key = apiKeyInput.value.trim();
  
  if (validateApiKey(key)) {
    // Test the API key before saving
    document.getElementById('msg').innerHTML = '<div style="color: blue;">Testing API key...</div>';
    
    try {
      console.log('Testing API key with OpenAI...');
      const testResponse = await fetch('https://api.openai.com/v1/models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('API test response status:', testResponse.status);
      
      if (testResponse.ok) {
        console.log('API key test successful!');
        // Save API key with proper error handling
        try {
          if (chrome && chrome.storage && chrome.storage.local) {
            chrome.storage.local.set({ openai_api_key: key }, () => {
              if (chrome.runtime.lastError) {
                console.error('Error saving API key:', chrome.runtime.lastError);
                document.getElementById('msg').innerHTML = `
                  <div style="color: red;">
                    <strong>Save Error:</strong><br>
                    ${chrome.runtime.lastError.message}
                  </div>
                `;
              } else {
                console.log('API key saved successfully');
                apiKey = key;
                isKeyValid = true;
                updateUI();
                document.getElementById('msg').innerHTML = `
                  <div style="color: green;">
                    <strong>✓ API Key Validated & Saved!</strong><br>
                    <small>Successfully connected to OpenAI API</small>
                  </div>
                `;
              }
            });
          } else {
            console.error('Chrome storage API not available, using fallback');
            // Fallback: store in memory only
            apiKey = key;
            isKeyValid = true;
            updateUI();
            document.getElementById('msg').innerHTML = `
              <div style="color: orange;">
                <strong>⚠ API Key Validated (Memory Only)</strong><br>
                <small>Key will be lost when extension closes</small>
              </div>
            `;
          }
        } catch (error) {
          console.error('Error in storage operation:', error);
          document.getElementById('msg').innerHTML = `
            <div style="color: red;">
              <strong>Storage Error:</strong><br>
              ${error.message}
            </div>
          `;
        }
      } else {
        console.log('API key test failed with status:', testResponse.status);
        const errorData = await testResponse.text();
        console.log('API error response:', errorData);
        document.getElementById('msg').innerHTML = `
          <div style="color: red;">
            <strong>API Key Test Failed:</strong><br>
            Status: ${testResponse.status}<br>
            <small>Please check your API key and try again.</small>
          </div>
        `;
      }
    } catch (error) {
      console.error('Error testing API key:', error);
      console.log('API key test error details:', error);
      document.getElementById('msg').innerHTML = `
        <div style="color: red;">
          <strong>API Key Test Error:</strong><br>
          ${error.message}<br>
          <small>Please check your internet connection and try again.</small>
        </div>
      `;
    }
  } else {
    console.log('Invalid API key format provided');
    apiKeyInput.style.borderColor = '#f44336';
    document.getElementById('msg').innerHTML = `
      <div style="color: red;">
        <strong>Invalid API Key Format:</strong><br>
        OpenAI API keys start with 'sk-' and are 20+ characters long.
      </div>
    `;
  }
});

// Add clear API key functionality
document.addEventListener('DOMContentLoaded', () => {
  const clearBtn = document.getElementById('clearApiKey');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (confirm('Are you sure you want to clear your API key? This will remove it from storage.')) {
        try {
          if (chrome && chrome.storage && chrome.storage.local) {
            chrome.storage.local.remove(['openai_api_key'], () => {
              if (chrome.runtime.lastError) {
                console.error('Error clearing API key:', chrome.runtime.lastError);
                document.getElementById('msg').innerHTML = `
                  <div style="color: red;">
                    <strong>Clear Error:</strong><br>
                    ${chrome.runtime.lastError.message}
                  </div>
                `;
              } else {
                console.log('API key cleared successfully');
                apiKey = null;
                isKeyValid = false;
                updateUI();
                document.getElementById('msg').innerHTML = '<div style="color: orange;">API key cleared from storage.</div>';
              }
            });
          } else {
            console.log('Chrome storage not available, clearing from memory');
            apiKey = null;
            isKeyValid = false;
            updateUI();
            document.getElementById('msg').innerHTML = '<div style="color: orange;">API key cleared from memory.</div>';
          }
        } catch (error) {
          console.error('Error clearing API key:', error);
          document.getElementById('msg').innerHTML = `
            <div style="color: red;">
              <strong>Clear Error:</strong><br>
              ${error.message}
            </div>
          `;
        }
      }
    });
  }
});
