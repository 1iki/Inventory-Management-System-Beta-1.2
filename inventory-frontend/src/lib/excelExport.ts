import * as XLSX from 'xlsx-js-style';
import { format } from 'date-fns';
import type { Part, Customer, PurchaseOrder } from '../types';

// ================== EXCEL EXPORT UTILITIES ==================

interface ExportFilter {
  customers?: string[]; // Array of customer IDs
  searchTerm?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

// Styling untuk Excel
const headerStyle = {
  font: { bold: true, color: { rgb: "FFFFFF" }, sz: 12 },
  fill: { fgColor: { rgb: "2563EB" } },
  alignment: { horizontal: "center", vertical: "center" },
  border: {
    top: { style: "thin", color: { rgb: "000000" } },
    bottom: { style: "thin", color: { rgb: "000000" } },
    left: { style: "thin", color: { rgb: "000000" } },
    right: { style: "thin", color: { rgb: "000000" } }
  }
};

const cellStyle = {
  border: {
    top: { style: "thin", color: { rgb: "CCCCCC" } },
    bottom: { style: "thin", color: { rgb: "CCCCCC" } },
    left: { style: "thin", color: { rgb: "CCCCCC" } },
    right: { style: "thin", color: { rgb: "CCCCCC" } }
  },
  alignment: { vertical: "center" }
};

const titleStyle = {
  font: { bold: true, sz: 16, color: { rgb: "1F2937" } },
  alignment: { horizontal: "center", vertical: "center" }
};

// Helper function to set column widths
const setColumnWidths = (worksheet: XLSX.WorkSheet, widths: number[]) => {
  worksheet['!cols'] = widths.map(w => ({ wch: w }));
};

// Helper function to apply styles to a range
const applyStylesToRange = (worksheet: XLSX.WorkSheet, range: string, style: any) => {
  const decoded = XLSX.utils.decode_range(range);
  for (let R = decoded.s.r; R <= decoded.e.r; ++R) {
    for (let C = decoded.s.c; C <= decoded.e.c; ++C) {
      const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
      if (!worksheet[cellAddress]) continue;
      worksheet[cellAddress].s = style;
    }
  }
};

// ================== EXPORT MASTER PARTS ==================
export const exportPartsToExcel = (
  parts: Part[],
  customers: Customer[],
  filter?: ExportFilter
) => {
  try {
    // Filter parts based on criteria
    let filteredParts = [...parts];
    
    if (filter?.customers && filter.customers.length > 0) {
      filteredParts = filteredParts.filter(part => {
        const customerId = typeof part.customerId === 'string' 
          ? part.customerId 
          : part.customerId._id;
        return filter.customers!.includes(customerId);
      });
    }

    if (filter?.searchTerm) {
      const searchLower = filter.searchTerm.toLowerCase();
      filteredParts = filteredParts.filter(part =>
        part.name.toLowerCase().includes(searchLower) ||
        part.internalPartNo.toLowerCase().includes(searchLower) ||
        part.supplierInfo.id.toLowerCase().includes(searchLower)
      );
    }

    if (filteredParts.length === 0) {
      throw new Error('Tidak ada data yang sesuai dengan filter');
    }

    // Group parts by customer
    const partsByCustomer = new Map<string, Part[]>();
    filteredParts.forEach(part => {
      const customerId = typeof part.customerId === 'string' 
        ? part.customerId 
        : part.customerId._id;
      const customer = customers.find(c => c._id === customerId);
      const customerName = customer?.name || 'Unknown Customer';
      
      if (!partsByCustomer.has(customerName)) {
        partsByCustomer.set(customerName, []);
      }
      partsByCustomer.get(customerName)!.push(part);
    });

    // Create workbook
    const workbook = XLSX.utils.book_new();

    // Create a sheet for each customer
    Array.from(partsByCustomer.entries()).forEach(([customerName, customerParts]) => {
      // Prepare data
      const data = [
        [`MASTER PARTS - ${customerName.toUpperCase()}`],
        [`Exported: ${format(new Date(), 'dd MMM yyyy HH:mm')}`],
        [], // Empty row
        [
          'No',
          'Internal Part No',
          'Nama Item',
          'Deskripsi',
          'Supplier ID',
          'Supplier Part No',
          'Supplier Description',
          'PO Number',
          'Weight (kg)',
          'Dimensions',
          'Material',
          'Created Date'
        ],
        ...customerParts.map((part, index) => [
          index + 1,
          part.internalPartNo,
          part.name,
          part.description || '-',
          part.supplierInfo.id,
          part.supplierInfo.partNumber || '-',
          part.supplierInfo.description || '-',
          part.poNumber || '-',
          part.specifications?.weight || '-',
          part.specifications?.dimensions || '-',
          part.specifications?.material || '-',
          part.createdAt ? format(new Date(part.createdAt), 'dd MMM yyyy') : '-'
        ])
      ];

      // Create worksheet
      const worksheet = XLSX.utils.aoa_to_sheet(data);

      // Set column widths
      setColumnWidths(worksheet, [5, 18, 25, 30, 15, 20, 30, 18, 12, 20, 20, 15]);

      // Apply styles
      // Title (row 0)
      if (worksheet['A1']) {
        worksheet['A1'].s = titleStyle;
        worksheet['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 11 } }];
      }

      // Date (row 1)
      if (worksheet['A2']) {
        worksheet['A2'].s = { alignment: { horizontal: "center" } };
        if (!worksheet['!merges']) worksheet['!merges'] = [];
        worksheet['!merges'].push({ s: { r: 1, c: 0 }, e: { r: 1, c: 11 } });
      }

      // Headers (row 3)
      applyStylesToRange(worksheet, 'A4:L4', headerStyle);

      // Data rows
      for (let i = 0; i < customerParts.length; i++) {
        applyStylesToRange(worksheet, `A${5 + i}:L${5 + i}`, cellStyle);
      }

      // Add worksheet to workbook (sanitize sheet name)
      const sheetName = customerName.substring(0, 31).replace(/[\\\/\*\?\[\]]/g, '_');
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    });

    // Create summary sheet
    const summaryData = [
      ['SUMMARY - MASTER PARTS'],
      [`Exported: ${format(new Date(), 'dd MMM yyyy HH:mm')}`],
      [`Total Parts: ${filteredParts.length}`],
      [`Total Customers: ${partsByCustomer.size}`],
      [],
      ['Customer Name', 'Total Parts'],
      ...Array.from(partsByCustomer.entries()).map(([name, parts]) => [
        name,
        parts.length
      ])
    ];

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    setColumnWidths(summarySheet, [40, 15]);
    
    if (summarySheet['A1']) {
      summarySheet['A1'].s = titleStyle;
      summarySheet['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }];
    }
    applyStylesToRange(summarySheet, 'A6:B6', headerStyle);

    // Insert summary sheet at the beginning
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary', true);
    workbook.SheetNames = ['Summary', ...workbook.SheetNames.filter(n => n !== 'Summary')];

    // Generate and download file
    const fileName = `Master_Parts_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`;
    XLSX.writeFile(workbook, fileName);

    return { success: true, fileName, recordCount: filteredParts.length };
  } catch (error) {
    console.error('Export Parts Error:', error);
    throw error;
  }
};

// ================== EXPORT MASTER CUSTOMERS ==================
export const exportCustomersToExcel = (
  customers: Customer[],
  filter?: ExportFilter
) => {
  try {
    let filteredCustomers = [...customers];

    if (filter?.searchTerm) {
      const searchLower = filter.searchTerm.toLowerCase();
      filteredCustomers = filteredCustomers.filter(customer =>
        customer.name.toLowerCase().includes(searchLower) ||
        customer.address.toLowerCase().includes(searchLower) ||
        customer.email?.toLowerCase().includes(searchLower)
      );
    }

    if (filteredCustomers.length === 0) {
      throw new Error('Tidak ada data yang sesuai dengan filter');
    }

    const data = [
      ['MASTER CUSTOMERS'],
      [`Exported: ${format(new Date(), 'dd MMM yyyy HH:mm')}`],
      [`Total Records: ${filteredCustomers.length}`],
      [],
      ['No', 'Customer Name', 'Address', 'Contact Person', 'Phone', 'Email', 'Created Date'],
      ...filteredCustomers.map((customer, index) => [
        index + 1,
        customer.name,
        customer.address,
        customer.contactPerson || '-',
        customer.phone || '-',
        customer.email || '-',
        customer.createdAt ? format(new Date(customer.createdAt as string), 'dd MMM yyyy') : '-'
      ])
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(data);
    setColumnWidths(worksheet, [5, 35, 40, 25, 18, 30, 15]);

    // Apply styles
    if (worksheet['A1']) {
      worksheet['A1'].s = titleStyle;
      worksheet['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 6 } }];
    }

    if (worksheet['A2']) {
      worksheet['A2'].s = { alignment: { horizontal: "center" } };
      if (!worksheet['!merges']) worksheet['!merges'] = [];
      worksheet['!merges'].push({ s: { r: 1, c: 0 }, e: { r: 1, c: 6 } });
    }

    if (worksheet['A3']) {
      worksheet['A3'].s = { alignment: { horizontal: "center" } };
      if (!worksheet['!merges']) worksheet['!merges'] = [];
      worksheet['!merges'].push({ s: { r: 2, c: 0 }, e: { r: 2, c: 6 } });
    }

    applyStylesToRange(worksheet, 'A5:G5', headerStyle);
    
    for (let i = 0; i < filteredCustomers.length; i++) {
      applyStylesToRange(worksheet, `A${6 + i}:G${6 + i}`, cellStyle);
    }

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Master Customers');

    const fileName = `Master_Customers_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`;
    XLSX.writeFile(workbook, fileName);

    return { success: true, fileName, recordCount: filteredCustomers.length };
  } catch (error) {
    console.error('Export Customers Error:', error);
    throw error;
  }
};

// ================== EXPORT PURCHASE ORDERS ==================
export const exportPurchaseOrdersToExcel = (
  purchaseOrders: PurchaseOrder[],
  customers: Customer[],
  parts: Part[],
  filter?: ExportFilter
) => {
  try {
    let filteredPOs = [...purchaseOrders];

    if (filter?.customers && filter.customers.length > 0) {
      filteredPOs = filteredPOs.filter(po => {
        const customerId = typeof po.customerId === 'string' 
          ? po.customerId 
          : po.customerId._id;
        return filter.customers!.includes(customerId);
      });
    }

    if (filter?.searchTerm) {
      const searchLower = filter.searchTerm.toLowerCase();
      filteredPOs = filteredPOs.filter(po =>
        po.poNumber.toLowerCase().includes(searchLower)
      );
    }

    if (filteredPOs.length === 0) {
      throw new Error('Tidak ada data yang sesuai dengan filter');
    }

    // Group POs by customer
    const posByCustomer = new Map<string, PurchaseOrder[]>();
    filteredPOs.forEach(po => {
      const customerId = typeof po.customerId === 'string' 
        ? po.customerId 
        : po.customerId._id;
      const customer = customers.find(c => c._id === customerId);
      const customerName = customer?.name || 'Unknown Customer';
      
      if (!posByCustomer.has(customerName)) {
        posByCustomer.set(customerName, []);
      }
      posByCustomer.get(customerName)!.push(po);
    });

    const workbook = XLSX.utils.book_new();

    // Create sheet for each customer
    Array.from(posByCustomer.entries()).forEach(([customerName, customerPOs]) => {
      const data = [
        [`PURCHASE ORDERS - ${customerName.toUpperCase()}`],
        [`Exported: ${format(new Date(), 'dd MMM yyyy HH:mm')}`],
        [],
        [
          'No',
          'PO Number',
          'Part Name',
          'Internal Part No',
          'Total Quantity',
          'Delivered Quantity',
          'Progress (%)',
          'Status',
          'Delivery Date',
          'Notes',
          'Created Date'
        ],
        ...customerPOs.map((po, index) => {
          const partId = typeof po.partId === 'string' ? po.partId : po.partId?._id;
          const part = typeof po.partId === 'object' && po.partId?.name
            ? po.partId
            : parts.find(p => p._id === partId);
          
          const deliveredQty = po.deliveredQuantity || 0;
          const totalQty = po.totalQuantity || 0;
          const progress = totalQty > 0 ? Math.round((deliveredQty / totalQty) * 100) : 0;

          return [
            index + 1,
            po.poNumber,
            part?.name || '-',
            part?.internalPartNo || '-',
            totalQty,
            deliveredQty,
            progress,
            po.status === 'completed' ? 'Completed' :
            po.status === 'partial' ? 'Partial' :
            po.status === 'open' ? 'Open' :
            po.status === 'cancelled' ? 'Cancelled' : 'Closed',
            po.deliveryDate ? format(new Date(po.deliveryDate), 'dd MMM yyyy') : '-',
            po.notes || '-',
            po.createdAt ? format(new Date(po.createdAt), 'dd MMM yyyy') : '-'
          ];
        })
      ];

      const worksheet = XLSX.utils.aoa_to_sheet(data);
      setColumnWidths(worksheet, [5, 18, 30, 18, 15, 15, 12, 12, 15, 30, 15]);

      // Apply styles
      if (worksheet['A1']) {
        worksheet['A1'].s = titleStyle;
        worksheet['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 10 } }];
      }

      if (worksheet['A2']) {
        worksheet['A2'].s = { alignment: { horizontal: "center" } };
        if (!worksheet['!merges']) worksheet['!merges'] = [];
        worksheet['!merges'].push({ s: { r: 1, c: 0 }, e: { r: 1, c: 10 } });
      }

      if (worksheet['A3']) {
        worksheet['A3'].s = { alignment: { horizontal: "center" } };
        if (!worksheet['!merges']) worksheet['!merges'] = [];
        worksheet['!merges'].push({ s: { r: 2, c: 0 }, e: { r: 2, c: 10 } });
      }

      applyStylesToRange(worksheet, 'A4:K4', headerStyle);

      for (let i = 0; i < customerPOs.length; i++) {
        applyStylesToRange(worksheet, `A${5 + i}:K${5 + i}`, cellStyle);
      }

      const sheetName = customerName.substring(0, 31).replace(/[\\\/\*\?\[\]]/g, '_');
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    });

    // Summary sheet
    const summaryData = [
      ['SUMMARY - PURCHASE ORDERS'],
      [`Exported: ${format(new Date(), 'dd MMM yyyy HH:mm')}`],
      [`Total POs: ${filteredPOs.length}`],
      [`Total Customers: ${posByCustomer.size}`],
      [],
      ['Customer Name', 'Total POs', 'Open', 'Partial', 'Completed', 'Cancelled'],
      ...Array.from(posByCustomer.entries()).map(([name, pos]) => {
        const open = pos.filter(p => p.status === 'open').length;
        const partial = pos.filter(p => p.status === 'partial').length;
        const completed = pos.filter(p => p.status === 'completed').length;
        const cancelled = pos.filter(p => p.status === 'cancelled').length;
        
        return [name, pos.length, open, partial, completed, cancelled];
      })
    ];

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    setColumnWidths(summarySheet, [40, 12, 10, 10, 12, 12]);
    
    if (summarySheet['A1']) {
      summarySheet['A1'].s = titleStyle;
      summarySheet['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }];
    }
    applyStylesToRange(summarySheet, 'A6:F6', headerStyle);

    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary', true);
    workbook.SheetNames = ['Summary', ...workbook.SheetNames.filter(n => n !== 'Summary')];

    const fileName = `Purchase_Orders_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`;
    XLSX.writeFile(workbook, fileName);

    return { success: true, fileName, recordCount: filteredPOs.length };
  } catch (error) {
    console.error('Export POs Error:', error);
    throw error;
  }
};

// ================== EXPORT SCAN ACTIVITY REPORTS ==================
export const exportScanActivityToExcel = (
  reports: any[],
  customers: Customer[],
  filter?: ExportFilter & { reportType?: 'SCAN_IN' | 'SCAN_OUT' | 'ALL'; dateRange?: { start: Date; end: Date } }
) => {
  try {
    let filteredReports = [...reports];

    // Filter by report type
    if (filter?.reportType && filter.reportType !== 'ALL') {
      filteredReports = filteredReports.filter(report => report.reportType === filter.reportType);
    }

    // Filter by customers
    if (filter?.customers && filter.customers.length > 0) {
      filteredReports = filteredReports.filter(report => {
        const customerId = typeof report.customerId === 'string' 
          ? report.customerId 
          : report.customerId?._id;
        return filter.customers!.includes(customerId);
      });
    }

    // Filter by search term
    if (filter?.searchTerm) {
      const searchLower = filter.searchTerm.toLowerCase();
      filteredReports = filteredReports.filter(report =>
        report.uniqueId?.toLowerCase().includes(searchLower) ||
        report.poNumber?.toLowerCase().includes(searchLower) ||
        report.partName?.toLowerCase().includes(searchLower)
      );
    }

    // Filter by date range
    if (filter?.dateRange) {
      filteredReports = filteredReports.filter(report => {
        const reportDate = new Date(report.createdAt);
        return reportDate >= filter.dateRange!.start && reportDate <= filter.dateRange!.end;
      });
    }

    if (filteredReports.length === 0) {
      throw new Error('Tidak ada data yang sesuai dengan filter');
    }

    // Group reports by customer
    const reportsByCustomer = new Map<string, any[]>();
    filteredReports.forEach(report => {
      const customerId = typeof report.customerId === 'string' 
        ? report.customerId 
        : report.customerId?._id;
      const customer = customers.find(c => c._id === customerId);
      const customerName = customer?.name || report.customerName || 'Unknown Customer';
      
      if (!reportsByCustomer.has(customerName)) {
        reportsByCustomer.set(customerName, []);
      }
      reportsByCustomer.get(customerName)!.push(report);
    });

    const workbook = XLSX.utils.book_new();

    // Create sheet for each customer
    Array.from(reportsByCustomer.entries()).forEach(([customerName, customerReports]) => {
      const data = [
        [`SCAN ACTIVITY REPORT - ${customerName.toUpperCase()}`],
        [`Exported: ${format(new Date(), 'dd MMM yyyy HH:mm')}`],
        [`Report Type: ${filter?.reportType === 'SCAN_IN' ? 'Scan In Only' : filter?.reportType === 'SCAN_OUT' ? 'Scan Out Only' : 'All Activities'}`],
        [],
        [
          'No',
          'Date & Time',
          'Unique ID',
          'Activity Type',
          'Part Name',
          'PO Number',
          'Quantity',
          'Location',
          'Gate ID',
          'Lot ID',
          'Scanned By',
          'Notes'
        ],
        ...customerReports.map((report, index) => [
          index + 1,
          report.createdAt ? format(new Date(report.createdAt), 'dd MMM yyyy HH:mm') : '-',
          report.uniqueId || '-',
          report.reportType === 'SCAN_IN' ? 'Scan In' : 'Scan Out',
          report.partName || '-',
          report.poNumber || '-',
          report.quantity || 0,
          report.location?.warehouse 
            ? `${report.location.warehouse} / ${report.location.zone || '-'} / ${report.location.rack || '-'}` 
            : '-',
          report.gateId || '-',
          report.lotId || '-',
          report.scannedBy?.name || report.scannedBy?.username || '-',
          report.notes || '-'
        ])
      ];

      const worksheet = XLSX.utils.aoa_to_sheet(data);
      setColumnWidths(worksheet, [5, 18, 20, 12, 30, 18, 12, 25, 12, 18, 20, 30]);

      // Apply styles
      if (worksheet['A1']) {
        worksheet['A1'].s = titleStyle;
        worksheet['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 11 } }];
      }

      if (worksheet['A2']) {
        worksheet['A2'].s = { alignment: { horizontal: "center" } };
        if (!worksheet['!merges']) worksheet['!merges'] = [];
        worksheet['!merges'].push({ s: { r: 1, c: 0 }, e: { r: 1, c: 11 } });
      }

      if (worksheet['A3']) {
        worksheet['A3'].s = { alignment: { horizontal: "center" } };
        if (!worksheet['!merges']) worksheet['!merges'] = [];
        worksheet['!merges'].push({ s: { r: 2, c: 0 }, e: { r: 2, c: 11 } });
      }

      applyStylesToRange(worksheet, 'A5:L5', headerStyle);

      for (let i = 0; i < customerReports.length; i++) {
        applyStylesToRange(worksheet, `A${6 + i}:L${6 + i}`, cellStyle);
      }

      const sheetName = customerName.substring(0, 31).replace(/[\\\/\*\?\[\]]/g, '_');
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    });

    // Summary sheet
    const summaryData = [
      ['SUMMARY - SCAN ACTIVITY REPORT'],
      [`Exported: ${format(new Date(), 'dd MMM yyyy HH:mm')}`],
      [`Total Records: ${filteredReports.length}`],
      [`Total Customers: ${reportsByCustomer.size}`],
      [],
      ['Customer Name', 'Total Scans', 'Scan In', 'Scan Out'],
      ...Array.from(reportsByCustomer.entries()).map(([name, reports]) => {
        const scanIn = reports.filter(r => r.reportType === 'SCAN_IN').length;
        const scanOut = reports.filter(r => r.reportType === 'SCAN_OUT').length;
        return [name, reports.length, scanIn, scanOut];
      })
    ];

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    setColumnWidths(summarySheet, [40, 15, 15, 15]);
    
    if (summarySheet['A1']) {
      summarySheet['A1'].s = titleStyle;
      summarySheet['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }];
    }
    applyStylesToRange(summarySheet, 'A6:D6', headerStyle);

    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary', true);
    workbook.SheetNames = ['Summary', ...workbook.SheetNames.filter(n => n !== 'Summary')];

    const fileName = `Scan_Activity_Report_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`;
    XLSX.writeFile(workbook, fileName);

    return { success: true, fileName, recordCount: filteredReports.length };
  } catch (error) {
    console.error('Export Scan Activity Error:', error);
    throw error;
  }
};

// ================== EXPORT PO SUMMARY REPORT ==================
export const exportPOSummaryToExcel = (
  purchaseOrders: PurchaseOrder[],
  customers: Customer[],
  parts: Part[],
  filter?: ExportFilter & { status?: string }
) => {
  try {
    let filteredPOs = [...purchaseOrders];

    // Filter by status
    if (filter?.status && filter.status !== 'all') {
      filteredPOs = filteredPOs.filter(po => po.status === filter.status);
    }

    // Filter by customers
    if (filter?.customers && filter.customers.length > 0) {
      filteredPOs = filteredPOs.filter(po => {
        const customerId = typeof po.customerId === 'string' 
          ? po.customerId 
          : po.customerId._id;
        return filter.customers!.includes(customerId);
      });
    }

    // Filter by search term
    if (filter?.searchTerm) {
      const searchLower = filter.searchTerm.toLowerCase();
      filteredPOs = filteredPOs.filter(po =>
        po.poNumber.toLowerCase().includes(searchLower)
      );
    }

    if (filteredPOs.length === 0) {
      throw new Error('Tidak ada data yang sesuai dengan filter');
    }

    // Group POs by customer
    const posByCustomer = new Map<string, PurchaseOrder[]>();
    filteredPOs.forEach(po => {
      const customerId = typeof po.customerId === 'string' 
        ? po.customerId 
        : po.customerId._id;
      const customer = customers.find(c => c._id === customerId);
      const customerName = customer?.name || 'Unknown Customer';
      
      if (!posByCustomer.has(customerName)) {
        posByCustomer.set(customerName, []);
      }
      posByCustomer.get(customerName)!.push(po);
    });

    const workbook = XLSX.utils.book_new();

    // Create sheet for each customer
    Array.from(posByCustomer.entries()).forEach(([customerName, customerPOs]) => {
      const data = [
        [`PO SUMMARY REPORT - ${customerName.toUpperCase()}`],
        [`Exported: ${format(new Date(), 'dd MMM yyyy HH:mm')}`],
        [],
        [
          'No',
          'PO Number',
          'Part Name',
          'Internal Part No',
          'Total Quantity',
          'Delivered Quantity',
          'Remaining',
          'Progress (%)',
          'Status',
          'Delivery Date',
          'Created Date'
        ],
        ...customerPOs.map((po, index) => {
          const partId = typeof po.partId === 'string' ? po.partId : po.partId?._id;
          const part = typeof po.partId === 'object' && po.partId?.name
            ? po.partId
            : parts.find(p => p._id === partId);
          
          const deliveredQty = po.deliveredQuantity || 0;
          const totalQty = po.totalQuantity || 0;
          const remaining = totalQty - deliveredQty;
          const progress = totalQty > 0 ? Math.round((deliveredQty / totalQty) * 100) : 0;

          return [
            index + 1,
            po.poNumber,
            part?.name || '-',
            part?.internalPartNo || '-',
            totalQty,
            deliveredQty,
            remaining,
            progress,
            po.status === 'completed' ? 'Completed' :
            po.status === 'partial' ? 'Partial' :
            po.status === 'open' ? 'Open' :
            po.status === 'cancelled' ? 'Cancelled' : 'Closed',
            po.deliveryDate ? format(new Date(po.deliveryDate), 'dd MMM yyyy') : '-',
            po.createdAt ? format(new Date(po.createdAt), 'dd MMM yyyy') : '-'
          ];
        })
      ];

      const worksheet = XLSX.utils.aoa_to_sheet(data);
      setColumnWidths(worksheet, [5, 18, 30, 18, 15, 15, 12, 12, 12, 15, 15]);

      // Apply styles
      if (worksheet['A1']) {
        worksheet['A1'].s = titleStyle;
        worksheet['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 10 } }];
      }

      if (worksheet['A2']) {
        worksheet['A2'].s = { alignment: { horizontal: "center" } };
        if (!worksheet['!merges']) worksheet['!merges'] = [];
        worksheet['!merges'].push({ s: { r: 1, c: 0 }, e: { r: 1, c: 10 } });
      }

      if (worksheet['A3']) {
        worksheet['A3'].s = { alignment: { horizontal: "center" } };
        if (!worksheet['!merges']) worksheet['!merges'] = [];
        worksheet['!merges'].push({ s: { r: 2, c: 0 }, e: { r: 2, c: 10 } });
      }

      applyStylesToRange(worksheet, 'A4:K4', headerStyle);

      for (let i = 0; i < customerPOs.length; i++) {
        applyStylesToRange(worksheet, `A${5 + i}:K${5 + i}`, cellStyle);
      }

      const sheetName = customerName.substring(0, 31).replace(/[\\\/\*\?\[\]]/g, '_');
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    });

    // Summary sheet
    const summaryData = [
      ['SUMMARY - PO SUMMARY REPORT'],
      [`Exported: ${format(new Date(), 'dd MMM yyyy HH:mm')}`],
      [`Total POs: ${filteredPOs.length}`],
      [`Total Customers: ${posByCustomer.size}`],
      [],
      ['Customer Name', 'Total POs', 'Open', 'Partial', 'Completed', 'Total Qty', 'Delivered Qty', 'Remaining Qty'],
      ...Array.from(posByCustomer.entries()).map(([name, pos]) => {
        const open = pos.filter(p => p.status === 'open').length;
        const partial = pos.filter(p => p.status === 'partial').length;
        const completed = pos.filter(p => p.status === 'completed').length;
        const totalQty = pos.reduce((sum, p) => sum + (p.totalQuantity || 0), 0);
        const deliveredQty = pos.reduce((sum, p) => sum + (p.deliveredQuantity || 0), 0);
        const remainingQty = totalQty - deliveredQty;
        
        return [name, pos.length, open, partial, completed, totalQty, deliveredQty, remainingQty];
      })
    ];

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    setColumnWidths(summarySheet, [40, 12, 10, 10, 12, 15, 15, 15]);
    
    if (summarySheet['A1']) {
      summarySheet['A1'].s = titleStyle;
      summarySheet['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 7 } }];
    }
    applyStylesToRange(summarySheet, 'A6:H6', headerStyle);

    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary', true);
    workbook.SheetNames = ['Summary', ...workbook.SheetNames.filter(n => n !== 'Summary')];

    const fileName = `PO_Summary_Report_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`;
    XLSX.writeFile(workbook, fileName);

    return { success: true, fileName, recordCount: filteredPOs.length };
  } catch (error) {
    console.error('Export PO Summary Error:', error);
    throw error;
  }
};

// ================== EXPORT INVENTORY STATUS REPORT ==================
export const exportInventoryStatusToExcel = (
  inventoryItems: any[],
  customers: Customer[],
  parts: Part[],
  filter?: ExportFilter & { status?: 'IN' | 'OUT' | 'ALL' }
) => {
  try {
    let filteredItems = [...inventoryItems];

    // Filter by status
    if (filter?.status && filter.status !== 'ALL') {
      filteredItems = filteredItems.filter(item => item.status === filter.status);
    }

    // Filter by customers
    if (filter?.customers && filter.customers.length > 0) {
      filteredItems = filteredItems.filter(item => {
        const partId = typeof item.partId === 'string' ? item.partId : item.partId?._id;
        const part = parts.find(p => p._id === partId);
        if (!part) return false;
        
        const customerId = typeof part.customerId === 'string' 
          ? part.customerId 
          : part.customerId?._id;
        return filter.customers!.includes(customerId);
      });
    }

    // Filter by search term
    if (filter?.searchTerm) {
      const searchLower = filter.searchTerm.toLowerCase();
      filteredItems = filteredItems.filter(item =>
        item.uniqueId?.toLowerCase().includes(searchLower) ||
        item.lotId?.toLowerCase().includes(searchLower)
      );
    }

    if (filteredItems.length === 0) {
      throw new Error('Tidak ada data yang sesuai dengan filter');
    }

    // Group items by customer
    const itemsByCustomer = new Map<string, any[]>();
    filteredItems.forEach(item => {
      const partId = typeof item.partId === 'string' ? item.partId : item.partId?._id;
      const part = parts.find(p => p._id === partId);
      
      const customerId = part 
        ? (typeof part.customerId === 'string' ? part.customerId : part.customerId?._id)
        : null;
      
      const customer = customers.find(c => c._id === customerId);
      const customerName = customer?.name || 'Unknown Customer';
      
      if (!itemsByCustomer.has(customerName)) {
        itemsByCustomer.set(customerName, []);
      }
      itemsByCustomer.get(customerName)!.push(item);
    });

    const workbook = XLSX.utils.book_new();

    // Create sheet for each customer
    Array.from(itemsByCustomer.entries()).forEach(([customerName, customerItems]) => {
      const data = [
        [`INVENTORY STATUS REPORT - ${customerName.toUpperCase()}`],
        [`Exported: ${format(new Date(), 'dd MMM yyyy HH:mm')}`],
        [`Status Filter: ${filter?.status === 'IN' ? 'In Stock' : filter?.status === 'OUT' ? 'Out Stock' : 'All Status'}`],
        [],
        [
          'No',
          'Unique ID',
          'Part Name',
          'PO Number',
          'Quantity',
          'Status',
          'Location',
          'Lot ID',
          'Gate ID',
          'Created By',
          'Created Date'
        ],
        ...customerItems.map((item, index) => {
          const partId = typeof item.partId === 'string' ? item.partId : item.partId?._id;
          const part = typeof item.partId === 'object' && item.partId?.name
            ? item.partId
            : parts.find(p => p._id === partId);

          return [
            index + 1,
            item.uniqueId || '-',
            part?.name || '-',
            item.poNumber || '-',
            item.quantity || 0,
            item.status === 'IN' ? 'In Stock' : 'Out Stock',
            item.location?.warehouse 
              ? `${item.location.warehouse} / ${item.location.zone || '-'} / ${item.location.rack || '-'}` 
              : '-',
            item.lotId || '-',
            item.gateId || '-',
            item.createdBy?.username || '-',
            item.createdAt ? format(new Date(item.createdAt), 'dd MMM yyyy') : '-'
          ];
        })
      ];

      const worksheet = XLSX.utils.aoa_to_sheet(data);
      setColumnWidths(worksheet, [5, 20, 30, 18, 12, 12, 25, 18, 12, 20, 15]);

      // Apply styles
      if (worksheet['A1']) {
        worksheet['A1'].s = titleStyle;
        worksheet['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 10 } }];
      }

      if (worksheet['A2']) {
        worksheet['A2'].s = { alignment: { horizontal: "center" } };
        if (!worksheet['!merges']) worksheet['!merges'] = [];
        worksheet['!merges'].push({ s: { r: 1, c: 0 }, e: { r: 1, c: 10 } });
      }

      if (worksheet['A3']) {
        worksheet['A3'].s = { alignment: { horizontal: "center" } };
        if (!worksheet['!merges']) worksheet['!merges'] = [];
        worksheet['!merges'].push({ s: { r: 2, c: 0 }, e: { r: 2, c: 10 } });
      }

      applyStylesToRange(worksheet, 'A5:K5', headerStyle);

      for (let i = 0; i < customerItems.length; i++) {
        applyStylesToRange(worksheet, `A${6 + i}:K${6 + i}`, cellStyle);
      }

      const sheetName = customerName.substring(0, 31).replace(/[\\\/\*\?\[\]]/g, '_');
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    });

    // Summary sheet
    const summaryData = [
      ['SUMMARY - INVENTORY STATUS REPORT'],
      [`Exported: ${format(new Date(), 'dd MMM yyyy HH:mm')}`],
      [`Total Items: ${filteredItems.length}`],
      [`Total Customers: ${itemsByCustomer.size}`],
      [],
      ['Customer Name', 'Total Items', 'In Stock', 'Out Stock', 'Total Quantity'],
      ...Array.from(itemsByCustomer.entries()).map(([name, items]) => {
        const inStock = items.filter(i => i.status === 'IN').length;
        const outStock = items.filter(i => i.status === 'OUT').length;
        const totalQty = items.reduce((sum, i) => sum + (i.quantity || 0), 0);
        
        return [name, items.length, inStock, outStock, totalQty];
      })
    ];

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    setColumnWidths(summarySheet, [40, 15, 15, 15, 15]);
    
    if (summarySheet['A1']) {
      summarySheet['A1'].s = titleStyle;
      summarySheet['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }];
    }
    applyStylesToRange(summarySheet, 'A6:E6', headerStyle);

    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary', true);
    workbook.SheetNames = ['Summary', ...workbook.SheetNames.filter(n => n !== 'Summary')];

    const fileName = `Inventory_Status_Report_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`;
    XLSX.writeFile(workbook, fileName);

    return { success: true, fileName, recordCount: filteredItems.length };
  } catch (error) {
    console.error('Export Inventory Status Error:', error);
    throw error;
  }
};
