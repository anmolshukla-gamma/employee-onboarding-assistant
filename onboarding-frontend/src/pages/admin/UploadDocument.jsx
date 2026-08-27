import { useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { uploadDocument } from "../../api/documents";
import { extractErrorMessage } from "../../api/axios";
import { useToast } from "../../context/ToastContext";
import LoadingButton from "../../components/LoadingButton";

function formatBytes(size) {
  if (!size && size !== 0) return "—";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export default function UploadDocument() {
  const toast = useToast();
  const navigate = useNavigate();
  const inputRef = useRef(null);

  const [file, setFile] = useState(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("General");
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);

  function applyFile(next) {
    if (!next) return;
    setFile(next);
    if (!title.trim()) {
      setTitle(next.name.replace(/\.[^/.]+$/, ""));
    }
  }

  function onPick(e) {
    const f = e.target.files?.[0];
    if (f) applyFile(f);
  }

  function onDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) applyFile(f);
  }

  const canSubmit = useMemo(() => !!file, [file]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!file) {
      toast.error("Choose a file to upload.");
      return;
    }

    setUploading(true);
    try {
      await uploadDocument({
        file,
        title: title.trim() || file.name,
        category: category.trim() || "General",
      });
      toast.success("Document uploaded. Process it from the documents list to enable AI answers.");
      navigate("/admin/documents");
    } catch (err) {
      toast.error(extractErrorMessage(err, "Could not upload this document."));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="cu-page">
      <div className="cu-top">
        <div>
          <div className="cu-breadcrumb">
            <Link to="/admin/documents">Documents</Link>
            <span>/</span>
            <span>Upload</span>
          </div>
          <h1>Upload document</h1>
          <p>Add a policy or guide file to the AI knowledge base.</p>
        </div>
        <Link to="/admin/documents" className="btn btn-secondary">
          Back to documents
        </Link>
      </div>

      <form className="cu-grid" onSubmit={handleSubmit}>
        <div className="cu-main">
          {/* File */}
          <section className="cu-card">
            <div className="cu-card-head">
              <div>
                <h2>File</h2>
                <p>PDF, DOCX, or TXT works best for AI processing.</p>
              </div>
              <span className="cu-step">1</span>
            </div>

            <div
              className={`ud-dropzone ${dragOver ? "over" : ""} ${file ? "has-file" : ""}`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={() => inputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
              }}
            >
              <input
                ref={inputRef}
                type="file"
                accept=".pdf,.doc,.docx,.txt,.md"
                onChange={onPick}
                hidden
              />
              {!file ? (
                <>
                  <div className="ud-drop-icon">↑</div>
                  <strong>Drag & drop your file here</strong>
                  <span>or click to browse</span>
                </>
              ) : (
                <>
                  <div className="ud-file-name">{file.name}</div>
                  <div className="ud-file-meta">{formatBytes(file.size)} · click to replace</div>
                </>
              )}
            </div>
          </section>

          {/* Metadata */}
          <section className="cu-card">
            <div className="cu-card-head">
              <div>
                <h2>Details</h2>
                <p>Help admins and the AI organize this document.</p>
              </div>
              <span className="cu-step">2</span>
            </div>

            <div className="cu-fields">
              <div className="field">
                <label htmlFor="doc_title">Title</label>
                <input
                  id="doc_title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Leave Policy 2026"
                />
              </div>
              <div className="field">
                <label htmlFor="doc_category">Category</label>
                <input
                  id="doc_category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="General, HR, IT, Engineering…"
                />
              </div>
            </div>
          </section>
        </div>

        <aside className="cu-side">
          <div className="cu-side-card">
            <h3>Summary</h3>
            <div className="cu-summary-row">
              <span>File</span>
              <strong>{file?.name || "—"}</strong>
            </div>
            <div className="cu-summary-row">
              <span>Size</span>
              <strong>{file ? formatBytes(file.size) : "—"}</strong>
            </div>
            <div className="cu-summary-row">
              <span>Title</span>
              <strong>{title.trim() || file?.name || "—"}</strong>
            </div>
            <div className="cu-summary-row">
              <span>Category</span>
              <strong>{category.trim() || "General"}</strong>
            </div>

            <div className="cu-side-actions">
              <LoadingButton
                type="submit"
                className="btn btn-primary btn-block"
                loading={uploading}
                disabled={!canSubmit}
              >
                Upload document
              </LoadingButton>
              <Link to="/admin/documents" className="btn btn-secondary btn-block">
                Cancel
              </Link>
            </div>
          </div>

          <div className="cu-tip">
            <strong>After upload</strong>
            <p>
              Click <strong>Process</strong> on the documents list so the AI can use this file in
              answers.
            </p>
          </div>
        </aside>
      </form>
    </div>
  );
}