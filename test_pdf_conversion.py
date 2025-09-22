#!/usr/bin/env python3
"""
Test script to diagnose PDF conversion issues
"""

import os
import sys
from pathlib import Path

def test_docx2pdf_installation():
    """Test if docx2pdf is properly installed and working"""
    try:
        from docx2pdf import convert
        print("✅ docx2pdf is installed")
        
        # Test with a simple conversion
        test_docx = "templates/confirmation_of_property_availability.docx"
        test_pdf = "test_output.pdf"
        
        if os.path.exists(test_docx):
            print(f"📄 Testing conversion with: {test_docx}")
            try:
                convert(test_docx, test_pdf)
                if os.path.exists(test_pdf):
                    size = os.path.getsize(test_pdf)
                    print(f"✅ Test conversion successful: {test_pdf} ({size} bytes)")
                    os.remove(test_pdf)  # Clean up
                    return True
                else:
                    print("❌ Test conversion failed: PDF not created")
                    return False
            except Exception as e:
                print(f"❌ Test conversion failed: {str(e)}")
                return False
        else:
            print(f"⚠️ Test file not found: {test_docx}")
            return False
            
    except ImportError as e:
        print(f"❌ docx2pdf not installed: {str(e)}")
        return False

def test_alternative_libraries():
    """Test alternative PDF conversion libraries"""
    print("\n🔍 Testing alternative libraries...")
    
    # Test python-docx
    try:
        from docx import Document
        print("✅ python-docx is available")
    except ImportError:
        print("❌ python-docx not installed")
    
    # Test reportlab
    try:
        from reportlab.lib.pagesizes import letter
        from reportlab.platypus import SimpleDocTemplate
        print("✅ reportlab is available")
    except ImportError:
        print("❌ reportlab not installed")
    
    # Test PyPDF2
    try:
        from PyPDF2 import PdfMerger
        print("✅ PyPDF2 is available")
    except ImportError:
        print("❌ PyPDF2 not installed")

def check_system_requirements():
    """Check system requirements for docx2pdf"""
    print("\n🔍 Checking system requirements...")
    
    # Check if we're on Windows
    if sys.platform.startswith('win'):
        print("✅ Running on Windows")
        
        # Check for Microsoft Word installation
        import winreg
        try:
            # Check for Word in registry
            key = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, 
                               r"SOFTWARE\Microsoft\Office")
            print("✅ Microsoft Office registry key found")
            winreg.CloseKey(key)
        except:
            print("⚠️ Microsoft Office registry key not found")
    else:
        print("⚠️ Not running on Windows - docx2pdf may not work properly")

def main():
    print("🧪 PDF Conversion Diagnostic Tool")
    print("=" * 50)
    
    # Test docx2pdf
    docx2pdf_works = test_docx2pdf_installation()
    
    # Test alternatives
    test_alternative_libraries()
    
    # Check system requirements
    check_system_requirements()
    
    print("\n📋 Summary:")
    if docx2pdf_works:
        print("✅ docx2pdf is working correctly")
    else:
        print("❌ docx2pdf has issues - consider using alternative method")
        print("💡 Install alternative libraries: pip install python-docx reportlab")

if __name__ == "__main__":
    main()

