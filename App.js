import React, { useState, useEffect, useCallback } from 'react';
import { Search, FileText, CheckCircle, AlertCircle, Loader2, X, Building2, Upload, ArrowUpDown, Settings, RefreshCw, Eye, EyeOff, Scissors } from 'lucide-react';

const DocumentGenerator = () => {
  const [formData, setFormData] = useState({
    cv: 3000000,
    name: 'John Michael Doe',
    pensionCompany: '',
    pensionNo: '48291736',
    pensionCompanyAddress: '',
    address: '', // residential address
    dob: '',
    mortgageBank: '',
    mortgageBankAddress: '',
    accountNo: '0123456789'
  });

  const [status, setStatus] = useState({ message: '', type: '', visible: false });
  const [isLoading, setIsLoading] = useState(false);
  const [showPensionModal, setShowPensionModal] = useState(false);
  const [showMortgageModal, setShowMortgageModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [mortgageSearchTerm, setMortgageSearchTerm] = useState('');
  const [currentPolicyNumber, setCurrentPolicyNumber] = useState('');
  const [showCustomOrderModal, setShowCustomOrderModal] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [documentOrder, setDocumentOrder] = useState([]);
  const [newPolicyNumber, setNewPolicyNumber] = useState('');
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverItem, setDragOverItem] = useState(null);
  const [splitPages, setSplitPages] = useState([]);
  const [showPreview, setShowPreview] = useState({});
  const [isSplitting, setIsSplitting] = useState(false);

  // Predefined pension companies and their addresses
  const pensionCompanies = {
    'Norrenberger Pensions Limited': 'No. 22 Otukpo Street, Off Gimbiya Street, Area 11, Garki, Abuja',
    'NPF Pensions Limited': 'Plot 3820, R.B. Dikko Street, Off Shehu Shagari Way, Opposite Force Headquarters, Central Business District (CBD), Abuja',
    'OAK Pensions Limited': '266 Muritala Mohammed Way, Yaba, Lagos',
    'Parthian Pensions Limited': '1st Floor, NIJ House, Plot 20 Adeyemo Alakija Street, Victoria Island, Lagos',
    'Pensions Alliance Limited': 'Plot 289 Ajose Adeogun Street, Victoria Island, Lagos',
    'Premium Pension Limited': 'No. 4. Agwu Street, Off Faskari Crescent, Area 3, Garki, Abuja',
    'Citizens Pensions Limited': '3rd Floor, The Beacon, Plot 15 Admiralty Way, Lekki Phase 1, Lagos',
    'Nigerian University Pension Management Company (NUPEMCO)': 'Ground Floor, Abuja Chamber of Commerce and Industry, KM 8 Umaru Musa Yaradua Express Road, Abuja',
    'Cardinal Stone Pensions Limited': '26 Adeola Hopewell Street, Victoria Island, Lagos',
    'Trustfund Pensions Limited': 'Plot 820/821 Labour House, Behind Ministry of Finance, Central Business District, Abuja',
    'Stanbic IBTC Pension Managers Limited': 'Stanbic IBTC Towers, No. 6F Walter Carrington Crescent, Victoria Island, Lagos',
    'Access-ARM Pensions Limited': 'No. 339 Cadastral Zone A08, Takwa Crescent, Off Adetokunbo Ademola Crescent, Wuse 2, Abuja',
    'Crusader Sterling Pensions Limited': 'No. 14b Keffi Street, Off Awolowo Way, South West Ikoyi, Lagos',
    'FCMB Pensions Limited': 'No. 207 Zakariya Maimalari Street, Cadastral AO, Central Business District, Abuja',
    'AXA Mansard Pensions Limited': 'Plot 1568, Muhammadu Buhari Way, Area 11, Garki, Abuja',
    'Leadway Pensure PFA Limited': '121/123 Funsho Williams Avenue, Surulere, Lagos',
    'Legacy Pension Managers Limited': '39 Adetokunbo Ademola Crescent, Wuse II, Abuja',
    'NLPC Pension Fund Administrators Limited': '312A Ikorodu Road, Anthony, Lagos',
    'IGI Pension Fund Managers Limited': 'No. 4, Adeola Odeku Street, Victoria Island, Lagos',
    'Tangerine APT Pensions Limited': 'Federal Mortgage Bank House, Plot 266, Cadastral AO, Central Business District, Abuja',
    'Veritas Glanvills Pensions Limited': 'Plot 1698 C & D, Oyin Jolayemi Street, Victoria Island, Lagos',
    'AIICO Pension Managers Limited': '2 Oba Akran Avenue, Ikeja, Lagos'
  };

  // Predefined mortgage banks and their addresses
  const mortgageBanks = {
    'JIGAWA SAVINGS & LOANS LTD': 'BINTA SUNUSI HOUSE, NO 1, KIYAWA ROAD DUTSE JIGAWA STATE',
    'KEBBI STATE HOME SAVINGS & LOANS LTD': 'PLOT 24, AHMADU BELLO WAY, BIRNIN KEBBI, KEBBI STATE',
  };

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  // Utility function to convert ArrayBuffer to base64 efficiently
  const arrayBufferToBase64 = (arrayBuffer) => {
    const uint8Array = new Uint8Array(arrayBuffer);
    let binary = '';
    const chunkSize = 8192; // Process in chunks to avoid stack overflow
    
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.slice(i, i + chunkSize);
      binary += String.fromCharCode.apply(null, chunk);
    }
    
    return btoa(binary);
  };

  useEffect(() => {
    checkHealth();
    getCurrentPolicyNumber();
  }, []);

  const showStatus = (message, type = 'info') => {
    setStatus({ message, type, visible: true });
    if (type === 'success') {
      setTimeout(() => setStatus(prev => ({ ...prev, visible: false })), 5000);
    }
  };

  const hideStatus = () => {
    setStatus(prev => ({ ...prev, visible: false }));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePensionCompanySelect = (company) => {
    setFormData(prev => ({
      ...prev,
      pensionCompany: company,
      pensionCompanyAddress: pensionCompanies[company]
    }));
    setShowPensionModal(false);
    setSearchTerm('');
  };

  const handleMortgageBankSelect = (bank) => {
    setFormData(prev => ({
      ...prev,
      mortgageBank: bank,
      mortgageBankAddress: mortgageBanks[bank]
    }));
    setShowMortgageModal(false);
    setMortgageSearchTerm('');
  };

  const filteredPensionCompanies = Object.keys(pensionCompanies).filter(company =>
    company.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredMortgageBanks = Object.keys(mortgageBanks).filter(bank =>
    bank.toLowerCase().includes(mortgageSearchTerm.toLowerCase())
  );

  const checkHealth = async () => {
    try {
      showStatus('Checking server status...', 'info');
      
      const response = await fetch(`${apiUrl}/api/health`);
      const data = await response.json();
      
      if (response.ok) {
        let message = `Server Status: ${data.status}<br/>`;
        message += `Templates Directory: ${data.templatesDirExists ? 'EXISTS' : 'MISSING'}<br/>`;
        
        // Show bank-specific template information
        if (data.templateStructure) {
          message += `<br/><strong>Template Structure:</strong><br/>`;
          message += `Common Templates: ${data.templateStructure.commonTemplates.count}/${data.templateStructure.commonTemplates.templates.length}<br/>`;
          message += `Jigawa Templates: ${data.templateStructure.jigawaTemplates.count}/${data.templateStructure.jigawaTemplates.templates.length} (${data.templateStructure.jigawaTemplates.exists ? 'EXISTS' : 'MISSING'})<br/>`;
          message += `Jigawa PDFs: ${data.templateStructure.jigawaPdfs.count}/${data.templateStructure.jigawaPdfs.templates.length} (${data.templateStructure.jigawaPdfs.exists ? 'EXISTS' : 'MISSING'})<br/>`;
          message += `Kebbi Templates: ${data.templateStructure.kebbiTemplates.count}/${data.templateStructure.kebbiTemplates.templates.length} (${data.templateStructure.kebbiTemplates.exists ? 'EXISTS' : 'MISSING'})<br/>`;
          
          if (data.templateStructure.jigawaTemplates.available.length > 0) {
            message += `Jigawa Available: ${data.templateStructure.jigawaTemplates.available.join(', ')}<br/>`;
          }
          if (data.templateStructure.jigawaPdfs.available.length > 0) {
            message += `Jigawa PDFs Available: ${data.templateStructure.jigawaPdfs.available.join(', ')}<br/>`;
          }
          if (data.templateStructure.kebbiTemplates.available.length > 0) {
            message += `Kebbi Available: ${data.templateStructure.kebbiTemplates.available.join(', ')}<br/>`;
          }
        }
        
        const isHealthy = data.templateStructure && 
          data.templateStructure.commonTemplates.count === data.templateStructure.commonTemplates.templates.length &&
          data.templateStructure.jigawaTemplates.count === data.templateStructure.jigawaTemplates.templates.length &&
          data.templateStructure.kebbiTemplates.count === data.templateStructure.kebbiTemplates.templates.length;
        
        showStatus(message, isHealthy ? 'success' : 'error');
      } else {
        showStatus(`Server Error: ${data.error || 'Unknown error'}`, 'error');
      }
    } catch (error) {
      showStatus(`Connection Error: ${error.message}`, 'error');
    }
  };

  const getCurrentPolicyNumber = async () => {
    try {
      const response = await fetch(`${apiUrl}/api/current-policy-number`);
      const data = await response.json();
      
      if (response.ok) {
        setCurrentPolicyNumber(data.policyNo);
        console.log('Current policy number:', data.policyNo);
      } else {
        console.error('Failed to get policy number:', data.error);
      }
    } catch (error) {
      console.error('Error getting policy number:', error);
    }
  };

  const handleResetPolicyNumber = async () => {
    if (!newPolicyNumber || isNaN(parseInt(newPolicyNumber))) {
      showStatus('Please enter a valid policy number', 'error');
      return;
    }

    try {
      setIsLoading(true);
      showStatus('Resetting policy number...', 'info');
      
      const response = await fetch(`${apiUrl}/api/reset-policy-number/${newPolicyNumber}`, {
        method: 'POST'
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setCurrentPolicyNumber(data.nextPolicyNumber);
        setNewPolicyNumber('');
        showStatus(`Policy number reset successfully! Next number: ${data.nextPolicyNumber}`, 'success');
      } else {
        showStatus(`Failed to reset policy number: ${data.error}`, 'error');
      }
    } catch (error) {
      showStatus(`Error resetting policy number: ${error.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const debugGenerate = async () => {
    try {
      setIsLoading(true);
      showStatus('Running debug generation...', 'info');
      
      const response = await fetch(`${apiUrl}/api/debug-generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      const data = await response.json();
      
      if (response.ok) {
        let message = `Debug Generation Successful<br/>`;
        message += `Buffer Size: ${data.bufferSize} bytes<br/>`;
        message += `Output File: ${data.outputPath}<br/>`;
        message += `Check your server directory for debug_output.docx`;
        
        showStatus(message, 'success');
      } else {
        showStatus(`Debug Failed: ${data.error || 'Unknown error'}`, 'error');
      }
    } catch (error) {
      showStatus(`Debug Error: ${error.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const validateForm = () => {
    const requiredFields = [
      { field: 'pensionCompany', label: 'Pension Company' },
      { field: 'address', label: 'Residential Address' },
      { field: 'dob', label: 'Date of Birth' },
      { field: 'mortgageBank', label: 'Mortgage Bank' }
    ];

    console.log('Validating form with data:', formData);

    for (const { field, label } of requiredFields) {
      console.log(`Checking field ${field}:`, formData[field]);
      if (!formData[field]) {
        console.log(`Validation failed for field: ${field} (${label})`);
        showStatus(`Please select/enter ${label}`, 'error');
        return false;
      }
    }
    console.log('Form validation passed!');
    return true;
  };

  const generateDocuments = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setIsLoading(true);
      showStatus('Generating documents...', 'info');
      
      const response = await fetch(`${apiUrl}/api/generate-documents`, {
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

      const blob = await response.blob();
      console.log('Received PDF blob:', blob.size, 'bytes');
      
      // Sanitize name for safe filename
      const safeName = formData.name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${safeName}-${formData.pensionNo}.pdf`;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      showStatus(`Documents downloaded successfully!<br/>Check your Downloads folder for the PDF file.<br/>File size: ${(blob.size / 1024).toFixed(2)} KB`, 'success');
      
      // Refresh policy number after successful generation
      getCurrentPolicyNumber();
      
    } catch (error) {
      console.error('Download failed:', error);
      showStatus(`Download failed: ${error.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = (event) => {
    const files = Array.from(event.target.files);
    const newFiles = files.map(file => ({
      id: Date.now() + Math.random(),
      file: file,
      name: file.name,
      size: file.size,
      type: file.type,
      splitIntoPages: false,
      isSplit: false,
      splitPages: []
    }));
    
    setUploadedFiles(prev => [...prev, ...newFiles]);
    showStatus(`Added ${files.length} file(s) for upload`, 'success');
  };

  const splitPdfFile = async (fileObj) => {
    try {
      setIsSplitting(true);
      showStatus(`Splitting ${fileObj.name} into pages...`, 'info');
      
      // Convert file to base64 using efficient method
      const arrayBuffer = await fileObj.file.arrayBuffer();
      const base64 = arrayBufferToBase64(arrayBuffer);
      
      const response = await fetch(`${apiUrl}/api/split-pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pdfData: base64,
          fileName: fileObj.name
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to split PDF');
      }

      const data = await response.json();
      
      // Update the file object with split pages
      const updatedFile = {
        ...fileObj,
        isSplit: true,
        splitPages: data.pages,
        totalPages: data.totalPages
      };
      
      // Update uploaded files
      setUploadedFiles(prev => 
        prev.map(f => f.id === fileObj.id ? updatedFile : f)
      );
      
      // Add split pages to state (document order will be updated by useEffect)
      setSplitPages(prev => [...prev, ...data.pages]);
      
      showStatus(`Successfully split ${fileObj.name} into ${data.totalPages} pages`, 'success');
      
    } catch (error) {
      console.error('PDF splitting failed:', error);
      showStatus(`Failed to split PDF: ${error.message}`, 'error');
    } finally {
      setIsSplitting(false);
    }
  };

  const togglePreview = (pageId) => {
    setShowPreview(prev => ({
      ...prev,
      [pageId]: !prev[pageId]
    }));
  };

  const removeUploadedFile = (fileId) => {
    // Find the file to get its split pages
    const fileToRemove = uploadedFiles.find(f => f.id === fileId);
    
    // Remove the file
    setUploadedFiles(prev => prev.filter(file => file.id !== fileId));
    
    // Remove associated split pages from document order
    if (fileToRemove && fileToRemove.isSplit) {
      setDocumentOrder(prev => 
        prev.filter(item => 
          !(item.type === 'split_page' && item.originalFileName === fileToRemove.name)
        )
      );
      
      // Remove from split pages state
      setSplitPages(prev => 
        prev.filter(page => page.originalFileName !== fileToRemove.name)
      );
    }
  };

  // Initialize document order with all available documents
  const initializeDocumentOrder = useCallback(() => {
    const baseGeneratedDocs = [
      'confirmation_of_property_availability',
      'confirmation_of_property_title',
      'indemnity',
      'readiness',
      'verification',
      'indicative',
      'legal_search'
    ];

    // Add bank-specific documents
    const generatedDocsList = [...baseGeneratedDocs];
    if (formData.mortgageBank && formData.mortgageBank.toLowerCase().includes('jigawa')) {
      generatedDocsList.push('pension_cert');
      generatedDocsList.push('nsia_insurance'); // NSIA is for Jigawa
      generatedDocsList.push('mujaa_offer_letter'); // MUJAA offer letter for Jigawa
      generatedDocsList.push('valuation_report'); // Valuation report for Jigawa
    } else if (formData.mortgageBank && formData.mortgageBank.toLowerCase().includes('kebbi')) {
      generatedDocsList.push('kbl_insurance'); // KBL is for Kebbi
      generatedDocsList.push('mujaa_offer_letter'); // MUJAA offer letter for Kebbi
      generatedDocsList.push('valuation_report'); // Valuation report for Kebbi
      generatedDocsList.push('clearance_cert'); // Clearance certificate for Kebbi
    }

    const generatedDocs = generatedDocsList.map((docName, index) => ({
      id: `generated_${docName}`,
      name: docName.replace(/_/g, ' ').toUpperCase(),
      type: 'generated',
      order: index + 1
    }));

    const uploadedDocs = uploadedFiles
      .filter(file => !file.isSplit) // Only include non-split files
      .map((file, index) => ({
        id: file.id,
        name: file.name,
        type: 'uploaded',
        order: generatedDocs.length + index + 1,
        splitIntoPages: file.splitIntoPages || false
      }));

    // Add split pages
    const splitDocs = splitPages.map((page, index) => ({
      id: page.id,
      name: `Page ${page.pageNumber} - ${page.originalFileName}`,
      type: 'split_page',
      order: generatedDocs.length + uploadedDocs.length + index + 1,
      originalFileName: page.originalFileName,
      pageNumber: page.pageNumber,
      previewData: page.previewData
    }));

    return [...generatedDocs, ...uploadedDocs, ...splitDocs].sort((a, b) => a.order - b.order);
  }, [uploadedFiles, splitPages, formData.mortgageBank]);

  // Update document order when uploaded files or split pages change
  useEffect(() => {
    const newDocumentOrder = initializeDocumentOrder();
    setDocumentOrder(newDocumentOrder);
  }, [initializeDocumentOrder]);

  const handleDragStart = (e, item) => {
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, item) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverItem(item);
  };

  const handleDragLeave = () => {
    setDragOverItem(null);
  };

  const handleDrop = (e, targetItem) => {
    e.preventDefault();
    
    if (!draggedItem || draggedItem.id === targetItem.id) {
      setDraggedItem(null);
      setDragOverItem(null);
      return;
    }

    const newOrder = [...documentOrder];
    const draggedIndex = newOrder.findIndex(item => item.id === draggedItem.id);
    const targetIndex = newOrder.findIndex(item => item.id === targetItem.id);

    // Remove dragged item and insert at new position
    const [removed] = newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, removed);

    // Update order numbers
    const updatedOrder = newOrder.map((item, index) => ({
      ...item,
      order: index + 1
    }));

    setDocumentOrder(updatedOrder);
    setDraggedItem(null);
    setDragOverItem(null);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDragOverItem(null);
  };

  const generateCustomOrderDocuments = async () => {
    console.log('generateCustomOrderDocuments called!');
    
    if (!validateForm()) {
      console.log('Form validation failed');
      return;
    }

    console.log('Form validation passed, starting generation...');

    try {
      setIsLoading(true);
      showStatus('Generating custom ordered documents...', 'info');
      console.log('Loading state set to true');
      
      // Ensure documentOrder is properly initialized
      const currentDocumentOrder = documentOrder.length > 0 ? documentOrder : initializeDocumentOrder();
      
      // Convert uploaded files to base64 (only non-split files)
      const uploadedDocuments = await Promise.all(
        uploadedFiles
          .filter(file => !file.isSplit) // Only include non-split files
          .map(async (fileObj) => {
            const arrayBuffer = await fileObj.file.arrayBuffer();
            const base64 = arrayBufferToBase64(arrayBuffer);
            return {
              name: fileObj.name,
              data: base64,
              splitIntoPages: fileObj.splitIntoPages || false
            };
          })
      );
      
      const requestData = {
        ...formData,
        documentOrder: currentDocumentOrder.map(item => ({
          type: item.type,
          documentName: item.type === 'generated' 
            ? item.id.replace('generated_', '') 
            : item.type === 'split_page'
            ? item.id
            : item.name,
          pageNumber: item.type === 'split_page' ? item.pageNumber : undefined
        })),
        uploadedDocuments: uploadedDocuments,
        splitPages: splitPages // Include split pages data
      };
      
      console.log('Sending request data:', requestData);
      
      console.log('Making request to:', `${apiUrl}/api/generate-documents-with-custom-order`);
      
      const response = await fetch(`${apiUrl}/api/generate-documents-with-custom-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      });

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error response:', errorData);
        throw new Error(errorData.error || 'Failed to generate custom ordered documents');
      }

      const blob = await response.blob();
      console.log('Received custom order PDF blob:', blob.size, 'bytes');
      
      // Sanitize name for safe filename
      const safeName = formData.name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${safeName}-custom-ordered-${formData.pensionNo}.pdf`;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      showStatus(`Custom ordered documents downloaded successfully!<br/>Check your Downloads folder for the PDF file.<br/>File size: ${(blob.size / 1024).toFixed(2)} KB`, 'success');
      
      // Refresh policy number after successful generation
      getCurrentPolicyNumber();
      
    } catch (error) {
      console.error('Custom order download failed:', error);
      
      // If custom order fails, try regular document generation as fallback
      showStatus(`Custom order failed, trying regular generation...`, 'info');
      
      try {
        const response = await fetch(`${apiUrl}/api/generate-documents`, {
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

        const blob = await response.blob();
        console.log('Received fallback PDF blob:', blob.size, 'bytes');
        
        // Sanitize name for safe filename
        const safeName = formData.name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');

        // Create download link
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${safeName}-fallback-${formData.pensionNo}.pdf`;
        
        // Trigger download
        document.body.appendChild(link);
        link.click();
        
        // Cleanup
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        showStatus(`Fallback documents downloaded successfully!<br/>File size: ${(blob.size / 1024).toFixed(2)} KB`, 'success');
        
        // Refresh policy number after successful generation
        getCurrentPolicyNumber();
        
      } catch (fallbackError) {
        console.error('Fallback generation also failed:', fallbackError);
        showStatus(`Both custom order and fallback generation failed: ${error.message}`, 'error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-800 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-white/20">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full mb-4">
              <FileText className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Document Generator</h1>
            <p className="text-gray-600">Generate pension documents with ease</p>
          </div>
          
          <div className="space-y-6">
            {/* First Row */}

              <div className="md:col-span-8">
    <label className="block text-sm font-semibold text-gray-700 mb-2">
      Name
    </label>
    <input
      type="text"
      name="name"
      value={formData.name}
      onChange={handleInputChange}
      placeholder="Enter Name"
      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl 
                 focus:border-purple-500 focus:outline-none transition-all duration-200"
      required
    />
  </div>
          <div>
  <label className="block text-sm font-semibold text-gray-700 mb-2">
    CV (₦)
  </label>
  <input
    type="text"
    name="cv"
    value={
      formData.cv !== ""
        ? formData.cv.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")
        : ""
    }
    onChange={(e) => {
      let rawValue = e.target.value.replace(/,/g, ""); // remove commas

      // Allow decimals only once
      if (/^\d*\.?\d*$/.test(rawValue)) {
        setFormData((prev) => ({
          ...prev,
          cv: rawValue, // keep as string to avoid cutting decimals
        }));
      }
    }}
    onBlur={() => {
      // Format properly on blur (optional)
      if (formData.cv !== "" && !isNaN(formData.cv)) {
        setFormData((prev) => ({
          ...prev,
          cv: parseFloat(prev.cv).toString(),
        }));
      }
    }}
    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl 
               focus:border-purple-500 focus:outline-none 
               transition-all duration-200 text-lg"
    required
  />
</div>



            {/* Second Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Date of Birth
                </label>
                <input
                  type="date"
                  name="dob"
                  value={formData.dob}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-all duration-200"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Account Number
                </label>
                <input
                  type="text"
                  name="accountNo"
                  value={formData.accountNo}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-all duration-200"
                  required
                />
              </div>
            </div>

            {/* Third Row */}
            {/* Third Row */}
<div className="grid grid-cols-1 md:grid-cols-12 gap-6">
  <div className="md:col-span-4">
    <label className="block text-sm font-semibold text-gray-700 mb-2">
      Pension Number
    </label>
    <input
      type="text"
      name="pensionNo"
      value={formData.pensionNo}
      onChange={handleInputChange}
      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl 
                 focus:border-purple-500 focus:outline-none transition-all duration-200"
      required
    />
  </div>

  <div className="md:col-span-8">
    <label className="block text-sm font-semibold text-gray-700 mb-2">
      Residential Address
    </label>
    <input
      type="text"
      name="address"
      value={formData.address}
      onChange={handleInputChange}
      placeholder="Enter your full residential address..."
      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl 
                 focus:border-purple-500 focus:outline-none transition-all duration-200"
      required
    />
  </div>
</div>


            {/* Pension Company Selection */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                PFA (Pension Fund Administrator)
              </label>
              <button
                type="button"
                onClick={() => setShowPensionModal(true)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-all duration-200 flex items-center justify-between bg-white text-left hover:border-purple-300"
              >
                <span className={formData.pensionCompany ? 'text-gray-900' : 'text-gray-500'}>
                  {formData.pensionCompany || 'Select a pension company...'}
                </span>
                <Search className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {formData.pensionCompanyAddress && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  PFA Address
                </label>
                <input
                  type="text"
                  name="pensionCompanyAddress"
                  value={formData.pensionCompanyAddress}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-all duration-200 bg-gray-50"
                  readOnly
                />
              </div>
            )}

            {/* Mortgage Bank Selection */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Mortgage Bank
              </label>
              <button
                type="button"
                onClick={() => setShowMortgageModal(true)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-all duration-200 flex items-center justify-between bg-white text-left hover:border-purple-300"
              >
                <span className={formData.mortgageBank ? 'text-gray-900' : 'text-gray-500'}>
                  {formData.mortgageBank || 'Select a mortgage bank...'}
                </span>
                <Building2 className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {formData.mortgageBankAddress && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Mortgage Bank Address
                </label>
                <input
                  type="text"
                  name="mortgageBankAddress"
                  value={formData.mortgageBankAddress}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-all duration-200 bg-gray-50"
                  readOnly
                />
              </div>
            )}
            
            {/* Policy Number Display */}
            {currentPolicyNumber && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-blue-800">Current Policy Number</h3>
                    <p className="text-2xl font-bold text-blue-900">{currentPolicyNumber}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={newPolicyNumber}
                      onChange={(e) => setNewPolicyNumber(e.target.value)}
                      placeholder="New number"
                      className="w-24 px-3 py-2 border border-blue-300 rounded-lg text-sm"
                    />
                    <button
                      onClick={handleResetPolicyNumber}
                      disabled={isLoading || !newPolicyNumber}
                      className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Reset
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-6">
              <button
                type="button"
                onClick={checkHealth}
                disabled={isLoading}
                className="flex-1 bg-white border-2 border-gray-300 text-gray-700 px-6 py-3 rounded-xl font-semibold hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 hover:shadow-lg transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                Check Server Status
              </button>
              
              <button
                type="button"
                onClick={debugGenerate}
                disabled={isLoading}
                className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-6 py-3 rounded-xl font-semibold hover:from-blue-600 hover:to-cyan-600 transition-all duration-200 hover:shadow-lg transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <AlertCircle className="w-5 h-5" />}
                Test Debug
              </button>
              
              <button
                type="button"
                onClick={() => {
                  setShowCustomOrderModal(true);
                  // Initialize document order when opening modal
                  setDocumentOrder(initializeDocumentOrder());
                }}
                disabled={isLoading}
                className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-6 py-3 rounded-xl font-semibold hover:from-green-600 hover:to-emerald-600 transition-all duration-200 hover:shadow-lg transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowUpDown className="w-5 h-5" />}
                Custom Order
              </button>
              
              <button
                type="submit"
                disabled={isLoading}
                onClick={generateDocuments}
                className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-purple-700 hover:to-indigo-700 transition-all duration-200 hover:shadow-lg transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileText className="w-5 h-5" />}
                Generate Documents
              </button>
            </div>
          </div>
          
          {status.visible && (
            <div className={`mt-6 p-4 rounded-xl border-l-4 ${
              status.type === 'success' 
                ? 'bg-green-50 border-green-500 text-green-700'
                : status.type === 'error'
                ? 'bg-red-50 border-red-500 text-red-700'
                : 'bg-blue-50 border-blue-500 text-blue-700'
            } transition-all duration-300`}>
              <div 
                className="text-sm leading-relaxed"
                dangerouslySetInnerHTML={{ __html: status.message }}
              />
              <button
                onClick={hideStatus}
                className="mt-2 text-xs text-gray-500 hover:text-gray-700 underline"
              >
                Dismiss
              </button>
            </div>
          )}
        </div>

        {/* Pension Company Selection Modal */}
        {showPensionModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h3 className="text-xl font-semibold text-gray-800">Select Pension Company</h3>
                <button
                  onClick={() => {
                    setShowPensionModal(false);
                    setSearchTerm('');
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              
              <div className="p-6 border-b border-gray-200">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search pension companies..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-all duration-200"
                  />
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-3">
                  {filteredPensionCompanies.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Search className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p>No pension companies found matching your search.</p>
                    </div>
                  ) : (
                    filteredPensionCompanies.map((company) => (
                      <button
                        key={company}
                        onClick={() => handlePensionCompanySelect(company)}
                        className="w-full p-4 text-left bg-white border-2 border-gray-100 hover:border-purple-300 hover:bg-purple-50 rounded-xl transition-all duration-200 hover:shadow-md"
                      >
                        <div className="font-semibold text-gray-900 mb-2">{company}</div>
                        <div className="text-sm text-gray-600">{pensionCompanies[company]}</div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Mortgage Bank Selection Modal */}
        {showMortgageModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h3 className="text-xl font-semibold text-gray-800">Select Mortgage Bank</h3>
                <button
                  onClick={() => {
                    setShowMortgageModal(false);
                    setMortgageSearchTerm('');
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              
              <div className="p-6 border-b border-gray-200">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search mortgage banks..."
                    value={mortgageSearchTerm}
                    onChange={(e) => setMortgageSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-all duration-200"
                  />
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-3">
                  {filteredMortgageBanks.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Building2 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p>No mortgage banks found matching your search.</p>
                    </div>
                  ) : (
                    filteredMortgageBanks.map((bank) => (
                      <button
                        key={bank}
                        onClick={() => handleMortgageBankSelect(bank)}
                        className="w-full p-4 text-left bg-white border-2 border-gray-100 hover:border-purple-300 hover:bg-purple-50 rounded-xl transition-all duration-200 hover:shadow-md"
                      >
                        <div className="font-semibold text-gray-900 mb-2">{bank}</div>
                        <div className="text-sm text-gray-600">{mortgageBanks[bank]}</div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Custom Document Order Modal */}
        {showCustomOrderModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h3 className="text-xl font-semibold text-gray-800">Custom Document Ordering</h3>
                <button
                  onClick={() => {
                    setShowCustomOrderModal(false);
                    setUploadedFiles([]);
                    setDocumentOrder([]);
                    setSplitPages([]);
                    setShowPreview({});
                    setDraggedItem(null);
                    setDragOverItem(null);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* File Upload Section */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-800 mb-4">Upload Additional Documents</h4>
                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center">
                    <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <input
                      type="file"
                      multiple
                      accept=".pdf"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="file-upload"
                    />
                    <label
                      htmlFor="file-upload"
                      className="cursor-pointer bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors inline-block"
                    >
                      Choose PDF Files
                    </label>
                    <p className="text-sm text-gray-500 mt-2">Upload PDF files to include in your document package</p>
                  </div>
                  
                  {/* Uploaded Files List */}
                  {uploadedFiles.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <h5 className="font-semibold text-gray-700">Uploaded Files:</h5>
                      {uploadedFiles.map((file) => (
                        <div key={file.id} className="bg-gray-50 p-3 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <FileText className="w-5 h-5 text-gray-500" />
                              <div>
                                <p className="text-sm font-medium text-gray-900">{file.name}</p>
                                <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                                {file.isSplit && (
                                  <p className="text-xs text-blue-600">Split into {file.totalPages} pages</p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {!file.isSplit && (
                                <button
                                  onClick={() => splitPdfFile(file)}
                                  disabled={isSplitting}
                                  className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {isSplitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Scissors className="w-3 h-3" />}
                                  Split
                                </button>
                              )}
                              <button
                                onClick={() => removeUploadedFile(file.id)}
                                className="text-red-500 hover:text-red-700 p-1"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          
                          {/* Split Pages Preview */}
                          {file.isSplit && file.splitPages && file.splitPages.length > 0 && (
                            <div className="mt-3 border-t pt-3">
                              <h6 className="text-xs font-semibold text-gray-600 mb-2">Split Pages:</h6>
                              <div className="grid grid-cols-2 gap-2">
                                {file.splitPages.map((page) => (
                                  <div key={page.id} className="bg-white p-2 rounded border">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="text-xs font-medium text-gray-700">
                                        Page {page.pageNumber}
                                      </span>
                                      <button
                                        onClick={() => togglePreview(page.id)}
                                        className="text-blue-600 hover:text-blue-800 p-1"
                                      >
                                        {showPreview[page.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                      </button>
                                    </div>
                                    {showPreview[page.id] && (
                                      <div className="mt-2">
                                        <iframe
                                          src={page.previewData}
                                          className="w-full h-32 border rounded"
                                          title={`Page ${page.pageNumber} preview`}
                                        />
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Document Order Section */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-800 mb-4">Document Order</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Drag and drop to reorder documents. The order here will be the final order in your PDF package.
                  </p>
                  
                  <div className="space-y-2">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h5 className="font-semibold text-gray-800 mb-3">Drag to reorder documents:</h5>
                      <div className="space-y-2">
                        {documentOrder.map((item, index) => (
                          <div
                            key={item.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, item)}
                            onDragOver={(e) => handleDragOver(e, item)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, item)}
                            onDragEnd={handleDragEnd}
                            className={`flex items-center gap-3 bg-white p-3 rounded-lg border-2 cursor-move transition-all duration-200 ${
                              draggedItem?.id === item.id 
                                ? 'opacity-50 scale-95' 
                                : dragOverItem?.id === item.id 
                                ? 'border-blue-400 bg-blue-50 shadow-md' 
                                : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-xs font-semibold text-gray-600">
                                {item.order}
                              </div>
                              <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                              <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                              <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                            </div>
                            <FileText className="w-4 h-4 text-gray-500" />
                            <span className="text-sm text-gray-700 flex-1">{item.name}</span>
                            <div className="flex gap-2">
                              {item.type === 'generated' && (
                                <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">Generated</span>
                              )}
                              {item.type === 'uploaded' && (
                                <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">Uploaded</span>
                              )}
                              {item.type === 'split_page' && (
                                <span className="text-xs text-purple-600 bg-purple-100 px-2 py-1 rounded">
                                  Page {item.pageNumber}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="p-6 border-t border-gray-200 flex gap-4">
                <button
                  onClick={() => {
                    console.log('Test button clicked!');
                    alert('Test button works!');
                  }}
                  className="flex-1 bg-yellow-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-yellow-600 transition-all duration-200"
                >
                  Test Button
                </button>
                <button
                  onClick={() => {
                    setShowCustomOrderModal(false);
                    setUploadedFiles([]);
                    setDocumentOrder([]);
                    setSplitPages([]);
                    setShowPreview({});
                    setDraggedItem(null);
                    setDragOverItem(null);
                  }}
                  className="flex-1 bg-gray-300 text-gray-700 px-6 py-3 rounded-xl font-semibold hover:bg-gray-400 transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    console.log('Generate Custom Order button clicked!');
                    console.log('isLoading state:', isLoading);
                    generateCustomOrderDocuments();
                  }}
                  disabled={isLoading}
                  className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-green-700 hover:to-emerald-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowUpDown className="w-5 h-5" />}
                  Generate Custom Order
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentGenerator;