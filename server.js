import fs from "fs";
import path from "path";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import archiver from "archiver";
import express from "express";
import multer from "multer";
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const upload = multer({ dest: 'uploads/' });
const execAsync = promisify(exec);

// Middleware with increased limits and timeout
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static('public'));

// Add CORS middleware for better browser compatibility
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Expose-Headers', 'Content-Disposition');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Set longer timeout for document generation
app.use('/api/generate-documents', (req, res, next) => {
  req.setTimeout(300000); // 5 minutes
  res.setTimeout(300000); // 5 minutes
  next();
});

// Template file names - bank-specific and common documents
const BANK_SPECIFIC_TEMPLATES = [
  'confirmation_of_property_availability.docx',
  'confirmation_of_property_title.docx', 
  'indemnity.docx',
  'readiness.docx',
  'verification.docx',
  'indicative.docx',
  'legal_search.docx'
];

const JIGAWA_SPECIFIC_TEMPLATES = [
  'pension_cert.pdf', // PDF file for Jigawa (no placeholders)
  'rangaza_c_of_o.pdf',
  'rangaza_deed_of_assignment.pdf'
];

const KBL_SPECIFIC_TEMPLATES = [
  'kbl_insurance.docx',
  'mujaa_offer_letter.docx',
  'valuation_report.docx'
];

const KBL_SPECIFIC_PDFS = [
  'clearance_cert.pdf',
  'rangaza_c_of_o.pdf',
  'rangaza_deed_of_assignment.pdf'
];

const NSIA_SPECIFIC_TEMPLATES = [
  'nsia_insurance.docx',
  'mujaa_offer_letter.docx',
  'valuation_report.docx'
];

const COMMON_TEMPLATES = [
  // No common templates - all are now bank-specific
];

// Function to get templates to process based on bank
function getTemplatesToProcess(mortgageBank) {
  const bankDir = getBankTemplateDirectory(mortgageBank);
  let templates = [...BANK_SPECIFIC_TEMPLATES, ...COMMON_TEMPLATES];
  
  // Add bank-specific templates 
  if (bankDir === 'jigawa') {
    templates = [...templates, ...JIGAWA_SPECIFIC_TEMPLATES, ...NSIA_SPECIFIC_TEMPLATES];
  } else if (bankDir === 'kebbi') {
    templates = [...templates, ...KBL_SPECIFIC_TEMPLATES];
  }
  
  return templates;
}

// All template files (for backward compatibility)
const TEMPLATE_FILES = [...BANK_SPECIFIC_TEMPLATES, ...COMMON_TEMPLATES];

// Function to get bank-specific template directory
function getBankTemplateDirectory(mortgageBank) {
  if (mortgageBank && mortgageBank.toLowerCase().includes('jigawa')) {
    return 'jigawa';
  } else if (mortgageBank && mortgageBank.toLowerCase().includes('kebbi')) {
    return 'kebbi';
  }
  return null; // Use default templates directory
}

// Function to get template path based on bank and template type
function getTemplatePath(templateFile, mortgageBank) {
  const templatesDir = path.join(__dirname, 'templates');
  
  // Check if it's a bank-specific template
  if (BANK_SPECIFIC_TEMPLATES.includes(templateFile)) {
    const bankDir = getBankTemplateDirectory(mortgageBank);
    if (bankDir) {
      const bankSpecificPath = path.join(templatesDir, bankDir, templateFile);
      if (fs.existsSync(bankSpecificPath)) {
        return bankSpecificPath;
      }
    }
  }
  
  // Check if it's KBL-specific template (Kebbi bank)
  if (KBL_SPECIFIC_TEMPLATES.includes(templateFile)) {
    const bankDir = getBankTemplateDirectory(mortgageBank);
    if (bankDir === 'kebbi') {
      const bankSpecificPath = path.join(templatesDir, bankDir, templateFile);
      if (fs.existsSync(bankSpecificPath)) {
        return bankSpecificPath;
      }
    }
  }
  
  // Check if it's NSIA-specific template (Jigawa bank)
  if (NSIA_SPECIFIC_TEMPLATES.includes(templateFile)) {
    const bankDir = getBankTemplateDirectory(mortgageBank);
    if (bankDir === 'jigawa') {
      const bankSpecificPath = path.join(templatesDir, bankDir, templateFile);
      if (fs.existsSync(bankSpecificPath)) {
        return bankSpecificPath;
      }
    }
  }
  
  // Fall back to common templates directory
  return path.join(templatesDir, templateFile);
}

// Utility function to convert number to words with proper formatting
function numberToWords(amount) {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const scales = ['', 'Thousand', 'Million', 'Billion'];

  if (amount === 0) return 'Zero Naira Only';

  // Split into naira and kobo
  const parts = amount.toString().split('.');
  const naira = parseInt(parts[0]);
  const kobo = parts[1] ? parseInt(parts[1].padEnd(2, '0').substring(0, 2)) : 0;

  function convertGroup(num) {
    let result = '';
    
    const hundreds = Math.floor(num / 100);
    const remainder = num % 100;
    
    if (hundreds > 0) {
      result += ones[hundreds] + ' Hundred';
    }
    
    if (remainder >= 10 && remainder < 20) {
      if (result) result += ' ';
      result += teens[remainder - 10];
    } else {
      const tensDigit = Math.floor(remainder / 10);
      const onesDigit = remainder % 10;
      
      if (tensDigit > 0) {
        if (result) result += ' ';
        result += tens[tensDigit];
      }
      
      if (onesDigit > 0) {
        if (result) result += ' ';
        result += ones[onesDigit];
      }
    }
    
    return result;
  }

  let result = '';
  let scaleIndex = 0;
  let tempAmount = naira;

  while (tempAmount > 0) {
    const group = tempAmount % 1000;
    if (group > 0) {
      const groupWords = convertGroup(group);
      if (scaleIndex > 0) {
        result = groupWords + ' ' + scales[scaleIndex] + (result ? ' ' + result : '');
      } else {
        result = groupWords;
      }
    }
    tempAmount = Math.floor(tempAmount / 1000);
    scaleIndex++;
  }

  result += ' Naira';

  if (kobo > 0) {
    result += ', ' + convertGroup(kobo) + ' Kobo';
  }

  result += ' Only';
  return result;
}

