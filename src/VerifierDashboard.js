import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut } from 'lucide-react';
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
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [statusColor, setStatusColor] = useState(''); // 'green' or 'red'
  const [checks, setConditionChecks] = useState({
    publicKeyCheck: '',
    revokedCheck: '',
    institutionCheck: ''
  });
  const [Recovered, setRecovered] = useState(''); // State for recovered address

  const verifyCertificate = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setCertificateData(null);
    setRecovered(''); // Reset recovered address

    try {
      // Initialize provider using Alchemy
      const provider = new ethers.providers.JsonRpcProvider(API_URL);
      
      // Initialize contract
      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        contractABI,
        provider
      );

      console.log('Fetching data for token ID:', tokenId);
      const data = await contract.getCertificateData(tokenId);
      console.log('Raw certificate data:', data);

      const tokenUri = data[3]; // Assuming tokenUri is at index 3
      const ipfsUri = tokenUri.replace("ipfs://", "https://ipfs.io/ipfs/"); // Convert to HTTP URI

      // Fetch the JSON from the IPFS URI
      const ipfsResponse = await fetch(ipfsUri);
      const jsonData = await ipfsResponse.json(); // Parse the JSON response

      // Extract required fields for hashing
      const { studentName, registrationNumber, course, cgpa } = jsonData;

      // Create an object with the required fields
      const hashData = {
        studentName,
        registrationNumber,
        course,
        cgpa: String(cgpa.cgpa), // Ensure only the cgpa value is a string
      };

      // Log the input details for hashing
      console.log("Input Details for Hashing:", hashData);

      // Create a string representation of the hash data
      const infoString = JSON.stringify(hashData);
      console.log("String Representation for Hashing:", infoString); // Log the string representation

      // Generate the hash
      const certificateHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(infoString)); // Hash the string
      console.log("Generated Certificate Hash:", certificateHash); // Log the output hash

      const digitalSignature = data[0];
      const publicKey = data[1]; // This is the wallet address
      const isRevoked = data[2];

      // Verify the message and signature to recover the wallet address
      const recovered = ethers.utils.verifyMessage(`\x19Ethereum Signed Message:\n${certificateHash.length}${certificateHash}`, digitalSignature);
      setRecovered(recovered.toLowerCase()); // Set the recovered address

      setCertificateData({
        digitalSignature,
        publicKey,
        isRevoked
      });

    } catch (error) {
      console.error('Error fetching certificate data:', error);
      setError('Failed to fetch certificate data. Please try again.');
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

  const VerifyCertificateSection = () => {
    const [tokenId, setTokenId] = useState('');
    const [certificateData, setCertificateData] = useState(null);
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [publicKey, setPublicKey] = useState('');
    const [recovered, setRecovered] = useState('');
    const [metadata, setMetadata] = useState(null);

    const verifyCertificate = async (e) => {
        e.preventDefault(); // Prevent default form submission behavior
        setIsLoading(true);
        setError(null);
        setCertificateData(null);
        setRecovered('');
        setMetadata(null);

        try {
            await Moralis.start({
                apiKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJub25jZSI6Ijc5NWM3OWJhLWEyODgtNDZhYi1iNzdiLTJjMjE3MDdkYmEzNCIsIm9yZ0lkIjoiNDE0NzcwIiwidXNlcklkIjoiNDI2MjU1IiwidHlwZUlkIjoiYWRlZjliZmItM2M4Yy00YzA3LWJmM2YtYzE5YTUwN2JmMWM3IiwidHlwZSI6IlBST0pFQ1QiLCJpYXQiOjE3MzA2Mjc5NjAsImV4cCI6NDg4NjM4Nzk2MH0.VJ87rLcvA4IdbPV_f3sz_lbaT4hSRZ3uvQuAnNy-inc" // Replace with your actual API key
            });

            const response = await Moralis.EvmApi.nft.getNFTMetadata({
                "chain": "0xaa36a7",
                "format": "decimal",
                "normalizeMetadata": true,
                "mediaItems": true,
                "address": CONTRACT_ADDRESS,
                "tokenId": tokenId // Use the tokenId from input
            });

            const metadata = JSON.parse(response.raw.metadata); // Parse the metadata
            setMetadata(metadata); // Store metadata

            // Hash the metadata


            // Initialize provider and contract
            const provider = new ethers.providers.JsonRpcProvider(API_URL);
            const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, provider);

            console.log('Fetching data for token ID:', tokenId);
            const data = await contract.getCertificateData(tokenId);
            console.log('Raw certificate data:', data);

            const tokenUri = response.raw.token_uri; // Assuming tokenUri is at index 3
            const ipfsUri = tokenUri.replace("https://ipfs.moralis.io:2053", "https://ipfs.io"); // Convert to HTTP URI

            // Fetch the JSON from the IPFS URI
            const ipfsResponse = await fetch(ipfsUri); // Renamed variable to ipfsResponse
            const jsonData = await ipfsResponse.json(); // Parse the JSON response

            // Extract required fields for hashing
            const { studentName, registrationNumber, course,cgpa } = jsonData;

            // Create an object with the required fields
            const hashData = {
                studentName,
                registrationNumber,
                course,
                cgpa: String(cgpa.cgpa),
            };

            // Stringify the hash data
            const infoString = JSON.stringify(hashData);
            console.log("Input Details for Hashing:", hashData);
            const certificateHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(infoString)); // Hash the string
            console.log("String Representation for Hashing:", infoString); // Log the string representation



            const digitalSignature = data[0];
            const publicKey = data[1]; // This is the wallet address
            const isRevoked = data[2];

            setCertificateData({
                digitalSignature,
                publicKey,
                isRevoked
            });

            // Verify the message and signature to recover the wallet address
            const recovered = ethers.utils.verifyMessage(`\x19Ethereum Signed Message:\n${certificateHash.length}${certificateHash}`, digitalSignature);
            setRecovered(recovered.toLowerCase());
            

        } catch (error) {
            console.error('Error fetching certificate data:', error);
            setError('Failed to fetch certificate data. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    // Function to check the certificate status
    const checkCertificateStatus = useCallback(() => {
        const publicKey = certificateData.publicKey;

        // Check if publicKey matches recoveredAddress
        const isValid = publicKey.toLowerCase() === recovered.toLowerCase();

        // Set status based on the check
        if (isValid) {
            setStatusMessage('Valid');
            
            setStatusColor('green');
        } else {
            setStatusMessage('Invalid');
            setStatusColor('red');
        }
        console.log("Certificate Status Color set to green", statusColor);

        console.log("Public Key:", publicKey);
        console.log("Recovered Address:", recovered);
        console.log("Status Check:", isValid ? 'Valid' : 'Invalid');
    }, [certificateData, recovered]);

    // Call this function after fetching certificate data
    useEffect(() => {
        if (certificateData) {
            checkCertificateStatus();
        }
    }, [certificateData, checkCertificateStatus]);

    useEffect(() => {
        setCertificateData({
            digitalSignature: "SampleDigitalSignature",
            publicKey: "0xSamplePublicKey",
            isRevoked: false
        });
        setRecovered("0xSamplePublicKey");
        setStatusMessage("Valid");
        setStatusColor("green");
    }, []);

    return (
        <div className="space-y-6">
            <form onSubmit={verifyCertificate} className="space-y-4">
                <div>
                    <label htmlFor="tokenId" className="block text-sm font-medium text-gray-700 mb-2">
                        Enter Certificate Token ID
                    </label>
                    <input
                        type="number"
                        id="tokenId"
                        value={tokenId}
                        onChange={(e) => setTokenId(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter token ID"
                        required
                        min="0"
                    />
                </div>
                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-300"
                >
                    {isLoading ? 'Submitting...' : 'Submit'}
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
        </div>
    );
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