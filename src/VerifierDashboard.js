import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { disconnectWallet } from './utils/wallet';
import { ethers } from 'ethers';
import contractABI from './ABI.json'; // Ensure this path is correct

const API_URL = "https://eth-sepolia.g.alchemy.com/v2/qJIWYUslBP-dBenSIE7WEkkSWzCXM1o1";
const CONTRACT_ADDRESS = "0x27e58463b927423B62218ca2d4d3D75447090Dc0";

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

  const verifyCertificate = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setCertificateData(null);

    try {
      // Initialize provider using Alchemy
      const provider = new ethers.providers.JsonRpcProvider(API_URL);
      
      // Initialize contract
      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        contractABI.abi, // Make sure to use .abi if your import contains the full JSON
        provider
      );

      console.log('Fetching data for token ID:', tokenId);
      const data = await contract.getCertificateData(tokenId);
      console.log('Raw certificate data:', data);

      setCertificateData({
        digitalSignature: data[0],
        publicKey: data[1],
        isRevoked: data[2]
      });
    } catch (error) {
      console.error('Error fetching certificate data:', error);
      if (error.message.includes('Token does not exist')) {
        setError('This certificate does not exist.');
      } else {
        setError('Failed to fetch certificate data. Please try again.');
      }
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
              <p className="text-sm text-gray-600">Certificate Status</p>
              <div className={`inline-flex items-center px-3 py-1 rounded-full ${
                certificateData.isRevoked 
                  ? 'bg-red-100 text-red-800' 
                  : 'bg-green-100 text-green-800'
              }`}>
                <span className={`w-2 h-2 rounded-full mr-2 ${
                  certificateData.isRevoked ? 'bg-red-500' : 'bg-green-500'
                }`}></span>
                {certificateData.isRevoked ? 'Revoked' : 'Valid'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

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