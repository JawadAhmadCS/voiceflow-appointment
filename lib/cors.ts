import { NextResponse } from "next/server";

export const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export function withCors<T extends NextResponse | Response>(res: T): T {
  Object.entries(CORS_HEADERS).forEach(([k, v]) => {
    res.headers.set(k, v);
  });
  return res;
}

export function corsOptions(): NextResponse {
  return withCors(new NextResponse(null, { status: 204 }));
}
