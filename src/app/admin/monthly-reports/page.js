'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect, useCallback } from 'react';
import { format, parseISO } from 'date-fns';
import Link from 'next/link';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';

export default function MonthlyReports() {
  const { data: session, status } = useSession();
  const [reports, setReports] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [loading, setLoading] = useState(false);

  // Helper function to group consecutive week off days into periods
  const getWeekOffPeriods = (weekOffLogs) => {
    if (!weekOffLogs || weekOffLogs.length === 0) return 'None';
    
    const sortedLogs = weekOffLogs.sort((a, b) => new Date(a.date) - new Date(b.date));
    const periods = [];
    let currentPeriod = {
      start: sortedLogs[0].date,
      end: sortedLogs[0].date
    };
    
    for (let i = 1; i < sortedLogs.length; i++) {
      const currentDate = new Date(sortedLogs[i].date);
      const prevDate = new Date(sortedLogs[i - 1].date);
      const diffDays = (currentDate - prevDate) / (1000 * 60 * 60 * 24);
      
      if (diffDays === 1) {
        // Consecutive day, extend current period
        currentPeriod.end = sortedLogs[i].date;
      } else {
        // Non-consecutive, save current period and start new one
        periods.push(`${currentPeriod.start} to ${currentPeriod.end}`);
        currentPeriod = {
          start: sortedLogs[i].date,
          end: sortedLogs[i].date
        };
      }
    }
    
    // Add the last period
    periods.push(`${currentPeriod.start} to ${currentPeriod.end}`);
    
    return periods.join('; ');
  };

  const fetchMonthlyReports = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/monthly-reports?month=${selectedMonth}`);
      const data = await response.json();
      if (response.ok) {
        setReports(data.reports);
      }
    } catch (error) {
      console.error('Error fetching monthly reports:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (session?.user?.role === 'admin') {
      fetchMonthlyReports();
    }
  }, [session, selectedMonth]);

  const downloadCSV = () => {
    const headers = [
      'Employee Name', 
      'Email', 
      'Total Days Worked', 
      'Total Hours', 
      'Average Hours/Day',
      'Total Minutes',
      'Working Days in Month',
      'Attendance Rate (%)',
      'Total Work Sessions',
      'Completed Sessions',
      'Incomplete Sessions',
      'Week Off Days',
      'Week Off Periods'
    ];
    const csvContent = [
      headers.join(','),
      ...reports.map(report => {
        const workingDaysInMonth = new Date(parseISO(selectedMonth + '-01').getFullYear(), parseISO(selectedMonth + '-01').getMonth() + 1, 0).getDate();
        const attendanceRate = (report.totalDays / workingDaysInMonth) * 100;
        const weekOffLogs = report.workLogs ? report.workLogs.filter(log => log.status === 'week_off') : [];
        const workLogs = report.workLogs ? report.workLogs.filter(log => log.status !== 'week_off') : [];
        
        return [
          `"${report.userName}"`,
          `"${report.userEmail}"`,
          report.totalDays,
          report.totalHours,
          report.averageHoursPerDay,
          Math.round(report.totalHours * 60),
          workingDaysInMonth,
          Math.round(attendanceRate * 100) / 100,
          workLogs.length,
          workLogs.filter(log => log.endTime).length,
          workLogs.filter(log => !log.endTime).length,
          weekOffLogs.length,
          `"${getWeekOffPeriods(weekOffLogs)}"`
        ].join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `monthly-report-${selectedMonth}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const downloadExcel = () => {
    // Create workbook
    const wb = XLSX.utils.book_new();
    
    // Summary sheet with salary slip information
    const summaryData = reports.map(report => {
      const weekOffLogs = report.workLogs ? report.workLogs.filter(log => log.status === 'week_off') : [];
      const workLogs = report.workLogs ? report.workLogs.filter(log => log.status !== 'week_off') : [];
      
      return {
        'Employee Name': report.userName,
        'Email': report.userEmail,
        'Total Days Worked': report.totalDays,
        'Total Hours': report.totalHours,
        'Average Hours/Day': report.averageHoursPerDay,
        'Total Minutes': Math.round(report.totalHours * 60),
        'Working Days in Month': new Date(parseISO(selectedMonth + '-01').getFullYear(), parseISO(selectedMonth + '-01').getMonth() + 1, 0).getDate(),
        'Attendance Rate (%)': Math.round((report.totalDays / new Date(parseISO(selectedMonth + '-01').getFullYear(), parseISO(selectedMonth + '-01').getMonth() + 1, 0).getDate()) * 100),
        'Total Work Sessions': workLogs.length,
        'Completed Sessions': workLogs.filter(log => log.endTime).length,
        'Incomplete Sessions': workLogs.filter(log => !log.endTime).length,
        'Week Off Days': weekOffLogs.length,
        'Week Off Periods': getWeekOffPeriods(weekOffLogs)
      };
    });
    
    const summaryWS = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summaryWS, 'Salary Summary');
    
    // Salary calculation sheet
    const salaryData = reports.map(report => {
      const totalMinutes = Math.round(report.totalHours * 60);
      const workingDaysInMonth = new Date(parseISO(selectedMonth + '-01').getFullYear(), parseISO(selectedMonth + '-01').getMonth() + 1, 0).getDate();
      const attendanceRate = (report.totalDays / workingDaysInMonth) * 100;
      const weekOffLogs = report.workLogs ? report.workLogs.filter(log => log.status === 'week_off') : [];
      
      return {
        'Employee Name': report.userName,
        'Email': report.userEmail,
        'Total Days Worked': report.totalDays,
        'Working Days in Month': workingDaysInMonth,
        'Attendance Rate (%)': Math.round(attendanceRate * 100) / 100,
        'Total Hours': report.totalHours,
        'Total Minutes': totalMinutes,
        'Average Hours/Day': report.averageHoursPerDay,
        'Total Work Sessions': report.workLogs ? report.workLogs.filter(log => log.status !== 'week_off').length : 0,
        'Completed Sessions': report.workLogs ? report.workLogs.filter(log => log.status !== 'week_off' && log.endTime).length : 0,
        'Incomplete Sessions': report.workLogs ? report.workLogs.filter(log => log.status !== 'week_off' && !log.endTime).length : 0,
        'Week Off Days': weekOffLogs.length,
        'Week Off Periods': getWeekOffPeriods(weekOffLogs),
        'Salary Calculation Notes': `Based on ${report.totalDays} days worked out of ${workingDaysInMonth} working days (${Math.round(attendanceRate * 100) / 100}% attendance). Week off: ${weekOffLogs.length} days.`
      };
    });
    
    const salaryWS = XLSX.utils.json_to_sheet(salaryData);
    XLSX.utils.book_append_sheet(wb, salaryWS, 'Salary Calculation');
    
    // Week Off Summary Sheet
    const weekOffSummaryData = reports.map(report => {
      const weekOffLogs = report.workLogs ? report.workLogs.filter(log => log.status === 'week_off') : [];
      const weekOffPeriods = getWeekOffPeriods(weekOffLogs);
      
      return {
        'Employee Name': report.userName,
        'Email': report.userEmail,
        'Total Week Off Days': weekOffLogs.length,
        'Week Off Periods': weekOffPeriods,
        'Week Off Dates': weekOffLogs.map(log => log.date).join(', '),
        'Week Off Days of Week': weekOffLogs.map(log => format(new Date(log.startTime), 'EEEE')).join(', '),
        'Notes': weekOffLogs.length > 0 ? 'Week off periods marked by employee' : 'No week off days'
      };
    });
    
    const weekOffWS = XLSX.utils.json_to_sheet(weekOffSummaryData);
    XLSX.utils.book_append_sheet(wb, weekOffWS, 'Week Off Summary');
    
    // Detailed daily logs for each employee
    reports.forEach(report => {
      if (report.workLogs && report.workLogs.length > 0) {
        const detailedData = report.workLogs.map((log, index) => ({
          'Day': index + 1,
          'Date': log.date,
          'Day of Week': format(new Date(log.startTime), 'EEEE'),
          'Start Time': format(new Date(log.startTime), 'HH:mm:ss'),
          'End Time': log.endTime ? format(new Date(log.endTime), 'HH:mm:ss') : 'Not Ended',
          'Duration (minutes)': log.duration || 0,
          'Duration (hours)': log.duration ? `${Math.floor(log.duration / 60)}h ${log.duration % 60}m` : 'Not Calculated',
          'Status': log.status === 'week_off' ? 'Week Off' : (log.endTime ? 'Completed' : 'In Progress'),
          'Session ID': log._id || `Session-${index + 1}`,
          'Notes': log.status === 'week_off' ? 'Week off day' : (log.endTime ? 'Full day completed' : 'Session not ended')
        }));
        
        const detailedWS = XLSX.utils.json_to_sheet(detailedData);
        XLSX.utils.book_append_sheet(wb, detailedWS, report.userName.substring(0, 31)); // Excel sheet names limited to 31 chars
      }
    });
    
    // All employees combined daily log
    const allLogsData = [];
    reports.forEach(report => {
      if (report.workLogs && report.workLogs.length > 0) {
        report.workLogs.forEach(log => {
          allLogsData.push({
            'Employee Name': report.userName,
            'Email': report.userEmail,
            'Date': log.date,
            'Day of Week': format(new Date(log.startTime), 'EEEE'),
            'Start Time': format(new Date(log.startTime), 'HH:mm:ss'),
            'End Time': log.endTime ? format(new Date(log.endTime), 'HH:mm:ss') : 'Not Ended',
            'Duration (minutes)': log.duration || 0,
            'Duration (hours)': log.duration ? `${Math.floor(log.duration / 60)}h ${log.duration % 60}m` : 'Not Calculated',
            'Status': log.status === 'week_off' ? 'Week Off' : (log.endTime ? 'Completed' : 'In Progress'),
            'Week Off Note': log.status === 'week_off' ? 'Employee marked as unavailable' : ''
          });
        });
      }
    });
    
    if (allLogsData.length > 0) {
      const allLogsWS = XLSX.utils.json_to_sheet(allLogsData);
      XLSX.utils.book_append_sheet(wb, allLogsWS, 'All Daily Logs');
    }
    
    // Week Off Details Sheet
    const weekOffDetailsData = [];
    reports.forEach(report => {
      const weekOffLogs = report.workLogs ? report.workLogs.filter(log => log.status === 'week_off') : [];
      weekOffLogs.forEach(log => {
        weekOffDetailsData.push({
          'Employee Name': report.userName,
          'Email': report.userEmail,
          'Week Off Date': log.date,
          'Day of Week': format(new Date(log.startTime), 'EEEE'),
          'Start Time': format(new Date(log.startTime), 'HH:mm:ss'),
          'End Time': format(new Date(log.endTime), 'HH:mm:ss'),
          'Duration (minutes)': log.duration,
          'Duration (hours)': `${Math.floor(log.duration / 60)}h ${log.duration % 60}m`,
          'Status': 'Week Off',
          'Session ID': log._id,
          'Notes': 'Employee marked this day as week off'
        });
      });
    });
    
    if (weekOffDetailsData.length > 0) {
      const weekOffDetailsWS = XLSX.utils.json_to_sheet(weekOffDetailsData);
      XLSX.utils.book_append_sheet(wb, weekOffDetailsWS, 'Week Off Details');
    }
    
    // Save the file
    XLSX.writeFile(wb, `monthly-report-${selectedMonth}.xlsx`);
  };

  const downloadPDF = () => {
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(20);
    doc.text('Monthly Attendance Report', 14, 22);
    doc.setFontSize(12);
    doc.text(`Month: ${format(parseISO(selectedMonth + '-01'), 'MMMM yyyy')}`, 14, 32);
    doc.text(`Generated on: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 40);
    
    // Add summary statistics
    const totalEmployees = reports.length;
    const totalDays = reports.reduce((sum, report) => sum + report.totalDays, 0);
    const totalHours = reports.reduce((sum, report) => sum + report.totalHours, 0);
    
    doc.setFontSize(14);
    doc.text('Summary:', 14, 55);
    doc.setFontSize(10);
    doc.text(`Total Employees: ${totalEmployees}`, 14, 65);
    doc.text(`Total Days Worked: ${totalDays}`, 14, 72);
    doc.text(`Total Hours: ${Math.round(totalHours * 100) / 100}h`, 14, 79);
    
    // Add employee data
    let yPosition = 100;
    doc.setFontSize(12);
    doc.text('Employee Details:', 14, yPosition);
    yPosition += 10;
    
    reports.forEach((report, index) => {
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
      }
      
      doc.setFontSize(10);
      doc.text(`${index + 1}. ${report.userName}`, 14, yPosition);
      yPosition += 6;
      doc.setFontSize(8);
      doc.text(`   Email: ${report.userEmail}`, 20, yPosition);
      yPosition += 5;
      doc.text(`   Total Days: ${report.totalDays} | Total Hours: ${report.totalHours}h | Avg: ${report.averageHoursPerDay}h/day`, 20, yPosition);
      yPosition += 8;
    });
    
    // Save PDF
    doc.save(`monthly-report-${selectedMonth}.pdf`);
  };

  const downloadDetailedPDF = () => {
    const doc = new jsPDF();
    let currentY = 20;
    
    // Add title
    doc.setFontSize(20);
    doc.text('Detailed Monthly Attendance Report', 14, currentY);
    currentY += 10;
    
    doc.setFontSize(12);
    doc.text(`Month: ${format(parseISO(selectedMonth + '-01'), 'MMMM yyyy')}`, 14, currentY);
    currentY += 8;
    doc.text(`Generated on: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, currentY);
    currentY += 15;
    
    // Process each employee
    reports.forEach((report, index) => {
      // Check if we need a new page
      if (currentY > 250) {
        doc.addPage();
        currentY = 20;
      }
      
      // Employee header
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text(`${index + 1}. ${report.userName}`, 14, currentY);
      currentY += 8;
      
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text(`Email: ${report.userEmail}`, 14, currentY);
      currentY += 6;
      doc.text(`Total Days: ${report.totalDays} | Total Hours: ${report.totalHours}h | Avg: ${report.averageHoursPerDay}h/day`, 14, currentY);
      currentY += 10;
      
      // Add daily logs if available
      if (report.workLogs && report.workLogs.length > 0) {
        doc.setFontSize(9);
        doc.text('Daily Logs:', 20, currentY);
        currentY += 6;
        
        report.workLogs.forEach(log => {
          if (currentY > 250) {
            doc.addPage();
            currentY = 20;
          }
          
          const startTime = format(new Date(log.startTime), 'HH:mm');
          const endTime = log.endTime ? format(new Date(log.endTime), 'HH:mm') : '-';
          const duration = `${Math.floor(log.duration / 60)}h ${log.duration % 60}m`;
          
          doc.setFontSize(8);
          doc.text(`   ${log.date}: ${startTime} - ${endTime} (${duration})`, 25, currentY);
          currentY += 4;
        });
        currentY += 5;
      } else {
        currentY += 10;
      }
    });
    
    // Save PDF
    doc.save(`detailed-monthly-report-${selectedMonth}.pdf`);
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
                Monthly Reports
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
                  Monthly Attendance Reports
                </h2>
                <div className="flex items-center space-x-4">
                  <label htmlFor="month" className="text-sm font-medium text-gray-700">
                    Select Month:
                  </label>
                  <input
                    type="month"
                    id="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                  />
                  <button
                    onClick={downloadCSV}
                    className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 text-sm mr-2"
                  >
                    Download CSV
                  </button>
                  <button
                    onClick={downloadExcel}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm mr-2"
                  >
                    Download Excel
                  </button>
                  <button
                    onClick={downloadPDF}
                    className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 text-sm mr-2"
                  >
                    Download PDF
                  </button>
                  <button
                    onClick={downloadDetailedPDF}
                    className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 text-sm"
                  >
                    Download Detailed PDF
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="text-center py-8">
                  <div className="text-gray-500">Loading...</div>
                </div>
              ) : reports.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-gray-500">No reports found for this month</div>
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
                          Total Days
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total Hours
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Avg Hours/Day
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {reports.map((report) => (
                        <tr key={report.userId}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {report.userName}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {report.userEmail}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {report.totalDays}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {report.totalHours}h
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {report.averageHoursPerDay}h
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => {
                                // Show detailed logs for this user
                                const details = report.workLogs.map(log => 
                                  `${log.date}: ${log.duration} minutes`
                                ).join('\n');
                                alert(`Detailed logs for ${report.userName}:\n\n${details}`);
                              }}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              View Details
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {reports.length > 0 && (
                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="text-sm font-medium text-blue-800">Total Employees</h3>
                    <p className="text-2xl font-bold text-blue-900">{reports.length}</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h3 className="text-sm font-medium text-green-800">Total Days Worked</h3>
                    <p className="text-2xl font-bold text-green-900">
                      {reports.reduce((sum, report) => sum + report.totalDays, 0)}
                    </p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <h3 className="text-sm font-medium text-purple-800">Total Hours</h3>
                    <p className="text-2xl font-bold text-purple-900">
                      {Math.round(reports.reduce((sum, report) => sum + report.totalHours, 0) * 100) / 100}h
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 