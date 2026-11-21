"use client";

import { useRef, useState } from "react";

const MAX_MB = 100;

export default function UploadField({
  name,
  accept,
  label,
}: {
  name: string;
  accept: string;
  label: string;
}) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function reset() {
    setFileName(null);
    setProgress(null);
    setError(null);
    setDone(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function upload(file: File) {
    setError(null);
    setDone(null);

    if (file.size > MAX_MB * 1024 * 1024) {
      setError(`File too big (${(file.size / 1048576).toFixed(1)} MB). Maximum is ${MAX_MB} MB.`);
      reset();
      return;
    }

    setFileName(`${file.name} (${(file.size / 1048576).toFixed(1)} MB)`);
    setProgress(0);

    const body = new FormData();
    body.append("file", file);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/admin/upload");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      setProgress(null);
      try {
        const data = JSON.parse(xhr.responseText);
        if (xhr.status === 200 && data.ok) {
          setDone(data.name);
          const hidden = document.getElementById(`uploaded-${name}`) as HTMLInputElement | null;
          if (hidden) hidden.value = String(data.name);
        } else {
          setError(data.error || "Upload failed. Please try again.");
          reset();
        }
      } catch {
        setError("Upload failed. Please try again.");
        reset();
      }
    };
    xhr.onerror = () => {
      setError("Network error during upload. Please try again.");
      setProgress(null);
      reset();
    };
    xhr.send(body);
  }

  return (
    <div className="upload-field">
      <label className="field">
        {label}
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          disabled={progress !== null}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) upload(file);
          }}
        />
      </label>
      <input type="hidden" name={name} id={`uploaded-${name}`} value={done || ""} readOnly />
      {fileName && progress !== null && (
        <div>
          <div style={{ color: "var(--muted)", fontSize: "0.82rem", marginBottom: "0.25rem" }}>
            Uploading {fileName}…
          </div>
          <div className="progress-bar" role="progressbar">
            <div
              style={{
                width: `${progress}%`,
                height: "100%",
                background: "linear-gradient(135deg, var(--gold-light), var(--gold))",
                transition: "width 0.2s ease",
              }}
            />
          </div>
        </div>
      )}
      {done && (
        <div style={{ color: "var(--green)", fontSize: "0.82rem" }}>
          Uploaded. It will be attached when you save.{" "}
          <button
            type="button"
            className="btn outline sm"
            onClick={() => {
              const hidden = document.getElementById(`uploaded-${name}`) as HTMLInputElement | null;
              if (hidden) hidden.value = "";
              reset();
            }}
          >
            Remove
          </button>
        </div>
      )}
      {error && <div style={{ color: "var(--red)", fontSize: "0.82rem" }}>{error}</div>}
    </div>
  );
}
