#!/usr/bin/env python3
"""
DOCX to PDF Converter
Converts DOCX documents from the templates folder to PDF format.
"""

import os
import sys
from pathlib import Path
import argparse
from PyPDF2 import PdfMerger
import comtypes.client

# Set UTF-8 encoding for Windows compatibility
if sys.platform.startswith('win'):
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.detach())
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.detach())

def convert_docx_to_pdf(input_file, output_file=None):
    """
    Convert a DOCX file to PDF using Microsoft Word COM interface.
    Preserves all formatting perfectly.
    
    Args:
        input_file (str): Path to the input DOCX file
        output_file (str, optional): Path to the output PDF file. 
                                   If None, will use same name as input with .pdf extension
    
    Returns:
        bool: True if conversion successful, False otherwise
    """
    try:
        # Convert input path to Path object for easier manipulation
        input_path = Path(input_file)
        
        # Check if input file exists
        if not input_path.exists():
            print(f"Error: Input file '{input_file}' does not exist.")
            return False
        
        # Check if input file is a DOCX file
        if input_path.suffix.lower() != '.docx':
            print(f"Error: Input file '{input_file}' is not a DOCX file.")
            return False
        
        # Set output file path if not provided
        if output_file is None:
            output_path = input_path.with_suffix('.pdf')
        else:
            output_path = Path(output_file)
        
        # Create output directory if it doesn't exist
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        print(f"Converting '{input_path}' to '{output_path}'...")
        
        # Convert to absolute paths for COM interface
        word_file_path = os.path.abspath(str(input_path))
        pdf_output_path = os.path.abspath(str(output_path))
        
        # Start Word application
        word = comtypes.client.CreateObject('Word.Application')
        word.Visible = False
        
        try:
            # Open the Word document
            doc = word.Documents.Open(word_file_path)
            
            # Export as PDF (17 = wdExportFormatPDF)
            doc.ExportAsFixedFormat(
                OutputFileName=pdf_output_path,
                ExportFormat=17
            )
            
            # Close document
            doc.Close()
            
            print(f"[SUCCESS] Successfully converted to '{output_path}' using Microsoft Word COM")
            return True
            
        finally:
            # Always quit Word application
            word.Quit()
        
    except Exception as e:
        print(f"[ERROR] Error during conversion: {str(e)}")
        return False

def merge_pdfs(pdf_files, output_file):
    """
    Merge multiple PDF files into a single PDF.
    
    Args:
        pdf_files (list): List of paths to PDF files to merge
        output_file (str): Path to the output merged PDF file
    
    Returns:
        bool: True if merge successful, False otherwise
    """
    try:
        print(f"Merging {len(pdf_files)} PDF files into '{output_file}'...")
        
        merger = PdfMerger()
        
        # Add each PDF file to the merger
        for pdf_file in pdf_files:
            if os.path.exists(pdf_file):
                print(f"  Adding: {os.path.basename(pdf_file)}")
                merger.append(pdf_file)
            else:
                print(f"  Warning: File not found: {pdf_file}")
        
        # Write the merged PDF
        with open(output_file, 'wb') as output:
            merger.write(output)
        
        merger.close()
        
        # Check if the merged file was created successfully
        if os.path.exists(output_file):
            file_size = os.path.getsize(output_file)
            print(f"[SUCCESS] Successfully merged PDFs: '{output_file}' ({file_size} bytes)")
            return True
        else:
            print(f"[ERROR] Merged PDF file was not created: {output_file}")
            return False
            
    except Exception as e:
        print(f"[ERROR] Error during PDF merge: {str(e)}")
        return False

def list_templates():
    """List all available DOCX templates in the templates folder."""
    templates_dir = Path("templates")
    
    if not templates_dir.exists():
        print("Templates directory not found.")
        return []
    
    docx_files = list(templates_dir.glob("*.docx"))
    
    print("Available DOCX templates:")
    for i, file in enumerate(docx_files, 1):
        print(f"  {i}. {file.name}")
    
    return docx_files

def convert_multiple_docx_to_pdf(input_files, output_dir):
    """
    Convert multiple DOCX files to PDF in batch for better performance.
    
    Args:
        input_files (list): List of paths to input DOCX files
        output_dir (str): Directory to save the output PDF files
    
    Returns:
        list: List of successfully converted PDF file paths
    """
    try:
        print(f"Batch converting {len(input_files)} DOCX files to PDF...")
        
        # Create output directory if it doesn't exist
        os.makedirs(output_dir, exist_ok=True)
        
        converted_files = []
        failed_files = []
        
        # Process files one by one (COM interface doesn't work well with threading)
        for input_file in input_files:
            try:
                input_path = Path(input_file)
                
                # Check if input file exists
                if not input_path.exists():
                    print(f"Error: Input file '{input_file}' does not exist.")
                    failed_files.append(input_file)
                    continue
                
                # Check if input file is a DOCX file
                if input_path.suffix.lower() != '.docx':
                    print(f"Error: Input file '{input_file}' is not a DOCX file.")
                    failed_files.append(input_file)
                    continue
                
                # Set output file path
                output_filename = input_path.stem + '.pdf'
                output_path = os.path.join(output_dir, output_filename)
                
                print(f"Converting '{input_path.name}' to '{output_filename}'...")
                
                # Convert DOCX to PDF using the main conversion function
                success = convert_docx_to_pdf(input_file, output_path)
                
                if success:
                    print(f"[SUCCESS] Converted '{input_path.name}' to '{output_filename}'")
                    converted_files.append(output_path)
                else:
                    print(f"[ERROR] Failed to convert '{input_path.name}'")
                    failed_files.append(input_file)
                
            except Exception as e:
                print(f"[ERROR] Error converting '{input_file}': {str(e)}")
                failed_files.append(input_file)
        
        print(f"[SUCCESS] Batch conversion completed: {len(converted_files)}/{len(input_files)} files converted successfully")
        
        if failed_files:
            print(f"[WARNING] {len(failed_files)} files failed to convert: {failed_files}")
        
        return converted_files
        
    except Exception as e:
        print(f"[ERROR] Error during batch conversion: {str(e)}")
        return []

