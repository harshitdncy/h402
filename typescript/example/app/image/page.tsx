"use client";

import { useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";

export default function CreateImagePage() {
  const searchParams = useSearchParams();
  const prompt = searchParams.get("prompt");

  const [image, setImage] = useState<string | null>(null);

  useEffect(() => {
    
  }, [prompt]);

  return image && <img src={image} alt="AI Generated Image" />;
}
