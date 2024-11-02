import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { disconnectWallet } from './utils/wallet';
import { getFirestore, collection, getDocs, deleteDoc, doc, query, where, getDoc, addDoc, arrayUnion } from 'firebase/firestore';
import { PinataSDK } from "pinata-web3";
import { ethers } from 'ethers';
import contractABI from './ABI.json';

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

const InstitutionDashboard = () => {
  const [activeSection, setActiveSection] = useState('requests');
  const [requests, setRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [institutionName, setInstitutionName] = useState('');
  const [approvedRequestId, setApprovedRequestId] = useState(null);
  const [issuedCertificates, setIssuedCertificates] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchInstitutionInfo = async () => {
    const db = getFirestore();
    const institutionId = localStorage.getItem('userId');
    
    if (!institutionId) {
      console.error('No userId found in localStorage');
      // Handle the case where there's no userId, e.g., redirect to login
      // navigate('/login');
      return;
    }

    try {
      const institutionDoc = await getDoc(doc(db, 'users', institutionId));
      if (institutionDoc.exists()) {
        setInstitutionName(institutionDoc.data().name);
      } else {
        console.error('No institution document found for id:', institutionId);
        // Handle the case where no document exists for this id
      }
    } catch (error) {
      console.error('Error fetching institution info:', error);
      // Handle the error, e.g., show an error message to the user
    }
  };

  const fetchRequests = async () => {
    const db = getFirestore();
    
    console.log('Fetching all requests');

    try {
      const requestsCollection = collection(db, 'certificateRequests');
      const requestsSnapshot = await getDocs(requestsCollection);
      
      console.log('Number of requests found:', requestsSnapshot.size);

      const requestsList = requestsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      console.log('Processed requests:', requestsList);

      setRequests(requestsList);
    } catch (error) {
      console.error('Error fetching requests:', error);
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

  const handleDelete = async (requestId) => {
    const db = getFirestore();
    try {
      await deleteDoc(doc(db, 'certificateRequests', requestId));
      setRequests(requests.filter(request => request.id !== requestId));
      console.log('Request deleted successfully');
    } catch (error) {
      console.error('Error deleting request:', error);
    }
  };

  const handleApprove = (request) => {
    setSelectedRequest(request);
    setActiveSection('issue-certificate');
    setApprovedRequestId(request.id);
  };

  const handleIssueCertificate = (certificateDetails) => {
    if (approvedRequestId) {
      setRequests(requests.filter(request => request.id !== approvedRequestId));
      setIssuedCertificates([...issuedCertificates, certificateDetails]);
      setApprovedRequestId(null);
      setSelectedRequest(null);
      setActiveSection('manage-certificates');
    }
  };

  return (
    <div className="min-h-screen bg-blue-50 p-8 font-sans">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-4xl font-bold text-blue-900">Institution Dashboard</h1>
        <button
          onClick={handleLogout}
          className="bg-red-500 text-white px-4 py-2 rounded-lg flex items-center"
        >
          <LogOut className="mr-2" /> Logout
        </button>
      </div>
      <div className="w-32 h-1 bg-blue-600 mb-8"></div>

      <div className="flex space-x-8">
        <div className="w-1/3">
          <SectionButton
            title="Issue Certificate"
            isActive={activeSection === 'issue-certificate'}
            onClick={() => setActiveSection('issue-certificate')}
          />
          <SectionButton
            title="Manage Certificates"
            isActive={activeSection === 'manage-certificates'}
            onClick={() => setActiveSection('manage-certificates')}
          />
          <SectionButton
            title="Requests"
            isActive={activeSection === 'requests'}
            onClick={() => setActiveSection('requests')}
          />
        </div>
        <div className="w-2/3 bg-white p-6 rounded-lg shadow-md">
          {activeSection === 'issue-certificate' && (
            <IssueCertificateSection 
              selectedRequest={selectedRequest} 
              onIssueCertificate={handleIssueCertificate}
            />
          )}
          {activeSection === 'manage-certificates' && (
            <ManageCertificatesSection issuedCertificates={issuedCertificates} />
          )}
          {activeSection === 'requests' && (
            <div>
              <h3 className="text-lg font-semibold mb-2">Pending Requests</h3>
              <p>Total requests: {requests.length}</p>
              {requests.length > 0 ? (
                <ul className="space-y-2">
                  {requests.map(request => (
                    <li key={request.id} className="border p-2 rounded mb-4">
                      <p><strong>Student:</strong> {request.studentName}</p>
                      <p><strong>Registration Number:</strong> {request.registrationNumber}</p>
                      <p><strong>Course:</strong> {request.course}</p>
                      <p><strong>Wallet Address:</strong> {request.walletAddress}</p>
                      <p><strong>Institution:</strong> {request.institutionName}</p>
                      <p><strong>Status:</strong> {request.status}</p>
                      <div className="mt-2">
                        <button
                          onClick={() => handleApprove(request)}
                          className="bg-green-500 text-white px-3 py-1 rounded mr-2"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleDelete(request.id)}
                          className="bg-red-500 text-white px-3 py-1 rounded"
                        >
                          Delete
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div>
                  <p>No pending requests at the moment.</p>
                  <button 
                    onClick={fetchRequests} 
                    className="mt-2 bg-blue-500 text-white px-4 py-2 rounded"
                  >
                    Refresh Requests
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const IssueCertificateSection = ({ selectedRequest, onIssueCertificate }) => {
  const [certificateImage, setCertificateImage] = useState(null);
  const [ipfsHash, setIpfsHash] = useState('');
  const [imageUri, setImageUri] = useState('');
  //Todo: remove finalUri
  const [finalUri, setFinalUri] = useState('');
  const [certificateHash, setCertificateHash] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [cgpa, setCgpa] = useState('');
  
  const [semMarks, setSemMarks] = useState({
    sem1: '', sem2: '', sem3: '', sem4: '', sem5: '', sem6: ''
  });
  const [institutionWalletAddress, setInstitutionWalletAddress] = useState('');
  const [digitalSignature, setDigitalSignature] = useState('');
  const [finalIpfsUri, setFinalIpfsUri] = useState('');

  const pinata = new PinataSDK({
    pinataJwt: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiIzZmQ3ZTUyZS1hYmI4LTQ0NWItODM3Ni02NTRmNjI0OGZhMzkiLCJlbWFpbCI6Iml0Y2h5ZmVldGZsaWNrc0BnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwicGluX3BvbGljeSI6eyJyZWdpb25zIjpbeyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJGUkExIn0seyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJOWUMxIn1dLCJ2ZXJzaW9uIjoxfSwibWZhX2VuYWJsZWQiOmZhbHNlLCJzdGF0dXMiOiJBQ1RJVkUifSwiYXV0aGVudGljYXRpb25UeXBlIjoic2NvcGVkS2V5Iiwic2NvcGVkS2V5S2V5IjoiYjU1ODQyMTQ4OTAzYThmZWJmMTUiLCJzY29wZWRLZXlTZWNyZXQiOiJjNzcyNGM0YjNhYTdiYTYwNmMzZTg5M2I3OWU0MDk5NTFmM2YwZDY3NTM5YmRmMGFkMTg3MmFmMjJjNzVkOWUyIiwiZXhwIjoxNzYxNDA1ODYyfQ.GnDh-jQk2w1Buk7KQA-AB5iIOk1hHpaQS2_tK4_WBJQ",
    pinataGateway: "https://gateway.pinata.cloud",
  });

  const API_URL = "https://eth-sepolia.g.alchemy.com/v2/qJIWYUslBP-dBenSIE7WEkkSWzCXM1o1";
  const PRIVATE_KEY = "3b5276e9aa5ecc8e43cf3bbb83ed95981dc1ef502786fd098ad56a9910cca60b";
  const contractAddress = "0x27e58463b927423B62218ca2d4d3D75447090Dc0";

  // const contractABI = [
  //   "function mintCertificate(address recipient, string memory ipfsURI, string memory digitalSignature, string memory publicKey) external returns (uint256)",
  //   "event CertificateMinted(address indexed recipient, uint256 indexed tokenId, string ipfsURI)"
  // ];
  //
  const mintNFT = async (recipient, ipfsURI, digitalSignature, publicKey) => {
    const provider = new ethers.providers.JsonRpcProvider(API_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);
    const contract = new ethers.Contract(contractAddress, contractABI, signer);

    try {
      const tx = await contract.mintCertificate(recipient, ipfsURI, digitalSignature, publicKey);
      const receipt = await tx.wait();
      console.log("Certificate minted successfully!");
      console.log("Transaction hash:", receipt.transactionHash);
      return receipt.transactionHash;
    } catch (error) {
      console.error("Error minting certificate:", error);
      throw error;
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setCertificateImage(file);
      setIpfsHash('');
      setImageUri('');
    }
  };

  const handleUploadToIPFS = async () => {
    if (!certificateImage) {
      alert('Please select an image first');
      return;
    }

    setIsUploading(true);

    try {
      const upload = await pinata.upload.file(certificateImage);
      console.log('Upload response:', upload);
      setIpfsHash(upload.IpfsHash);
      setImageUri(`ipfs://${upload.IpfsHash}`);
    } catch (error) {
      console.error('Error uploading to IPFS:', error);
      alert(`Failed to upload image to IPFS: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const generateCertificateHash = () => {
    const studentInfo = {
      studentName: selectedRequest.studentName,
      registrationNumber: selectedRequest.registrationNumber,
      course: selectedRequest.course,
      cgpa,
      semMarks,
    };

    const infoString = JSON.stringify(studentInfo);
    const hash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(infoString));
    setCertificateHash(hash);
  };

  const handleGenerateFinalUri = async () => {
    if (!imageUri) {
      alert('Please upload the certificate image first');
      return;
    }

    setIsUploading(true);

    generateCertificateHash();

    const certificateData = {
      ...selectedRequest,
      name : "Sahrdaya college of engineering and technology academic certificate",
      description : "This is a certificate for the student Sahrdaya college of engineering and technology",
      image : imageUri,
      institutionWalletAddress,
      cgpa:{
        cgpa : cgpa,
        semMarks,
      },
      certificateHash,
    };


    try {
      const jsonString = JSON.stringify(certificateData);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const file = new File([blob], 'certificate_data.json', { type: 'application/json' });

      const upload = await pinata.upload.file(file);
      console.log('Final URI upload response:', upload);
      setFinalIpfsUri(`ipfs://${upload.IpfsHash}`);
    } catch (error) {
      console.error('Error generating final URI:', error);
      alert(`Failed to generate final URI: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const generateDigitalSignature = async () => {
    if (!window.ethereum) {
      alert('MetaMask is not installed!');
      return;
    }

    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const account = accounts[0];

      if (account.toLowerCase() !== institutionWalletAddress.toLowerCase()) {
        alert('Please connect MetaMask with the institution wallet address you provided.');
        return;
      }

      const messageToSign = `\x19Ethereum Signed Message:\n${certificateHash.length}${certificateHash}`;
      const signature = await window.ethereum.request({
        method: 'personal_sign',
        params: [messageToSign, account],
      });

      setDigitalSignature(signature);
    } catch (error) {
      console.error('Error generating digital signature:', error);
      alert(`Failed to generate digital signature: ${error.message}`);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!finalIpfsUri) {
      alert('Please generate the final IPFS URI first');
      return;
    }
    if (!digitalSignature) {
      alert('Please generate the digital signature first');
      return;
    }

    try {
      // Check if MetaMask is installed
      if (typeof window.ethereum === 'undefined') {
        throw new Error('MetaMask is not installed!');
      }

      // Request account access
      await window.ethereum.request({ method: 'eth_requestAccounts' });

      // Create a Web3Provider instance
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();

      // Create contract instance
      const contract = new ethers.Contract(contractAddress, contractABI, signer);

      // Prepare transaction
      const tx = await contract.mintCertificate(
        selectedRequest.walletAddress, // student wallet address
        finalIpfsUri,
        digitalSignature,
        institutionWalletAddress // institution wallet address (public key)
      );

      // Wait for transaction confirmation
      const receipt = await tx.wait();

      console.log('Certificate issued successfully!');
      console.log('Transaction hash:', receipt.transactionHash);
      alert(`Certificate issued successfully! Transaction hash: ${receipt.transactionHash}`);

      // Create certificate details object
      const certificateDetails = {
        studentName: selectedRequest.studentName,
        registrationNumber: selectedRequest.registrationNumber,
        course: selectedRequest.course,
        walletAddress: selectedRequest.walletAddress,
        institutionName: selectedRequest.institutionName,
        cgpa,
        semMarks,
        transactionHash: receipt.transactionHash,
        ipfsUri: finalIpfsUri,
        issuedAt: new Date().toISOString(),
      };

      // Call the onIssueCertificate function to update the parent component
      onIssueCertificate(certificateDetails);

    } catch (error) {
      console.error('Error issuing certificate:', error);
      alert(`Failed to issue certificate: ${error.message}`);
    }
  };

  const handleSemMarksChange = (e, semester) => {
    setSemMarks({
      ...semMarks,
      [semester]: e.target.value,
    });
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-blue-800 mb-4">Issue Certificate</h2>
      {selectedRequest ? (
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="studentName">
              Student Name
            </label>
            <input
              type="text"
              id="studentName"
              value={selectedRequest.studentName}
              readOnly
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="registrationNumber">
              Registration Number
            </label>
            <input
              type="text"
              id="registrationNumber"
              value={selectedRequest.registrationNumber}
              readOnly
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="course">
              Course
            </label>
            <input
              type="text"
              id="course"
              value={selectedRequest.course}
              readOnly
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="walletAddress">
              Wallet Address
            </label>
            <input
              type="text"
              id="walletAddress"
              value={selectedRequest.walletAddress}
              readOnly
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="institutionName">
              Institution Name
            </label>
            <input
              type="text"
              id="institutionName"
              value={selectedRequest.institutionName}
              readOnly
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Institution Wallet Address
            </label>
            <input
              type="text"
              value={institutionWalletAddress}
              onChange={(e) => setInstitutionWalletAddress(e.target.value)}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              CGPA
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="10"
              value={cgpa}
              onChange={(e) => setCgpa(e.target.value)}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              required
            />
          </div>
          {/* Add semester marks fields */}
          {[1, 2, 3, 4, 5, 6].map((sem) => (
            <div key={sem} className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Semester {sem} Marks
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={semMarks[`sem${sem}`]}
                onChange={(e) => handleSemMarksChange(e, `sem${sem}`)}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                required
              />
            </div>
          ))}
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Upload Certificate Image
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            />
          </div>
          {certificateImage && (
            <div className="mb-4">
              <p className="text-sm text-gray-600">Image preview:</p>
              <img
                src={URL.createObjectURL(certificateImage)}
                alt="Certificate preview"
                className="mt-2 max-w-xs"
              />
              <button
                type="button"
                onClick={handleUploadToIPFS}
                disabled={isUploading}
                className={`mt-2 ${isUploading ? 'bg-gray-500' : 'bg-green-500 hover:bg-green-700'} text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline`}
              >
                {isUploading ? 'Uploading...' : 'Upload to IPFS'}
              </button>
            </div>
          )}
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Image URI
            </label>
            <input
              type="text"
              value={imageUri}
              readOnly
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            />
          </div>
          <div className="mb-4">
            <button
              type="button"
              onClick={handleGenerateFinalUri}
              disabled={isUploading || !imageUri}
              className={`${isUploading || !imageUri ? 'bg-gray-500' : 'bg-blue-500 hover:bg-blue-700'} text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline`}
            >
              Generate Final URI
            </button>
          </div>
          {/* <div className="mb-4"> */}
          {/*   <label className="block text-gray-700 text-sm font-bold mb-2"> */}
          {/*     Final URI */}
          {/*   </label> */}
          {/*   <input */}
          {/*     type="text" */}
          {/*     value={finalIpfsUri} */}
          {/*     readOnly */}
          {/*     className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" */}
          {/*   /> */}
          {/* </div> */}
          <div className="mb-4">}
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Certificate Hash
            </label>
            <input
              type="text"
              value={certificateHash}
              readOnly
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            />
          </div>
          <div className="mb-4">
            <button
              type="button"
              onClick={generateDigitalSignature}
              disabled={!certificateHash}
              className={`${!certificateHash ? 'bg-gray-500' : 'bg-blue-500 hover:bg-blue-700'} text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline`}
            >
              Generate Digital Signature
            </button>
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Digital Signature
            </label>
            <input
              type="text"
              value={digitalSignature}
              onChange={(e) => setDigitalSignature(e.target.value)}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Final IPFS URI
            </label>
            <input
              type="text"
              value={finalIpfsUri}
              onChange={(e) => setFinalIpfsUri(e.target.value)}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Institution Wallet Address
            </label>
            <input
              type="text"
              value={institutionWalletAddress}
              onChange={(e) => setInstitutionWalletAddress(e.target.value)}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Student Wallet Address
            </label>
            <input
              type="text"
              value={selectedRequest.walletAddress}
              readOnly
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            />
          </div>
          <button
            type="submit"
            onClick={handleSubmit}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          >
            Issue Certificate
          </button>
        </form>
      ) : (
        <p>No request selected. Please approve a request from the Requests section.</p>
      )}
    </div>
  );
};

const ManageCertificatesSection = ({ issuedCertificates }) => {
  return (
    <div>
      <h2 className="text-2xl font-bold text-blue-800 mb-4">Manage Certificates</h2>
      {issuedCertificates.length > 0 ? (
        <ul className="space-y-4">
          {issuedCertificates.map((cert, index) => (
            <li key={index} className="border p-4 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold">{cert.studentName}</h3>
              <p><strong>Registration Number:</strong> {cert.registrationNumber}</p>
              <p><strong>Course:</strong> {cert.course}</p>
              <p><strong>CGPA:</strong> {cert.cgpa}</p>
              <p><strong>Transaction Hash:</strong> {cert.transactionHash}</p>
              <p><strong>IPFS URI:</strong> {cert.ipfsUri}</p>
              <p><strong>Issued At:</strong> {new Date(cert.issuedAt).toLocaleString()}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p>No certificates issued yet.</p>
      )}
    </div>
  );
};

export default InstitutionDashboard;