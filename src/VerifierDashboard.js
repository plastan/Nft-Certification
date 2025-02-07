import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { disconnectWallet } from './utils/wallet';
import { ethers } from 'ethers';
import contractABI from './ABI.json'; // Ensure this path is correct
import Web3 from 'web3'; 
import Moralis from 'moralis';


const API_URL = "https://eth-sepolia.g.alchemy.com/v2/qJIWYUslBP-dBenSIE7WEkkSWzCXM1o1";
const CONTRACT_ADDRESS = "0x330175D4bCDCEEe90bF72BDA093b084C8dD8257e";

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

const VerifierDashboard = () => {
  const [activeSection, setActiveSection] = useState(null);
  const [tokenId, setTokenId] = useState('');
  const [certificateData, setCertificateData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [recovered, setRecovered] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [statusColor, setStatusColor] = useState('');
  const navigate = useNavigate();
  const [checks, setConditionChecks] = useState({
    publicKeyCheck: '',
    revokedCheck: ''
  });

  // Add this useEffect for Moralis initialization
  useEffect(() => {
    const initializeMoralis = async () => {
      try {
        if (!Moralis.Core.isStarted) {
          await Moralis.start({
            apiKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJub25jZSI6Ijc5NWM3OWJhLWEyODgtNDZhYi1iNzdiLTJjMjE3MDdkYmEzNCIsIm9yZ0lkIjoiNDE0NzcwIiwidXNlcklkIjoiNDI2MjU1IiwidHlwZUlkIjoiYWRlZjliZmItM2M4Yy00YzA3LWJmM2YtYzE5YTUwN2JmMWM3IiwidHlwZSI6IlBST0pFQ1QiLCJpYXQiOjE3MzA2Mjc5NjAsImV4cCI6NDg4NjM4Nzk2MH0.VJ87rLcvA4IdbPV_f3sz_lbaT4hSRZ3uvQuAnNy-inc"
          });
        }
      } catch (error) {
        console.error('Error initializing Moralis:', error);
      }
    };

    initializeMoralis();
  }, []);

  // Function to check certificate status
  const checkCertificateStatus = useCallback(() => {
    if (!certificateData || !recovered) return;

    const publicKey = certificateData.publicKey;
    const isRevoked = certificateData.isRevoked;
    
    // First check if certificate is revoked
    if (isRevoked) {
      setStatusMessage('Invalid - Certificate Revoked');
      setStatusColor('red');
      return;
    }

    // Then check if public key matches recovered address
    const isValidSignature = publicKey.toLowerCase() === recovered.toLowerCase();
    
    if (isValidSignature) {
      setStatusMessage('Valid');
      setStatusColor('green');
    } else {
      setStatusMessage('Invalid - Signature Mismatch');
      setStatusColor('red');
    }

    setConditionChecks({
      publicKeyCheck: isValidSignature ? 'Valid signature' : 'Invalid signature',
      revokedCheck: isRevoked ? 'Certificate is revoked' : 'Certificate is not revoked'
    });
  }, [certificateData, recovered]);

  useEffect(() => {
    if (certificateData && recovered) {
      checkCertificateStatus();
    }
  }, [certificateData, recovered, checkCertificateStatus]);

  const verifyCertificate = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setCertificateData(null);
    setRecovered('');
    setMetadata(null);
    setStatusMessage('');
    setStatusColor('');

    try {
      // Get NFT metadata from Moralis
      const response = await Moralis.EvmApi.nft.getNFTMetadata({
        chain: "0xaa36a7",
        format: "decimal",
        normalizeMetadata: true,
        mediaItems: false,
        address: CONTRACT_ADDRESS,
        tokenId: tokenId,
      });

      // Initialize provider and contract
      const provider = new ethers.providers.JsonRpcProvider(API_URL);
      const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, provider);

      console.log('Fetching data for token ID:', tokenId);
      const data = await contract.getCertificateData(tokenId);
      console.log('Raw certificate data:', data);

      // Get metadata from Moralis response and set it
      const metadataFromResponse = response.toJSON().metadata;
      const jsonData = typeof metadataFromResponse === 'string' 
        ? JSON.parse(metadataFromResponse) 
        : metadataFromResponse;
      
      if (!jsonData) {
        throw new Error('No metadata found for this token');
      }

      // Set the metadata state
      setMetadata(jsonData);
      console.log('Setting metadata:', jsonData);

      // Extract required fields for hashing
      const { studentName, registrationNumber, course, cgpa } = jsonData;

      // Create hash data object
      const hashData = {
        studentName,
        registrationNumber,
        course,
        cgpa: String(cgpa.cgpa),
      };

      // Create hash
      const infoString = JSON.stringify(hashData);
      const certificateHash = ethers.utils.keccak256(
        ethers.utils.toUtf8Bytes(infoString)
      );

      const [digitalSignature, publicKey, isRevoked] = data;

      // Verify signature
      const recovered = ethers.utils.verifyMessage(
        `\x19Ethereum Signed Message:\n${certificateHash.length}${certificateHash}`,
        digitalSignature
      );

      setRecovered(recovered.toLowerCase());
      setCertificateData({
        digitalSignature,
        publicKey,
        isRevoked
      });

    } catch (error) {
      console.error('Error fetching certificate data:', error);
      setError(`Failed to verify certificate: ${error.message}`);
      setStatusMessage('Invalid');
      setStatusColor('red');
    } finally {
      setIsLoading(false);
    }
  };

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

  const VerifyCertificateSection = () => (
    <div className="space-y-6">
      <form onSubmit={verifyCertificate} className="space-y-4">
        <div>
          <label className="block text-gray-700 text-sm font-bold mb-2">
            Token ID
          </label>
          <input
            type="text"
            value={tokenId}
            onChange={(e) => setTokenId(e.target.value)}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            required
          />
        </div>
        <button
          type="submit"
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          disabled={isLoading}
        >
          {isLoading ? 'Verifying...' : 'Verify Certificate'}
        </button>
      </form>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {certificateData && (
        <div className="p-6 bg-gray-50 rounded-lg space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Certificate Details</h3>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-600">Digital Signature</p>
              <p className="font-mono text-sm break-all bg-white p-2 rounded border">
                {certificateData.digitalSignature}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Public Key</p>
              <p className="font-mono text-sm break-all bg-white p-2 rounded border">
                {certificateData.publicKey}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Recovered Address</p>
              <p className="font-mono text-sm break-all bg-white p-2 rounded border">
                {recovered}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Revocation Status</p>
              <p className={`font-medium ${certificateData.isRevoked ? 'text-red-600' : 'text-green-600'}`}>
                {certificateData.isRevoked ? 'Revoked' : 'Not Revoked'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Certificate Status</p>
              <div className={`inline-flex items-center px-3 py-1 rounded-full ${statusColor === 'green' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                <span className={`w-2 h-2 rounded-full mr-2 ${statusColor === 'green' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                <button className={`px-4 py-2 rounded ${statusColor === 'green' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                  {statusMessage}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {certificateData && statusColor === 'green' && metadata && (
        <div className="mt-8 p-6 bg-white rounded-lg shadow-md">
          <h3 className="text-xl font-semibold text-blue-800 mb-4">Certificate Details</h3>
          <div className="flex items-start gap-6">
            {/* Image container with hover effect */}
            <div className="relative w-48 h-48 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden group cursor-pointer">
              {metadata.image ? (
                <>
                  <img
                    src={getIPFSUrl(metadata.image)}
                    alt={`Certificate for ${metadata.studentName || 'Student'}`}
                    className="w-full h-full object-contain"
                  />
                  {/* Clickable overlay with download icon */}
                  <div 
                    onClick={() => handleImageDownload(
                      metadata.image,
                      metadata.studentName
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

            {/* Certificate Details */}
            <div className="flex flex-col gap-4 flex-grow">
              <h3 className="text-2xl font-semibold text-blue-600">
                {metadata.studentName || 'Student Name'}
              </h3>
              
              <div className="space-y-3">
                <div>
                  <p className="text-gray-600 text-sm">Registration Number</p>
                  <p className="font-medium">{metadata.registrationNumber || 'N/A'}</p>
                </div>
                
                <div>
                  <p className="text-gray-600 text-sm">Institution</p>
                  <p className="font-medium">{metadata.institutionName || 'N/A'}</p>
                </div>
                
                <div>
                  <p className="text-gray-600 text-sm">Course</p>
                  <p className="font-medium">{metadata.course || 'N/A'}</p>
                </div>

                <div>
                  <p className="text-gray-600 text-sm">CGPA</p>
                  <p className="font-medium">{metadata.cgpa?.cgpa || 'N/A'}</p>
                </div>

                {/* Metadata Download Button */}
                <button
                  onClick={() => handleMetadataDownload(metadata)}
                  className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors mt-2"
                >
                  <Download size={16} />
                  Download Metadata
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // First, add these helper functions at the component level
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

  const handleMetadataDownload = async (metadata) => {
    try {
        if (!metadata) {
            throw new Error('No metadata available');
        }

        // Create a formatted metadata object
        const formattedMetadata = {
            studentName: metadata.studentName,
            registrationNumber: metadata.registrationNumber,
            course: metadata.course,
            cgpa: metadata.cgpa,
            institutionName: metadata.institutionName,
            institutionId: metadata.institutionId,
            walletAddress: metadata.walletAddress,
            image: metadata.image,
            description: metadata.description,
            certificateHash: metadata.certificateHash,
            tokenId: metadata.tokenId
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

  const handleImageDownload = async (imageUrl, studentName) => {
    try {
        console.log('Downloading image from:', imageUrl);

        const downloadUrl = imageUrl.startsWith('ipfs://')
            ? `https://ipfs.io/ipfs/${imageUrl.replace('ipfs://', '')}`
            : imageUrl;

        const response = await fetch(downloadUrl);
        if (!response.ok) throw new Error('Failed to fetch image');

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
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
        <h1 className="text-4xl font-bold text-blue-900">Verifier Dashboard</h1>
        <button
          onClick={handleLogout}
          className="bg-red-500 text-white px-4 py-2 rounded-lg flex items-center hover:bg-red-600 transition-colors"
        >
          <LogOut className="mr-2" /> Logout
        </button>
      </div>
      <div className="w-32 h-1 bg-blue-600 mb-8"></div>

      <div className="flex space-x-8">
        <div className="w-1/3">
          <SectionButton
            title="Verify Certificate"
            isActive={activeSection === 'verify-certificate'}
            onClick={() => setActiveSection('verify-certificate')}
          />
          <SectionButton
            title="Verification History"
            isActive={activeSection === 'verification-history'}
            onClick={() => setActiveSection('verification-history')}
          />
        </div>
        <AnimatePresence>
          {activeSection && (
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="w-2/3 bg-white p-6 rounded-lg shadow-md"
            >
              <h2 className="text-2xl font-bold text-blue-800 mb-4">
                {activeSection === 'verify-certificate' && 'Verify Certificate'}
                {activeSection === 'verification-history' && 'Verification History'}
              </h2>
              
              {activeSection === 'verify-certificate' && <VerifyCertificateSection />}
              {activeSection === 'verification-history' && (
                <p className="text-blue-600">Verification history will be displayed here.</p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default VerifierDashboard;