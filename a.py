import aspose.words as aw
import os
import time

# Check if file exists and is accessible
file_path = "templates/jigawa/verification.docx"
if not os.path.exists(file_path):
    print(f"Error: File {file_path} not found")
    exit(1)

# Try to access the file with retry logic
max_retries = 5
for attempt in range(max_retries):
    try:
        print(f"Attempt {attempt + 1}: Opening {file_path}...")
        doc = aw.Document(file_path)
        print("Successfully opened document!")
        break
    except Exception as e:
        print(f"Attempt {attempt + 1} failed: {e}")
        if attempt < max_retries - 1:
            print("Waiting 2 seconds before retry...")
            time.sleep(2)
        else:
            print("All attempts failed. File may be locked by another process.")
            exit(1)

# Save the document
try:
    doc.save("Output.pdf")
    print("Successfully saved as Output.pdf")
except Exception as e:
    print(f"Error saving PDF: {e}")