def split_pdf_into_pages(input_pdf, output_dir, base_name):
    """
    Split a PDF into individual pages.
    
    Args:
        input_pdf (str): Path to the input PDF file
        output_dir (str): Directory to save the split pages
        base_name (str): Base name for the output files
    
    Returns:
        bool: True if split successful, False otherwise
    """
    try:
        print(f"Splitting PDF '{input_pdf}' into individual pages...")
        
        # Create output directory if it doesn't exist
        os.makedirs(output_dir, exist_ok=True)
        
        # Read the PDF
        with open(input_pdf, 'rb') as file:
            from PyPDF2 import PdfReader, PdfWriter
            pdf_reader = PdfReader(file)
            total_pages = len(pdf_reader.pages)
            
            print(f"Found {total_pages} pages in the PDF")
            
            # Split each page
            for page_num in range(total_pages):
                pdf_writer = PdfWriter()
                pdf_writer.add_page(pdf_reader.pages[page_num])
                
                output_filename = f"{base_name}_page_{page_num + 1}.pdf"
                output_path = os.path.join(output_dir, output_filename)
                
                with open(output_path, 'wb') as output_file:
                    pdf_writer.write(output_file)
                
                print(f"  Created page {page_num + 1}: {output_filename}")
            
            print(f"[SUCCESS] Successfully split PDF into {total_pages} pages")
            return True
            
    except Exception as e:
        print(f"[ERROR] Error splitting PDF: {str(e)}")
        return False

def main():
    """Main function to handle command line arguments and execute conversion."""
    parser = argparse.ArgumentParser(description="Convert DOCX files to PDF, merge PDFs, and split PDFs")
    parser.add_argument("input_file", nargs="?", help="Path to the input DOCX file")
    parser.add_argument("-o", "--output", help="Path to the output PDF file")
    parser.add_argument("-l", "--list", action="store_true", help="List available templates")
    parser.add_argument("-m", "--merge", nargs="+", help="Merge multiple PDF files into one")
    parser.add_argument("--merge-output", help="Output file for merged PDF (use with -m)")
    parser.add_argument("--split-pdf", help="Split a PDF into individual pages")
    parser.add_argument("--split-output-dir", help="Output directory for split pages")
    parser.add_argument("--split-base-name", help="Base name for split page files")
    parser.add_argument("-b", "--batch", nargs="+", help="Convert multiple DOCX files to PDF in batch")
    parser.add_argument("--batch-output-dir", help="Output directory for batch conversion")
    
    args = parser.parse_args()
    
    # List templates if requested
    if args.list:
        list_templates()
        return
    
    # Handle batch conversion if requested
    if args.batch:
        if not args.batch_output_dir:
            print("[ERROR] --batch-output-dir is required when using --batch")
            sys.exit(1)
        
        converted_files = convert_multiple_docx_to_pdf(args.batch, args.batch_output_dir)
        if converted_files:
            print(f"[SUCCESS] Batch conversion completed successfully! {len(converted_files)} files converted.")
        else:
            print("[ERROR] Batch conversion failed!")
            sys.exit(1)
        return
    
    # Handle PDF merge if requested
    if args.merge:
        if not args.merge_output:
            print("[ERROR] --merge-output is required when using --merge")
            sys.exit(1)
        
        success = merge_pdfs(args.merge, args.merge_output)
        if success:
            print("[SUCCESS] PDF merge completed successfully!")
        else:
            print("[ERROR] PDF merge failed!")
            sys.exit(1)
        return
    
    # Handle PDF split if requested
    if args.split_pdf:
        if not args.split_output_dir or not args.split_base_name:
            print("[ERROR] --split-output-dir and --split-base-name are required when using --split-pdf")
            sys.exit(1)
        
        success = split_pdf_into_pages(args.split_pdf, args.split_output_dir, args.split_base_name)
        if success:
            print("[SUCCESS] PDF split completed successfully!")
        else:
            print("[ERROR] PDF split failed!")
            sys.exit(1)
        return
    
    # If no input file provided, show available templates and ask user to choose
    if not args.input_file:
        templates = list_templates()
        if not templates:
            print("No DOCX templates found in the templates folder.")
            return
        
        try:
            choice = input(f"\nEnter the number of the template to convert (1-{len(templates)}): ")
            choice_idx = int(choice) - 1
            
            if 0 <= choice_idx < len(templates):
                selected_template = templates[choice_idx]
                print(f"Selected: {selected_template.name}")
            else:
                print("Invalid choice.")
                return
                
        except (ValueError, KeyboardInterrupt):
            print("Invalid input or operation cancelled.")
            return
    else:
        selected_template = Path(args.input_file)
    
    # Convert the selected file
    success = convert_docx_to_pdf(selected_template, args.output)
    
    if success:
        print("[SUCCESS] Conversion completed successfully!")
    else:
        print("[ERROR] Conversion failed!")
        sys.exit(1)

if __name__ == "__main__":
    main()
