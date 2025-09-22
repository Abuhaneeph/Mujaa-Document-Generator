# Custom Document Ordering & Upload System

This document explains the new custom document ordering and upload feature that allows you to upload scanned PDF documents and arrange them in a specific order with generated documents.

## 🎯 **Overview**

The system now supports:
- Uploading scanned PDF documents (individual or combined)
- **Splitting combined PDFs into individual pages**
- Defining custom document order
- Merging generated and uploaded documents in the specified sequence
- Creating a final combined PDF with your preferred arrangement

## 🚀 **New API Endpoint**

### `POST /api/generate-documents-with-custom-order`

This endpoint extends the original document generation with custom ordering capabilities.

## 📋 **Request Format**

```json
{
  // Standard document generation data (same as before)
  "cv": 5000000,
  "name": "John Doe",
  "pensionCompany": "Pension Fund Administrator",
  "pensionNo": "1234567890",
  "pensionCompanyAddress": "123 Main St, City, State",
  "accountNo": "1234567890",
  "address": "456 Oak Ave, City, State",
  "dob": "1990-01-01",
  "mortgageBank": "Bank Name",
  "mortgageBankAddress": "789 Bank St, City, State",
  
  // New custom ordering data
  "documentOrder": [
    {
      "type": "generated",
      "documentName": "confirmation_of_property_availability_processed"
    },
    {
      "type": "uploaded",
      "documentName": "scanned_id_card.pdf"
    },
    {
      "type": "generated", 
      "documentName": "readiness_processed"
    },
    {
      "type": "uploaded",
      "documentName": "scanned_bank_statement.pdf"
    },
    {
      "type": "generated",
      "documentName": "verification_processed"
    },
    {
      "type": "uploaded",
      "documentName": "scanned_utility_bill.pdf"
    }
  ],
  
  "uploadedDocuments": [
    {
      "name": "scanned_id_card.pdf",
      "data": "base64_encoded_pdf_data_here",
      "splitIntoPages": false
    },
    {
      "name": "scanned_bank_statement.pdf", 
      "data": "base64_encoded_pdf_data_here",
      "splitIntoPages": false
    },
    {
      "name": "combined_scanned_docs.pdf",
      "data": "base64_encoded_pdf_data_here",
      "splitIntoPages": true
    }
  ]
}
```

## 📝 **Document Order Structure**

### `documentOrder` Array
Each item in the array specifies the order and type of document:

```json
{
  "type": "generated" | "uploaded",
  "documentName": "document_name_here"
}
```

**Types:**
- `"generated"` - Documents generated from templates
- `"uploaded"` - Scanned PDF documents you upload
- `"split_page"` - Individual pages from a combined PDF that was split

**Document Names:**
- For generated: Use the template name without `.docx` (e.g., `"confirmation_of_property_availability_processed"`)
- For uploaded: Use the filename you provided in `uploadedDocuments`
- For split pages: Use the generated page name (e.g., `"combined_1_page_1.pdf"`, `"combined_1_page_2.pdf"`)

**Split Page Naming Convention:**
When a PDF is split, pages are named as: `{baseName}_page_{pageNumber}.pdf`
- Example: `combined_1_page_1.pdf`, `combined_1_page_2.pdf`, etc.

### `uploadedDocuments` Array
Each uploaded document should include:

```json
{
  "name": "filename.pdf",
  "data": "base64_encoded_pdf_content",
  "splitIntoPages": true | false
}
```

**Properties:**
- `name`: The filename of the uploaded PDF
- `data`: Base64 encoded PDF content
- `splitIntoPages`: Set to `true` if this is a combined PDF that should be split into individual pages

## 🔧 **Available Generated Documents**

The following documents can be included in your custom order:

1. `confirmation_of_property_availability_processed`
2. `confirmation_of_property_title_processed`
3. `indemnity_processed`
4. `readiness_processed`
5. `verification_processed`
6. `indicative_processed`
7. `kbl_insurance_processed`
8. `nsia_insurance_processed`
9. `mujaa_offer_letter_processed`
10. `valuation_report_processed`
11. `legal_search_processed`