// Add utility function to format numbers with commas and 2 decimal places
function formatCurrency(amount) {
  return parseFloat(amount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

// Add utility function to generate UID
function generateUID() {
  return Math.random().toString().substring(2, 18).padStart(16, '0');
}

// Add utility function to calculate dates for KBL
function calculateKBLDates(dateA) {
  // KBL_DATE_ONE should be exactly DATE_A (formatted with ordinal)
  const dateOne = formatDateWithOrdinal(dateA);
  
  // KBL_DATE_TWO should be DATE_A + one year
  const dateTwo = new Date(dateA);
  dateTwo.setFullYear(dateTwo.getFullYear() + 1);
  
  return {
    kblDateOne: dateOne,
    kblDateTwo: formatDateWithOrdinal(dateTwo)
  };
}

// Utility function to format date with superscript
function formatDate(date = new Date()) {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  
  // Add ordinal suffix
  let suffix = 'th';
  if (day === 1 || day === 21 || day === 31) suffix = 'st';
  else if (day === 2 || day === 22) suffix = 'nd';
  else if (day === 3 || day === 23) suffix = 'rd';
  
  return `${month} ${day}${suffix}, ${year}`;
}

// Calculate property details based on CV
function calculatePropertyDetails(cv) {
  // First calculate equity amount and truncate to 2 decimal places
  const equityAmount = Math.floor((cv / 4) * 100) / 100;
  const minLoanAmount = 500000;
  const maxLoanAmount = 2500000;
  const minPropertyAmount = 3000000;
  
  let loanAmount, propertyAmount;
  
  if (equityAmount >= 3000000) {
    // For high equity amounts, round property to nearest million
    const targetProperty = Math.ceil((equityAmount + minLoanAmount) / 1000000) * 1000000;
    propertyAmount = Math.floor(targetProperty * 100) / 100; // Truncate to 2 decimal places
    
    // Calculate loan amount and ROUND UP to ensure property amount adds up correctly
    const loanAmountRaw = propertyAmount - equityAmount;
    loanAmount = Math.ceil(loanAmountRaw * 100) / 100; // ROUND UP to 2 decimal places
    
    // Ensure loan amount is within limits
    if (loanAmount > maxLoanAmount) {
      loanAmount = Math.floor(maxLoanAmount * 100) / 100; // Truncate to 2 decimal places
      propertyAmount = Math.floor((equityAmount + loanAmount) * 100) / 100; // Recalculate property
    }
  } else {
    // For lower equity amounts, ensure property amount is exactly minPropertyAmount
    propertyAmount = minPropertyAmount; // Exactly 3,000,000.00
    
    // Calculate loan amount and ROUND UP to ensure property amount adds up correctly
    const loanAmountRaw = propertyAmount - equityAmount;
    loanAmount = Math.ceil(loanAmountRaw * 100) / 100; // ROUND UP to 2 decimal places
    
    // Ensure loan amount is within limits
    if (loanAmount > maxLoanAmount) {
      loanAmount = Math.floor(maxLoanAmount * 100) / 100; // Truncate to 2 decimal places
      propertyAmount = Math.floor((equityAmount + loanAmount) * 100) / 100; // Recalculate property
    }
  }
  
  // For minimum property cases, ensure property amount is exactly 3,000,000.00
  if (propertyAmount === minPropertyAmount) {
    // Calculate loan amount to make the total exactly 3,000,000.00
    const targetPropertyCents = 300000000; // 3,000,000.00 in cents
    const equityCents = Math.floor(equityAmount * 100);
    const loanCents = targetPropertyCents - equityCents;
    
    loanAmount = Math.floor(loanCents) / 100;
    propertyAmount = minPropertyAmount; // Keep exactly 3,000,000.00
  } else {
    // For all other cases, ensure property amount equals equity + loan (with rounding)
    // Recalculate property amount to ensure it matches equity + loan
    const equityCents = Math.floor(equityAmount * 100);
    const loanCents = Math.floor(loanAmount * 100);
    const propertyCents = equityCents + loanCents;
    
    // Convert back to decimal
    propertyAmount = Math.floor(propertyCents) / 100;
    loanAmount = Math.floor(loanCents) / 100;
  }
  
  // Calculate number of bedrooms
  const noOfBedroom = propertyAmount >= 10000000 ? 3 : 2;
  
  // Calculate other values
  const repaymentYrs = 7; // 84 months = 7 years
  const repaymentAmount = Math.floor((loanAmount / 84) * 100) / 100; // Truncate to 2 decimal places
  const processingFee = Math.floor((equityAmount * 0.01) * 100) / 100; // Truncate to 2 decimal places
  
  return {
    equityAmount,
    loanAmount,
    propertyAmount,
    noOfBedroom,
    repaymentYrs,
    repaymentAmount,
    processingFee
  };
}

// Add utility function to generate random house size
function generateHouseSize() {
  // Generate random dimensions between 25-50 ft
  const width = Math.floor(Math.random() * (50 - 25 + 1)) + 25;
  const length = Math.floor(Math.random() * (80 - 40 + 1)) + 40;
  const sizeInFt = `${width}ft X ${length}ft`;
  
  // Convert to square meters (1 foot = 0.3048 meters)
  const widthInM = width * 0.3048;
  const lengthInM = length * 0.3048;
  const sizeInSqm = Math.round(widthInM * lengthInM);
  
  return {
    sizeInFt,
    sizeInSqm: `${sizeInSqm}sqm`
  };
}

// Add utility function to generate random two-digit numbers
function generateRandomTwoDigit() {
  // Generate random number between 10 and 99 (inclusive)
  return Math.floor(Math.random() * (99 - 10 + 1)) + 10;
}

// Add utility function to generate random time within working hours (8:00 AM - 4:00 PM)
function generateRandomWorkingTime() {
  // Working hours: 8:00 AM to 4:00 PM (8:00 to 16:00 in 24-hour format)
  const startHour = 8;  // 8:00 AM
  const endHour = 16;   // 4:00 PM
  
  // Generate random hour between 8 and 16 (inclusive)
  const randomHour = Math.floor(Math.random() * (endHour - startHour + 1)) + startHour;
  
  // Generate random minute (0-59)
  const randomMinute = Math.floor(Math.random() * 60);
  
  // Format the time
  const hour12 = randomHour > 12 ? randomHour - 12 : randomHour === 0 ? 12 : randomHour;
  const ampm = randomHour >= 12 ? 'PM' : 'AM';
  const minuteStr = randomMinute.toString().padStart(2, '0');
  
  return `${hour12}:${minuteStr}${ampm}`;
}

// Add utility function to calculate MUJAA dates (current date + 90 weekdays)
function calculateMUJAADates(dateC) {
  // MUJAA_DATE_ONE should be exactly DATE_C (formatted)
  const dateOne = formatDate(dateC);
  
  // MUJAA_DATE_TWO should be DATE_C + 90 weekdays (excluding weekends)
  let dateTwo = new Date(dateC);
  let daysAdded = 0;
  
  while (daysAdded < 90) {
    dateTwo.setDate(dateTwo.getDate() + 1);
    // Skip weekends (Saturday = 6, Sunday = 0)
    if (dateTwo.getDay() !== 0 && dateTwo.getDay() !== 6) {
      daysAdded++;
    }
  }
  
  return {
    mujaaDateOne: dateOne,
    mujaaDateTwo: formatDate(dateTwo)
  };
}

// Add utility function to calculate NSIA maturity date
function calculateNSIAMaturityDate(dateA) {
  // NSIA_MATURITY_DATE should be DATE_A + 1 year
  const maturityDate = new Date(dateA);
  maturityDate.setFullYear(maturityDate.getFullYear() + 1);
  
  return {
    nsiaMaturityDate: formatDate(maturityDate)
  };
}

// Add utility function to shift weekend dates to next Monday
function shiftToNextMonday(date) {
  const dayOfWeek = date.getDay();
  if (dayOfWeek === 0) { // Sunday
    date.setDate(date.getDate() + 1); // Move to Monday
  } else if (dayOfWeek === 6) { // Saturday
    date.setDate(date.getDate() + 2); // Move to Monday
  }
  return date;
}

// Add utility function to get next weekday (excluding weekends)
function getNextWeekday(date) {
  do {
    date.setDate(date.getDate() + 1);
  } while (date.getDay() === 0 || date.getDay() === 6); // Skip weekends
  return date;
}

// Add utility function to get previous weekday (excluding weekends)
function getPreviousWeekday(date) {
  do {
    date.setDate(date.getDate() - 1);
  } while (date.getDay() === 0 || date.getDay() === 6); // Skip weekends
  return date;
}

// Add utility function to convert DOCX to PDF using Python script with retry
async function convertDocxToPdf(docxFilePath, pdfDir, retryCount = 0) {
  try {
    const fileName = path.basename(docxFilePath, '.docx');
    const pdfFileName = `${fileName}.pdf`;
    const pdfFilePath = path.join(pdfDir, pdfFileName);
    
    console.log(`🔄 Converting ${fileName}.docx to PDF... (attempt ${retryCount + 1})`);
    
    // Call the Python script to convert DOCX to PDF
    const pythonScript = path.join(__dirname, 'docx_to_pdf_converter.py');
    const command = `python "${pythonScript}" "${docxFilePath}" -o "${pdfFilePath}"`;
    
    console.log(`🐍 Executing: ${command}`);
    
    try {
      const { stdout, stderr } = await execAsync(command);
      
      if (stderr) {
        console.warn(`⚠️ Python script warnings: ${stderr}`);
      }
      
      if (stdout) {
        console.log(`📄 Python output: ${stdout}`);
      }
    } catch (execError) {
      // Even if the command fails due to encoding issues, check if PDF was created
      console.warn(`⚠️ Python script execution had issues: ${execError.message}`);
    }
    
    // Check if PDF file was created (regardless of script exit code)
    if (fs.existsSync(pdfFilePath)) {
      const stats = fs.statSync(pdfFilePath);
      console.log(`✅ Successfully converted to PDF: ${pdfFileName} (${stats.size} bytes)`);
      return pdfFilePath;
    } else {
      // Retry up to 2 times
      if (retryCount < 2) {
        console.log(`🔄 Retrying conversion (attempt ${retryCount + 2})...`);
        await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds
        return convertDocxToPdf(docxFilePath, pdfDir, retryCount + 1);
      } else {
        throw new Error(`PDF file was not created after ${retryCount + 1} attempts: ${pdfFilePath}`);
      }
    }
    
  } catch (error) {
    console.error(`❌ Error converting ${path.basename(docxFilePath)} to PDF:`, error.message);
    throw error;
  }
}

// Add utility function to convert multiple DOCX files to PDF in batch
async function convertMultipleDocxToPdf(docxFiles, pdfDir) {
  try {
    if (docxFiles.length === 0) {
      console.log('⚠️ No DOCX files to convert');
      return [];
    }
    
    console.log(`🔄 Converting ${docxFiles.length} DOCX files to PDF in batch...`);
    
    // Call the Python script to convert multiple DOCX files to PDF
    const pythonScript = path.join(__dirname, 'docx_to_pdf_converter.py');
    const docxFilesStr = docxFiles.map(file => `"${file}"`).join(' ');
    const command = `python "${pythonScript}" -b ${docxFilesStr} --batch-output-dir "${pdfDir}"`;
    
    console.log(`🐍 Executing batch conversion: ${command}`);
    
    try {
      const { stdout, stderr } = await execAsync(command);
      
      if (stderr) {
        console.warn(`⚠️ Python batch script warnings: ${stderr}`);
      }
      
      if (stdout) {
        console.log(`📄 Python batch output: ${stdout}`);
      }
    } catch (execError) {
      console.warn(`⚠️ Python batch script execution had issues: ${execError.message}`);
    }
    
    // Check which PDF files were created
    const pdfFiles = [];
    for (const docxFile of docxFiles) {
      const fileName = path.basename(docxFile, '.docx');
      const pdfFileName = `${fileName}.pdf`;
      const pdfFilePath = path.join(pdfDir, pdfFileName);
      
      if (fs.existsSync(pdfFilePath)) {
        const stats = fs.statSync(pdfFilePath);
        console.log(`✅ Successfully converted to PDF: ${pdfFileName} (${stats.size} bytes)`);
        pdfFiles.push(pdfFilePath);
      } else {
        console.warn(`⚠️ PDF file was not created: ${pdfFileName}`);
      }
    }
    
    console.log(`✅ Batch conversion completed: ${pdfFiles.length}/${docxFiles.length} files converted`);
    return pdfFiles;
    
  } catch (error) {
    console.error(`❌ Error in batch PDF conversion:`, error.message);
    throw error;
  }
}

// Add utility function to merge all PDF files into one combined PDF
async function mergeAllPdfs(pdfFiles, pdfDir) {
  try {
    if (pdfFiles.length === 0) {
      console.log('⚠️ No PDF files to merge');
      return null;
    }
    
    const combinedPdfPath = path.join(pdfDir, 'combined_documents.pdf');
    console.log(`🔄 Merging ${pdfFiles.length} PDF files into combined document...`);
    
    // Call the Python script to merge PDFs
    const pythonScript = path.join(__dirname, 'docx_to_pdf_converter.py');
    const pdfFilesStr = pdfFiles.map(file => `"${file}"`).join(' ');
    const command = `python "${pythonScript}" -m ${pdfFilesStr} --merge-output "${combinedPdfPath}"`;
    
    console.log(`🐍 Executing merge: ${command}`);
    
    try {
      const { stdout, stderr } = await execAsync(command);
      
      if (stderr) {
        console.warn(`⚠️ Python merge script warnings: ${stderr}`);
      }
      
      if (stdout) {
        console.log(`📄 Python merge output: ${stdout}`);
      }
    } catch (execError) {
      console.warn(`⚠️ Python merge script execution had issues: ${execError.message}`);
    }
    
    // Check if combined PDF was created
    if (fs.existsSync(combinedPdfPath)) {
      const stats = fs.statSync(combinedPdfPath);
      console.log(`✅ Successfully created combined PDF: combined_documents.pdf (${stats.size} bytes)`);
      return combinedPdfPath;
    } else {
      throw new Error(`Combined PDF file was not created: ${combinedPdfPath}`);
    }
    
  } catch (error) {
    console.error(`❌ Error merging PDFs:`, error.message);
    throw error;
  }
}

// Add utility function to split PDF into individual pages
async function splitPdfIntoPages(pdfPath, outputDir, baseName) {
  try {
    console.log(`🔄 Splitting PDF into individual pages: ${path.basename(pdfPath)}`);
    
    // Call Python script to split PDF
    const pythonScript = path.join(__dirname, 'docx_to_pdf_converter.py');
    const command = `python "${pythonScript}" --split-pdf "${pdfPath}" --split-output-dir "${outputDir}" --split-base-name "${baseName}"`;
    
    console.log(`🐍 Executing PDF split: ${command}`);
    
    try {
      const { stdout, stderr } = await execAsync(command);
      
      if (stderr) {
        console.warn(`⚠️ Python split script warnings: ${stderr}`);
      }
      
      if (stdout) {
        console.log(`📄 Python split output: ${stdout}`);
      }
    } catch (execError) {
      console.warn(`⚠️ Python split script execution had issues: ${execError.message}`);
    }
    
    // Find all generated page files
    const pageFiles = [];
    let pageNum = 1;
    
    while (true) {
      const pageFile = path.join(outputDir, `${baseName}_page_${pageNum}.pdf`);
      if (fs.existsSync(pageFile)) {
        pageFiles.push({
          path: pageFile,
          name: `${baseName}_page_${pageNum}.pdf`,
          pageNumber: pageNum,
          type: 'split_page'
        });
        pageNum++;
      } else {
        break;
      }
    }
    
    console.log(`✅ Successfully split PDF into ${pageFiles.length} pages`);
    return pageFiles;
    
  } catch (error) {
    console.error(`❌ Error splitting PDF:`, error.message);
    throw error;
  }
}

// Add utility function to merge PDFs in custom order
async function mergePdfsInCustomOrder(orderedPdfFiles, pdfDir, outputFileName = 'custom_ordered_documents.pdf') {
  try {
    if (orderedPdfFiles.length === 0) {
      console.log('⚠️ No PDF files to merge in custom order');
      return null;
    }
    
    const combinedPdfPath = path.join(pdfDir, outputFileName);
    console.log(`🔄 Merging ${orderedPdfFiles.length} PDF files in custom order...`);
    
    // Call the Python script to merge PDFs in the specified order
    const pythonScript = path.join(__dirname, 'docx_to_pdf_converter.py');
    const pdfFilesStr = orderedPdfFiles.map(file => `"${file}"`).join(' ');
    const command = `python "${pythonScript}" -m ${pdfFilesStr} --merge-output "${combinedPdfPath}"`;
    
    console.log(`🐍 Executing custom order merge: ${command}`);
    
    try {
      const { stdout, stderr } = await execAsync(command);
      
      if (stderr) {
        console.warn(`⚠️ Python custom merge script warnings: ${stderr}`);
      }
      
      if (stdout) {
        console.log(`📄 Python custom merge output: ${stdout}`);
      }
    } catch (execError) {
      console.warn(`⚠️ Python custom merge script execution had issues: ${execError.message}`);
    }
    
    // Check if combined PDF was created
    if (fs.existsSync(combinedPdfPath)) {
      const stats = fs.statSync(combinedPdfPath);
      console.log(`✅ Successfully created custom ordered PDF: ${outputFileName} (${stats.size} bytes)`);
      return combinedPdfPath;
    } else {
      throw new Error(`Custom ordered PDF file was not created: ${combinedPdfPath}`);
    }
    
  } catch (error) {
    console.error(`❌ Error merging PDFs in custom order:`, error.message);
    throw error;
  }
}

// Add utility function to format date as "day/month/year" (e.g., "2nd September, 2024")
function formatDateWithOrdinal(date) {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  
  // Add ordinal suffix
  let suffix = 'th';
  if (day === 1 || day === 21 || day === 31) suffix = 'st';
  else if (day === 2 || day === 22) suffix = 'nd';
  else if (day === 3 || day === 23) suffix = 'rd';
  
  return `${day}${suffix} ${month}, ${year}`;
}

// Add utility function to calculate date categories
function calculateDateCategories() {
  const now = new Date();
  
  // Group A: Current date, shift to Monday if weekend
  let dateA = new Date(now);
  dateA = shiftToNextMonday(dateA);
  
  // Group B: One week before Group A
  let dateB = new Date(dateA);
  dateB.setDate(dateB.getDate() - 7);
  dateB = shiftToNextMonday(dateB);
  
  // Group C: One week before Group B
  let dateC = new Date(dateB);
  dateC.setDate(dateC.getDate() - 7);
  dateC = shiftToNextMonday(dateC);
  
  // Group D: Two days after Group A, shift to Monday if weekend
  let dateD = new Date(dateA);
  dateD.setDate(dateD.getDate() + 2);
  dateD = shiftToNextMonday(dateD);
  
  // Group E: Any weekday between Group B and Group C
  let dateE = new Date(dateB);
  dateE.setDate(dateE.getDate() - 1); // Start from day before Group B
  dateE = getPreviousWeekday(dateE); // Ensure it's a weekday
  
  // If dateE is not between B and C, adjust it
  if (dateE <= dateC) {
    dateE = new Date(dateC);
    dateE.setDate(dateE.getDate() + 1);
    dateE = getNextWeekday(dateE);
  }
  
  return {
    DATE_A: formatDateWithOrdinal(dateA),
    DATE_B: formatDateWithOrdinal(dateB),
    DATE_C: formatDateWithOrdinal(dateC),
    DATE_D: formatDateWithOrdinal(dateD),
    DATE_E: formatDateWithOrdinal(dateE),
    // Also return the raw Date objects for calculations
    dateA: dateA,
    dateB: dateB,
    dateC: dateC,
    dateD: dateD,
    dateE: dateE
  };
}


// Fix template placeholders
function fixTemplatePlaceholders(documentXml) {
  console.log("🔧 Fixing placeholders in template...");
  
  // Define all possible placeholders
 const placeholders = [
    'PENSION_COMPANY', 'PENSION_COMPANY_ADDRESS', 'PENSION_COMPANY_ADDR_ONE',
    'PENSION_COMPANY_ADDR_TWO', 'PENSION_COMPANY_ADDR_THREE', 'PENSION_COMPANY_ADDR_FOUR',
    'PENSION_COMPANY_ADDR_FIVE', 'PENSION_COMPANY_ADDR_SIX',
    'NO_OF_BEDROOM', 'NAME', 'DATE', 'PENSION_NO', 'LOAN_AMOUNT',
    'LOAN_AMOUNT_IN_WORDS', 'LOAN_AMOUNT_IN_WORDS_IN_CAPITALS', 'EQUITY_AMOUNT', 'EQUITY_AMOUNT_IN_WORDS',
    'PROPERTY_AMOUNT', 'PROPERTY_AMOUNT_IN_WORDS', 'ACCOUNT_NO', 'ACCOUNT_NAME',
    'REPAYMENT_YRS', 'REPAYMENT_AMOUNT', 'PROCESSING_FEE',
    'POLICY_NO', 'ADDRESS', 'ADDR_ONE', 'ADDR_TWO', 'ADDR_THREE', 'ADDR_FOUR',
    'UID', 'DOB', 'MORTGAGE_BANK', 'MORTGAGE_BANK_ADDRESS', 'MORTGAGE_BANK_ADDR_ONE', 'MORTGAGE_BANK_ADDR_TWO', 'MORTGAGE_BANK_ADDR_THREE', 'MORTGAGE_BANK_ADDR_FOUR', 'PRE_NSIA', 'NSIA_MATURITY_DATE', 
    'KBL_DATE_ONE', 'KBL_DATE_TWO', 'PRE_KBL', 'SIZE_IN_FT', 'SIZE_IN_SQM',
    'MUJAA_DATE_ONE', 'MUJAA_DATE_TWO', 'DATE_A', 'DATE_B', 'DATE_C', 'DATE_D', 'DATE_E',
    'MARKET_VALUE', 'MARKET_VALUE_IN_WORDS', 'BUILDING_COST', 'RENTAL_VALUE', 'REINSTATEMENT_COST', 'SELLING_PRICE',
    'LKN_A', 'LKN_B', 'NSIA_TIME'
];
  
  placeholders.forEach(placeholder => {
    // Strategy 1: Fix broken placeholders with XML formatting
    const fullPattern = new RegExp(
      `\\{\\{[\\s\\S]*?${placeholder.replace(/_/g, '[\\s\\S]*?_?[\\s\\S]*?')}[\\s\\S]*?\\}\\}`, 
      'gi'
    );
    
    documentXml = documentXml.replace(fullPattern, (match) => {
      // Check if this match contains our placeholder (case-insensitive)
      const cleanMatch = match.replace(/<[^>]*>/g, '').replace(/\s/g, '');
      if (cleanMatch.toUpperCase().includes(placeholder)) {
        console.log(`     Replaced broken placeholder for ${placeholder}`);
        return `{{${placeholder}}}`;
      }
      return match;
    });
    
    // Strategy 2: Fix variations and partial matches
    const variations = [
      new RegExp(`\\{\\{\\s*${placeholder}\\s*\\}\\}`, 'gi'),
      new RegExp(`\\{\\{${placeholder}\\}\\}`, 'gi')
    ];
    
    variations.forEach(pattern => {
      documentXml = documentXml.replace(pattern, `{{${placeholder}}}`);
    });
  });
  
  // Additional cleanup
  documentXml = documentXml.replace(/\{\{\s*\{\{/g, '{{');
  documentXml = documentXml.replace(/\}\}\s*\}\}/g, '}}');
  
  return documentXml;
}

// Template cache to avoid re-reading template files
const templateCache = new Map();

// Memory management configuration
const MEMORY_CONFIG = {
  MAX_CACHE_SIZE: 50, // Maximum number of templates to cache
  CACHE_CLEANUP_INTERVAL: 300000, // 5 minutes in milliseconds
  MEMORY_WARNING_THRESHOLD: 100 * 1024 * 1024, // 100MB
  MEMORY_CRITICAL_THRESHOLD: 200 * 1024 * 1024, // 200MB
};

// Memory monitoring and cleanup
function getMemoryUsage() {
  const usage = process.memoryUsage();
  return {
    rss: usage.rss, // Resident Set Size
    heapTotal: usage.heapTotal,
    heapUsed: usage.heapUsed,
    external: usage.external,
    arrayBuffers: usage.arrayBuffers
  };
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function logMemoryUsage(context = '') {
  const memory = getMemoryUsage();
  console.log(`🧠 Memory Usage ${context}:`);
  console.log(`   RSS: ${formatBytes(memory.rss)}`);
  console.log(`   Heap Used: ${formatBytes(memory.heapUsed)}`);
  console.log(`   Heap Total: ${formatBytes(memory.heapTotal)}`);
  console.log(`   External: ${formatBytes(memory.external)}`);
  console.log(`   Template Cache Size: ${templateCache.size}`);
}

function cleanupTemplateCache() {
  const memory = getMemoryUsage();
  
  // Clear cache if it's too large or memory usage is high
  if (templateCache.size > MEMORY_CONFIG.MAX_CACHE_SIZE || 
      memory.heapUsed > MEMORY_CONFIG.MEMORY_WARNING_THRESHOLD) {
    
    const clearedCount = templateCache.size;
    templateCache.clear();
    
    console.log(`🧹 Memory cleanup: Cleared ${clearedCount} cached templates`);
    logMemoryUsage('after cleanup');
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
      console.log('🗑️ Forced garbage collection');
    }
  }
}

// Set up periodic memory cleanup
setInterval(cleanupTemplateCache, MEMORY_CONFIG.CACHE_CLEANUP_INTERVAL);

// Monitor memory usage on startup
logMemoryUsage('on startup');

// Process a single template with better error handling and caching
async function processTemplate(templatePath, data) {
  try {
    console.log(`📄 Processing: ${path.basename(templatePath)}`);
    
    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template file not found: ${templatePath}`);
    }
    
    // Check memory usage before processing
    const memoryBefore = getMemoryUsage();
    
    // Check cache first
    let zip;
    if (templateCache.has(templatePath)) {
      console.log(`⚡ Using cached template: ${path.basename(templatePath)}`);
      zip = templateCache.get(templatePath).clone();
    } else {
      console.log(`📖 Reading template from disk: ${path.basename(templatePath)}`);
      const content = fs.readFileSync(templatePath, "binary");
      zip = new PizZip(content);
      
      // Cache the template for future use (with memory check)
      if (templateCache.size < MEMORY_CONFIG.MAX_CACHE_SIZE) {
        templateCache.set(templatePath, zip.clone());
        console.log(`💾 Cached template: ${path.basename(templatePath)} (cache size: ${templateCache.size})`);
      } else {
        console.log(`⚠️ Cache full, not caching: ${path.basename(templatePath)}`);
      }
    }
    
    // Get and fix the document XML
    let documentXml = zip.file("word/document.xml").asText();
    documentXml = fixTemplatePlaceholders(documentXml);
    
    // Update the zip with fixed XML
    zip.file("word/document.xml", documentXml);
    
    // Create docxtemplater instance
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: {
        start: '{',
        end: '}'
      }
    });
    
    // Render with data
    doc.render(data);
    
    // Generate the document
    const buffer = doc.getZip().generate({
      type: "nodebuffer",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
    
    // Log memory usage after processing
    const memoryAfter = getMemoryUsage();
    const memoryDiff = memoryAfter.heapUsed - memoryBefore.heapUsed;
    console.log(`📊 Memory delta: ${formatBytes(memoryDiff)} (${memoryDiff > 0 ? '+' : ''}${memoryDiff})`);
    
    // Cleanup if memory usage is getting high
    if (memoryAfter.heapUsed > MEMORY_CONFIG.MEMORY_WARNING_THRESHOLD) {
      console.log(`⚠️ High memory usage detected: ${formatBytes(memoryAfter.heapUsed)}`);
      cleanupTemplateCache();
    }
    
    return buffer;
    
  } catch (error) {
    console.error(`❌ Error processing ${path.basename(templatePath)}:`, error.message);
    throw error;
  }
}

// Policy number management
const POLICY_NUMBER_FILE = path.join(__dirname, 'policy_number.json');
const KBL_POLICY_NUMBER_FILE = path.join(__dirname, 'kbl_policy_number.json');
const NSIA_POLICY_NUMBER_FILE = path.join(__dirname, 'nsia_policy_number.json');

// Multi-user support - simple request queuing
const requestQueue = [];
let activeRequests = 0;
const MAX_CONCURRENT_REQUESTS = 2; // Allow 2 concurrent requests
let isProcessingQueue = false;

// Generate unique session ID for temporary directories
function generateSessionId() {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Simple request queuing for multi-user support
async function queueRequest(requestFunction) {
  return new Promise((resolve, reject) => {
    const queueItem = {
      id: generateSessionId(),
      function: requestFunction,
      resolve,
      reject,
      timestamp: Date.now()
    };
    
    requestQueue.push(queueItem);
    console.log(`📋 Queued request (${queueItem.id}). Queue length: ${requestQueue.length}, Active: ${activeRequests}`);
    
    processRequestQueue();
  });
}

// Process request queue
async function processRequestQueue() {
  if (isProcessingQueue || requestQueue.length === 0 || activeRequests >= MAX_CONCURRENT_REQUESTS) {
    return;
  }
  
  isProcessingQueue = true;
  
  while (requestQueue.length > 0 && activeRequests < MAX_CONCURRENT_REQUESTS) {
    const queueItem = requestQueue.shift();
    activeRequests++;
    console.log(`🔄 Processing request (${queueItem.id}). Active: ${activeRequests}`);
    
    // Process request asynchronously
    queueItem.function()
      .then(result => {
        activeRequests--;
        queueItem.resolve(result);
        console.log(`✅ Completed request (${queueItem.id}). Active: ${activeRequests}`);
        processRequestQueue(); // Process next request
      })
      .catch(error => {
        activeRequests--;
        queueItem.reject(error);
        console.error(`❌ Request failed (${queueItem.id}):`, error);
        processRequestQueue(); // Process next request
      });
  }
  
  isProcessingQueue = false;
}



async function getCurrentPolicyNumber() {
  try {
    if (fs.existsSync(POLICY_NUMBER_FILE)) {
      const data = fs.readFileSync(POLICY_NUMBER_FILE, 'utf8');
      const policyData = JSON.parse(data);
      console.log('📋 Policy data from file:', policyData);
      
      // Return the current policy number (which should be the next one to be used)
      const currentNumber = policyData.lastPolicyNumber || 0;
      const nextPolicyNumber = (currentNumber + 1).toString().padStart(6, '0');
      console.log('📋 Next policy number will be:', nextPolicyNumber);
      
      return nextPolicyNumber;
    }
    
    console.log('📋 No policy file found, starting with 000001');
    return '000001';
  } catch (error) {
    console.error('❌ Error reading policy number:', error);
    return '000001';
  }
}

// Also update the getNextPolicyNumber function to be consistent
async function getNextPolicyNumber() {
  try {
    let currentNumber = 0;

    try {
      await fs.access(POLICY_NUMBER_FILE);
      const data = await fs.readFile(POLICY_NUMBER_FILE, "utf8");
      const policyData = JSON.parse(data);
      if (typeof policyData.lastPolicyNumber === "number") {
        currentNumber = policyData.lastPolicyNumber;
      }
      console.log("📋 Last used policy number:", currentNumber);
    } catch (accessError) {
      // File doesn't exist, start with 0
      console.log("📋 Policy file doesn't exist, starting with 0");
    }

    const nextNumber = currentNumber + 1;

    const newPolicyData = {
      lastPolicyNumber: nextNumber,
      updatedAt: new Date().toISOString()
    };

    await fs.writeFile(POLICY_NUMBER_FILE, JSON.stringify(newPolicyData, null, 2));
    console.log("📋 Updated policy file with number:", nextNumber);

    return nextNumber.toString().padStart(6, "0");
  } catch (error) {
    console.error("❌ Error managing policy number:", error);
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}

// KBL Policy number management (starts from 00001)
async function getNextKBLPolicyNumber() {
  try {
    let currentNumber = 0;

    try {
      await fs.access(KBL_POLICY_NUMBER_FILE);
      const data = await fs.readFile(KBL_POLICY_NUMBER_FILE, "utf8");
      const policyData = JSON.parse(data);
      if (typeof policyData.lastPolicyNumber === "number") {
        currentNumber = policyData.lastPolicyNumber;
      }
      console.log("📋 Last used KBL policy number:", currentNumber);
    } catch (accessError) {
      // File doesn't exist, start with 0
      console.log("📋 KBL policy file doesn't exist, starting with 0");
    }

    const nextNumber = currentNumber + 1;

    const newPolicyData = {
      lastPolicyNumber: nextNumber,
      updatedAt: new Date().toISOString()
    };

    await fs.writeFile(KBL_POLICY_NUMBER_FILE, JSON.stringify(newPolicyData, null, 2));
    console.log("📋 Updated KBL policy file with number:", nextNumber);

    return nextNumber.toString().padStart(5, "0");
  } catch (error) {
    console.error("❌ Error managing KBL policy number:", error);
    return Math.floor(10000 + Math.random() * 90000).toString();
  }
}

// NSIA Policy number management (starts from 50001 to ensure different from KBL)
async function getNextNSIAPolicyNumber() {
  try {
    let currentNumber = 50000; // Start from 50000 to ensure different from KBL

    try {
      await fs.access(NSIA_POLICY_NUMBER_FILE);
      const data = await fs.readFile(NSIA_POLICY_NUMBER_FILE, "utf8");
      const policyData = JSON.parse(data);
      if (typeof policyData.lastPolicyNumber === "number") {
        currentNumber = policyData.lastPolicyNumber;
      }
      console.log("📋 Last used NSIA policy number:", currentNumber);
    } catch (accessError) {
      // File doesn't exist, start with 50000
      console.log("📋 NSIA policy file doesn't exist, starting with 50000");
    }

    const nextNumber = currentNumber + 1;

    const newPolicyData = {
      lastPolicyNumber: nextNumber,
      updatedAt: new Date().toISOString()
    };

    await fs.writeFile(NSIA_POLICY_NUMBER_FILE, JSON.stringify(newPolicyData, null, 2));
    console.log("📋 Updated NSIA policy file with number:", nextNumber);

    return nextNumber.toString().padStart(5, "0");
  } catch (error) {
    console.error("❌ Error managing NSIA policy number:", error);
    return Math.floor(50000 + Math.random() * 40000).toString(); // Random between 50000-89999
  }
}

// API Endpoints
app.get('/api/current-policy-number', async (req, res) => {
  try {
    console.log('🔍 Checking current policy number...');
    console.log('📁 Policy file path:', POLICY_NUMBER_FILE);
    console.log('📁 Policy file exists:', fs.existsSync(POLICY_NUMBER_FILE));
    
    if (fs.existsSync(POLICY_NUMBER_FILE)) {
      const data = fs.readFileSync(POLICY_NUMBER_FILE, 'utf8');
      console.log('📄 Raw file content:', data);
    }
    
    const currentPolicyNumber = await getCurrentPolicyNumber();
    console.log('📋 Returning policy number:', currentPolicyNumber);
    
    res.json({ 
      policyNo: currentPolicyNumber,
      fileExists: fs.existsSync(POLICY_NUMBER_FILE),
      filePath: POLICY_NUMBER_FILE
    });
  } catch (error) {
    console.error('❌ Error getting current policy number:', error);
    res.status(500).json({ error: 'Failed to get policy number', details: error.message });
  }
});

app.post('/api/reset-policy-number/:newNumber', async (req, res) => {
  try {
    const newNumber = parseInt(req.params.newNumber);
    
    if (isNaN(newNumber) || newNumber < 1) {
      return res.status(400).json({ error: 'Invalid policy number' });
    }
    
    const policyData = {
      lastPolicyNumber: newNumber - 1,
      updatedAt: new Date().toISOString()
    };
    
    fs.writeFileSync(POLICY_NUMBER_FILE, JSON.stringify(policyData, null, 2));
    
    res.json({ 
      message: 'Policy number reset successfully',
      nextPolicyNumber: newNumber.toString().padStart(6, '0')
    });
  } catch (error) {
    console.error('Error resetting policy number:', error);
    res.status(500).json({ error: 'Failed to reset policy number' });
  }
});

// Add request logging middleware
app.use('/api/generate-documents', (req, res, next) => {
  console.log('🔍 Incoming request details:');
  console.log('   Method:', req.method);
  console.log('   Headers:', JSON.stringify(req.headers, null, 2));
  console.log('   Content-Type:', req.get('Content-Type'));
  console.log('   Content-Length:', req.get('Content-Length'));
  next();
});

// Main endpoint for generating documents with improved error handling
app.post('/api/generate-documents', async (req, res) => {
  // Queue the request for multi-user support
  queueRequest(async () => {
    try {
      console.log('📥 Document generation request started');
    
    // First, send a simple response to test if basic communication works
    console.log('📊 Request body received, size:', JSON.stringify(req.body).length, 'characters');
    console.log('📊 Request body keys:', Object.keys(req.body || {}));
    
    // Validate request body exists
    if (!req.body || typeof req.body !== 'object') {
      console.error('❌ Invalid request body:', typeof req.body);
      return res.status(400).json({ 
        error: 'Invalid request body',
        received: typeof req.body,
        contentType: req.get('Content-Type')
      });
    }
    
    const {
      cv,
      name,
      pensionCompany,
      pensionNo,
      pensionCompanyAddress,
      accountNo,
      address,
      dob,
      mortgageBank,
      mortgageBankAddress
    } = req.body;
    
    // Validate required fields
    const requiredFields = [
      'cv', 'name', 'pensionCompany', 'pensionNo', 'pensionCompanyAddress', 
      'accountNo', 'address', 'dob', 'mortgageBank', 'mortgageBankAddress'
    ];
    
    const missingFields = requiredFields.filter(field => !req.body[field]);
    
    if (missingFields.length > 0) {
      console.error('❌ Missing required fields:', missingFields);
      return res.status(400).json({ 
        error: 'Missing required fields', 
        missingFields,
        received: Object.keys(req.body)
      });
    }
    
    console.log('📦 Starting document processing...');
    
    // Create temporary directories for processing
    const tempDir = path.join(__dirname, 'temp', `processing_${Date.now()}`);
    const docxDir = path.join(tempDir, 'docx');
    const pdfDir = path.join(tempDir, 'pdf');
    
    // Ensure directories exist
    fs.mkdirSync(tempDir, { recursive: true });
    fs.mkdirSync(docxDir, { recursive: true });
    fs.mkdirSync(pdfDir, { recursive: true });
    
    // Get the next policy numbers
    const policyNo = await getNextPolicyNumber();
    const kblPolicyNo = await getNextKBLPolicyNumber();
    const nsiaPolicyNo = await getNextNSIAPolicyNumber();
    
    console.log('📋 Generated policy numbers:');
    console.log('   Main Policy:', policyNo);
    console.log('   KBL Policy:', kblPolicyNo);
    console.log('   NSIA Policy:', nsiaPolicyNo);
    
    // Calculate property details
    const propertyDetails = calculatePropertyDetails(parseFloat(cv));
    console.log('🧮 Calculated property details:', propertyDetails);
    
    // Process pension company address
   
// Process pension company address (up to 6 parts)
const pensionAddressParts = pensionCompanyAddress.split(',').map(part => part.trim());
const pensionAddressPlaceholders = {};

// Initialize all pension address placeholders to empty string
['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX'].forEach((num) => {
  pensionAddressPlaceholders[`PENSION_COMPANY_ADDR_${num}`] = '';
});

// Fill in the available pension address parts
['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX'].forEach((num, index) => {
  if (pensionAddressParts[index]) {
    let addressPart = pensionAddressParts[index].toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
    
    // Add comma for all parts except the last one that has content
    if (index === pensionAddressParts.length - 1) {
      // Last part gets a full stop
      addressPart += '.';
    } else if (index < pensionAddressParts.length - 1) {
      // Other parts get a comma
      addressPart += ',';
    }
    
    pensionAddressPlaceholders[`PENSION_COMPANY_ADDR_${num}`] = addressPart;
  }
});

// Process regular address (up to 4 parts)
const addressParts = address.split(',').map(part => part.trim());
const addressPlaceholders = {};

// Initialize all address placeholders to empty string
['ONE', 'TWO', 'THREE', 'FOUR'].forEach((num) => {
  addressPlaceholders[`ADDR_${num}`] = '';
});

// Fill in the available address parts
['ONE', 'TWO', 'THREE', 'FOUR'].forEach((num, index) => {
  if (addressParts[index]) {
    let addressPart = addressParts[index].toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
    
    // Add comma for all parts except the last one that has content
    if (index === addressParts.length - 1) {
      // Last part gets a full stop
      addressPart += '.';
    } else if (index < addressParts.length - 1) {
      // Other parts get a comma
      addressPart += ',';
    }
    
    addressPlaceholders[`ADDR_${num}`] = addressPart;
  }
})

// Process mortgage bank address (up to 4 parts)
const mortgageBankAddressParts = mortgageBankAddress.split(',').map(part => part.trim());
const mortgageBankAddressPlaceholders = {};

// Initialize all mortgage bank address placeholders to empty string
['ONE', 'TWO', 'THREE', 'FOUR'].forEach((num) => {
  mortgageBankAddressPlaceholders[`MORTGAGE_BANK_ADDR_${num}`] = '';
});

// Fill in the available mortgage bank address parts
['ONE', 'TWO', 'THREE', 'FOUR'].forEach((num, index) => {
  if (mortgageBankAddressParts[index]) {
    let addressPart = mortgageBankAddressParts[index].toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
    
    // Add comma for all parts except the last one that has content
    if (index === mortgageBankAddressParts.length - 1) {
      // Last part gets a full stop
      addressPart += '.';
    } else if (index < mortgageBankAddressParts.length - 1) {
      // Other parts get a comma
      addressPart += ',';
    }
    
    mortgageBankAddressPlaceholders[`MORTGAGE_BANK_ADDR_${num}`] = addressPart;
  }
})

// Generate house size
const houseSize = generateHouseSize();
    
    // Calculate date categories first
    const dateCategories = calculateDateCategories();
    
    // Calculate MUJAA dates using DATE_C from date categories
    const mujaaDates = calculateMUJAADates(dateCategories.dateC);
    
    // Calculate KBL dates using DATE_A from date categories
    const kblDates = calculateKBLDates(dateCategories.dateA);
    
    // Calculate NSIA maturity date using DATE_A from date categories
    const nsiaDates = calculateNSIAMaturityDate(dateCategories.dateA);
    
    // Calculate additional property-related values
    const buildingCost = propertyDetails.propertyAmount * 0.45; // 45% of property amount
    const rentalValue = propertyDetails.propertyAmount * 0.50; // 50% of property amount
    const reinstatementCost = 2000000 + rentalValue; // 2 million + rental value
    const sellingPrice = propertyDetails.propertyAmount; // Same as property amount
    
    // Generate random two-digit numbers for LKN_A and LKN_B
    const lknA = generateRandomTwoDigit();
    const lknB = generateRandomTwoDigit();
    
    // Generate random time within working hours for NSIA_TIME
    const nsiaTime = generateRandomWorkingTime();

    // Prepare template data
const templateData = {
  PENSION_COMPANY: pensionCompany.toUpperCase(),
  PENSION_COMPANY_ADDRESS: pensionCompanyAddress.toUpperCase(),
  ...pensionAddressPlaceholders,
  NO_OF_BEDROOM: propertyDetails.noOfBedroom.toString(),
  NAME: name.toUpperCase(),
  DATE: formatDate(),
  PENSION_NO: pensionNo,
  LOAN_AMOUNT: formatCurrency(propertyDetails.loanAmount),
  LOAN_AMOUNT_IN_WORDS: numberToWords(propertyDetails.loanAmount),
  LOAN_AMOUNT_IN_WORDS_IN_CAPITALS: numberToWords(propertyDetails.loanAmount).toUpperCase(),
  EQUITY_AMOUNT: formatCurrency(propertyDetails.equityAmount),
  EQUITY_AMOUNT_IN_WORDS: numberToWords(propertyDetails.equityAmount),
  PROPERTY_AMOUNT: formatCurrency(propertyDetails.propertyAmount),
  PROPERTY_AMOUNT_IN_WORDS: numberToWords(propertyDetails.propertyAmount),
  MARKET_VALUE: formatCurrency(propertyDetails.propertyAmount + 2000000),
  MARKET_VALUE_IN_WORDS: numberToWords(propertyDetails.propertyAmount + 2000000),
  BUILDING_COST: formatCurrency(buildingCost),
  RENTAL_VALUE: formatCurrency(rentalValue),
  REINSTATEMENT_COST: formatCurrency(reinstatementCost),
  SELLING_PRICE: formatCurrency(sellingPrice),
  LKN_A: lknA.toString(),
  LKN_B: lknB.toString(),
  NSIA_TIME: nsiaTime,
  ACCOUNT_NO: accountNo,
  ACCOUNT_NAME: name.toUpperCase(),
  REPAYMENT_YRS: propertyDetails.repaymentYrs.toString(),
  REPAYMENT_AMOUNT: formatCurrency(propertyDetails.repaymentAmount),
  PROCESSING_FEE: formatCurrency(propertyDetails.processingFee),
  KBL_POLICY_NO: kblPolicyNo,
  NSIA_POLICY_NO: nsiaPolicyNo,
  ADDRESS: address,
  ...addressPlaceholders,
  UID: generateUID(),
  DOB: dob,
  MORTGAGE_BANK: mortgageBank,
  MORTGAGE_BANK_ADDRESS: mortgageBankAddress,
  ...mortgageBankAddressPlaceholders,
  PRE_NSIA: formatCurrency(propertyDetails.loanAmount * 0.01),
  NSIA_MATURITY_DATE: nsiaDates.nsiaMaturityDate,
  KBL_DATE_ONE: kblDates.kblDateOne,
  KBL_DATE_TWO: kblDates.kblDateTwo,
  PRE_KBL: formatCurrency(propertyDetails.propertyAmount * 0.0021),
  SIZE_IN_FT: houseSize.sizeInFt,
  SIZE_IN_SQM: houseSize.sizeInSqm,
  MUJAA_DATE_ONE: mujaaDates.mujaaDateOne,
  MUJAA_DATE_TWO: mujaaDates.mujaaDateTwo,
  ...dateCategories
};
    
    console.log('📊 Template data prepared');
    
    // Process templates one by one and save as DOCX files
    let processedCount = 0;
    let failedCount = 0;
    const docxFiles = [];
    const pdfFiles = [];
    
    // Determine bank-specific template directory
    const bankDir = getBankTemplateDirectory(mortgageBank);
    console.log(`🏦 Using bank-specific templates for: ${bankDir || 'default'}`);
    
    // Get bank-specific templates to process
    const templatesToProcess = getTemplatesToProcess(mortgageBank);
    console.log(`📋 Processing ${templatesToProcess.length} templates for ${bankDir || 'default'} bank`);
    
    // Process all templates in parallel for maximum speed
    console.log(`🚀 Processing ${templatesToProcess.length} templates in parallel...`);
    
    const templatePromises = templatesToProcess.map(async (templateFile, index) => {
      const templatePath = getTemplatePath(templateFile, mortgageBank);
      
      try {
        console.log(`📄 Processing template ${index + 1}/${templatesToProcess.length}: ${templateFile}`);
        console.log(`📁 Template path: ${templatePath}`);
        
        if (!fs.existsSync(templatePath)) {
          console.warn(`⚠️ Template not found: ${templateFile} at ${templatePath}`);
          return { success: false, error: 'Template not found' };
        }
        
        // Process template and convert to PDF in one go
        const buffer = await processTemplate(templatePath, templateData);
        const outputFileName = templateFile.replace('.docx', '_processed.docx');
        const outputPath = path.join(docxDir, outputFileName);
        
        // Save DOCX file
        fs.writeFileSync(outputPath, buffer);
        console.log(`✅ Saved ${outputFileName} (${buffer.length} bytes)`);
        
        // Convert DOCX to PDF
        try {
          const pdfPath = await convertDocxToPdf(outputPath, pdfDir);
          console.log(`✅ Converted to PDF: ${path.basename(pdfPath)}`);
          return { 
            success: true, 
            docxPath: outputPath, 
            pdfPath: pdfPath,
            fileName: outputFileName
          };
        } catch (pdfError) {
          console.warn(`⚠️ Failed to convert ${outputFileName} to PDF:`, pdfError.message);
          return { 
            success: false, 
            error: `PDF conversion failed: ${pdfError.message}`,
            docxPath: outputPath,
            fileName: outputFileName
          };
        }
        
      } catch (error) {
        console.error(`❌ Failed to process ${templateFile}:`, error.message);
        return { 
          success: false, 
          error: error.message,
          fileName: templateFile
        };
      }
    });
    
    // Wait for all templates to complete
    const results = await Promise.all(templatePromises);
    
    // Process results
    results.forEach(result => {
      if (result.success) {
        processedCount++;
        if (result.docxPath) docxFiles.push(result.docxPath);
        if (result.pdfPath) pdfFiles.push(result.pdfPath);
      } else {
        failedCount++;
        console.error(`❌ Failed: ${result.fileName} - ${result.error}`);
      }
    });
    
    // Log memory usage after parallel processing
    logMemoryUsage('after parallel processing');
    
    // Process Jigawa-specific PDF files (no placeholders)
    if (bankDir === 'jigawa') {
      console.log(`🏦 Processing Jigawa-specific PDF files...`);
      
      const templatesDir = path.join(__dirname, 'templates');
      
      for (const pdfFile of JIGAWA_SPECIFIC_TEMPLATES) {
        const pdfPath = path.join(templatesDir, 'jigawa', pdfFile);
        
        try {
          console.log(`📄 Processing Jigawa PDF: ${pdfFile}`);
          
          if (!fs.existsSync(pdfPath)) {
            console.warn(`⚠️ Jigawa PDF not found: ${pdfFile} at ${pdfPath}`);
            failedCount++;
            continue;
          }
          
          // Copy PDF file directly (no processing needed)
          const outputFileName = pdfFile.replace('.pdf', '_processed.pdf');
          const outputPath = path.join(pdfDir, outputFileName);
          
          fs.copyFileSync(pdfPath, outputPath);
          pdfFiles.push(outputPath);
          processedCount++;
          
          console.log(`✅ Copied Jigawa PDF: ${outputFileName}`);
          
        } catch (error) {
          console.error(`❌ Failed to copy Jigawa PDF ${pdfFile}:`, error.message);
          failedCount++;
        }
      }
    }
    
    // Process Kebbi-specific PDF files (no placeholders)
    if (bankDir === 'kebbi') {
      console.log(`🏦 Processing Kebbi-specific PDF files...`);
      
      const templatesDir = path.join(__dirname, 'templates');
      
      for (const pdfFile of KBL_SPECIFIC_PDFS) {
        const pdfPath = path.join(templatesDir, 'kebbi', pdfFile);
        
        try {
          console.log(`📄 Processing Kebbi PDF: ${pdfFile}`);
          
          if (!fs.existsSync(pdfPath)) {
            console.warn(`⚠️ Kebbi PDF not found: ${pdfFile} at ${pdfPath}`);
            failedCount++;
            continue;
          }
          
          // Copy PDF file directly (no processing needed)
          const outputFileName = pdfFile.replace('.pdf', '_processed.pdf');
          const outputPath = path.join(pdfDir, outputFileName);
          
          fs.copyFileSync(pdfPath, outputPath);
          pdfFiles.push(outputPath);
          processedCount++;
          
          console.log(`✅ Copied Kebbi PDF: ${outputFileName}`);
          
        } catch (error) {
          console.error(`❌ Failed to copy Kebbi PDF ${pdfFile}:`, error.message);
          failedCount++;
        }
      }
    }
    
    if (processedCount === 0) {
      console.error('❌ No templates were processed successfully');
      return res.status(500).json({ error: 'No documents were processed successfully' });
    }
    
    // Merge all PDF files into one combined PDF
    let combinedPdfPath = null;
    if (pdfFiles.length > 0) {
      try {
        combinedPdfPath = await mergeAllPdfs(pdfFiles, pdfDir);
        if (combinedPdfPath) {
          pdfFiles.push(combinedPdfPath); // Add combined PDF to the list
        }
      } catch (mergeError) {
        console.warn(`⚠️ Failed to create combined PDF: ${mergeError.message}`);
        // Continue without combined PDF
      }
    }
    
    // Return the combined PDF directly
    if (combinedPdfPath && fs.existsSync(combinedPdfPath)) {
      console.log('🔄 Returning combined PDF file...');
      
      // Set response headers for PDF
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="processed_documents_${Date.now()}.pdf"`);
      res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
      
      // Send the PDF file
      const pdfStream = fs.createReadStream(combinedPdfPath);
      
      // Handle stream errors
      pdfStream.on('error', (streamError) => {
        console.error('❌ Error reading PDF stream:', streamError);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Failed to read PDF file' });
        }
      });
      
      // Handle stream end to clean up
      pdfStream.on('end', () => {
        console.log('✅ PDF stream completed successfully');
        // Clean up temporary files after stream is complete
        try {
          fs.rmSync(tempDir, { recursive: true, force: true });
          console.log('🧹 Cleaned up temporary files');
        } catch (cleanupError) {
          console.warn('⚠️ Failed to clean up temporary files:', cleanupError.message);
        }
      });
      
      pdfStream.pipe(res);
      
      console.log(`✅ Successfully returning combined PDF with ${pdfFiles.length - 1} individual documents`);
    } else {
      // Fallback: if no combined PDF, return the first available PDF
      const firstPdf = pdfFiles.find(pdf => fs.existsSync(pdf));
      if (firstPdf) {
        console.log('🔄 Returning first available PDF file...');
        
        // Set response headers for PDF
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="processed_documents_${Date.now()}.pdf"`);
        res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
        
        // Send the PDF file
        const pdfStream = fs.createReadStream(firstPdf);
        
        // Handle stream errors
        pdfStream.on('error', (streamError) => {
          console.error('❌ Error reading PDF stream:', streamError);
          if (!res.headersSent) {
            res.status(500).json({ error: 'Failed to read PDF file' });
          }
        });
        
        // Handle stream end to clean up
        pdfStream.on('end', () => {
          console.log('✅ PDF stream completed successfully');
          // Clean up temporary files after stream is complete
          try {
            fs.rmSync(tempDir, { recursive: true, force: true });
            console.log('🧹 Cleaned up temporary files');
          } catch (cleanupError) {
            console.warn('⚠️ Failed to clean up temporary files:', cleanupError.message);
          }
        });
        
        pdfStream.pipe(res);
        
        console.log(`✅ Successfully returning PDF: ${path.basename(firstPdf)}`);
      } else {
        throw new Error('No PDF files were generated');
      }
    }
    
    } catch (error) {
      console.error('❌ Document generation error:', error);
      
      if (!res.headersSent) {
        res.status(500).json({ 
          error: 'Document generation failed', 
          message: error.message 
        });
      }
    }
  }).catch(error => {
    console.error('❌ Queue processing error:', error);
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Request processing failed', 
        message: error.message 
      });
    }
  });
});

// Multi-user status endpoint
app.get('/api/status', (req, res) => {
  res.json({
    status: 'running',
    multiUser: {
      queueLength: requestQueue.length,
      activeRequests: activeRequests,
      maxConcurrentRequests: MAX_CONCURRENT_REQUESTS,
      isProcessingQueue: isProcessingQueue
    },
    memory: getMemoryUsage(),
    uptime: process.uptime()
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  const templatesDir = path.join(__dirname, 'templates');
  const pythonScript = path.join(__dirname, 'docx_to_pdf_converter.py');
  
  // Check common templates
  const availableCommonTemplates = COMMON_TEMPLATES.filter(file => 
    fs.existsSync(path.join(templatesDir, file))
  );
  
  // Check bank-specific templates
  const jigawaDir = path.join(templatesDir, 'jigawa');
  const kebbiDir = path.join(templatesDir, 'kebbi');
  
  const availableJigawaTemplates = fs.existsSync(jigawaDir) ? 
    BANK_SPECIFIC_TEMPLATES.filter(file => 
      fs.existsSync(path.join(jigawaDir, file))
    ) : [];
    
  const availableJigawaPdfs = fs.existsSync(jigawaDir) ? 
    JIGAWA_SPECIFIC_TEMPLATES.filter(file => 
      fs.existsSync(path.join(jigawaDir, file))
    ) : [];
    
  const availableKebbiTemplates = fs.existsSync(kebbiDir) ? 
    BANK_SPECIFIC_TEMPLATES.filter(file => 
      fs.existsSync(path.join(kebbiDir, file))
    ) : [];
  
  const totalAvailableTemplates = availableCommonTemplates.length + 
    Math.max(availableJigawaTemplates.length, availableKebbiTemplates.length);
  
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    templatesDir: templatesDir,
    templatesDirExists: fs.existsSync(templatesDir),
    totalTemplates: TEMPLATE_FILES.length,
    availableTemplates: totalAvailableTemplates,
    templateStructure: {
      commonTemplates: {
        directory: templatesDir,
        templates: COMMON_TEMPLATES,
        available: availableCommonTemplates,
        count: availableCommonTemplates.length
      },
      jigawaTemplates: {
        directory: jigawaDir,
        exists: fs.existsSync(jigawaDir),
        templates: BANK_SPECIFIC_TEMPLATES,
        available: availableJigawaTemplates,
        count: availableJigawaTemplates.length
      },
      jigawaPdfs: {
        directory: jigawaDir,
        exists: fs.existsSync(jigawaDir),
        templates: JIGAWA_SPECIFIC_TEMPLATES,
        available: availableJigawaPdfs,
        count: availableJigawaPdfs.length
      },
      kebbiTemplates: {
        directory: kebbiDir,
        exists: fs.existsSync(kebbiDir),
        templates: BANK_SPECIFIC_TEMPLATES,
        available: availableKebbiTemplates,
        count: availableKebbiTemplates.length
      }
    },
    allFiles: fs.existsSync(templatesDir) ? fs.readdirSync(templatesDir) : [],
    pdfConversion: {
      pythonScript: pythonScript,
      scriptExists: fs.existsSync(pythonScript),
      description: 'DOCX to PDF conversion using Python script'
    }
  });
});

// New endpoint for PDF splitting and preview
app.post('/api/split-pdf', async (req, res) => {
  try {
    console.log('📥 PDF splitting request started');
    
    const { pdfData, fileName } = req.body;
    
    if (!pdfData || !fileName) {
      return res.status(400).json({ 
        error: 'Missing required fields: pdfData and fileName' 
      });
    }
    
    // Create temporary directory for processing
    const tempDir = path.join(__dirname, 'temp', `pdf_split_${Date.now()}`);
    const uploadsDir = path.join(tempDir, 'uploads');
    const splitDir = path.join(tempDir, 'split');
    
    // Ensure directories exist
    fs.mkdirSync(tempDir, { recursive: true });
    fs.mkdirSync(uploadsDir, { recursive: true });
    fs.mkdirSync(splitDir, { recursive: true });
    
    // Save uploaded PDF
    const filePath = path.join(uploadsDir, fileName);
    fs.writeFileSync(filePath, Buffer.from(pdfData, 'base64'));
    
    console.log(`📄 Saved uploaded PDF: ${fileName}`);
    
    // Split PDF into pages
    const baseName = path.basename(fileName, '.pdf');
    const splitPages = await splitPdfIntoPages(filePath, splitDir, baseName);
    
    if (splitPages.length === 0) {
      return res.status(500).json({ 
        error: 'Failed to split PDF into pages' 
      });
    }
    
    // Convert split pages to base64 for frontend preview
    const pagesWithPreview = await Promise.all(
      splitPages.map(async (page) => {
        const pageData = fs.readFileSync(page.path);
        const base64Data = pageData.toString('base64');
        
        return {
          id: `split_${page.name}`,
          name: page.name,
          pageNumber: page.pageNumber,
          type: 'split_page',
          originalFileName: fileName,
          previewData: `data:application/pdf;base64,${base64Data}`,
          size: pageData.length
        };
      })
    );
    
    console.log(`✅ Successfully split PDF into ${pagesWithPreview.length} pages`);
    
    // Clean up temporary files
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
      console.log('🧹 Cleaned up temporary files');
    } catch (cleanupError) {
      console.warn('⚠️ Failed to clean up temporary files:', cleanupError.message);
    }
    
    res.json({
      success: true,
      originalFileName: fileName,
      totalPages: pagesWithPreview.length,
      pages: pagesWithPreview
    });
    
  } catch (error) {
    console.error('❌ PDF splitting error:', error);
    res.status(500).json({ 
      error: 'PDF splitting failed', 
      message: error.message 
    });
  }
});

// New endpoint for document upload and custom ordering
app.post('/api/generate-documents-with-custom-order', async (req, res) => {
  // Queue the request for multi-user support
  queueRequest(async () => {
    try {
    console.log('📥 Custom document generation request started');
    
    const {
      // Original document generation data
      cv,
      name,
      pensionCompany,
      pensionNo,
      pensionCompanyAddress,
      accountNo,
      address,
      dob,
      mortgageBank,
      mortgageBankAddress,
      // New custom ordering data
      documentOrder,
      uploadedDocuments
    } = req.body;
    
    // Validate required fields
    const requiredFields = [
      'cv', 'name', 'pensionCompany', 'pensionNo', 'pensionCompanyAddress', 
      'accountNo', 'address', 'dob', 'mortgageBank', 'mortgageBankAddress',
      'documentOrder'
    ];
    
    const missingFields = requiredFields.filter(field => !req.body[field]);
    
    if (missingFields.length > 0) {
      console.error('❌ Missing required fields:', missingFields);
      return res.status(400).json({ 
        error: 'Missing required fields', 
        missingFields,
        received: Object.keys(req.body)
      });
    }
    
    console.log('📦 Starting custom document processing...');
    
    // Create temporary directories for processing
    const tempDir = path.join(__dirname, 'temp', `custom_processing_${Date.now()}`);
    const docxDir = path.join(tempDir, 'docx');
    const pdfDir = path.join(tempDir, 'pdf');
    const uploadsDir = path.join(tempDir, 'uploads');
    
    // Ensure directories exist
    fs.mkdirSync(tempDir, { recursive: true });
    fs.mkdirSync(docxDir, { recursive: true });
    fs.mkdirSync(pdfDir, { recursive: true });
    fs.mkdirSync(uploadsDir, { recursive: true });
    
    // Process uploaded documents if any
    const uploadedPdfFiles = [];
    const splitPdfFiles = [];
    
    if (uploadedDocuments && uploadedDocuments.length > 0) {
      console.log(`📎 Processing ${uploadedDocuments.length} uploaded documents...`);
      
      for (let i = 0; i < uploadedDocuments.length; i++) {
        const uploadedDoc = uploadedDocuments[i];
        const fileName = `uploaded_${i + 1}_${uploadedDoc.name || `document_${i + 1}.pdf`}`;
        const filePath = path.join(uploadsDir, fileName);
        
        // Save uploaded document
        fs.writeFileSync(filePath, Buffer.from(uploadedDoc.data, 'base64'));
        
        // Check if this is a combined document that needs splitting
        if (uploadedDoc.splitIntoPages === true) {
          console.log(`🔄 Splitting combined document: ${fileName}`);
          const splitDir = path.join(uploadsDir, `split_${i + 1}`);
          const baseName = `combined_${i + 1}`;
          
          try {
            const splitPages = await splitPdfIntoPages(filePath, splitDir, baseName);
            splitPdfFiles.push(...splitPages);
            console.log(`✅ Split ${fileName} into ${splitPages.length} pages`);
          } catch (splitError) {
            console.warn(`⚠️ Failed to split ${fileName}:`, splitError.message);
            // Fallback to treating as single document
            uploadedPdfFiles.push({
              path: filePath,
              name: fileName,
              originalName: uploadedDoc.name || `document_${i + 1}.pdf`,
              type: 'uploaded'
            });
          }
        } else {
          uploadedPdfFiles.push({
            path: filePath,
            name: fileName,
            originalName: uploadedDoc.name || `document_${i + 1}.pdf`,
            type: 'uploaded'
          });
        }
        
        console.log(`✅ Saved uploaded document: ${fileName}`);
      }
    }
    
    // Process split pages from frontend
    if (req.body.splitPages && req.body.splitPages.length > 0) {
      console.log(`📄 Processing ${req.body.splitPages.length} split pages from frontend...`);
      
      for (let i = 0; i < req.body.splitPages.length; i++) {
        const splitPage = req.body.splitPages[i];
        const fileName = `split_${i + 1}_${splitPage.name}`;
        const filePath = path.join(uploadsDir, fileName);
        
        // Save split page
        const pageData = Buffer.from(splitPage.previewData.split(',')[1], 'base64');
        fs.writeFileSync(filePath, pageData);
        
        splitPdfFiles.push({
          path: filePath,
          name: fileName,
          pageNumber: splitPage.pageNumber,
          type: 'split_page',
          originalFileName: splitPage.originalFileName
        });
        
        console.log(`✅ Saved split page: ${fileName}`);
      }
    }
    
    // Generate the standard documents (same as before)
    const policyNo = await getNextPolicyNumber();
    const kblPolicyNo = await getNextKBLPolicyNumber();
    const nsiaPolicyNo = await getNextNSIAPolicyNumber();
    
    console.log('📋 Generated policy numbers:');
    console.log('   Main Policy:', policyNo);
    console.log('   KBL Policy:', kblPolicyNo);
    console.log('   NSIA Policy:', nsiaPolicyNo);
    
    const propertyDetails = calculatePropertyDetails(parseFloat(cv));
    console.log('🧮 Calculated property details:', propertyDetails);
    
    // Process pension company address (up to 6 parts)
    const pensionAddressParts = pensionCompanyAddress.split(',').map(part => part.trim());
    const pensionAddressPlaceholders = {};

    // Initialize all pension address placeholders to empty string
    ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX'].forEach((num) => {
      pensionAddressPlaceholders[`PENSION_COMPANY_ADDR_${num}`] = '';
    });

    // Fill in the available pension address parts
    ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX'].forEach((num, index) => {
      if (pensionAddressParts[index]) {
        let addressPart = pensionAddressParts[index].toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
        
        // Add comma for all parts except the last one that has content
        if (index === pensionAddressParts.length - 1) {
          // Last part gets a full stop
          addressPart += '.';
        } else if (index < pensionAddressParts.length - 1) {
          // Other parts get a comma
          addressPart += ',';
        }
        
        pensionAddressPlaceholders[`PENSION_COMPANY_ADDR_${num}`] = addressPart;
      }
    });

    // Process regular address (up to 4 parts)
    const addressParts = address.split(',').map(part => part.trim());
    const addressPlaceholders = {};

    // Initialize all address placeholders to empty string
    ['ONE', 'TWO', 'THREE', 'FOUR'].forEach((num) => {
      addressPlaceholders[`ADDR_${num}`] = '';
    });

    // Fill in the available address parts
    ['ONE', 'TWO', 'THREE', 'FOUR'].forEach((num, index) => {
      if (addressParts[index]) {
        let addressPart = addressParts[index].toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
        
        // Add comma for all parts except the last one that has content
        if (index === addressParts.length - 1) {
          // Last part gets a full stop
          addressPart += '.';
        } else if (index < addressParts.length - 1) {
          // Other parts get a comma
          addressPart += ',';
        }
        
        addressPlaceholders[`ADDR_${num}`] = addressPart;
      }
    });

    // Process mortgage bank address (up to 4 parts)
    const mortgageBankAddressParts = mortgageBankAddress.split(',').map(part => part.trim());
    const mortgageBankAddressPlaceholders = {};

    // Initialize all mortgage bank address placeholders to empty string
    ['ONE', 'TWO', 'THREE', 'FOUR'].forEach((num) => {
      mortgageBankAddressPlaceholders[`MORTGAGE_BANK_ADDR_${num}`] = '';
    });

    // Fill in the available mortgage bank address parts
    ['ONE', 'TWO', 'THREE', 'FOUR'].forEach((num, index) => {
      if (mortgageBankAddressParts[index]) {
        let addressPart = mortgageBankAddressParts[index].toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
        
        // Add comma for all parts except the last one that has content
        if (index === mortgageBankAddressParts.length - 1) {
          // Last part gets a full stop
          addressPart += '.';
        } else if (index < mortgageBankAddressParts.length - 1) {
          // Other parts get a comma
          addressPart += ',';
        }
        
        mortgageBankAddressPlaceholders[`MORTGAGE_BANK_ADDR_${num}`] = addressPart;
      }
    });

    // Generate house size
    const houseSize = generateHouseSize();
    
    // Calculate date categories first
    const dateCategories = calculateDateCategories();
    
    // Calculate MUJAA dates using DATE_C from date categories
    const mujaaDates = calculateMUJAADates(dateCategories.dateC);
    
    // Calculate KBL dates using DATE_A from date categories
    const kblDates = calculateKBLDates(dateCategories.dateA);
    
    // Calculate NSIA maturity date using DATE_A from date categories
    const nsiaDates = calculateNSIAMaturityDate(dateCategories.dateA);
    
    // Calculate additional property-related values
    const buildingCost = propertyDetails.propertyAmount * 0.45; // 45% of property amount
    const rentalValue = propertyDetails.propertyAmount * 0.50; // 50% of property amount
    const reinstatementCost = 2000000 + rentalValue; // 2 million + rental value
    const sellingPrice = propertyDetails.propertyAmount; // Same as property amount
    
    // Generate random two-digit numbers for LKN_A and LKN_B
    const lknA = generateRandomTwoDigit();
    const lknB = generateRandomTwoDigit();
    
    // Generate random time within working hours for NSIA_TIME
    const nsiaTime = generateRandomWorkingTime();

    // Prepare template data
    const templateData = {
      PENSION_COMPANY: pensionCompany.toUpperCase(),
      PENSION_COMPANY_ADDRESS: pensionCompanyAddress.toUpperCase(),
      ...pensionAddressPlaceholders,
      NO_OF_BEDROOM: propertyDetails.noOfBedroom.toString(),
      NAME: name.toUpperCase(),
      DATE: formatDate(),
      PENSION_NO: pensionNo,
      LOAN_AMOUNT: formatCurrency(propertyDetails.loanAmount),
      LOAN_AMOUNT_IN_WORDS: numberToWords(propertyDetails.loanAmount),
      LOAN_AMOUNT_IN_WORDS_IN_CAPITALS: numberToWords(propertyDetails.loanAmount).toUpperCase(),
      EQUITY_AMOUNT: formatCurrency(propertyDetails.equityAmount),
      EQUITY_AMOUNT_IN_WORDS: numberToWords(propertyDetails.equityAmount),
      PROPERTY_AMOUNT: formatCurrency(propertyDetails.propertyAmount),
      PROPERTY_AMOUNT_IN_WORDS: numberToWords(propertyDetails.propertyAmount),
      MARKET_VALUE: formatCurrency(propertyDetails.propertyAmount + 2000000),
      MARKET_VALUE_IN_WORDS: numberToWords(propertyDetails.propertyAmount + 2000000),
      BUILDING_COST: formatCurrency(buildingCost),
      RENTAL_VALUE: formatCurrency(rentalValue),
      REINSTATEMENT_COST: formatCurrency(reinstatementCost),
      SELLING_PRICE: formatCurrency(sellingPrice),
      LKN_A: lknA.toString(),
      LKN_B: lknB.toString(),
      NSIA_TIME: nsiaTime,
      ACCOUNT_NO: accountNo,
      ACCOUNT_NAME: name.toUpperCase(),
      REPAYMENT_YRS: propertyDetails.repaymentYrs.toString(),
      REPAYMENT_AMOUNT: formatCurrency(propertyDetails.repaymentAmount),
      PROCESSING_FEE: formatCurrency(propertyDetails.processingFee),
      KBL_POLICY_NO: kblPolicyNo,
      NSIA_POLICY_NO: nsiaPolicyNo,
      ADDRESS: address,
      ...addressPlaceholders,
      UID: generateUID(),
      DOB: dob,
      MORTGAGE_BANK: mortgageBank,
      MORTGAGE_BANK_ADDRESS: mortgageBankAddress,
      ...mortgageBankAddressPlaceholders,
      PRE_NSIA: formatCurrency(propertyDetails.loanAmount * 0.01),
      NSIA_MATURITY_DATE: nsiaDates.nsiaMaturityDate,
      KBL_DATE_ONE: kblDates.kblDateOne,
      KBL_DATE_TWO: kblDates.kblDateTwo,
      PRE_KBL: formatCurrency(propertyDetails.propertyAmount * 0.0021),
      SIZE_IN_FT: houseSize.sizeInFt,
      SIZE_IN_SQM: houseSize.sizeInSqm,
      MUJAA_DATE_ONE: mujaaDates.mujaaDateOne,
      MUJAA_DATE_TWO: mujaaDates.mujaaDateTwo,
      ...dateCategories
    };
    
    console.log('📊 Template data prepared for custom order');
    
    // Process templates one by one and save as DOCX files, then convert to PDF
    let processedCount = 0;
    let failedCount = 0;
    const standardPdfFiles = [];
    
    // Determine bank-specific template directory
    const bankDir = getBankTemplateDirectory(mortgageBank);
    console.log(`🏦 Using bank-specific templates for: ${bankDir || 'default'}`);
    
    // Get bank-specific templates to process
    const templatesToProcess = getTemplatesToProcess(mortgageBank);
    console.log(`📋 Processing ${templatesToProcess.length} templates for ${bankDir || 'default'} bank`);
    
    // Process all templates in parallel for maximum speed
    console.log(`🚀 Processing ${templatesToProcess.length} templates in parallel...`);
    
    const templatePromises = templatesToProcess.map(async (templateFile, index) => {
      const templatePath = getTemplatePath(templateFile, mortgageBank);
      
      try {
        console.log(`📄 Processing template ${index + 1}/${templatesToProcess.length}: ${templateFile}`);
        console.log(`📁 Template path: ${templatePath}`);
        
        if (!fs.existsSync(templatePath)) {
          console.warn(`⚠️ Template not found: ${templateFile} at ${templatePath}`);
          return { success: false, error: 'Template not found' };
        }
        
        // Process template and convert to PDF in one go
        const buffer = await processTemplate(templatePath, templateData);
        const outputFileName = templateFile.replace('.docx', '_processed.docx');
        const outputPath = path.join(docxDir, outputFileName);
        
        // Save DOCX file
        fs.writeFileSync(outputPath, buffer);
        console.log(`✅ Saved ${outputFileName} (${buffer.length} bytes)`);
        
        // Convert DOCX to PDF
        try {
          const pdfPath = await convertDocxToPdf(outputPath, pdfDir);
          const pdfFileName = path.basename(pdfPath);
          console.log(`✅ Converted to PDF: ${pdfFileName}`);
          return { 
            success: true, 
            pdfPath: pdfPath,
            pdfFileName: pdfFileName,
            originalName: templateFile.replace('.docx', ''),
            fileName: outputFileName
          };
        } catch (pdfError) {
          console.warn(`⚠️ Failed to convert ${outputFileName} to PDF:`, pdfError.message);
          return { 
            success: false, 
            error: `PDF conversion failed: ${pdfError.message}`,
            fileName: outputFileName
          };
        }
        
      } catch (error) {
        console.error(`❌ Failed to process ${templateFile}:`, error.message);
        return { 
          success: false, 
          error: error.message,
          fileName: templateFile
        };
      }
    });
    
    // Wait for all templates to complete
    const results = await Promise.all(templatePromises);
    
    // Process results
    results.forEach(result => {
      if (result.success) {
        processedCount++;
        standardPdfFiles.push({
          path: result.pdfPath,
          name: result.pdfFileName,
          originalName: result.originalName,
          type: 'generated'
        });
      } else {
        failedCount++;
        console.error(`❌ Failed: ${result.fileName} - ${result.error}`);
      }
    });
    
    // Log memory usage after parallel processing
    logMemoryUsage('after custom order parallel processing');
    
    // Process Jigawa-specific PDF files (no placeholders)
    if (bankDir === 'jigawa') {
      console.log(`🏦 Processing Jigawa-specific PDF files...`);
      
      const templatesDir = path.join(__dirname, 'templates');
      
      for (const pdfFile of JIGAWA_SPECIFIC_TEMPLATES) {
        const pdfPath = path.join(templatesDir, 'jigawa', pdfFile);
        
        try {
          console.log(`📄 Processing Jigawa PDF: ${pdfFile}`);
          
          if (!fs.existsSync(pdfPath)) {
            console.warn(`⚠️ Jigawa PDF not found: ${pdfFile} at ${pdfPath}`);
            failedCount++;
            continue;
          }
          
          // Copy PDF file directly (no processing needed)
          const outputFileName = pdfFile.replace('.pdf', '_processed.pdf');
          const outputPath = path.join(pdfDir, outputFileName);
          
          fs.copyFileSync(pdfPath, outputPath);
          standardPdfFiles.push({
            path: outputPath,
            name: outputFileName,
            originalName: pdfFile.replace('.pdf', ''),
            type: 'generated'
          });
          processedCount++;
          
          console.log(`✅ Copied Jigawa PDF: ${outputFileName}`);
          
        } catch (error) {
          console.error(`❌ Failed to copy Jigawa PDF ${pdfFile}:`, error.message);
          failedCount++;
        }
      }
    }
    
    // Process Kebbi-specific PDF files (no placeholders)
    if (bankDir === 'kebbi') {
      console.log(`🏦 Processing Kebbi-specific PDF files...`);
      
      const templatesDir = path.join(__dirname, 'templates');
      
      for (const pdfFile of KBL_SPECIFIC_PDFS) {
        const pdfPath = path.join(templatesDir, 'kebbi', pdfFile);
        
        try {
          console.log(`📄 Processing Kebbi PDF: ${pdfFile}`);
          
          if (!fs.existsSync(pdfPath)) {
            console.warn(`⚠️ Kebbi PDF not found: ${pdfFile} at ${pdfPath}`);
            failedCount++;
            continue;
          }
          
          // Copy PDF file directly (no processing needed)
          const outputFileName = pdfFile.replace('.pdf', '_processed.pdf');
          const outputPath = path.join(pdfDir, outputFileName);
          
          fs.copyFileSync(pdfPath, outputPath);
          standardPdfFiles.push({
            path: outputPath,
            name: outputFileName,
            originalName: pdfFile.replace('.pdf', ''),
            type: 'generated'
          });
          processedCount++;
          
          console.log(`✅ Copied Kebbi PDF: ${outputFileName}`);
          
        } catch (error) {
          console.error(`❌ Failed to copy Kebbi PDF ${pdfFile}:`, error.message);
          failedCount++;
        }
      }
    }
    
    if (processedCount === 0) {
      console.error('❌ No templates were processed successfully');
      return res.status(500).json({ error: 'No documents were processed successfully' });
    }
    
    console.log(`✅ Generated ${standardPdfFiles.length} standard PDF documents`);
    
    // Create ordered PDF list based on documentOrder
    const orderedPdfFiles = [];
    const documentOrderArray = Array.isArray(documentOrder) ? documentOrder : JSON.parse(documentOrder);
    
    console.log('📋 Processing document order:', documentOrderArray);
    console.log('📋 Available standard PDF files:', standardPdfFiles.map(pdf => ({ name: pdf.name, originalName: pdf.originalName, type: pdf.type })));
    console.log('📋 Available uploaded PDF files:', uploadedPdfFiles.map(pdf => ({ name: pdf.name, originalName: pdf.originalName, type: pdf.type })));
    console.log('📋 Available split PDF files:', splitPdfFiles.map(pdf => ({ name: pdf.name, pageNumber: pdf.pageNumber, type: pdf.type })));
    
    for (const orderItem of documentOrderArray) {
      if (orderItem.type === 'generated') {
        // Find the corresponding generated PDF by matching the document name
        const generatedPdf = standardPdfFiles.find(pdf => {
          // Try exact match first
          if (pdf.originalName === orderItem.documentName) {
            return true;
          }
          // Try partial match (in case of naming differences)
          if (pdf.originalName.includes(orderItem.documentName) || 
              orderItem.documentName.includes(pdf.originalName)) {
            return true;
          }
          // Try matching with underscores vs spaces
          const normalizedOriginal = pdf.originalName.replace(/_/g, ' ');
          const normalizedOrder = orderItem.documentName.replace(/_/g, ' ');
          if (normalizedOriginal === normalizedOrder) {
            return true;
          }
          return false;
        });
        
        if (generatedPdf) {
          orderedPdfFiles.push(generatedPdf.path);
          console.log(`✅ Added generated document: ${orderItem.documentName} -> ${generatedPdf.originalName}`);
        } else {
          console.warn(`⚠️ Generated document not found: ${orderItem.documentName}`);
          console.log(`Available generated documents:`, standardPdfFiles.map(pdf => pdf.originalName));
        }
      } else if (orderItem.type === 'uploaded') {
        // Find the corresponding uploaded PDF
        const uploadedPdf = uploadedPdfFiles.find(pdf => 
          pdf.originalName === orderItem.documentName || 
          pdf.name === orderItem.documentName
        );
        if (uploadedPdf) {
          orderedPdfFiles.push(uploadedPdf.path);
          console.log(`✅ Added uploaded document: ${orderItem.documentName}`);
        } else {
          console.warn(`⚠️ Uploaded document not found: ${orderItem.documentName}`);
        }
      } else if (orderItem.type === 'split_page') {
        // Find the corresponding split page by ID or page number
        const splitPage = splitPdfFiles.find(page => {
          // Try matching by the split page ID from frontend
          if (page.name === orderItem.documentName) {
            return true;
          }
          // Try matching by page number and original file name
          if (orderItem.pageNumber && page.pageNumber === orderItem.pageNumber) {
            return true;
          }
          return false;
        });
        if (splitPage) {
          orderedPdfFiles.push(splitPage.path);
          console.log(`✅ Added split page: ${orderItem.documentName} (page ${splitPage.pageNumber})`);
        } else {
          console.warn(`⚠️ Split page not found: ${orderItem.documentName}`);
          console.log(`Available split pages:`, splitPdfFiles.map(page => ({ name: page.name, pageNumber: page.pageNumber })));
        }
      }
    }
    
    // Merge PDFs in custom order
    let customOrderedPdf = null;
    
    if (orderedPdfFiles.length > 0) {
      try {
        customOrderedPdf = await mergePdfsInCustomOrder(orderedPdfFiles, pdfDir, 'custom_ordered_documents.pdf');
        console.log(`✅ Successfully created custom ordered PDF with ${orderedPdfFiles.length} documents`);
      } catch (mergeError) {
        console.error('❌ Failed to merge PDFs in custom order:', mergeError.message);
        // Fallback: create a simple combined PDF with all available documents
        try {
          const allPdfFiles = [...standardPdfFiles.map(pdf => pdf.path), ...uploadedPdfFiles.map(pdf => pdf.path)];
          if (allPdfFiles.length > 0) {
            customOrderedPdf = await mergeAllPdfs(allPdfFiles, pdfDir);
            console.log('✅ Fallback: Created combined PDF with all available documents');
          }
        } catch (fallbackError) {
          console.error('❌ Fallback PDF creation also failed:', fallbackError.message);
        }
      }
    } else {
      console.warn('⚠️ No PDF files found to merge in custom order');
      // Fallback: create a simple combined PDF with all available documents
      try {
        const allPdfFiles = [...standardPdfFiles.map(pdf => pdf.path), ...uploadedPdfFiles.map(pdf => pdf.path)];
        if (allPdfFiles.length > 0) {
          customOrderedPdf = await mergeAllPdfs(allPdfFiles, pdfDir);
          console.log('✅ Fallback: Created combined PDF with all available documents');
        }
      } catch (fallbackError) {
        console.error('❌ Fallback PDF creation failed:', fallbackError.message);
      }
    }
    
    if (!customOrderedPdf) {
      throw new Error('Failed to create any PDF document');
    }
    
    // Return the custom ordered PDF directly
    if (customOrderedPdf && fs.existsSync(customOrderedPdf)) {
      console.log('🔄 Returning custom ordered PDF file...');
      
      // Set response headers for PDF
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="custom_ordered_documents_${Date.now()}.pdf"`);
      res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
      
      // Send the PDF file
      const pdfStream = fs.createReadStream(customOrderedPdf);
      
      // Handle stream errors
      pdfStream.on('error', (streamError) => {
        console.error('❌ Error reading PDF stream:', streamError);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Failed to read PDF file' });
        }
      });
      
      // Handle stream end to clean up
      pdfStream.on('end', () => {
        console.log('✅ PDF stream completed successfully');
        // Clean up temporary files after stream is complete
        try {
          fs.rmSync(tempDir, { recursive: true, force: true });
          console.log('🧹 Cleaned up temporary files');
        } catch (cleanupError) {
          console.warn('⚠️ Failed to clean up temporary files:', cleanupError.message);
        }
      });
      
      pdfStream.pipe(res);
      
      console.log(`✅ Successfully returning custom ordered PDF with ${orderedPdfFiles.length} documents`);
    } else {
      throw new Error('Failed to create custom ordered PDF');
    }
    
    } catch (error) {
      console.error('❌ Custom document generation error:', error);
      
      if (!res.headersSent) {
        res.status(500).json({ 
          error: 'Custom document generation failed', 
          message: error.message 
        });
      }
    }
  }).catch(error => {
    console.error('❌ Queue processing error:', error);
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Request processing failed', 
        message: error.message 
      });
    }
  });
});




