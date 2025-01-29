import { Request, Response } from 'express';
import { db } from '../../config/database';
import { logger } from '../../utils/logger';
import env from '../../config/env.config';

export async function getInstallationInstructions(req: Request, res: Response) {
   try {
       const { shop } = req.query;
       
       if (!shop) {
           return res.status(400).json({
               error: 'Shop parameter is required'
           });
       }

       const config = await db('store_configurations')
        .whereRaw('JSON_UNQUOTE(JSON_EXTRACT(credentials, "$.storeName")) = ?', [shop])
        .first();

       if (!config) {
           return res.status(404).json({
               error: 'Store configuration not found'
           });
       }

       res.status(200).send(`
<!DOCTYPE html>
<html>
<head>
   <title>Wharf Sales Rep AI Chat Widget Installation</title>
   <style>
       body {
           font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
           line-height: 1.6;
           max-width: 800px;
           margin: 0 auto;
           padding: 20px;
           color: #333;
       }
       .header {
           text-align: center;
           margin-bottom: 40px;
       }
       .header h1 {
           color: #FF6813;
           margin-bottom: 10px;
       }
       .code-block {
           background: #f8f9fa;
           padding: 20px;
           border-radius: 8px;
           border: 1px solid #e9ecef;
           margin: 20px 0;
           position: relative;
       }
       .code-block pre {
           margin: 0;
           white-space: pre-wrap;
           word-wrap: break-word;
       }
       .code-block code {
           font-family: 'Courier New', Courier, monospace;
           font-size: 14px;
       }
       .copy-button {
           background: #FF6813;
           color: white;
           border: none;
           padding: 10px 20px;
           border-radius: 5px;
           cursor: pointer;
           font-size: 14px;
           transition: background-color 0.3s;
           position: absolute;
           top: 10px;
           right: 10px;
       }
       .copy-button:hover {
           background: #e55a0a;
       }
       .steps {
           margin-top: 30px;
           background: #fff;
           padding: 20px;
           border-radius: 8px;
           box-shadow: 0 2px 4px rgba(0,0,0,0.1);
       }
       .steps h2 {
           color: #FF6813;
           margin-top: 0;
       }
       .step {
           margin: 15px 0;
           padding-left: 24px;
           position: relative;
       }
       .step:before {
           content: "";
           width: 8px;
           height: 8px;
           background: #FF6813;
           border-radius: 50%;
           position: absolute;
           left: 0;
           top: 8px;
       }
       .note {
           background: #fff3e0;
           padding: 15px;
           border-left: 4px solid #FF6813;
           margin-top: 20px;
           border-radius: 4px;
       }
   </style>
</head>
<body>
   <div class="header">
       <h1>Wharf Chat Widget Installation</h1>
       <p>Follow these steps to add the AI chat widget to your store</p>
   </div>
   
   <div class="code-block">
       <pre><code>&lt;script src="${env.APP_URL}/widget/wharf-chat.min.js">&lt;/script>
&lt;script>
   WharfChat.init({
       shopId: "${config.shop_id}",
       platform: "shopify",
       apiKey: "${config.api_key}"
   });
&lt;/script></code></pre>
       <button class="copy-button" onclick="copyCode()">Copy Code</button>
   </div>

   <div class="steps">
       <h2>Installation Steps</h2>
       <div class="step">Go to Online Store > Themes</div>
       <div class="step">Click 'Actions' > 'Edit code'</div>
       <div class="step">Open theme.liquid</div>
       <div class="step">Find the closing &lt;/body> tag</div>
       <div class="step">Paste the code above just before the &lt;/body> tag</div>
       <div class="step">Click 'Save'</div>
   </div>

   <div class="note">
       <strong>Note:</strong> After installation, the chat widget will appear as a floating button on your store. It may take up to 5 minutes for changes to reflect on your live store.
   </div>

   <script>
       function copyCode() {
           try {
                const codeElement = document.querySelector('code');
                const range = document.createRange();
                range.selectNode(codeElement);
                window.getSelection()?.removeAllRanges();
                window.getSelection()?.addRange(range);
                document.execCommand('copy');
                window.getSelection()?.removeAllRanges();

                const button = document.querySelector('.copy-button');
                button.textContent = 'Copied!';
                setTimeout(() => {
                    button.textContent = 'Copy Code';
                }, 2000);
            } catch (err) {
                console.error('Failed to copy:', err);
            }
       }
   </script>
</body>
</html>
       `);
   } catch (error) {
       logger.error('Error getting installation instructions:', error);
       res.status(500).json({ 
           error: 'Failed to get installation instructions',
           message: error instanceof Error ? error.message : 'Unknown error'
       });
   }
}