## 📊 **Example Use Cases**

### Case 1: Mixed Document Order
```json
{
  "documentOrder": [
    {"type": "generated", "documentName": "confirmation_of_property_availability_processed"},
    {"type": "uploaded", "documentName": "scanned_id.pdf"},
    {"type": "generated", "documentName": "readiness_processed"},
    {"type": "uploaded", "documentName": "scanned_bank_statement.pdf"},
    {"type": "generated", "documentName": "verification_processed"}
  ]
}
```

### Case 2: All Generated Documents First
```json
{
  "documentOrder": [
    {"type": "generated", "documentName": "confirmation_of_property_availability_processed"},
    {"type": "generated", "documentName": "readiness_processed"},
    {"type": "generated", "documentName": "verification_processed"},
    {"type": "uploaded", "documentName": "scanned_supporting_docs.pdf"}
  ]
}
```

### Case 3: Scanned Documents Between Generated
```json
{
  "documentOrder": [
    {"type": "generated", "documentName": "confirmation_of_property_availability_processed"},
    {"type": "uploaded", "documentName": "scanned_id.pdf"},
    {"type": "uploaded", "documentName": "scanned_address_proof.pdf"},
    {"type": "generated", "documentName": "readiness_processed"},
    {"type": "uploaded", "documentName": "scanned_bank_statement.pdf"},
    {"type": "generated", "documentName": "verification_processed"}
  ]
}
```

### Case 4: Combined Scanned Document Split and Reordered
```json
{
  "documentOrder": [
    {"type": "generated", "documentName": "confirmation_of_property_availability_processed"},
    {"type": "split_page", "documentName": "combined_1_page_2.pdf"},
    {"type": "generated", "documentName": "readiness_processed"},
    {"type": "split_page", "documentName": "combined_1_page_1.pdf"},
    {"type": "generated", "documentName": "verification_processed"},
    {"type": "split_page", "documentName": "combined_1_page_3.pdf"}
  ],
  "uploadedDocuments": [
    {
      "name": "combined_scanned_docs.pdf",
      "data": "base64_encoded_pdf_data",
      "splitIntoPages": true
    }
  ]
}
```

## 📤 **Response Format**

The API returns a ZIP file containing:
- `custom_ordered_documents.pdf` - The final combined PDF in your specified order
- `processing_summary.json` - Summary of the processing including document order

## 🛠️ **Implementation Details**

### Frontend Integration
```javascript
// Example JavaScript for file upload and base64 conversion
function convertFileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64 = reader.result.split(',')[1]; // Remove data:application/pdf;base64, prefix
      resolve(base64);
    };
    reader.onerror = error => reject(error);
  });
}

// Example usage
const uploadedFiles = await Promise.all(
  fileInput.files.map(async (file) => ({
    name: file.name,
    data: await convertFileToBase64(file)
  }))
);

const requestData = {
  // ... standard document data
  documentOrder: [
    {"type": "generated", "documentName": "confirmation_of_property_availability_processed"},
    {"type": "uploaded", "documentName": "scanned_doc.pdf"}
  ],
  uploadedDocuments: uploadedFiles
};
```

## ⚠️ **Important Notes**

1. **File Size Limits**: Large PDF files may take longer to process
2. **Base64 Encoding**: Uploaded documents must be base64 encoded
3. **PDF Format**: Only PDF files are supported for uploads
4. **Order Matters**: The `documentOrder` array determines the final sequence
5. **Document Names**: Must match exactly between `documentOrder` and `uploadedDocuments`

## 🔍 **Error Handling**

The API will return appropriate error messages for:
- Missing required fields
- Invalid document names
- File processing errors
- PDF merging failures

## 🚀 **Getting Started**

1. Prepare your scanned PDF documents
2. Convert them to base64 format
3. Define your desired document order
4. Send a POST request to `/api/generate-documents-with-custom-order`
5. Download the ZIP file with your custom ordered documents

This feature gives you complete control over document arrangement, perfect for creating professional document packages with the exact sequence you need!