// Start server with better error handling
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('🚀 DOCX Template Processor Server Started');
  console.log(`📡 Server running on http://localhost:${PORT}`);
  console.log(`📡 Server also accessible via http://0.0.0.0:${PORT}`);
  console.log('📋 Available endpoints:');
  console.log('   POST /api/generate-documents - Generate processed documents (DOCX + PDF + Combined PDF)');
  console.log('   POST /api/generate-documents-with-custom-order - Generate documents with custom ordering and uploaded PDFs');
  console.log('   POST /api/test-request - Test request handling');
  console.log('   POST /api/simple-test - Simple test endpoint');
  console.log('   GET  /api/health - Check server and template status');
  console.log('   GET  /api/test - Quick server test');
  console.log('\n📁 Required template files in ./templates/ directory:');
  TEMPLATE_FILES.forEach(file => console.log(`   - ${file}`));
  console.log('\n🐍 PDF Conversion:');
  console.log('   - Uses Python script: docx_to_pdf_converter.py');
  console.log('   - Requires python-docx2pdf and PyPDF2 libraries');
  console.log('   - Generates individual DOCX and PDF versions');
  console.log('   - Creates combined PDF with all documents');
  console.log('\n🧠 Memory Management:');
  console.log('   - Template caching enabled');
  console.log('   - Automatic memory cleanup every 5 minutes');
  console.log('   - Memory monitoring endpoints available');
  console.log('   GET  /api/memory - Check memory usage');
  console.log('   POST /api/memory/cleanup - Force memory cleanup');
});

