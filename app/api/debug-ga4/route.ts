// app/api/debug-ga4/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { dataInicio, dataFim, cliente } = await req.json();

    return NextResponse.json({
      debug: true,
      step: "basic_test",
      received: { dataInicio, dataFim, cliente },
      message: "Endpoint funcionando"
    });

  } catch (e: any) {
    console.error("Debug error:", e);
    return NextResponse.json(
      { error: e?.message || "Erro desconhecido", stack: e?.stack },
      { status: 500 }
    );
  }
}