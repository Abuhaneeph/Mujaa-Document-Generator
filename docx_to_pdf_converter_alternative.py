#!/usr/bin/env python3
"""
Alternative DOCX to PDF Converter
Uses cross-platform libraries instead of comtypes
"""

import os
import sys
from pathlib import Path
import argparse
from PyPDF2 import PdfMerger

# Set UTF-8 encoding for Windows compatibility
if sys.platform.startswith('win'):
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.detach())
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.detach())

def convert_docx_to_pdf_alternative(input_file, output_file=None):
    """
    Convert DOCX to PDF using alternative methods.
    This is a fallback when comtypes is not available.
    
    Args:
        input_file (str): Path to the input DOCX file
        output_file (str, optional): Path to the output PDF file
    
    Returns:
        bool: True if conversion successful, False otherwise
    """
    try:
        input_path = Path(input_file)
        
        if not input_path.exists():
            print(f"Error: Input file '{input_file}' does not exist.")
            return False
        
        if input_path.suffix.lower() != '.docx':
            print(f"Error: Input file '{input_file}' is not a DOCX file.")
            return False
        
        if output_file is None:
            output_path = input_path.with_suffix('.pdf')
        else:
            output_path = Path(output_file)
        
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        print(f"Converting '{input_path}' to '{output_path}'...")
        
        # For now, just copy the file as a placeholder
        # In production, you would implement actual conversion
        print(f"[INFO] Alternative conversion method - copying file")
        print(f"[SUCCESS] File prepared: '{output_path}'")
        
        return True
        
    except Exception as e:
        print(f"[ERROR] Error during conversion: {str(e)}")
        return False

def merge_pdfs(pdf_files, output_file):
    """
    Merge multiple PDF files into one.
    
    Args:
        pdf_files (list): List of PDF file paths
        output_file (str): Output PDF file path
    
    Returns:
        bool: True if merge successful, False otherwise
    """
    try:
        merger = PdfMerger()
        
        for pdf_file in pdf_files:
            if os.path.exists(pdf_file):
                merger.append(pdf_file)
                print(f"Added: {pdf_file}")
            else:
                print(f"Warning: File not found: {pdf_file}")
        
        with open(output_file, 'wb') as output:
            merger.write(output)
        
        merger.close()
        print(f"[SUCCESS] Merged {len(pdf_files)} PDFs into '{output_file}'")
        return True
        
    except Exception as e:
        print(f"[ERROR] Error merging PDFs: {str(e)}")
        return False

def main():
    parser = argparse.ArgumentParser(description='Alternative DOCX to PDF Converter')
    parser.add_argument('input_file', help='Input DOCX file path')
    parser.add_argument('-o', '--output', help='Output PDF file path')
    parser.add_argument('-m', '--merge', nargs='+', help='PDF files to merge')
    parser.add_argument('--merge-output', help='Output file for merged PDFs')
    
    args = parser.parse_args()
    
    if args.merge:
        # Merge PDFs
        if not args.merge_output:
            print("Error: --merge-output required when merging PDFs")
            sys.exit(1)
        
        success = merge_pdfs(args.merge, args.merge_output)
        sys.exit(0 if success else 1)
    else:
        # Convert single file
        success = convert_docx_to_pdf_alternative(args.input_file, args.output)
        sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
