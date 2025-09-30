// components/InfographicReport.tsx
"use client";

import React, { useRef, useState } from "react";
import Image from "next/image";
import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";

interface InfographicReportProps {
  insight: string;
  cliente: string;
  periodo: string;
  origem: string;
}

export default function InfographicReport({
  insight,
  cliente,
  periodo,
  origem,
}: InfographicReportProps) {
  const reportRef = useRef<HTMLDivElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editableInsight, setEditableInsight] = useState(insight);
  const [editableCliente, setEditableCliente] = useState(cliente);
  const [editablePeriodo, setEditablePeriodo] = useState(periodo);
  const [editableOrigem, setEditableOrigem] = useState(origem);

  // Dimensões em mm (9,9cm x 21cm)
  const width = 99;
  const height = 210;

  // Função para gerar o PDF
  const generatePDF = async () => {
    if (!reportRef.current) return;

    try {
      // Converter o componente para imagem
      const dataUrl = await toPng(reportRef.current, {
        quality: 1.0,
        pixelRatio: 2,
      });

      // Criar o PDF com as dimensões corretas
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: [width, height],
      });

      // Adicionar a imagem ao PDF
      pdf.addImage(dataUrl, "PNG", 0, 0, width, height);

      // Salvar o PDF
      pdf.save(`insight-${cliente}-${new Date().toISOString().split("T")[0]}.pdf`);
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
    }
  };

  // Função para alternar entre modo de visualização e edição
  const toggleEditMode = () => {
    setIsEditing(!isEditing);
  };

  return (
    <div className="flex flex-col items-center">
      {/* Botões de ação */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={toggleEditMode}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          {isEditing ? "Visualizar" : "Editar"}
        </button>
        <button
          onClick={generatePDF}
          className="bg-brand text-white px-4 py-2 rounded hover:bg-brand-dark"
          disabled={isEditing}
        >
          Gerar PDF Infográfico
        </button>
      </div>

      {/* Preview do relatório */}
      <div className="border rounded shadow-lg overflow-hidden">
        {/* O componente real que será convertido para PDF */}
        <div
          ref={reportRef}
          className="bg-white"
          style={{
            width: `${width}mm`,
            height: `${height}mm`,
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Cabeçalho com logo */}
          <div className="bg-brand p-3 flex justify-between items-center">
            <Image
              src="/logo-controlf5.png"
              alt="Control F5"
              width={80}
              height={20}
              className="object-contain"
            />
            <div className="text-white text-xs font-semibold">
              {new Date().toLocaleDateString()}
            </div>
          </div>

          {/* Informações do cliente e período */}
          <div className="bg-gray-100 p-3 text-xs">
            {isEditing ? (
              <>
                <input 
                  type="text" 
                  value={editableCliente} 
                  onChange={(e) => setEditableCliente(e.target.value)}
                  className="w-full mb-1 p-1 border rounded text-xs"
                  placeholder="Nome do cliente"
                />
                <input 
                  type="text" 
                  value={editablePeriodo} 
                  onChange={(e) => setEditablePeriodo(e.target.value)}
                  className="w-full mb-1 p-1 border rounded text-xs"
                  placeholder="Período"
                />
                <input 
                  type="text" 
                  value={editableOrigem} 
                  onChange={(e) => setEditableOrigem(e.target.value)}
                  className="w-full p-1 border rounded text-xs"
                  placeholder="Origem"
                />
              </>
            ) : (
              <>
                <div className="font-bold text-brand">{editableCliente}</div>
                <div className="text-gray-700">{editablePeriodo}</div>
                <div className="text-gray-700">{editableOrigem}</div>
              </>
            )}
          </div>

          {/* Conteúdo do insight */}
          <div className="p-3 text-xs overflow-y-auto" style={{ maxHeight: "calc(210mm - 100px)" }}>
            {isEditing ? (
              <textarea
                value={editableInsight}
                onChange={(e) => setEditableInsight(e.target.value)}
                className="w-full h-64 p-2 border rounded text-xs"
                style={{ minHeight: "calc(210mm - 180px)" }}
              />
            ) : (
              <div className="prose prose-sm max-w-none">
                <div dangerouslySetInnerHTML={{ __html: editableInsight }} />
              </div>
            )}
          </div>

          {/* Rodapé */}
          <div className="absolute bottom-0 left-0 right-0 bg-gray-100 p-2 text-center text-xs text-gray-600">
            © {new Date().getFullYear()} Control F5 – Todos os direitos reservados
          </div>
        </div>
      </div>
    </div>
  );
}