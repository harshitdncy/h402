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
          <p>Generating your image...</p>
        </div>
      </div>
    );
  }

  return (
    <Suspense fallback={<div>Loadning..</div>} >
      <ImageComponent setStatus={(status) => setStatus(status)} setError={(error) => setError(error)} />
    </Suspense>
  );
}

function ImageComponent({ setStatus, setError }: { setStatus: (status: "loading" | "error" | "success") => void; setError: (error: string) => void }) {
  const searchParams = useSearchParams();
  const filename = searchParams.get("filename");

  useEffect(() => {
    if (!filename) {
      setStatus("error");
      setError("No filename provided")
    }

    const checkImage = async () => {
      try {
        const response = await fetch(`/uploads/${filename}`);

        if (response.ok) {
          setStatus("success");
        } else if (response.status === 404) {
          setTimeout(checkImage, 2000);
        } else {
          setStatus("error");
          setError("Failed to load image");
        }
      } catch {
        setStatus("error");
        setError("Failed to load image");
      }
    }

    checkImage();
  }, [filename, setStatus, setError])

  return (
    <div className="flex items-center justify-center min-h-screen bg-black">
      <Image
        src={`/uploads/${filename}`}
        alt="Generated image"
        className="max-w-full max-h-screen object-contain"
      />
    </div>
  );
}
