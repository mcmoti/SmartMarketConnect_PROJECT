import React from "react";
import { format } from "date-fns";
import smcLogo from "@/assets/smc-logo.png";

export interface TransactionDocumentProps {
  type: "RECEIPT" | "INVOICE";
  documentNumber: string;
  date: string;
  dueDate?: string;
  buyerName: string;
  farmerName: string;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
  }>;
  subtotal: number;
  tax?: number;
  total: number;
  signatureName?: string;
}

export const TransactionDocument: React.FC<TransactionDocumentProps> = ({
  type,
  documentNumber,
  date,
  dueDate,
  buyerName,
  farmerName,
  items,
  subtotal,
  tax = 0,
  total,
  signatureName,
}) => {
  return (
    <div className="bg-white p-8 max-w-4xl mx-auto border shadow-sm text-slate-800 text-sm font-sans" id="transaction-document">
      {/* Header */}
      <div className="flex justify-between items-start mb-12">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-[#1e2b4d] mb-4">
            {type}
          </h1>
          <div className="text-sm space-y-1">
            <p className="font-semibold text-base">Smart Market Connect</p>
            <p>123 Farming Avenue</p>
            <p>Nairobi, Kenya</p>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <div className="w-32 mb-4">
            <img src={smcLogo} alt="Smart Market Connect Logo" className="w-full h-auto object-contain" />
          </div>
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-3 gap-8 mb-12">
        <div>
          <h3 className="font-bold text-xs uppercase tracking-wider mb-2">Bill To</h3>
          <p className="font-medium">{buyerName}</p>
          <p className="text-gray-600">SMC Buyer</p>
        </div>
        <div>
          <h3 className="font-bold text-xs uppercase tracking-wider mb-2">From (Farmer)</h3>
          <p className="font-medium">{farmerName}</p>
          <p className="text-gray-600">SMC Vendor</p>
        </div>
        <div className="grid grid-cols-2 gap-y-2 text-sm">
          <span className="font-semibold uppercase text-xs flex items-center">{type} #</span>
          <span className="text-right">{documentNumber}</span>
          
          <span className="font-semibold uppercase text-xs flex items-center">{type} DATE</span>
          <span className="text-right">{format(new Date(date), "dd/MM/yyyy")}</span>
          
          {dueDate && (
            <>
              <span className="font-semibold uppercase text-xs flex items-center">DUE DATE</span>
              <span className="text-right">{format(new Date(dueDate), "dd/MM/yyyy")}</span>
            </>
          )}
        </div>
      </div>

      {/* Items Table */}
      <div className="mb-12">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-t-2 border-b-2 border-[#1e2b4d]">
              <th className="py-3 px-2 font-bold text-xs uppercase tracking-wider text-center w-16">Qty</th>
              <th className="py-3 px-2 font-bold text-xs uppercase tracking-wider">Description</th>
              <th className="py-3 px-2 font-bold text-xs uppercase tracking-wider text-right w-32">Unit Price</th>
              <th className="py-3 px-2 font-bold text-xs uppercase tracking-wider text-right w-32">Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={idx} className="border-b border-gray-100">
                <td className="py-4 px-2 text-center">{item.quantity}</td>
                <td className="py-4 px-2">{item.description}</td>
                <td className="py-4 px-2 text-right">{item.unitPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                <td className="py-4 px-2 text-right">{item.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals & Signature */}
      <div className="flex justify-between items-end mb-16">
        <div className="w-1/2">
          {signatureName && (
            <div className="text-center mt-12 w-48">
              <div className="border-b border-black mb-2 pb-2">
                {/* Simulated handwritten signature font can be applied here, or just cursive */}
                <span className="font-['Brush_Script_MT',_cursive] text-2xl">{signatureName}</span>
              </div>
            </div>
          )}
        </div>
        <div className="w-1/2 max-w-xs">
          <div className="flex justify-between py-2">
            <span className="font-medium text-gray-600">Subtotal</span>
            <span>{subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
          </div>
          {tax > 0 && (
            <div className="flex justify-between py-2">
              <span className="font-medium text-gray-600">Sales Tax</span>
              <span>{tax.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
          )}
          <div className="flex justify-between py-4 mt-2 border-t-2 border-[#1e2b4d] font-bold">
            <span className="uppercase">Total</span>
            <span>KES {total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="grid grid-cols-2 gap-8 items-end">
        <div>
          <h2 className="text-4xl font-['Brush_Script_MT',_cursive] text-[#1e2b4d] mb-4">
            Thank you
          </h2>
        </div>
        <div className="border-l-2 border-[#1e2b4d] pl-4 text-xs text-gray-600">
          <h4 className="font-bold text-red-500 uppercase tracking-wider mb-2">Terms & Conditions</h4>
          <p className="mb-1">Payment is due upon receipt unless otherwise stated.</p>
          <p>Please make checks payable to: Smart Market Connect</p>
        </div>
      </div>
    </div>
  );
};
