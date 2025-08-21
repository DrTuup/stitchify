"use client";

import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";

export default function Home() {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [gridSize, setGridSize] = useState<number>(32);
  const [processedUrl, setProcessedUrl] = useState<string | null>(null);
  const [showOriginal, setShowOriginal] = useState(true);

  // CGA 16 color palette
  const CGA_PALETTE: number[][] = [
    [0, 0, 0], // Black
    [0, 0, 170], // Blue
    [0, 170, 0], // Green
    [0, 170, 170], // Cyan
    [170, 0, 0], // Red
    [170, 0, 170], // Magenta
    [170, 85, 0], // Brown
    [170, 170, 170], // Light gray
    [85, 85, 85], // Dark gray
    [85, 85, 255], // Light blue
    [85, 255, 85], // Light green
    [85, 255, 255], // Light cyan
    [255, 85, 85], // Light red
    [255, 85, 255], // Light magenta
    [255, 255, 85], // Yellow
    [255, 255, 255], // White
  ];

  // Map image to CGA palette
  function mapToCGAPalette(imageData: ImageData): ImageData {
    const { data, width, height } = imageData;
    for (let i = 0; i < data.length; i += 4) {
      let minDist = Infinity;
      let bestIdx = 0;
      for (let j = 0; j < CGA_PALETTE.length; j++) {
        const dist =
          Math.pow(data[i] - CGA_PALETTE[j][0], 2) +
          Math.pow(data[i + 1] - CGA_PALETTE[j][1], 2) +
          Math.pow(data[i + 2] - CGA_PALETTE[j][2], 2);
        if (dist < minDist) {
          minDist = dist;
          bestIdx = j;
        }
      }
      data[i] = CGA_PALETTE[bestIdx][0];
      data[i + 1] = CGA_PALETTE[bestIdx][1];
      data[i + 2] = CGA_PALETTE[bestIdx][2];
      // alpha stays the same
    }
    return new ImageData(data, width, height);
  }

  // Helper to process image
  function processImage(url: string, gridSize: number) {
    const img = new window.Image();
    img.src = url;
    img.onload = () => {
      const imgW = img.naturalWidth;
      const imgH = img.naturalHeight;
      // Determine grid cell size so that the longer side has gridSize squares
      const isLandscape = imgW >= imgH;
      const cellSize = isLandscape
        ? Math.floor(400 / gridSize)
        : Math.floor(400 / gridSize);
      const canvasW = isLandscape
        ? gridSize * cellSize
        : Math.round((imgW / imgH) * gridSize * cellSize);
      const canvasH = isLandscape
        ? Math.round((imgH / imgW) * gridSize * cellSize)
        : gridSize * cellSize;

      const canvas = document.createElement("canvas");
      canvas.width = canvasW;
      canvas.height = canvasH;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Draw scaled-down image to temp canvas matching grid size
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = gridSize;
      tempCanvas.height = Math.round(gridSize * (imgH / imgW));
      const tempCtx = tempCanvas.getContext("2d");
      if (!tempCtx) return;
      tempCtx.drawImage(img, 0, 0, tempCanvas.width, tempCanvas.height);

      // Get image data
      const imageData = tempCtx.getImageData(
        0,
        0,
        tempCanvas.width,
        tempCanvas.height
      );
      const mapped = mapToCGAPalette(imageData);

      // Draw each pixel as a cell with border
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let y = 0; y < tempCanvas.height; y++) {
        for (let x = 0; x < tempCanvas.width; x++) {
          const idx = (y * tempCanvas.width + x) * 4;
          const r = mapped.data[idx];
          const g = mapped.data[idx + 1];
          const b = mapped.data[idx + 2];
          const a = mapped.data[idx + 3] / 255;
          ctx.fillStyle = `rgba(${r},${g},${b},${a})`;
          ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
          ctx.strokeStyle = "black";
          ctx.lineWidth = 1;
          ctx.strokeRect(x * cellSize, y * cellSize, cellSize, cellSize);
        }
      }

      setProcessedUrl(canvas.toDataURL());
    };
  }

  function handleImageUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    if (!file) {
      setError("Please upload a valid image file.");
      return;
    }
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file.");
      return;
    }

    setError(null);
    const url = URL.createObjectURL(file);

    // Remove square check, just set and process
    setImageUrl(url);
    processImage(url, gridSize);
  }

  // Re-process when gridSize changes
  useEffect(() => {
    if (imageUrl) {
      processImage(imageUrl, gridSize);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gridSize, imageUrl]);

  return (
    <main className="flex flex-col h-screen items-center justify-center p-4">
      <div className="text-center mb-4">
        <h1 className="text-4xl font-bold mb-2">Welcome to Stitchify</h1>
        <p className="text-lg text-gray-600">
          Create crochet patterns effortlessly
        </p>
      </div>
      <div className="flex w-full max-w-lg items-center gap-3">
        <Input id="picture" type="file" onInput={handleImageUpload} />
        <Input
          type="number"
          id="gridsize"
          defaultValue={gridSize}
          min={1}
          className="w-1/4"
          onChange={(e) => {
            const value = Math.max(1, Number(e.target.value));
            setGridSize(value);
          }}
        />
        <Button
          onClick={() => {
            setImageUrl(null);
            setProcessedUrl(null);
            setError(null);
            const fileInput = document.getElementById(
              "picture"
            ) as HTMLInputElement;
            if (fileInput) {
              fileInput.value = "";
            }
          }}
          className="bg-red-600 text-white hover:bg-red-700"
        >
          Clear
        </Button>
      </div>
      {error && (
        <div className="mt-4 text-red-500">
          <p>{error}</p>
        </div>
      )}
      {(processedUrl || imageUrl) && (
        <div className="mt-4 flex flex-col items-center">
          <Button
            type="button"
            className="mb-2 bg-blue-600 text-white hover:bg-blue-700"
            onClick={() => setShowOriginal((prev) => !prev)}
          >
            {showOriginal ? "Show processed" : "Show original"}
          </Button>
          {showOriginal && imageUrl && (
            <Image
              src={imageUrl}
              alt="Uploaded Image"
              className="max-w-full"
              width={400}
              height={400}
            />
          )}
          {!showOriginal && processedUrl && (
            <Image
              src={processedUrl}
              alt="Processed Image"
              className="max-w-full"
              width={400}
              height={400}
              style={{ imageRendering: "pixelated" }}
            />
          )}
        </div>
      )}
    </main>
  );
}