// Set server timeout and handle errors
server.setTimeout(300000); // 5 minutes
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;

server.on('error', (error) => {
  console.error('🚨 Server error:', error);
});

server.on('clientError', (err, socket) => {
  console.error('🚨 Client error:', err);
  socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
});

// Memory monitoring endpoint
app.get('/api/memory', (req, res) => {
  try {
    const memory = getMemoryUsage();
    const memoryInfo = {
      rss: {
        bytes: memory.rss,
        formatted: formatBytes(memory.rss)
      },
      heapUsed: {
        bytes: memory.heapUsed,
        formatted: formatBytes(memory.heapUsed)
      },
      heapTotal: {
        bytes: memory.heapTotal,
        formatted: formatBytes(memory.heapTotal)
      },
      external: {
        bytes: memory.external,
        formatted: formatBytes(memory.external)
      },
      arrayBuffers: {
        bytes: memory.arrayBuffers,
        formatted: formatBytes(memory.arrayBuffers)
      },
      templateCacheSize: templateCache.size,
      maxCacheSize: MEMORY_CONFIG.MAX_CACHE_SIZE,
      memoryWarningThreshold: formatBytes(MEMORY_CONFIG.MEMORY_WARNING_THRESHOLD),
      memoryCriticalThreshold: formatBytes(MEMORY_CONFIG.MEMORY_CRITICAL_THRESHOLD),
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    };
    
    res.json(memoryInfo);
  } catch (error) {
    res.status(500).json({
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Memory cleanup endpoint
app.post('/api/memory/cleanup', (req, res) => {
  try {
    const memoryBefore = getMemoryUsage();
    cleanupTemplateCache();
    const memoryAfter = getMemoryUsage();
    
    res.json({
      success: true,
      memoryBefore: {
        rss: formatBytes(memoryBefore.rss),
        heapUsed: formatBytes(memoryBefore.heapUsed)
      },
      memoryAfter: {
        rss: formatBytes(memoryAfter.rss),
        heapUsed: formatBytes(memoryAfter.heapUsed)
      },
      memoryFreed: {
        rss: formatBytes(memoryBefore.rss - memoryAfter.rss),
        heapUsed: formatBytes(memoryBefore.heapUsed - memoryAfter.heapUsed)
      },
      templateCacheSize: templateCache.size,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

export default app;