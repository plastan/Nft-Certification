import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, Copy, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { disconnectWallet } from './utils/wallet';
import 'buffer';
import process from 'process';
import { getFirestore, collection, getDocs, query, where, addDoc } from 'firebase/firestore';
import Moralis from 'moralis';

const SectionButton = ({ title, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full text-left p-4 mb-2 rounded-lg transition-colors ${
      isActive ? 'bg-blue-600 text-white' : 'bg-white text-blue-800 hover:bg-blue-100'
    }`}
  >
    {title}
  </button>
);

const courses = [
  'B Tech in Computer Science',
  'B Tech in Civil Engineering',
  'B Tech in Cyber Security'
];

const CertificateRequestForm = ({ onClose, institutions }) => {
  const [studentName, setStudentName] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [selectedInstitution, setSelectedInstitution] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [walletAddress, setWalletAddress] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const db = getFirestore();
    try {
      const institution = institutions.find(inst => inst.id === selectedInstitution);
      
      if (!institution) {
        console.error('Selected institution not found');
        return;
      }

      const requestData = {
        studentName,
        registrationNumber,
        institutionId: selectedInstitution,
        institutionName: institution.name,
        course: selectedCourse,
        walletAddress,
        status: 'pending',
        createdAt: new Date()
      };

      console.log('Submitting request with data:', requestData);

      const docRef = await addDoc(collection(db, 'certificateRequests'), requestData);
      console.log('Document written with ID: ', docRef.id);

      onClose();
    } catch (error) {
      console.error('Error submitting certificate request:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        type="text"
        value={studentName}
        onChange={(e) => setStudentName(e.target.value)}
        placeholder="Student Name"
        required
        className="w-full p-2 border rounded"
      />
      <input
        type="text"
        value={registrationNumber}
        onChange={(e) => setRegistrationNumber(e.target.value)}
        placeholder="Registration Number"
        required
        className="w-full p-2 border rounded"
      />
      <select
        value={selectedInstitution}
        onChange={(e) => setSelectedInstitution(e.target.value)}
        required
        className="w-full p-2 border rounded"
      >
        <option value="">Select Institution</option>
        {institutions.map(inst => (
          <option key={inst.id} value={inst.id}>{inst.name}</option>
        ))}
      </select>
      <select
        value={selectedCourse}
        onChange={(e) => setSelectedCourse(e.target.value)}
        required
        className="w-full p-2 border rounded"
      >
        <option value="">Select Course</option>
        {courses.map(course => (
          <option key={course} value={course}>{course}</option>
        ))}
      </select>
      <input
        type="text"
        value={walletAddress}
        onChange={(e) => setWalletAddress(e.target.value)}
        placeholder="Wallet Address"
        required
        className="w-full p-2 border rounded"
      />
      <div className="flex justify-end space-x-2">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 bg-gray-200 text-gray-800 rounded"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-500 text-white rounded"
        >
          Submit Request
        </button>
      </div>
    </form>
  );
};

const StudentDashboard = () => {
  const [activeSection, setActiveSection] = useState('request-certificate');
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [institutions, setInstitutions] = useState([]);
  const navigate = useNavigate();
  const [walletAddress, setWalletAddress] = useState('');
  const [nftData, setNftData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchInstitutions = async () => {
      const db = getFirestore();
      const institutionsCollection = collection(db, 'users');
      const institutionsSnapshot = await getDocs(institutionsCollection);
      const institutionsList = institutionsSnapshot.docs
        .filter(doc => doc.data().userType === 'institution')
        .map(doc => ({
          id: doc.id,
          name: doc.data().name
        }));
      setInstitutions(institutionsList);
    };

    fetchInstitutions();
  }, []);

  useEffect(() => {
    const storedWalletAddress = localStorage.getItem('walletAddress');
    console.log('Stored wallet address:', storedWalletAddress);
    if (storedWalletAddress) {
      setWalletAddress(storedWalletAddress);
    } else {
      console.error('No wallet address found in localStorage');
    }
  }, []);

  const handleLogout = async () => {
    try {
      await disconnectWallet();
      localStorage.removeItem('userType');
      localStorage.removeItem('walletAddress');
      navigate('/');
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  const handleCopyAddress = async () => {
    try {
      await navigator.clipboard.writeText(walletAddress);
      alert('Wallet address copied!');
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const getIPFSUrl = (ipfsUri) => {
    if (!ipfsUri) {
      console.log('No IPFS URI provided');
      return null;
    }
    
    console.log('Original URI:', ipfsUri);

    // If it's already a gateway URL, return as is
    if (ipfsUri.startsWith('https://')) {
      return ipfsUri;
    }

    // Handle ipfs:// protocol
    if (ipfsUri.startsWith('ipfs://')) {
      const hash = ipfsUri.replace('ipfs://', '');
      return `https://ipfs.io/ipfs/${hash}`;
    }

    // If it's just a hash, add the gateway
    if (ipfsUri.startsWith('Qm') || ipfsUri.startsWith('bafk')) {
      return `https://ipfs.io/ipfs/${ipfsUri}`;
    }

    // Default case: assume it's a hash
    return `https://ipfs.io/ipfs/${ipfsUri}`;
  };

  const fetchReceivedNFTs = async () => {
    setIsLoading(true);
    try {
      await Moralis.start({
        apiKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJub25jZSI6Ijc5NWM3OWJhLWEyODgtNDZhYi1iNzdiLTJjMjE3MDdkYmEzNCIsIm9yZ0lkIjoiNDE0NzcwIiwidXNlcklkIjoiNDI2MjU1IiwidHlwZUlkIjoiYWRlZjliZmItM2M4Yy00YzA3LWJmM2YtYzE5YTUwN2JmMWM3IiwidHlwZSI6IlBST0pFQ1QiLCJpYXQiOjE3MzA2Mjc5NjAsImV4cCI6NDg4NjM4Nzk2MH0.VJ87rLcvA4IdbPV_f3sz_lbaT4hSRZ3uvQuAnNy-inc"
      });

      const response = await Moralis.EvmApi.nft.getWalletNFTs({
        chain: "0xaa36a7",
        format: "hex",
        mediaItems: true,
        address: walletAddress
      });

      // Parse the metadata for each NFT
      const processedNFTs = response.result.map(nft => {
        try {
          // If metadata is a string, try to parse it
          const metadata = typeof nft.metadata === 'string' 
            ? JSON.parse(nft.metadata) 
            : nft.metadata;

          return {
            ...nft,
            metadata: {
              studentName: metadata?.studentName || metadata?.name || 'N/A',
              registrationNumber: metadata?.registrationNumber || 'N/A',
              institutionName: metadata?.institutionName || 'N/A',
              institutionId: metadata?.institutionId || 'N/A',
              course: metadata?.course || 'N/A',
              description: metadata?.description || 'N/A',
              image: metadata?.image || nft.original_media_url,
              walletAddress: metadata?.walletAddress || 'N/A',
              createdAt: metadata?.createdAt || 'N/A',
              status: metadata?.status || 'N/A',
              institutionWalletAddress: metadata?.institutionWalletAddress || 'N/A',
              cgpa: metadata?.cgpa || 'N/A',
              certificateHash: metadata?.certificateHash || 'N/A'
            }
          };
        } catch (error) {
          console.error('Error parsing metadata for NFT:', error);
          return {
            ...nft,
            metadata: {
              studentName: 'Error loading metadata',
              registrationNumber: 'N/A',
              institutionName: 'N/A',
              institutionId: 'N/A',
              course: 'N/A',
              description: 'N/A',
              image: nft.original_media_url,
              walletAddress: 'N/A',
              createdAt: 'N/A',
              status: 'N/A',
              institutionWalletAddress: 'N/A',
              cgpa: 'N/A',
              certificateHash: 'N/A',
              additionalField1: 'N/A',
              additionalField2: 'N/A'
            }
          };
        }
      });

      setNftData({ result: processedNFTs });
      console.log('Processed NFTs:', processedNFTs);

    } catch (error) {
      console.error('Error fetching NFTs:', error);
      alert('Failed to fetch NFTs');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMetadataDownload = async (metadata) => {
    try {
      if (!metadata) {
        throw new Error('No metadata available');
      }

      // Create a formatted metadata object with all relevant details
      const formattedMetadata = {
        id: metadata.id,
        registrationNumber: metadata.registrationNumber,
        walletAddress: metadata.walletAddress,
        createdAt: metadata.createdAt,
        institutionId: metadata.institutionId,
        status: metadata.status,
        institutionName: metadata.institutionName,
        studentName: metadata.studentName,
        course: metadata.course,
        name: metadata.name,
        description: metadata.description,
        image: metadata.image,
        institutionWalletAddress: metadata.institutionWalletAddress,
        cgpa: metadata.cgpa,
        certificateHash: metadata.certificateHash,
        // Add any additional fields you want to include
        additionalField1: metadata.additionalField1, // Example field
        additionalField2: metadata.additionalField2  // Example field
      };

      // Create and download the JSON file
      const blob = new Blob([JSON.stringify(formattedMetadata, null, 2)], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `certificate-metadata-${metadata.studentName || 'unknown'}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

    } catch (error) {
      console.error('Error downloading metadata:', error);
      alert('Failed to download metadata: ' + error.message);
    }
  };

  // Add this function to handle image download
  const handleImageDownload = async (imageUrl, studentName) => {
    try {
      console.log('Downloading image from:', imageUrl); // Debug log

      // If it's an IPFS URL, ensure we're using the gateway URL
      const downloadUrl = imageUrl.startsWith('ipfs://')
        ? `https://ipfs.io/ipfs/${imageUrl.replace('ipfs://', '')}`
        : imageUrl;

      const response = await fetch(downloadUrl);
      if (!response.ok) throw new Error('Failed to fetch image');

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      // Use a sanitized student name or timestamp for filename
      const fileName = studentName
        ? `certificate-${studentName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.png`
        : `certificate-${Date.now()}.png`;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading image:', error);
      alert('Failed to download image: ' + error.message);
    }
  };

  return (
    <div className="min-h-screen bg-blue-50 p-8 font-sans">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-4xl font-bold text-blue-900">Student Dashboard</h1>
        <div className="flex items-center gap-4">
          <div className="bg-white px-4 py-2 rounded-lg shadow-sm flex items-center gap-2">
            <span className="text-sm text-gray-600">Wallet:</span>
            <span className="text-sm font-mono">{walletAddress}</span>
            <button 
              onClick={handleCopyAddress}
              className="text-blue-600 hover:text-blue-800 ml-2"
              title="Copy wallet address"
            >
              <Copy size={16} />
            </button>
          </div>
          
          <button
            onClick={handleLogout}
            className="bg-red-500 text-white px-4 py-2 rounded-lg flex items-center"
          >
            <LogOut className="mr-2" /> Logout
          </button>
        </div>
      </div>
      <div className="w-32 h-1 bg-blue-600 mb-8"></div>

      <div className="flex space-x-8">
        <div className="w-1/3">
          <SectionButton
            title="Request Certificate"
            isActive={activeSection === 'request-certificate'}
            onClick={() => setActiveSection('request-certificate')}
          />

          <SectionButton
            title="Received NFT's"
            isActive={activeSection === 'received-nfts'}
            onClick={() => {
              setActiveSection('received-nfts');
              // Add your new actions here, for example:
              fetchReceivedNFTs();  // Function to fetch NFTs
              // or
                // Custom handler function
            }}
          />
        </div>
        <div className="w-2/3 bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold text-blue-800 mb-4">
            {activeSection === 'request-certificate' && 'Request Certificate'}
            
            {activeSection === 'received-nfts' && "Received NFT's"}
          </h2>
          {activeSection === 'request-certificate' && (
            <div>
              {!showRequestForm ? (
                <button
                  onClick={() => setShowRequestForm(true)}
                  className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
                >
                  Request Certificate
                </button>
              ) : (
                <CertificateRequestForm onClose={() => setShowRequestForm(false)} institutions={institutions} />
              )}
            </div>
          )}
 
          {activeSection === 'received-nfts' && (
            <div className="p-6">
              {isLoading ? (
                <div className="text-center py-4">
                  <p>Loading NFTs...</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {nftData?.result?.map((nft, index) => (
                    <div key={index} className="flex items-start bg-white p-6 rounded-lg shadow-md gap-6">
                      {/* Image container with hover effect */}
                      <div className="relative w-48 h-48 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden group cursor-pointer">
                        {nft.metadata?.image || nft.original_media_url ? (
                          <>
                            <img
                              src={getIPFSUrl(nft.metadata?.image || nft.original_media_url)}
                              alt={`Certificate for ${nft.metadata?.studentName || 'Student'}`}
                              className="w-full h-full object-contain"
                            />
                            {/* Clickable overlay with download icon */}
                            <div 
                              onClick={() => handleImageDownload(
                                nft.metadata?.image || nft.original_media_url,
                                nft.metadata?.studentName
                              )}
                              className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer"
                            >
                              <Download className="text-white w-8 h-8" />
                            </div>
                          </>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            No Image Available
                          </div>
                        )}
                      </div>

                      {/* Certificate Details - Updated Layout */}
                      <div className="flex flex-col gap-4 flex-grow">
                        {nft.metadata && (
                          <>
                            <h3 className="text-2xl font-semibold text-blue-600">
                              {nft.metadata.studentName || 'Student Name'}
                            </h3>
                            
                            <div className="space-y-3">
                              <div>
                                <p className="text-gray-600 text-sm">Registration Number</p>
                                <p className="font-medium">{nft.metadata.registrationNumber || 'N/A'}</p>
                              </div>
                              
                              <div>
                                <p className="text-gray-600 text-sm">Institution</p>
                                <p className="font-medium">{nft.metadata.institutionName || 'N/A'}</p>
                              </div>
                              
                              <div>
                                <p className="text-gray-600 text-sm">Institution ID</p>
                                <p className="font-medium break-all">{nft.metadata.institutionId || 'N/A'}</p>
                              </div>
                              
                              <div>
                                <p className="text-gray-600 text-sm">Course</p>
                                <p className="font-medium">{nft.metadata.course || 'N/A'}</p>
                              </div>

                              <div>
                                <p className="text-gray-600 text-sm">Description</p>
                                <p className="text-sm">{nft.metadata.description || 'N/A'}</p>
                              </div>
                            </div>

                            {/* Metadata Download Button */}
                            <button
                              onClick={() => handleMetadataDownload(nft.metadata)}
                              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors mt-2 w-fit"
                            >
                              <Download size={16} />
                              Download Metadata
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}

                  {(!nftData?.result || nftData.result.length === 0) && (
                    <p className="text-center text-gray-600">
                      No NFTs found in this wallet.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
