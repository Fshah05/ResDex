import { useState } from "react";
import { doc, updateDoc, getDoc, setDoc, arrayUnion } from "firebase/firestore";
import { db } from "../firebaseConfig";
import Spinner from "react-bootstrap/Spinner";
import Modal from "react-bootstrap/Modal";
import Form from "react-bootstrap/Form";
import Select from "react-select";
import { useNavigate } from "react-router-dom";
import Logo from "../images/dark-transparent.png";

const MAX_FILE_SIZE_MB = 5;
const MAX_UPLOADS_PER_DAY = 10;

const interestOptions = [
  { value: "Technology", label: "Technology" },
  { value: "Healthcare", label: "Healthcare" },
  { value: "Finance", label: "Finance" },
  { value: "Construction", label: "Construction" },
  { value: "Engineering", label: "Engineering" },
];

const OngoingPDFUpload = ({ user, onUploadComplete }) => {
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showErrorModal, setErrorModal] = useState(false);
  const [showUploadOptionsModal, setShowUploadOptionsModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedTopics, setSelectedTopics] = useState([]);
  const navigate = useNavigate();

  const handleUploadResearchClick = () => {
    setShowUploadOptionsModal(true);
  };

  const handleCreateDocument = () => {
    setShowUploadOptionsModal(false);
    navigate("/create");
  };

  const handleImportDocument = () => {
    setShowUploadOptionsModal(false);
    document.getElementById("ongoingPdfInput").click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        setErrorMessage(`File size exceeds ${MAX_FILE_SIZE_MB} MB limit.`);
        setErrorModal(true);
        return;
      }
      setSelectedFile(file);
      setErrorMessage("");
      setShowModal(true);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !user || !title.trim()) return;

    setLoading(true);
    setShowModal(false);
    setErrorModal(false);

    try {
      const userDocRef = doc(db, "users", user.uid);
      const docSnapshot = await getDoc(userDocRef);
      const currentOngoingPdfs = docSnapshot.exists()
        ? docSnapshot.data().ongoingPdfs || []
        : [];

      const today = new Date().toISOString().split("T")[0];
      const todaysUploads = currentOngoingPdfs.filter((pdf) =>
        pdf.uploadDate.startsWith(today)
      );

      if (todaysUploads.length >= MAX_UPLOADS_PER_DAY) {
        setLoading(false);
        setErrorMessage(
          `You have reached the daily limit of ${MAX_UPLOADS_PER_DAY} uploads.`
        );
        setErrorModal(true);
        return;
      }

      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("userId", user.uid);

      const response = await fetch("https://resdex.onrender.com/upload", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error("Upload failed");
      }

      const workerUrl = result.url.replace(
        "https://pub-b9219a60c2ea4807b8bb38a7c82cf268.r2.dev",
        "https://view.resdex.ca"
      );

      const pdfData = {
        url: workerUrl,
        objectKey: result.objectKey,
        title: title,
        description: description,
        uploadDate: new Date().toISOString(),
        topics: selectedTopics.map((topic) => topic.value),
        userUID: user.uid,
        status: "ongoing",
      };

      if (!docSnapshot.exists()) {
        await setDoc(userDocRef, { ongoingPdfs: [pdfData] });
      } else {
        await updateDoc(userDocRef, { ongoingPdfs: arrayUnion(pdfData) });
      }

      const searchIndexRef = doc(db, "searchIndex", "papersList");
      const searchIndexDoc = await getDoc(searchIndexRef);
      let papers = searchIndexDoc.exists()
        ? searchIndexDoc.data().papers || []
        : [];

      papers.push(pdfData);
      await setDoc(searchIndexRef, { papers });

      if (onUploadComplete) {
        onUploadComplete(user.uid);
      }

      setTitle("");
      setDescription("");
      setSelectedFile(null);
      setErrorMessage("");
      setSelectedTopics([]);
      window.location.reload();
    } catch (error) {
      console.error("Error uploading ongoing PDF: ", error);
      setErrorMessage("Failed to upload. Please try again.");
      setErrorModal(true);
    } finally {
      setLoading(false);
    }
  };

  const styles = {
    loadingOverlay: {
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(0, 0, 0, 0.8)",
      zIndex: 1000,
    },
    uploadArea: {
      cursor: "pointer",
      borderRadius: "5px",
      textAlign: "center",
    },
  };

  const customStyles = {
    option: (provided, state) => ({
      ...provided,
      color: state.isSelected ? "white" : "black",
      backgroundColor: state.isSelected ? "rgba(189,197,209,.3)" : "white",
      "&:hover": {
        backgroundColor: "rgba(189,197,209,.3)",
      },
    }),
    multiValue: (provided) => ({
      ...provided,
      backgroundColor: "black",
      padding: "5px",
      borderRadius: "5px",
    }),
    multiValueLabel: (provided) => ({
      ...provided,
      color: "white",
    }),
    multiValueRemove: (provided) => ({
      ...provided,
      color: "white",
      ":hover": {
        backgroundColor: "black",
        color: "white",
      },
    }),
  };

  return (
    <>
      <input
        type="file"
        id="ongoingPdfInput"
        accept=".pdf"
        onChange={handleFileChange}
        style={{ display: "none" }}
      />

      <div style={{ padding: "10px" }} onClick={handleUploadResearchClick}>
        <button className="custom-edit">
          <svg
            style={{ marginRight: "14px" }}
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            fill="white"
            className="bi bi-file-earmark-plus-fill"
            viewBox="0 0 16 16"
          >
            <path d="M9.293 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4.707A1 1 0 0 0 13.707 4L10 .293A1 1 0 0 0 9.293 0M9.5 3.5v-2l3 3h-2a1 1 0 0 1-1-1M8.5 7v1.5H10a.5.5 0 0 1 0 1H8.5V11a.5.5 0 0 1-1 0V9.5H6a.5.5 0 0 1 0-1h1.5V7a.5.5 0 0 1 1 0" />
          </svg>
          Upload Certification
        </button>
      </div>

      {loading && (
        <div style={styles.loadingOverlay}>
          <div style={{ textAlign: "center", color: "white" }}>
            <Spinner animation="border" role="status" />
            <p style={{ marginTop: "10px" }}>Uploading...</p>
          </div>
        </div>
      )}

      <Modal
        show={showUploadOptionsModal}
        onHide={() => setShowUploadOptionsModal(false)}
        centered
        size="md"
      >
        <Modal.Header
          style={{
            background: "#e5e3df",
            borderBottom: "1px solid white",
          }}
          closeButton
        >
          <Modal.Title className="primary">
            <div className="row justify-content-left">
              <img
                src={Logo}
                style={{ maxWidth: "70px", fill: "black" }}
                alt="resdex-logo"
              ></img>
            </div>
            <div className="row"></div>
            Upload Certification Document
          </Modal.Title>
        </Modal.Header>
        <Modal.Body
          style={{
            background: "#e5e3df",
            borderBottom: "1px solid white",
          }}
        >
          <div className="row">
            <div className="col-md-6">
              <button
                className="custom-view"
                onClick={handleCreateDocument}
                style={{
                  width: "100%",
                  padding: "20px",
                  marginBottom: "10px",
                }}
              >
                Create New Document
              </button>
            </div>
            <div className="col-md-6">
              <button
                className="custom-view"
                onClick={handleImportDocument}
                style={{
                  width: "100%",
                  padding: "20px",
                  marginBottom: "10px",
                }}
              >
                Import Existing Document
              </button>
            </div>
          </div>
        </Modal.Body>
      </Modal>

      <Modal
        show={showModal}
        onHide={() => setShowModal(false)}
        centered
        size="lg"
      >
        <Modal.Header
          style={{
            background: "#e5e3df",
            borderBottom: "1px solid white",
          }}
          closeButton
        >
          <Modal.Title className="primary">
            <div className="row justify-content-left">
              <img
                src={Logo}
                style={{ maxWidth: "70px", fill: "black" }}
                alt="resdex-logo"
              ></img>
            </div>
            <div className="row"></div>
            Upload Certification Document
          </Modal.Title>
        </Modal.Header>
        <Modal.Body
          style={{
            background: "#e5e3df",
            borderBottom: "1px solid white",
          }}
        >
          <Form>
            <Form.Group className="mb-3" controlId="formDocumentTitle">
              <Form.Label className="primary">Title</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter document title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </Form.Group>
            <Form.Group className="mb-3" controlId="formDocumentDescription">
              <Form.Label className="primary">Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                maxLength={150}
                placeholder="Enter document description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </Form.Group>
            <Form.Group className="mb-3" controlId="formDocumentTags">
              <Form.Label className="primary">Related Topics</Form.Label>
              <Select
                isMulti
                name="topics"
                options={interestOptions}
                className="basic-multi-select"
                classNamePrefix="select"
                value={selectedTopics}
                onChange={(selected) => {
                  if (selected.length <= 3) {
                    setSelectedTopics(selected);
                  }
                }}
                isOptionDisabled={() => selectedTopics.length >= 3}
                placeholder="Select up to 3 topics"
                styles={customStyles}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer
          style={{
            background: "#e5e3df",
            borderBottom: "1px solid white",
          }}
        >
          <button
            className="custom-view"
            onClick={() => setShowModal(false)}
          >
            Cancel
          </button>
          <button
            className="custom-view"
            onClick={handleUpload}
            disabled={!title.trim()}
          >
            Upload
          </button>
        </Modal.Footer>
      </Modal>

      <Modal
        show={showErrorModal}
        onHide={() => setErrorModal(false)}
        centered
        size="md"
      >
        <Modal.Header
          style={{
            background: "#e5e3df",
            borderBottom: "1px solid white",
          }}
          closeButton
        >
          <Modal.Title className="primary">Error</Modal.Title>
        </Modal.Header>
        <Modal.Body
          style={{
            background: "#e5e3df",
            borderBottom: "1px solid white",
          }}
        >
          <p className="primary">{errorMessage}</p>
        </Modal.Body>
        <Modal.Footer
          style={{
            background: "#e5e3df",
            borderBottom: "1px solid white",
          }}
        >
          <button
            className="custom-view"
            onClick={() => setErrorModal(false)}
          >
            Close
          </button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default OngoingPDFUpload;
