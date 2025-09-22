#!/usr/bin/env python3
"""
Test script to check if Python packages are installed correctly
"""

import sys
import os

print("Python version:", sys.version)
print("Python executable:", sys.executable)

# Test comtypes
try:
    import comtypes.client
    print("✅ comtypes: INSTALLED")
except ImportError as e:
    print("❌ comtypes: NOT INSTALLED")
    print("Error:", str(e))

# Test PyPDF2
try:
    import PyPDF2
    print("✅ PyPDF2: INSTALLED")
    print("PyPDF2 version:", PyPDF2.__version__)
except ImportError as e:
    print("❌ PyPDF2: NOT INSTALLED")
    print("Error:", str(e))

# Test basic functionality
try:
    import comtypes.client
    import PyPDF2
    print("✅ All packages working correctly!")
except Exception as e:
    print("❌ Package test failed:", str(e))

print("\nTest completed!")
