# PDF Conversion Integration

This document explains the PDF conversion feature that has been integrated into the server.js application.

## Overview

The server now automatically converts processed DOCX documents to PDF format using a Python script. This provides users with both editable DOCX files and ready-to-print PDF files. Additionally, it creates a combined PDF that merges all individual PDF documents into a single file for easy viewing and printing.

## How It Works

1. **DOCX Processing**: Templates are processed and filled with data as before
2. **PDF Conversion**: Each processed DOCX file is automatically converted to PDF using the Python script
3. **PDF Merging**: All individual PDF files are merged into a single combined PDF document
4. **ZIP Archive**: DOCX files, individual PDF files, and the combined PDF are included in the final ZIP download

## Files Added/Modified

### New Files
- `docx_to_pdf_converter.py` - Python script for DOCX to PDF conversion
- `requirements.txt` - Python dependencies
- `install_python_deps.bat` - Windows batch file to install Python dependencies
- `PDF_CONVERSION_README.md` - This documentation

### Modified Files
- `server.js` - Integrated PDF conversion functionality

## Setup Instructions

### Prerequisites
1. **Python 3.6+** must be installed on your system
2. **Node.js** (already required for the main application)

### Installation
1. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```
   
   Or on Windows, run:
   ```cmd
   install_python_deps.bat
   ```

2. Start the server as usual:
   ```bash
   npm start
   ```

## API Changes

### Updated Endpoints
- `POST /api/generate-documents` - Now generates both DOCX and PDF files
- `GET /api/health` - Now includes PDF conversion status

### Response Format
The ZIP archive now contains:
- `docx/` folder - Contains all processed DOCX files
- `pdf/` folder - Contains all individual converted PDF files
- `combined_documents.pdf` - Single PDF with all documents merged (in root directory)
- `processing_summary.json` - Updated with PDF conversion and merging statistics

## Error Handling

- If PDF conversion fails for a specific file, the process continues with other files
- DOCX files are always generated even if PDF conversion fails
- Detailed error messages are logged for troubleshooting

## Dependencies

### Python Dependencies
- `docx2pdf==0.1.8` - Library for converting DOCX to PDF
- `PyPDF2==3.0.1` - Library for merging PDF files

### Node.js Dependencies
- All existing dependencies remain the same
- Uses `child_process.exec` to call the Python script

## Troubleshooting

### Common Issues

1. **Python not found**
   - Ensure Python is installed and in your system PATH
   - Test with: `python --version`

2. **Missing dependencies**
   - Run: `pip install -r requirements.txt`
   - Check for permission issues

3. **PDF conversion fails**
   - Check server logs for detailed error messages
   - Ensure the Python script has write permissions to the output directory

4. **File not found errors**
   - Verify that `docx_to_pdf_converter.py` exists in the project root
   - Check file permissions

### Logs
The server provides detailed logging for PDF conversion:
- `🔄 Converting [filename].docx to PDF...`
- `✅ Successfully converted to PDF: [filename].pdf`
- `❌ Error converting [filename] to PDF: [error message]`

## Performance Considerations

- PDF conversion adds processing time to each document
- The process runs sequentially for each template
- Large documents may take longer to convert
- Consider the impact on server response times

## Future Enhancements

Potential improvements could include:
- Parallel PDF conversion for better performance
- Configurable PDF conversion (enable/disable)
- Different PDF quality settings
- Batch conversion optimization
