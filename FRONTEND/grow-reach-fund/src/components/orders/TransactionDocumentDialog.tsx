import React, { useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { TransactionDocument, TransactionDocumentProps } from "../TransactionDocument";

interface TransactionDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentData: TransactionDocumentProps | null;
}

export const TransactionDocumentDialog: React.FC<TransactionDocumentDialogProps> = ({
  open,
  onOpenChange,
  documentData,
}) => {
  const documentRef = useRef<HTMLDivElement>(null);

  const downloadPDF = async () => {
    if (!documentRef.current || !documentData) return;

    try {
      const canvas = await html2canvas(documentRef.current, {
        scale: 2, // higher resolution
        useCORS: true,
      });

      const imgData = canvas.toDataURL("image/png");
      
      // A4 size: 210 x 297 mm
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${documentData.type}_${documentData.documentNumber}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
    }
  };

  if (!documentData) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between sticky top-0 bg-background z-10 pb-4 border-b">
          <DialogTitle>{documentData.type} - {documentData.documentNumber}</DialogTitle>
          <Button onClick={downloadPDF} className="mr-8">
            <Download className="mr-2 h-4 w-4" /> Download PDF
          </Button>
        </DialogHeader>

        <div className="flex justify-center p-4 bg-muted/30">
          <div ref={documentRef} className="bg-white shadow-md">
            <TransactionDocument {...documentData} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
