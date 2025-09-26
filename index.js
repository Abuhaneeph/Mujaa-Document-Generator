const fs = require("fs");
const path = require("path");
const PizZip = require("pizzip");
const Docxtemplater = require("docxtemplater");

// Function to fix placeholders in existing template while preserving content
function fixExistingTemplate() {
  try {
    console.log("🔧 Fixing placeholders in existing template...");
    
    const templatePath = path.resolve("NPF.docx");
    const backupPath = path.resolve("offer_backup.docx");
    const fixedPath = path.resolve("offer_fixed.docx");
    
    if (!fs.existsSync(templatePath)) {
      console.log("❌ Template file 'offer.docx' not found");
      return false;
    }
    
    // Create backup
    fs.copyFileSync(templatePath, backupPath);
    console.log("✅ Backup created: offer_backup.docx");
    
    // Read the template
    const content = fs.readFileSync(templatePath, "binary");
    const zip = new PizZip(content);
    
    // Get the main document XML
    let documentXml = zip.file("word/document.xml").asText();
    console.log("✅ Template XML extracted");
    
    // Show original problematic content (first 1000 chars for debugging)
    console.log("\n📋 Original XML snippet:");
    const xmlSnippet = documentXml.substring(0, 1000) + "...";
    console.log(xmlSnippet);
    
    // Define placeholder mappings - what they should be
    const placeholderMappings = {
      'DATE': '{{DATE}}',
      'NAME': '{{NAME}}',
      'ADDRESS': '{{ADDRESS}}',
      'LOCATION': '{{LOCATION}}',
      'PRICE': '{{PRICE}}',
      'PRICE_IN_WORDS': '{{PRICE_IN_WORDS}}'
    };
    
    console.log("\n🔄 Fixing placeholders...");
    
    // Fix each placeholder by finding broken parts and reassembling them
    Object.entries(placeholderMappings).forEach(([key, placeholder]) => {
      console.log(`\n   Fixing ${placeholder}...`);
      
      // Pattern 1: Find split opening braces {{ and KEY
      // Look for patterns like: {{KEY or {{<formatting>KEY
      const openPattern = new RegExp(`\\{\\{[^}]*?${key}`, 'gi');
      const openMatches = documentXml.match(openPattern);
      if (openMatches) {
        console.log(`     Found ${openMatches.length} opening pattern(s): ${openMatches}`);
      }
      
      // Pattern 2: Find KEY}} or KEY<formatting>}}
      const closePattern = new RegExp(`${key}[^{]*?\\}\\}`, 'gi');
      const closeMatches = documentXml.match(closePattern);
      if (closeMatches) {
        console.log(`     Found ${closeMatches.length} closing pattern(s): ${closeMatches}`);
      }
      
      // Strategy 1: Remove all XML formatting between placeholder parts
      // This regex finds any XML content between {{ and }} that contains our key
      const fullPattern = new RegExp(
        `\\{\\{[\\s\\S]*?${key}[\\s\\S]*?\\}\\}`, 
        'gi'
      );
      
      documentXml = documentXml.replace(fullPattern, (match) => {
        // If this match contains our key, replace with clean placeholder
        if (match.toUpperCase().includes(key.toUpperCase())) {
          console.log(`     Replaced: "${match.substring(0, 50)}..." with "${placeholder}"`);
          return placeholder;
        }
        return match;
      });
      
      // Strategy 2: Fix specific broken patterns
      // Fix {{KEY variations
      documentXml = documentXml.replace(
        new RegExp(`\\{\\{\\s*${key}(?![A-Z])`, 'gi'),
        `{{${key}`
      );
      
      // Fix KEY}} variations
      documentXml = documentXml.replace(
        new RegExp(`(?<![A-Z])${key}\\s*\\}\\}`, 'gi'),
        `${key}}}`
      );
    });
    
    // Additional cleanup: Fix any remaining malformed braces
    documentXml = documentXml.replace(/\{\{\s*\{\{/g, '{{');
    documentXml = documentXml.replace(/\}\}\s*\}\}/g, '}}');
    
    // Update the zip with fixed XML
    zip.file("word/document.xml", documentXml);
    
    // Generate the fixed template
    const fixedBuffer = zip.generate({ type: "nodebuffer" });
    fs.writeFileSync(fixedPath, fixedBuffer);
    
    console.log("\n✅ Fixed template saved as: offer_fixed.docx");
    return fixedPath;
    
  } catch (error) {
    console.error("❌ Error fixing template:", error.message);
    return false;
  }
}

