'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect, useCallback } from 'react';
import { format, parseISO } from 'date-fns';
import Link from 'next/link';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';

export default function DailyLogs() {
  const { data: session, status } = useSession();
  const [logs, setLogs] = useState([]);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [loading, setLoading] = useState(false);

  const fetchDailyLogs = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/daily-logs?date=${selectedDate}`);
      const data = await response.json();
      if (response.ok) {
        setLogs(data.logs);
      }
    } catch (error) {
      console.error('Error fetching daily logs:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (session?.user?.role === 'admin') {
      fetchDailyLogs();
    }
  }, [session, selectedDate]);

  const downloadCSV = () => {
    const headers = ['Employee Name', 'Email', 'Start Time', 'End Time', 'Duration', 'Status'];
    const csvContent = [
      headers.join(','),
      ...logs.map(log => [
        `"${log.userId.name}"`,
        `"${log.userId.email}"`,
        format(new Date(log.startTime), 'HH:mm:ss'),
        log.endTime ? format(new Date(log.endTime), 'HH:mm:ss') : '-',
        log.duration ? `${Math.floor(log.duration / 60)}h ${log.duration % 60}m` : '-',
        log.status
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `daily-logs-${selectedDate}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const downloadExcel = () => {
    const data = logs.map(log => ({
      'Employee Name': log.userId.name,
      'Email': log.userId.email,
      'Start Time': format(new Date(log.startTime), 'HH:mm:ss'),
      'End Time': log.endTime ? format(new Date(log.endTime), 'HH:mm:ss') : '-',
      'Duration (minutes)': log.duration || 0,
      'Duration (formatted)': log.duration ? `${Math.floor(log.duration / 60)}h ${log.duration % 60}m` : '-',
      'Status': log.status
    }));
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Daily Logs');
    XLSX.writeFile(wb, `daily-logs-${selectedDate}.xlsx`);
  };

  const downloadPDF = () => {
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(20);
    doc.text('Daily Attendance Logs', 14, 22);
    doc.setFontSize(12);
    doc.text(`Date: ${format(parseISO(selectedDate), 'EEEE, MMMM dd, yyyy')}`, 14, 32);
    doc.text(`Generated on: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 40);
    doc.text(`Total Employees: ${logs.length}`, 14, 48);
    
    if (logs.length > 0) {
      let yPosition = 60;
      doc.setFontSize(12);
      doc.text('Employee Details:', 14, yPosition);
      yPosition += 10;
      
      logs.forEach((log, index) => {
        if (yPosition > 250) {
          doc.addPage();
          yPosition = 20;
        }
        
        doc.setFontSize(10);
        doc.text(`${index + 1}. ${log.userId.name}`, 14, yPosition);
        yPosition += 6;
        doc.setFontSize(8);
        doc.text(`   Email: ${log.userId.email}`, 20, yPosition);
        yPosition += 5;
        doc.text(`   Start Time: ${format(new Date(log.startTime), 'HH:mm:ss')}`, 20, yPosition);
        yPosition += 4;
        doc.text(`   End Time: ${log.endTime ? format(new Date(log.endTime), 'HH:mm:ss') : 'Not ended'}`, 20, yPosition);
        yPosition += 4;
        doc.text(`   Duration: ${log.duration ? `${Math.floor(log.duration / 60)}h ${log.duration % 60}m` : 'Not calculated'}`, 20, yPosition);
        yPosition += 4;
        doc.text(`   Status: ${log.status}`, 20, yPosition);
        yPosition += 8;
      });
    }
    
    // Save PDF
    doc.save(`daily-logs-${selectedDate}.pdf`);
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (!session?.user?.role || session.user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-4">You need admin privileges to view this page.</p>
          <Link href="/" className="text-blue-600 hover:text-blue-800">
            Go back to home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/" className="text-blue-600 hover:text-blue-800 mr-4">
                ← Back
              </Link>
              <h1 className="text-xl font-semibold text-gray-900">
                Daily Logs
              </h1>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-medium text-gray-900">
                  Daily Attendance Logs
                </h2>
                <div className="flex items-center space-x-4">
                  <label htmlFor="date" className="text-sm font-medium text-gray-700">
                    Select Date:
                  </label>
                  <input
                    type="date"
                    id="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                  />
                  {logs.length > 0 && (
                    <div className="flex space-x-2">
                      <button
                        onClick={downloadCSV}
                        className="bg-green-600 text-white px-3 py-2 rounded-md hover:bg-green-700 text-sm"
                      >
                        CSV
                      </button>
                      <button
                        onClick={downloadExcel}
                        className="bg-blue-600 text-white px-3 py-2 rounded-md hover:bg-blue-700 text-sm"
                      >
                        Excel
                      </button>
                      <button
                        onClick={downloadPDF}
                        className="bg-red-600 text-white px-3 py-2 rounded-md hover:bg-red-700 text-sm"
                      >
                        PDF
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {loading ? (
                <div className="text-center py-8">
                  <div className="text-gray-500">Loading...</div>
                </div>
              ) : logs.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-gray-500">No logs found for this date</div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Employee
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Start Time
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          End Time
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Duration
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {logs.map((log) => (
                        <tr key={log._id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {log.userId.name}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {log.userId.email}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {format(new Date(log.startTime), 'HH:mm:ss')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {log.endTime ? format(new Date(log.endTime), 'HH:mm:ss') : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {log.duration ? (
                              `${Math.floor(log.duration / 60)}h ${log.duration % 60}m`
                            ) : (
                              '-'
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              log.status === 'completed' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {log.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 