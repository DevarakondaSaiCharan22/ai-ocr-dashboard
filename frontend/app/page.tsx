"use client";

import { useState } from "react";
import styles from "./page.module.css";

type ActiveTab = "upload" | "results";

type DocItem = {
  file: File;
  status: "pending" | "processing" | "completed";
  result?: any;
};

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("upload");
  const [documents, setDocuments] = useState<DocItem[]>([]);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;

    const newDocs = Array.from(e.target.files).map((file) => ({
      file,
      status: "pending" as const,
    }));

    setDocuments(newDocs);
  };

  const handleUpload = async () => {
    if (!documents.length) return;

    const formData = new FormData();
    documents.forEach((doc) => formData.append("files", doc.file));

    try {
      setLoading(true);

      setDocuments((prev) =>
        prev.map((doc) => ({ ...doc, status: "processing" }))
      );

      const res = await fetch("http://localhost:8000/upload-multiple", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      setDocuments((prev) =>
        prev.map((doc, i) => ({
          ...doc,
          status: "completed",
          result: data.documents?.[i],
        }))
      );

      setActiveTab("results");
    } catch (err) {
      console.error("Upload error:", err);
      alert("Failed to upload. Check backend.");
    } finally {
      setLoading(false);
    }
  };

  const totalDocs = documents.length;
  const processedDocs = documents.filter(
    (d) => d.status === "completed"
  ).length;

  return (
    <div className={styles.dashboardContainer}>
      {/* Navbar */}
      <div className={styles.navbar}>
        <h1>📄 OCR Dashboard</h1>
      </div>

      <main style={{ maxWidth: "1100px", margin: "0 auto", padding: "24px" }}>
        {/* Stats */}
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <p className={styles.statTitle}>Total Docs</p>
            <h2 className={styles.statValue}>{totalDocs}</h2>
          </div>

          <div className={styles.statCard}>
            <p className={styles.statTitle}>Processed</p>
            <h2 className={`${styles.statValue} ${styles.textCyan}`}>
              {processedDocs}
            </h2>
          </div>

          <div className={styles.statCard}>
            <p className={styles.statTitle}>Status</p>
            <h2
              className={`${styles.statValue} ${
                loading ? styles.textYellow : styles.textGreen
              }`}
            >
              {loading ? "Processing..." : "Ready"}
            </h2>
          </div>
        </div>

        {/* Tabs */}
        <div className={styles.tabs}>
          {["upload", "results"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as ActiveTab)}
              className={`${styles.tabButton} ${
                activeTab === tab ? styles.tabActive : ""
              }`}
            >
              {tab.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Upload */}
        {activeTab === "upload" && (
          <div>
            <div className={styles.uploadBox}>
              <input type="file" multiple onChange={handleFileChange} />

              <button onClick={handleUpload} className={styles.uploadBtn}>
                {loading ? "Processing..." : "Upload & Extract"}
              </button>
            </div>

            {documents.length > 0 && (
              <div style={{ marginTop: "20px", display: "grid", gap: "10px" }}>
                {documents.map((doc, i) => (
                  <div key={i} className={styles.fileItem}>
                    <span>{doc.file.name}</span>

                    <span
                      className={
                        doc.status === "pending"
                          ? styles.textGray
                          : doc.status === "processing"
                          ? styles.textYellow
                          : styles.textGreen
                      }
                    >
                      {doc.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Results */}
        {activeTab === "results" && (
          <div>
            {processedDocs === 0 ? (
              <p className={styles.textGray}>No results yet</p>
            ) : (
              <div style={{ display: "grid", gap: "16px" }}>
                {documents
                  .filter((d) => d.status === "completed")
                  .map((doc, i) => (
                    <div key={i} className={styles.resultCard}>
                      <h3 className={styles.resultTitle}>
                        📦 {doc.file.name}
                      </h3>

                      <div className={styles.resultGrid}>
                        <p><b>Name:</b> {doc.result?.structured_data?.name || "-"}</p>
                        <p><b>DOB:</b> {doc.result?.structured_data?.dob || "-"}</p>
                        <p><b>ID:</b> {doc.result?.structured_data?.id_number || "-"}</p>
                        <p><b>Type:</b> {doc.result?.structured_data?.document_type || "-"}</p>
                        <p className={styles.fullWidth}>
                          <b>Address:</b> {doc.result?.structured_data?.address || "-"}
                        </p>
                      </div>

                      <details style={{ marginTop: "10px" }}>
                        <summary style={{ cursor: "pointer" }}>
                          View Raw OCR
                        </summary>
                        <pre className={styles.rawText}>
                          {doc.result?.raw_text}
                        </pre>
                      </details>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}