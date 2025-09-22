import os
import comtypes.client

def convert_word_to_pdf_comtypes(word_file_path, pdf_output_path=None):
    """
    Convert a Word document (.doc or .docx) to PDF using Microsoft Word COM interface.
    Works only on Windows with MS Word installed.
    
    Install dependency:
        pip install comtypes
    """
    try:
        if not os.path.exists(word_file_path):
            print(f"Error: Input file {word_file_path} does not exist")
            return None

        if not word_file_path.lower().endswith(('.doc', '.docx')):
            print("Error: Input file must be a Word document (.doc or .docx)")
            return None

        if pdf_output_path is None:
            pdf_output_path = word_file_path.rsplit('.', 1)[0] + ".pdf"

        # Convert to absolute paths
        word_file_path = os.path.abspath(word_file_path)
        pdf_output_path = os.path.abspath(pdf_output_path)

        # Start Word application
        word = comtypes.client.CreateObject('Word.Application')
        word.Visible = False

        # Open the Word document
        doc = word.Documents.Open(word_file_path)

        # Export as PDF (17 = wdExportFormatPDF)
        doc.ExportAsFixedFormat(
            OutputFileName=pdf_output_path,
            ExportFormat=17
        )

        # Close document and quit Word
        doc.Close()
        word.Quit()

        print(f"✅ Successfully converted {word_file_path} to {pdf_output_path}")
        return pdf_output_path

    except Exception as e:
        print(f"❌ Error converting with comtypes: {e}")
        return None


if __name__ == "__main__":
    # Example usage
    word_file = "verification.docx"   # Replace with your input file
    pdf_file = "output.pdf"           # Replace or leave None to auto-generate

    result = convert_word_to_pdf_comtypes(word_file, pdf_file)
    if result:
        print(f"PDF saved at: {result}")
    else:
        print("Conversion failed.")
