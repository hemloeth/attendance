'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import Image from 'next/image';

export default function Home() {
  const { data: session, status } = useSession();
  const [todayLog, setTodayLog] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState(null);
  const [showWeekOffModal, setShowWeekOffModal] = useState(false);
  const [weekOffDates, setWeekOffDates] = useState({
    startDate: '',
    endDate: ''
  });

  const fetchTodayLog = async () => {
    try {
      const response = await fetch('/api/work/logs?limit=1');
      const data = await response.json();
      
      if (response.ok && data.workLogs && data.workLogs.length > 0) {
        const today = new Date();
        const logDate = new Date(data.workLogs[0].date);
        
        if (logDate.toDateString() === today.toDateString()) {
          setTodayLog(data.workLogs[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching today log:', error);
      setError('Failed to load work data. Please try again.');
    }
  };

  useEffect(() => {
    if (session) {
      fetchTodayLog();
    }
  }, [session]);

  const startWork = async () => {
    setLoading(true);
    setMessage('');
    try {
      const response = await fetch('/api/work/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();
      
      if (response.ok) {
        setTodayLog(data.workLog);
        setMessage('Work started successfully!');
      } else {
        setMessage(data.error);
      }
    } catch (error) {
      setMessage('Error starting work');
    }
    setLoading(false);
  };

    const endWork = async () => {
    setLoading(true);
    setMessage('');
    try {
      const response = await fetch('/api/work/end', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();
      
      if (response.ok) {
        setTodayLog(data.workLog);
        setMessage('Work ended successfully!');
      } else {
        setMessage(data.error);
      }
    } catch (error) {
      setMessage('Error ending work');
    }
    setLoading(false);
  };

  const markWeekOff = async () => {
    setLoading(true);
    setMessage('');
    try {
      const response = await fetch('/api/work/week-off', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(weekOffDates),
      });
      const data = await response.json();
      
      if (response.ok) {
        setMessage(data.message);
        setShowWeekOffModal(false);
        setWeekOffDates({ startDate: '', endDate: '' });
        // Refresh today's log to show updated status
        fetchTodayLog();
      } else {
        setMessage(data.error);
      }
    } catch (error) {
      setMessage('Error marking week off');
    }
    setLoading(false);
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Error
            </h2>
            <p className="mt-2 text-center text-sm text-red-600">
              {error}
            </p>
          </div>
          <div className="mt-8 space-y-6">
            <button
              onClick={() => window.location.reload()}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Reload Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Attendance Tracker
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Sign in to track your work hours
            </p>
          </div>
          <div className="mt-8 space-y-6">
            <button
              onClick={() => signIn('google')}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Sign in with Google
            </button>
          </div>
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
              <h1 className="text-xl font-semibold text-gray-900">
                Attendance Tracker
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                {session?.user?.image && (
                  <Image
                    className="h-8 w-8 rounded-full"
                    src={session.user.image}
                    alt={session.user.name || 'User'}
                    width={32}
                    height={32}
                  />
                )}
                <span className="text-sm text-gray-700">{session?.user?.name || 'User'}</span>
              </div>
              <button
                onClick={() => signOut()}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              {session?.user?.role === 'admin' ? (
                <div className="text-center py-8">
                  <h2 className="text-lg font-medium text-gray-900 mb-4">
                    Welcome, Admin!
                  </h2>
                  <p className="text-gray-500 mb-6">
                    Use the admin panel below to view attendance reports and manage employee data.
                  </p>
                </div>
              ) : (
                <>
                  <h2 className="text-lg font-medium text-gray-900 mb-4">
                    Today&apos;s Work Session
                  </h2>
                  
                  {message && (
                    <div className={`mb-4 p-3 rounded-md ${
                      message.includes('Error') 
                        ? 'bg-red-50 text-red-700' 
                        : 'bg-green-50 text-green-700'
                    }`}>
                      {message}
                    </div>
                  )}

                  <div className="space-y-4">
                    {todayLog ? (
                      <div className="bg-gray-50 p-4 rounded-lg">
                        {todayLog.status === 'week_off' ? (
                          <div className="text-center">
                            <div className="text-orange-600 text-lg font-medium mb-2">
                              🏖️ Week Off
                            </div>
                            <p className="text-gray-600">
                              You are marked as unavailable for today
                            </p>
                          </div>
                        ) : (
                          <>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div>
                                <p className="text-sm font-medium text-gray-500">Start Time</p>
                                <p className="text-lg text-gray-900">
                                  {format(new Date(todayLog.startTime), 'HH:mm:ss')}
                                </p>
                              </div>
                              {todayLog.endTime && (
                                <>
                                  <div>
                                    <p className="text-sm font-medium text-gray-500">End Time</p>
                                    <p className="text-lg text-gray-900">
                                      {format(new Date(todayLog.endTime), 'HH:mm:ss')}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-gray-500">Duration</p>
                                    <p className="text-lg text-gray-900">
                                      {Math.floor(todayLog.duration / 60)}h {todayLog.duration % 60}m
                                    </p>
                                  </div>
                                </>
                              )}
                            </div>
                            
                            {!todayLog.endTime && (
                              <div className="mt-4">
                                <button
                                  onClick={endWork}
                                  disabled={loading}
                                  className="w-full bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-50"
                                >
                                  {loading ? 'Ending...' : 'End Work'}
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-gray-500 mb-4">No work session started today</p>
                        <button
                          onClick={startWork}
                          disabled={loading}
                          className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
                        >
                          {loading ? 'Starting...' : 'Start Work'}
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Week Off Section - Only for regular users */}
              {session?.user?.role !== 'admin' && (
                <div className="mt-8 pt-8 border-t border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Request Time Off
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Mark yourself as unavailable for a specific period (vacation, sick leave, etc.)
                  </p>
                  <button
                    onClick={() => setShowWeekOffModal(true)}
                    disabled={loading}
                    className="bg-orange-600 text-white px-6 py-2 rounded-md hover:bg-orange-700 disabled:opacity-50"
                  >
                    Mark Week Off
                  </button>
                </div>
              )}

              {session?.user?.role === 'admin' && (
                <div className="mt-8 pt-8 border-t border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Admin Panel
                  </h3>
                  <div className="space-x-4">
                    <a
                      href="/admin/daily-logs"
                      className="inline-block bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
                    >
                      Daily Logs
                    </a>
                    <a
                      href="/admin/monthly-reports"
                      className="inline-block bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700"
                    >
                      Monthly Reports
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Week Off Modal */}
      {showWeekOffModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Mark Week Off
              </h3>
              <div className="space-y-4">
                <div>
                  <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    id="startDate"
                    value={weekOffDates.startDate}
                    onChange={(e) => setWeekOffDates({...weekOffDates, startDate: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div>
                  <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    id="endDate"
                    value={weekOffDates.endDate}
                    onChange={(e) => setWeekOffDates({...weekOffDates, endDate: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    min={weekOffDates.startDate || new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div className="flex space-x-3 pt-4">
                  <button
                    onClick={markWeekOff}
                    disabled={loading || !weekOffDates.startDate || !weekOffDates.endDate}
                    className="flex-1 bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700 disabled:opacity-50"
                  >
                    {loading ? 'Processing...' : 'Mark Week Off'}
                  </button>
                  <button
                    onClick={() => {
                      setShowWeekOffModal(false);
                      setWeekOffDates({ startDate: '', endDate: '' });
                    }}
                    className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
