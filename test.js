// Frontend code to properly handle the ZIP download
async function generateDocuments(formData) {
  try {
    const response = await fetch('http://localhost:3000/api/generate-documents', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to generate documents');
    }

    // Get the ZIP file as a blob
    const blob = await response.blob();
    
    // Create a download link
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'processed_documents.zip';
    
    // Trigger the download
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    console.log('✅ Documents downloaded successfully');
    
  } catch (error) {
    console.error('❌ Download failed:', error);
    alert('Failed to download documents: ' + error.message);
  }
}

// Example usage with form data
const formData = {
  cv: 3000000,
  name: "John Michael Doe",
  pensionCompany: "United Pensions Trust Ltd",
  pensionNo: "PEN-48291736",
  pensionCompanyAddress: "45 Marina Road, Victoria Island, Lagos, Nigeria",
  accountName: "John M. Doe",
  accountNo: "0123456789"
};

// Call this function when the user clicks the generate button
generateDocuments(formData);