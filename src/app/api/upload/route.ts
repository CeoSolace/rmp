import { NextRequest, NextResponse } from "next/server";
import cloudinary from "../../../lib/cloudinary/server";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString("base64");
    const dataUrl = `data:${file.type};base64,${base64}`;
    const folder = process.env.CLOUDINARY_FOLDER || "rampchat";

    const uploadResult = await cloudinary.uploader.upload(dataUrl, {
      folder,
    });

    return NextResponse.json({ url: uploadResult.secure_url });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Image upload failed" },
      { status: 500 }
    );
  }
}
