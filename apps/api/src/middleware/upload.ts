import multer from "multer";
import { RequestHandler } from "express";

/** In-memory multer — files go into req.file/req.files as Buffer */
const storage = multer.memoryStorage();

const FIVE_MB = 5 * 1024 * 1024;
const TEN_MB = 10 * 1024 * 1024;
const TWENTY_MB = 20 * 1024 * 1024;

const imageFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
  if (["image/jpeg", "image/png", "image/webp", "image/svg+xml"].includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only JPEG, PNG, WebP and SVG images are allowed"));
  }
};

const docFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
  if (["application/pdf", "image/jpeg", "image/png"].includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only PDF, JPEG and PNG files are allowed"));
  }
};

export const uploadSingle = (field: string, maxSize = FIVE_MB): RequestHandler =>
  multer({ storage, limits: { fileSize: maxSize }, fileFilter: imageFilter }).single(field);

export const uploadMultiple = (field: string, max = 10, maxSize = TEN_MB): RequestHandler =>
  multer({ storage, limits: { fileSize: maxSize }, fileFilter: imageFilter }).array(field, max);

export const uploadDocument = (field: string): RequestHandler =>
  multer({ storage, limits: { fileSize: TWENTY_MB }, fileFilter: docFilter }).single(field);
