# PDF Conversion Update

## Changes Made

### 1. Fixed Equity Calculation Logic
- **Problem**: After truncating equity amount to 2 decimal places, the property amount calculation was not ensuring that `property amount = equity amount + loan amount`
- **Solution**: Modified the `calculatePropertyDetails()` function to:
  - First truncate equity amount to 2 decimal places
  - Calculate loan amount as `property amount - equity amount` (for high equity cases)
  - Calculate property amount as `equity amount + loan amount` (for low equity cases)
  - Added verification step to ensure calculations are correct
  - Added warning logs if there are any calculation mismatches

### 2. Added PDF Conversion Functionality
- **Replaced**: ZIP file output with merged PDF output
- **Added**: DOCX to PDF conversion using LibreOffice
- **Added**: PDF merging functionality using pdf-merger-js
- **Process Flow**:
  1. Process all DOCX templates with data
  2. Save processed DOCX files to temporary directory
  3. Convert each DOCX to PDF using LibreOffice
  4. Merge all PDFs into a single document
  5. Send merged PDF as response
  6. Clean up temporary files

## New Dependencies Added
- `pdf-merger-js`: For merging multiple PDF files
- `pdfkit`: For PDF manipulation (imported but not actively used in current implementation)

## System Requirements
- **LibreOffice**: Must be installed on the system for DOCX to PDF conversion
- **Windows**: LibreOffice should be available in PATH or install from https://www.libreoffice.org/
- **Fallback**: If LibreOffice is not available, the system will automatically fall back to ZIP format with DOCX files

## API Changes
- **Endpoint**: `POST /api/generate-documents`
- **Response**: 
  - **With LibreOffice**: Single merged PDF file
  - **Without LibreOffice**: ZIP archive with DOCX files (fallback)
- **Content-Type**: `application/pdf` or `application/zip`
- **Filename**: `processed_documents_{timestamp}.pdf` or `processed_documents_{timestamp}.zip`

## Testing
The equity calculation has been tested with various CV values:
- High CV (10M): Equity 2.5M + Loan 0.5M = Property 3M ✅
- Medium CV (5M): Equity 1.25M + Loan 1.75M = Property 3M ✅
- Low CV (2M): Equity 0.5M + Loan 2.5M = Property 3M ✅

## Error Handling
- Graceful handling of DOCX to PDF conversion failures
- Continues processing other documents if one fails
- Proper cleanup of temporary files
- Detailed logging for debugging

## File Structure
```
temp/
├── processing_{timestamp}/
│   ├── docx/          # Temporary DOCX files
│   ├── pdf/           # Temporary PDF files
│   └── merged_documents_{timestamp}.pdf  # Final merged PDF
```

## Notes
- Temporary files are automatically cleaned up after processing
- The system maintains backward compatibility with existing template processing
- All existing placeholders and data processing remain unchanged
