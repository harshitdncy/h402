"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Image from "next/image";

export default function ImagePage() {
  const [status, setStatus] = useState<"loading" | "error" | "success">(
    "loading"
  );
  const [error, setError] = useState<string>("");

  return (
    <Suspense fallback={<div>Loading..</div>}>
      <ImageComponent
        status={status}
        error={error}
        setStatus={(status) => setStatus(status)}
        setError={(error) => setError(error)}
      />
    </Suspense>
  );
}

function ImageComponent({
  status,
  error,
  setStatus,
  setError,
}: {
  status: "loading" | "error" | "success";
  error: string;
  setStatus: (status: "loading" | "error" | "success") => void;
  setError: (error: string) => void;
}) {
  const searchParams = useSearchParams();
  const filename = searchParams.get("filename");
  const [showLoadingText, setShowLoadingText] = useState(false);

  useEffect(() => {
    if (status === "loading") {
      const timer = setTimeout(() => {
        setShowLoadingText(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  useEffect(() => {
    if (!filename) {
      setStatus("error");
      setError("No filename provided");
      return;
    }

    const checkImage = async (attempt = 1) => {
      try {
        const response = await fetch(`/uploads/${filename}`);

        if (response.ok) {
          setStatus("success");
        } else if (response.status === 404 && attempt < 10) {
          setTimeout(() => checkImage(attempt + 1), 2000);
        } else {
          setStatus("error");
          setError("Image not found after multiple attempts");
        }
      } catch (error) {
        setStatus("error");
        setError("Failed to load image");
      }
    };

    checkImage();
  }, [filename, setStatus, setError]);

  if (status === "error") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="text-white text-center">
          <h1 className="text-2xl font-bold mb-4">Error</h1>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent mx-auto mb-4"></div>
          {showLoadingText && <p>Generating your image...</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-black relative">
      <Image
        src={`/uploads/${filename}`}
        fill
        priority
        alt="AI Generated Image"
        className="absolute max-w-full max-h-full object-contain"
        sizes="100vw"
      />
    </div>
  );
}