// Function to manually clean placeholders using regex patterns
function manualCleanup() {
  try {
    console.log("\n🧹 Attempting manual cleanup...");
    
    const templatePath = path.resolve("off.docx");
    const content = fs.readFileSync(templatePath, "binary");
    const zip = new PizZip(content);
    
    let documentXml = zip.file("word/document.xml").asText();
    
    // More aggressive cleanup - remove ALL formatting between { and }
    const aggressivePatterns = [
      // Match {{ followed by any content and ending with }}
      { 
        pattern: /\{\{[^}]*?DATE[^}]*?\}\}/gi, 
        replacement: '{{DATE}}' 
      },
      { 
        pattern: /\{\{[^}]*?NAME[^}]*?\}\}/gi, 
        replacement: '{{NAME}}' 
      },
      { 
        pattern: /\{\{[^}]*?ADDR[^}]*?ESS[^}]*?\}\}/gi, 
        replacement: '{{ADDRESS}}' 
      },
      { 
        pattern: /\{\{[^}]*?LOCA[^}]*?TION[^}]*?\}\}/gi, 
        replacement: '{{LOCATION}}' 
      },
      { 
        pattern: /\{\{[^}]*?PRIC[^}]*?E[^}]*?\}\}/gi, 
        replacement: '{{PRICE}}' 
      },
      { 
        pattern: /\{\{[^}]*?PRIC[^}]*?ORDS[^}]*?\}\}/gi, 
        replacement: '{{PRICE_IN_WORDS}}' 
      }
    ];
    
    aggressivePatterns.forEach(({ pattern, replacement }) => {
      const matches = documentXml.match(pattern);
      if (matches) {
        console.log(`   Cleaning ${replacement}: found ${matches.length} matches`);
        console.log(`   Sample: ${matches[0].substring(0, 50)}...`);
        documentXml = documentXml.replace(pattern, replacement);
      }
    });
    
    // Update and save
    zip.file("word/document.xml", documentXml);
    const cleanedBuffer = zip.generate({ type: "nodebuffer" });
    
    const cleanedPath = path.resolve("offer_manually_cleaned.docx");
    fs.writeFileSync(cleanedPath, cleanedBuffer);
    
    console.log("✅ Manually cleaned template saved as: offer_manually_cleaned.docx");
    return cleanedPath;
    
  } catch (error) {
    console.error("❌ Manual cleanup failed:", error.message);
    return false;
  }
}

// Function to test a template
function testTemplate(templatePath) {
  try {
    console.log(`\n🧪 Testing: ${path.basename(templatePath)}`);
    
    const content = fs.readFileSync(templatePath, "binary");
    const zip = new PizZip(content);
    
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });
    
    // Test with sample data
    doc.render({
      DATE: "August 26, 2025",
      NAME: "John Doe",
      ADDRESS: "123 Main Street, Ikeja",
      LOCATION: "Lagos State, Nigeria", 
      PRICE: "₦1,500,000",
      PRICE_IN_WORDS: "One Million Five Hundred Thousand Naira Only"
    });
    
    // Generate test document
    const buffer = doc.getZip().generate({
      type: "nodebuffer",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
    
    const testPath = templatePath.replace('.docx', '_test_output.docx');
    fs.writeFileSync(testPath, buffer);
    
    console.log("✅ Template works! Test output:", path.basename(testPath));
    return true;
    
  } catch (error) {
    console.log("❌ Template still has issues:");
    
    if (error.properties?.errors) {
      error.properties.errors.forEach((err, i) => {
        console.log(`   ${i + 1}. ${err.message}`);
        console.log(`      Tag: ${err.properties?.xtag}`);
      });
    } else {
      console.log(`   ${error.message}`);
    }
    return false;
  }
}

// Function to show XML content around placeholders
function debugPlaceholders() {
  try {
    console.log("\n🔍 Debugging placeholder content...");
    
    const templatePath = path.resolve("offer.docx");
    const content = fs.readFileSync(templatePath, "binary");
    const zip = new PizZip(content);
    
    const documentXml = zip.file("word/document.xml").asText();
    
    // Find and show content around each placeholder
    const keys = ['DATE', 'NAME', 'ADDR', 'LOCA', 'PRIC'];
    
    keys.forEach(key => {
      const regex = new RegExp(`.{0,100}${key}.{0,100}`, 'gi');
      const matches = documentXml.match(regex);
      
      if (matches) {
        console.log(`\n📍 Found "${key}" in these contexts:`);
        matches.forEach((match, i) => {
          console.log(`   ${i + 1}: ...${match}...`);
        });
      }
    });
    
  } catch (error) {
    console.error("Debug failed:", error.message);
  }
}

// Main execution
async function main() {
  console.log("🛠️  Existing Template Placeholder Fixer");
  console.log("======================================");
  
  // Step 1: Debug current state
  debugPlaceholders();
  
  // Step 2: Try standard fix
  const fixedPath = fixExistingTemplate();
  
  if (fixedPath) {
    const works = testTemplate(fixedPath);
    
    if (works) {
      console.log("\n🎉 SUCCESS! Your template is fixed!");
      console.log("\nNext steps:");
      console.log("1. Test the fixed template: offer_fixed.docx");
      console.log("2. If it looks good, replace your original template");
      console.log("3. Your original is backed up as: offer_backup.docx");
      return;
    }
  }
  
  // Step 3: Try manual cleanup
  console.log("\n🔄 Trying manual cleanup approach...");
  const cleanedPath = manualCleanup();
  
  if (cleanedPath) {
    const works = testTemplate(cleanedPath);
    
    if (works) {
      console.log("\n🎉 SUCCESS! Manual cleanup worked!");
      console.log("Use: offer_manually_cleaned.docx");
      return;
    }
  }
  
  // Step 4: Final advice
  console.log("\n😔 Both automated fixes failed. Manual intervention needed:");
  console.log("1. Open your original offer.docx in Word");
  console.log("2. Find each placeholder text (DATE, NAME, ADDRESS, LOCATION, PRICE, PRICE_IN_WORDS)");
  console.log("3. Delete the problematic text completely");
  console.log("4. Type the new placeholder fresh: {{DATE}}, {{NAME}}, etc.");
  console.log("5. Type each placeholder in ONE continuous motion without pausing");
  console.log("6. Don't format the placeholders (no bold, italic, etc.)");
  console.log("7. Save the document");
  console.log("8. Run this script again to test");
}

main().catch(console.error);