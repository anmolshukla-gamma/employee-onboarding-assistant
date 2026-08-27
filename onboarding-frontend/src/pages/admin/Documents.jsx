import { useEffect, useRef, useState } from "react";
import { fetchDocuments, uploadDocument, deleteDocument } from "../../api/documents";
import { processDocument } from "../../api/ai";
import { extractErrorMessage } from "../../api/axios";
import { useToast } from "../../context/ToastContext";
import { PageLoading, Modal, ConfirmModal } from "../../components/Modal";
import EmptyState from "../../components/EmptyState";
import StatusBadge from "../../components/StatusBadge";
import LoadingButton from "../../components/LoadingButton";
import { IconUpload, IconTrash } from "../../components/Icons";
import { useNavigate } from "react-router-dom";





export default function Documents() {
  const toast = useToast();
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [uploadOpen, setUploadOpen] = useState(false);
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const [processingId, setProcessingId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const navigate = useNavigate();

  function load() {
    setLoading(true);
    fetchDocuments()
      .then(({ data }) => setDocs(Array.isArray(data) ? data : data?.items || []))
      .catch((err) => setError(extractErrorMessage(err, "Could not load documents.")))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  function resetUploadForm() {
    setFile(null);
    setTitle("");
    setCategory("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleUpload(e) {
    e.preventDefault();
    if (!file) {
      toast.error("Choose a file to upload.");
      return;
    }
    setUploading(true);
    try {
      await uploadDocument({ file, title: title || file.name, category: category || "General" });
      toast.success("Document uploaded.");
      setUploadOpen(false);
      resetUploadForm();
      load();
    } catch (err) {
      toast.error(extractErrorMessage(err, "Could not upload this document."));
    } finally {
      setUploading(false);
    }
  }

  async function handleProcess(doc) {
    setProcessingId(doc.id);
    setDocs((prev) => prev.map((d) => (d.id === doc.id ? { ...d, status: "processing" } : d)));
    try {
      await processDocument(doc.id);
      toast.success(`Processing started for "${doc.title}".`);
      load();
    } catch (err) {
      toast.error(extractErrorMessage(err, "Could not start processing."));
      load();
    } finally {
      setProcessingId(null);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteDocument(deleteTarget.id);
      toast.success("Document deleted.");
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.error(extractErrorMessage(err, "Could not delete this document."));
    } finally {
      setDeleting(false);
    }
  }

  if (loading) return <PageLoading />;

  return (
    <div>
      <div className="flex-between" style={{ marginBottom: 18 }}>
        <div className="section-head" style={{ marginBottom: 0 }}>
          <h1>Documents</h1>
          <p>Upload official policy documents so the AI assistant can answer questions from them.</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate("/admin/documents/upload")}>
          Upload document
        </button>
      </div>

      {error && <div className="top-align-error">{error}</div>}

      <div className="card">
        {docs.length === 0 ? (
          <EmptyState title="No documents yet" description="Upload your first policy document to power the AI assistant." />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {docs.map((doc) => (
                  <tr key={doc.id}>
                    <td className="cell-name">{doc.title}</td>
                    <td className="cell-muted">{doc.category || "General"}</td>
                    <td>
                      <StatusBadge status={doc.status} />
                    </td>
                    <td>
                      <div className="row-actions">
                        {doc.status === "uploaded" && (
                          <LoadingButton
                            className="btn btn-secondary btn-sm"
                            loading={processingId === doc.id}
                            onClick={() => handleProcess(doc)}
                          >
                            Process
                          </LoadingButton>
                        )}
                        {doc.status === "failed" && (
                          <LoadingButton
                            className="btn btn-secondary btn-sm"
                            loading={processingId === doc.id}
                            onClick={() => handleProcess(doc)}
                          >
                            Retry
                          </LoadingButton>
                        )}
                        <button className="btn btn-danger btn-sm" onClick={() => setDeleteTarget(doc)}>
                          <IconTrash width={14} height={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {uploadOpen && (
        <Modal
          title="Upload document"
          onClose={() => {
            setUploadOpen(false);
            resetUploadForm();
          }}
        >
          <form onSubmit={handleUpload}>
            <div className="field">
              <label htmlFor="doc_file">File</label>
              <input
                id="doc_file"
                type="file"
                ref={fileInputRef}
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="doc_title">Title</label>
              <input
                id="doc_title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Employee Handbook 2026"
              />
            </div>
            <div className="field">
              <label htmlFor="doc_category">Category</label>
              <input
                id="doc_category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. HR Policy"
              />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22 }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setUploadOpen(false);
                  resetUploadForm();
                }}
                disabled={uploading}
              >
                Cancel
              </button>
              <LoadingButton type="submit" loading={uploading}>
                Upload
              </LoadingButton>
            </div>
          </form>
        </Modal>
      )}

      {deleteTarget && (
        <ConfirmModal
          title="Delete document"
          message={`Delete "${deleteTarget.title}"? The AI assistant will no longer use it to answer questions.`}
          confirmLabel="Delete document"
          loading={deleting}
          onConfirm={handleDelete}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
