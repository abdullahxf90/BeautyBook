import jwt from "jsonwebtoken";
import { config } from "../config";

export interface TokenPayload {
  sub: string;
  role: string;
}

export function signAccessToken(payload: TokenPayload) {
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.accessTokenTtl as jwt.SignOptions["expiresIn"],
  });
}

export function signRefreshToken(payload: TokenPayload) {
  return jwt.sign(payload, config.jwtRefreshSecret, {
    expiresIn: `${config.refreshTokenTtlDays}d` as jwt.SignOptions["expiresIn"],
  });
}

export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, config.jwtSecret) as TokenPayload;
}

export function verifyRefreshToken(token: string): TokenPayload {
  return jwt.verify(token, config.jwtRefreshSecret) as TokenPayload;
}

export function signResetToken(payload: TokenPayload) {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: "15m" });
}

export function verifyResetToken(token: string): TokenPayload {
  return jwt.verify(token, config.jwtSecret) as TokenPayload;
}
